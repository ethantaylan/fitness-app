import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, test } from "vite-plus/test";
import type { Program } from "../../src/lib/types";

const owner = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
const previous = "00000000-0000-0000-0000-000000000010";
const otherPrevious = "00000000-0000-0000-0000-000000000020";
const next = "00000000-0000-0000-0000-000000000011";
const later = "00000000-0000-0000-0000-000000000012";
const migration = readFileSync(
  new URL("../migrations/20261015201645_save_generated_program.sql", import.meta.url),
  "utf8",
);
const historicalSchema = readFileSync(new URL("../../schema.sql", import.meta.url), "utf8");
const programTables = historicalSchema
  .slice(
    historicalSchema.indexOf("CREATE TABLE IF NOT EXISTS programs ("),
    historicalSchema.indexOf("CREATE TABLE IF NOT EXISTS daily_sessions ("),
  )
  .replaceAll("uuid_generate_v4()", "gen_random_uuid()");
const programPolicies = historicalSchema.slice(
  historicalSchema.indexOf("-- programs\n"),
  historicalSchema.indexOf("-- daily_sessions\n"),
);
let db: PGlite;

function fixture(): Program {
  return {
    user_profile: { weight: 70, weeklyFrequency: 1 },
    program_overview: { duration_weeks: 1, training_days_per_week: 1, summary: "New plan" },
    nutrition_recommendations: {
      daily_calories_estimate: 2200,
      protein_target_g: 120,
      water_intake_l: 2.5,
      notes: "Hydrate",
    },
    general_advice: "Progress slowly",
    weeks: [
      {
        week_number: 1,
        focus: "Adaptation",
        sessions: [
          {
            session_id: "W1D1",
            day: "Lundi",
            type: "Renforcement",
            duration_min: 45,
            intensity: "Modérée",
            warmup: [{ name: "Marche", duration_sec: 300 }],
            cooldown: [],
            blocks: [
              {
                block_name: "Force",
                exercises: [
                  { name: "Squat", sets: 3, reps: 8, load_kg: "40", rest_sec: 90 },
                  { name: "Fentes", sets: 2, reps: "10 par jambe" },
                ],
              },
              { block_name: "Mobilité", exercises: [{ name: "Étirement", sets: 1, reps: "30s" }] },
            ],
          },
        ],
      },
    ],
  };
}

async function authenticate(id: string | null = owner) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
}

function save(id = next, program = fixture()) {
  return db.query<{ id: string }>("select public.save_generated_program($1, $2::jsonb) as id", [
    id,
    JSON.stringify({ ...program, user_id: owner, started_at: "2026-10-15" }),
  ]);
}

