import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";

let db: PGlite;
const migration = readFileSync(
  new URL("../migrations/20261008085025_app_store_account_deletion.sql", import.meta.url),
  "utf8",
);
beforeAll(async () => {
  db = new PGlite();
  // Minimal pre-migration schema: no live Supabase project is used by this test.
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create table public.users (id uuid primary key);
    create table public.contact (id int primary key, user_id uuid references public.users(id) on delete set null);
    create table public.programs (id int primary key, user_id uuid references public.users(id) on delete cascade);
    create table public.program_weeks (id int primary key, program_id int references public.programs(id) on delete cascade);
    insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
    insert into public.users select id from auth.users;
    insert into public.contact values (1, '00000000-0000-0000-0000-000000000001'), (2, '00000000-0000-0000-0000-000000000002'), (3, null);
    insert into public.programs values (1, '00000000-0000-0000-0000-000000000001'), (2, '00000000-0000-0000-0000-000000000002');
    insert into public.program_weeks values (1, 1), (2, 2);
  `);
  await db.exec(migration);
}, 30000);
afterAll(async () => {
  await db?.close();
});

test("readiness is true only with both validated cascading constraints", async () => {
  const { rows } = await db.query("select public.account_deletion_ready() as ready");
  expect(rows).toEqual([{ ready: true }]);
});
test("only service_role can invoke the deletion readiness function", async () => {
  const { rows } = await db.query(`select
    has_function_privilege('anon', 'public.account_deletion_ready()', 'execute') as anon,
    has_function_privilege('authenticated', 'public.account_deletion_ready()', 'execute') as authenticated,
    has_function_privilege('service_role', 'public.account_deletion_ready()', 'execute') as service`);
  expect(rows).toEqual([{ anon: false, authenticated: false, service: true }]);
});
test("Auth deletion cascades to the account, support and nested training data only", async () => {
  await db.query("delete from auth.users where id = $1", ["00000000-0000-0000-0000-000000000001"]);
  expect((await db.query("select id from public.users")).rows).toEqual([
    { id: "00000000-0000-0000-0000-000000000002" },
  ]);
  expect((await db.query("select id from public.program_weeks")).rows).toEqual([{ id: 2 }]);
  expect((await db.query("select id from public.contact order by id")).rows).toEqual([
    { id: 2 },
    { id: 3 },
  ]);
});
test("a stale access token cannot recreate a deleted public account", async () => {
  await expect(
    db.query("insert into public.users values ($1)", ["00000000-0000-0000-0000-000000000001"]),
  ).rejects.toMatchObject({ code: "23503" });
});
