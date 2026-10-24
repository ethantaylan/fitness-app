import { expect, test } from "vite-plus/test";
import { PGlite } from "@electric-sql/pglite";
import automatic from "../../supabase/migrations/20261024165536_exercise_demo_automatic_generation.sql?raw";
import migration from "../../supabase/migrations/20261024154903_exercise_demo_library.sql?raw";

const owner = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
test(
  "shared queue deduplicates accounts, hides drafts, enforces ownership and never overwrites published media",
  { timeout: 20000 },
  async () => {
    const db = new PGlite();
    try {
      await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema ai_private; create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${owner}'), ('${other}');
      create table public.users(id uuid primary key);
      insert into public.users select id from auth.users;
      grant select(id), update(id) on public.users to service_role;
      grant usage on schema ai_private, public to service_role;
      create table public.programs(id int, user_id uuid);
      create table public.program_weeks(id int, program_id int);
      create table public.program_sessions(id int, week_id int);
      create table public.program_session_blocks(id int, session_id int);
      create table public.exercises(id int, block_id int, name text);
      create table public.daily_sessions(id int, user_id uuid);
      create table public.daily_session_blocks(id int, session_id int);
      create table public.daily_session_exercises(id int, block_id int, name text);
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text, name text);
      insert into public.programs values (1,'${owner}'), (2,'${other}');
      insert into public.program_weeks values (1,1), (2,2);
      insert into public.program_sessions values (1,1), (2,2);
      insert into public.program_session_blocks values (1,1), (2,2);
      insert into public.exercises values (1,1,'Squat au poids du corps'), (2,2,'Squat au poids du corps');
    `);
      await db.exec(migration);
      await db.exec(automatic);
      async function request(
        user = owner,
        key = "squat au poids du corps",
        name = "Squat au poids du corps",
        enqueue = true,
      ) {
        const { rows } = await db.query<{
          value: { status: string; guide?: unknown; assetPath?: string };
        }>("select public.exercise_demo_request($1,$2,$3,$4) as value", [user, key, name, enqueue]);
        return rows[0].value;
      }
      await db.exec("set role service_role");
      expect((await request()).status).toBe("pending");
      expect((await request(other)).status).toBe("pending");
      expect((await request()).status).toBe("pending");
      expect(
        (
          await db.query(
            "select * from ai_private.exercise_demos where key='squat au poids du corps'",
          )
        ).rows,
      ).toHaveLength(1);
      await expect(request(other, "secret", "Exercice non enregistré")).rejects.toThrow(
        "Exercise unavailable",
      );
      expect((await request(owner, "missing", "Exercice non enregistré", false)).status).toBe(
        "missing",
      );
      await db.exec("reset role; set role authenticated");
      await expect(
        db.query("select public.exercise_demo_request($1,'test','test',true)", [owner]),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from ai_private.exercise_demos")).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.query("select public.exercise_demo_admin('list')")).rejects.toThrow(
        /permission denied/,
      );
      await db.exec("reset role");
      const metadata = {
        title: "Squat au poids du corps",
        steps: ["Ancre les pieds.", "Fléchis les jambes.", "Redresse-toi."],
        mistake: "Ne décolle pas les talons.",
        file: "demo.webp",
      };
      await db.query(
        "select public.exercise_demo_admin('stage','squat au poids du corps',$1::jsonb)",
        [JSON.stringify(metadata)],
      );
      expect(await request()).toEqual({ status: "pending" });
      await expect(
        db.query("select public.exercise_demo_admin('approve','squat au poids du corps')"),
      ).rejects.toThrow("Media unavailable");
      await db.exec(
        "insert into storage.objects select 'exercise-demo-library',asset_path from ai_private.exercise_demos where key='squat au poids du corps'",
      );
      await db.exec("select public.exercise_demo_admin('approve','squat au poids du corps')");
      expect((await request(other)).status).toBe("ready");
      await db.query(
        "select public.exercise_demo_admin('alias','squat au poids du corps',null,array['bodyweight squat'])",
      );
      expect((await request(other, "bodyweight squat", "Bodyweight squat")).status).toBe("ready");
      await expect(
        db.query("select public.exercise_demo_admin('stage','squat au poids du corps',$1::jsonb)", [
          JSON.stringify(metadata),
        ]),
      ).rejects.toThrow("Already published");
      await expect(
        db.exec("select public.exercise_demo_admin('reject','squat au poids du corps')"),
      ).rejects.toThrow("Published asset is immutable");
      expect(
        (await request(owner, "developpe couche halteres", "Développé couché haltères")).status,
      ).toBe("ready");
      await db.exec("insert into public.exercises values (3,1,'Burpees'), (4,2,'Burpees')");
      await request(owner, "burpees", "Burpees");
      async function claim(user: string) {
        return (
          await db.query<{ value: { claimed: boolean; id: string; token: string } }>(
            "select public.exercise_demo_claim($1,'burpees','Burpees') as value",
            [user],
          )
        ).rows[0].value;
      }
      const first = await claim(owner);
      expect(first.claimed).toBe(true);
      const second = await claim(other);
      expect(second.claimed).toBe(false);
      expect(second.token).toBe(first.token);
      await db.query(
        "select public.exercise_demo_generated('burpees',$1,'generation_interrupted')",
        [first.token],
      );
      expect((await request(other, "burpees", "Burpees")).status).toBe("unavailable");
      expect((await claim(other)).claimed).toBe(false);
      await db.query("insert into storage.objects values ('exercise-demo-library',$1)", [
        `${first.id}/generated.png`,
      ]);
      await db.query("select public.exercise_demo_generated('burpees',$1)", [first.token]);
      const generated = await request(other, "burpees", "Burpees");
      expect(generated.status).toBe("ready");
      expect(generated.guide).toMatchObject({ reviewed: false });
      expect(await claim(owner)).toBeNull();
      expect(
        (await db.query("select reviewed_at from ai_private.exercise_demos where key='burpees'"))
          .rows[0],
      ).toEqual({ reviewed_at: null });
      await db.query("delete from auth.users where id=$1", [owner]);
      expect((await request(other)).status).toBe("ready");
    } finally {
      await db.close();
    }
  },
);