beforeAll(async () => {
  // Embedded, disposable PostgreSQL only: no Supabase/API/AI requests.
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function public.auth_user_id() returns uuid language sql stable as $$ select auth.uid(); $$;
    grant usage on schema public, auth to anon, authenticated;
    create table public.users(id uuid primary key);
    alter table public.users enable row level security;
    create policy users_own on public.users for all using (id = auth.uid()) with check (id = auth.uid());
    ${programTables}
    alter table public.programs add column started_at date;
    alter table public.programs enable row level security;
    alter table public.program_weeks enable row level security;
    alter table public.program_sessions enable row level security;
    alter table public.program_session_blocks enable row level security;
    alter table public.exercises enable row level security;
    ${programPolicies}
    grant select, insert, update, delete on all tables in schema public to authenticated;
    create function public.reject_fixture_activation() returns trigger language plpgsql as $$
    begin
      if new.is_active and new.summary = 'Reject activation' then
        raise exception 'Fixture activation failure';
      end if;
      return new;
    end;
    $$;
    create trigger reject_fixture_activation before update on public.programs
      for each row execute function public.reject_fixture_activation();
  `);
  await db.exec(migration);
  await db.exec(migration);
}, 30000);

beforeEach(async () => {
  await db.exec("reset role; truncate public.users cascade;");
  await db.query("insert into public.users(id) values ($1), ($2)", [owner, other]);
  await db.query(
    `insert into public.programs(id, user_id, duration_weeks, training_days_per_week, summary)
     values ($1, $2, 1, 1, 'Previous plan'), ($3, $4, 1, 1, 'Other account')`,
    [previous, owner, otherPrevious, other],
  );
  await authenticate();
});

afterAll(async () => {
  await db?.close();
});

test("the RPC stores ordered nested data and replaces only its owner's plan", async () => {
  expect((await save()).rows).toEqual([{ id: next }]);
  expect((await db.query("select id from public.programs where is_active")).rows).toEqual([
    { id: next },
  ]);
  expect(
    (await db.query("select name, reps, sort_order from public.exercises order by name")).rows,
  ).toEqual([
    { name: "Fentes", reps: "10 par jambe", sort_order: 1 },
    { name: "Squat", reps: "8", sort_order: 0 },
    { name: "Étirement", reps: "30s", sort_order: 0 },
  ]);
  const { rows } = await db.query(
    "select profile_snapshot, started_at::text, nutrition_water_l::text from public.programs where id = $1",
    [next],
  );
  expect(rows).toEqual([
    {
      profile_snapshot: { weight: 70, weeklyFrequency: 1 },
      started_at: "2026-10-15",
      nutrition_water_l: "2.5",
    },
  ]);
  await db.exec("reset role");
  expect(
    (await db.query("select is_active from public.programs where id = $1", [otherPrevious])).rows,
  ).toEqual([{ is_active: true }]);
});

for (const stage of ["exercise", "activation"] as const) {
  test(`a ${stage} failure rolls back all children and preserves the previous active plan`, async () => {
    const program = fixture();
    if (stage === "exercise") program.weeks[0].sessions[0].blocks[1].exercises[0].sets = 0;
    else program.program_overview.summary = "Reject activation";
    await expect(save(next, program)).rejects.toThrow();
    expect((await db.query("select id, is_active from public.programs")).rows).toEqual([
      { id: previous, is_active: true },
    ]);
    for (const table of [
      "program_weeks",
      "program_sessions",
      "program_session_blocks",
      "exercises",
    ])
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
  });
}

test("retrying a committed identifier preserves children and does not reactivate an older plan", async () => {
  await save();
  await db.exec("update public.program_sessions set completed_at = '2026-10-15T12:00:00Z'");
  const sessions = (await db.query("select id, completed_at from public.program_sessions")).rows;
  await save();
  expect((await db.query("select id, completed_at from public.program_sessions")).rows).toEqual(
    sessions,
  );
  await save(later);
  await save();
  expect((await db.query("select id from public.programs where is_active")).rows).toEqual([
    { id: later },
  ]);
  expect((await db.query("select * from public.program_weeks")).rows).toHaveLength(2);
});

test("queued retries and replacements keep exactly one active complete program", async () => {
  // PGlite queues statements on one connection; this checks repeated requests,
  // not contention between independent PostgreSQL connections.
  await Promise.all([save(), save(), save(later)]);
  expect((await db.query("select id from public.programs where is_active")).rows).toEqual([
    { id: later },
  ]);
  expect((await db.query("select * from public.program_sessions")).rows).toHaveLength(2);
});

test("ownership checks and RLS reject absent, mismatched and foreign identities", async () => {
  await authenticate(null);
  await expect(save()).rejects.toMatchObject({ code: "42501" });
  await authenticate(other);
  await expect(save()).rejects.toMatchObject({ code: "42501" });
  await authenticate("00000000-0000-0000-0000-000000000099");
  await expect(
    db.query("select public.save_generated_program($1, $2::jsonb)", [
      next,
      JSON.stringify(fixture()),
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  await authenticate();
  // A foreign row is hidden by RLS; its UUID cannot be stolen or overwritten.
  await expect(save(otherPrevious)).rejects.toMatchObject({ code: "23505" });
  await db.exec("reset role");
  expect((await db.query("select id, is_active from public.programs order by id")).rows).toEqual([
    { id: previous, is_active: true },
    { id: otherPrevious, is_active: true },
  ]);
});

test("anonymous callers cannot execute the invoker function", async () => {
  await db.exec("reset role");
  expect(
    (
      await db.query(`select p.prosecdef,
        has_function_privilege('anon', p.oid, 'execute') as anon,
        has_function_privilege('authenticated', p.oid, 'execute') as authenticated
        from pg_proc p where p.oid = 'public.save_generated_program(uuid,jsonb)'::regprocedure`)
    ).rows,
  ).toEqual([{ prosecdef: false, anon: false, authenticated: true }]);
  await db.exec("set role anon");
  await expect(save()).rejects.toMatchObject({ code: "42501" });
});
