import type { Page } from "@playwright/test";

export const id = "00000000-0000-0000-0000-000000000001";
const user = {
  id,
  email: "audit@example.test",
  role: "authenticated",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: { ai_consent_version: "2026-10-08", full_name: "Ethan Test" },
  created_at: "2026-01-01T00:00:00Z",
};

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const iso = (date: Date) => date.toLocaleDateString("en-CA");
const shift = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

type Objective = "yoga" | "running";

function profileFor(objective: Objective) {
  return {
    objective,
    goalDetail: objective === "yoga" ? "Souplesse globale" : "10 km en 1 heure",
    age: 30,
    gender: "homme",
    height: 180,
    weight: 70,
    level: "intermédiaire",
    weeklyFrequency: 4,
    sessionDuration: [45],
    equipment: [],
    likedExercises: [],
    dislikedExercises: [],
    availability: ["soir"],
    injuries: "",
    nutritionRestrictions: "",
  };
}

function exercisesFor(objective: Objective) {
  if (objective === "yoga")
    return [
      {
        name: "Posture du pigeon",
        sets: 2,
        reps: "45s",
        load_kg: "N/A",
        tempo: "4-4",
        rest_sec: 15,
        alternative: "Pigeon sur chaise",
        notes: "Garde le bassin à plat et respire profondément.",
      },
      {
        name: "Fente basse",
        sets: 1,
        reps: "8 respirations",
        load_kg: "N/A",
        tempo: "N/A",
        rest_sec: 0,
        notes: "Ouvre les hanches sans forcer.",
      },
      {
        name: "Chien tête en bas",
        sets: 1,
        reps: "30s",
        load_kg: "N/A",
        tempo: "N/A",
        rest_sec: 0,
      },
    ];
  return [
    {
      name: "Course en endurance",
      sets: 1,
      reps: "20 min",
      load_kg: "N/A",
      tempo: "N/A",
      rest_sec: 0,
      alternative: "Course facile",
      notes: "Reste à une allure confortable.",
    },
  ];
}

function programFor(objective: Objective) {
  const type = objective === "yoga" ? "Yoga" : "Endurance facile";
  const offsets = [0, 1, 3, 5];
  const start = shift(-3);
  const weeks = Array.from({ length: 8 }, (_, index) => index + 1).map((number) => ({
    week_number: number,
    focus:
      number % 2
        ? "Adaptation et mobilité des hanches"
        : "Montée progressive de l'intensité et des maintiens",
    program_sessions: offsets.map((offset, order) => {
      const date = new Date(start);
      date.setDate(date.getDate() + offset);
      return {
        day: WEEKDAYS[date.getDay()],
        session_label: `W${number}D${order + 1}`,
        type,
        duration_min: 45,
        intensity: order === 3 ? "Intense" : "Modérée",
        warmup: [{ name: "Respiration profonde", duration_sec: 120 }],
        cooldown: [{ name: "Relaxation finale", duration_sec: 300 }],
        completed_at: number === 1 && order === 1 ? new Date().toISOString() : null,
        sort_order: order,
        program_session_blocks: [
          {
            block_name: "Ouverture des hanches",
            sort_order: 0,
            exercises: exercisesFor(objective).map((exercise, i) => ({
              ...exercise,
              sort_order: i,
            })),
          },
          {
            block_name: "Étirements profonds",
            sort_order: 1,
            exercises: exercisesFor(objective)
              .slice(0, 1)
              .map((exercise) => ({
                ...exercise,
                name: `${exercise.name} (suite)`,
                sort_order: 0,
              })),
          },
        ],
      };
    }),
  }));
  return {
    id: "program-1",
    duration_weeks: 8,
    training_days_per_week: 4,
    summary:
      "Programme de huit semaines orienté souplesse globale : chaque semaine alterne maintiens longs, respirations guidées et travail d'ouverture des hanches, des épaules et de la chaîne postérieure pour gagner en amplitude progressivement et sans douleur.",
    general_advice:
      "Écoutez votre corps et respectez vos limites. Si vous ressentez une douleur, arrêtez.",
    legal_disclaimer: "Consultez un professionnel de santé si vous avez un doute.",
    started_at: iso(start),
    created_at: iso(start) + "T12:00:00Z",
    profile_snapshot: profileFor(objective),
    program_weeks: weeks,
  };
}

