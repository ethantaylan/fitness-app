import { expect, test } from "vite-plus/test";
import { PGlite } from "@electric-sql/pglite";
import migration from "../../supabase/migrations/20261109103047_free_progression_and_health_links.sql?raw";
const owner = "00000000-0000-0000-0000-000000000001",
  other = "00000000-0000-0000-0000-000000000002",
  program = "00000000-0000-0000-0000-000000000010";
test(
  "database enforces progression, atomic health deduplication, scoped reset and isolation",
  { timeout: 20000 },
  async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${other}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;
 create table public.programs(id uuid primary key,user_id uuid);create table public.program_weeks(id uuid primary key,program_id uuid,week_number integer);
 create table public.program_sessions(id uuid primary key default gen_random_uuid(),week_id uuid,session_label text,completed_at timestamptz);
 grant select,update on public.programs,public.program_weeks,public.program_sessions to authenticated;
 insert into public.programs values('${program}','${owner}');
 insert into public.program_weeks select ('00000000-0000-0000-0000-00000000002'||n)::uuid,'${program}',n from generate_series(1,3)n;
 insert into public.program_sessions(week_id,session_label) select id,'W'||week_number||'D'||n from public.program_weeks cross join generate_series(1,2)n;
 alter table public.programs enable row level security;create policy own_programs on public.programs to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());`);
      await db.exec(migration);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
      await db.exec("set role authenticated");
      await expect(
        db.exec("update public.program_sessions set completed_at=now() where session_label='W2D1'"),
      ).rejects.toThrow("Termine les semaines");
      await db.exec(
        "update public.program_sessions set completed_at=now() where session_label in ('W1D1','W1D2')",
      );
      async function link(label: string, id: string, week = 2) {
        return db.query(
          "select public.link_health_activity($1,$2,$3,'apple_health',$4,now()-interval '30 minutes',now())",
          [program, week, label, id],
        );
      }
      await link("W2D1", "health-one");
      await link("W2D1", "health-one");
      await expect(link("W2D2", "health-one")).rejects.toThrow("déjà associée");
      expect((await db.query("select * from public.health_activity_links")).rows).toHaveLength(1);
      await expect(link("W3D1", "health-three", 3)).rejects.toThrow("Termine les semaines");
      expect((await db.query("select * from public.health_activity_links")).rows).toHaveLength(1);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
      expect((await db.query("select * from public.health_activity_links")).rows).toHaveLength(0);
      await expect(
        db.query("select public.reset_program_weeks($1,2,true)", [program]),
      ).rejects.toThrow("Semaine inaccessible");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
      await db.query("select public.reset_program_weeks($1,2,true)", [program]);
      expect((await db.query("select * from public.health_activity_links")).rows).toHaveLength(0);
      expect(
        (await db.query("select * from public.program_sessions where completed_at is not null"))
          .rows,
      ).toHaveLength(2);
      await link("W2D1", "health-one");
      await db.exec(
        "update public.program_sessions set completed_at=null where session_label='W2D1'",
      );
      expect((await db.query("select * from public.health_activity_links")).rows).toHaveLength(0);
      await db.query("select public.reset_program_weeks($1,1,true)", [program]);
      expect(
        (await db.query("select * from public.program_sessions where completed_at is not null"))
          .rows,
      ).toHaveLength(0);
    } finally {
      await db.close();
    }
  },
);