function freeSession(objective: Objective, uid: string, feedback?: "good") {
  const date = shift(uid === "libre-1" ? 0 : -2).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return {
    uid,
    date,
    goal: objective === "yoga" ? "Récupération hanches et dos" : "Endurance fondamentale",
    intensity: "Modérée",
    duration_min: 30,
    warmup: [{ name: "Marche active", duration_sec: 300 }],
    cooldown: [{ name: "Respiration", duration_sec: 120 }],
    motivation_message: "",
    notes: "Bonne séance.",
    feedback,
    blocks: [{ block_name: "Mobilité", exercises: exercisesFor(objective) }],
  };
}

export interface SetupOptions {
  theme: "light" | "dark";
  objective?: Objective;
  /** Pas de programme actif ni de séance libre. */
  empty?: boolean;
}

export async function setupApp(page: Page, options: SetupOptions) {
  const objective = options.objective ?? "yoga";
  const profile = profileFor(objective);
  const program = programFor(objective);
  const writes = { records: 0, profiles: 0, completions: 0 };
  await page.route("https://vincere-test.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/rpc/upsert_user"))
      body = { id, email: user.email, first_name: "Ethan", subscription: "free" };
    else if (path.startsWith("/auth/v1/user")) body = user;
    else if (path.endsWith("/users"))
      body = { id, email: user.email, first_name: "Ethan", subscription: "free" };
    else if (path.endsWith("/programs")) body = options.empty ? null : program;
    else if (path.endsWith("/program_weeks")) body = { id: "week-1" };
    else if (path.endsWith("/program_sessions") && request.method() !== "GET") {
      writes.completions += 1;
      body = {};
    } else if (path.endsWith("/user_profiles")) {
      if (request.method() === "POST") {
        writes.profiles += 1;
        await route.fulfill({ status: 500, json: { message: "Fixture save failure" } });
        return;
      }
      body = {
        user_id: id,
        objective: profile.objective,
        goal_detail: profile.goalDetail,
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.height,
        weight_kg: profile.weight,
        level: profile.level,
        weekly_frequency: profile.weeklyFrequency,
        session_duration: profile.sessionDuration,
        equipment: [],
        availability: profile.availability,
      };
    } else if (path.endsWith("/personal_records") && request.method() === "POST") {
      writes.records += 1;
      await route.fulfill({ status: 201, json: {} });
      return;
    } else if (path.endsWith("/onboarding_progress")) body = null;
    else if (path.includes("/functions/")) {
      await route.fulfill({ status: 503, json: { error: "Service momentanément indisponible." } });
      return;
    }
    await route.fulfill({ json: body });
  });
  const sessions = options.empty
    ? []
    : [freeSession(objective, "libre-1"), freeSession(objective, "libre-2", "good")];
  await page.addInitScript(
    ({ theme, id, user, profile, sessions, empty }) => {
      localStorage.setItem("vincere-theme-mode", theme);
      localStorage.setItem(
        "sb-vincere-test-auth-token",
        JSON.stringify({
          access_token: "fixture-access-token",
          refresh_token: "fixture-refresh-token",
          expires_at: 4102444800,
          token_type: "bearer",
          user,
        }),
      );
      localStorage.setItem(
        `Vincere_state_${id}`,
        JSON.stringify({
          profile,
          program: null,
          programStartDate: null,
          sessions,
          records: empty
            ? []
            : [
                {
                  id: "squat",
                  name: "Squat",
                  category: "force",
                  date: "2026-10-12",
                  weight_kg: 70,
                  reps: 5,
                },
              ],
          onboardingStep: 0,
        }),
      );
    },
    { theme: options.theme, id, user, profile, sessions, empty: Boolean(options.empty) },
  );
  return { writes, profile, program };
}
