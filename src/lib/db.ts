/**
 * db.ts — Toutes les fonctions d'accès Supabase pour Vincere
 *
 * Chaque fonction accepte un `SupabaseClient` authentifié en premier argument
 * (obtenu via `useSupabaseClient()` ou `getSupabaseClient(token)`).
 *
 * Les erreurs sont propagées (throw) — à gérer avec try/catch côté appelant.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UserProfile,
  Program,
  DailySession,
  Week,
  Session,
  SessionBlock,
  Exercise,
  WarmupItem,
  PersonalRecord,
  RecordCategory,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES LOCAUX (rows DB)
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "free" | "premium" | "cancelled";
export type FeedbackValue = "good" | "normal" | "hard";

export interface DbUser {
  id: string;
  email: string;
  first_name: string | null;
  subscription: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
}

export interface OnboardingProgress {
  step: number;
  isComplete: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/** État complet chargé depuis Supabase au démarrage de l'app */
export interface RemoteAppState {
  profile: UserProfile | null;
  program: Program | null;
  programStartDate: string | null;
  sessions: DailySession[];
  onboardingStep: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS  DB ↔ App
// ─────────────────────────────────────────────────────────────────────────────

function dbRowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    objective: row.objective as UserProfile["objective"],
    gender: row.gender as UserProfile["gender"],
    age: row.age as number,
    height: row.height_cm as number,
    weight: row.weight_kg as number,
    level: row.level as UserProfile["level"],
    weeklyFrequency: row.weekly_frequency as number,
    sessionDuration: (row.session_duration as number[]) ?? [],
    equipment: (row.equipment as string[]) ?? [],
    likedExercises: (row.liked_exercises as string[]) ?? [],
    dislikedExercises: (row.disliked_exercises as string[]) ?? [],
    availability: (row.availability as UserProfile["availability"]) ?? [],
    injuries: (row.injuries as string) ?? "",
    nutritionRestrictions: (row.nutrition_restrictions as string) ?? "",
    targetWeight: row.target_weight_kg as number | undefined,
    targetDate: row.target_date as string | undefined,
  };
}

function profileToDbRow(userId: string, p: UserProfile) {
  return {
    user_id: userId,
    objective: p.objective,
    gender: p.gender,
    age: p.age,
    height_cm: p.height,
    weight_kg: p.weight,
    level: p.level,
    weekly_frequency: p.weeklyFrequency,
    session_duration: p.sessionDuration,
    equipment: p.equipment,
    liked_exercises: p.likedExercises,
    disliked_exercises: p.dislikedExercises,
    availability: p.availability,
    injuries: p.injuries || null,
    nutrition_restrictions: p.nutritionRestrictions || null,
    target_weight_kg: p.targetWeight ?? null,
    target_date: p.targetDate ?? null,
  };
}

function dbRowToExercise(e: Record<string, unknown>): Exercise {
  return {
    name: e.name as string,
    sets: e.sets as number,
    reps: e.reps as string,
    load_kg: e.load_kg as string | undefined,
    tempo: e.tempo as string | undefined,
    rest_sec: e.rest_sec as number | undefined,
    alternative: e.alternative as string | undefined,
    notes: e.notes as string | undefined,
  };
}

function dbRowToBlock(b: Record<string, unknown>, exerciseKey: string): SessionBlock {
  return {
    block_name: b.block_name as string,
    exercises: ((b[exerciseKey] as Record<string, unknown>[]) ?? [])
      .sort((a, z) => (a.sort_order as number) - (z.sort_order as number))
      .map(dbRowToExercise),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function assertOk<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) throw new Error(`[db/${context}] ${error.message}`);
  if (data === null) throw new Error(`[db/${context}] Aucune donnée retournée`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée ou met à jour l'utilisateur dans la table `users`.
 * L'id est le même UUID que auth.uid() (Supabase Auth).
 */
export async function upsertUser(
  client: SupabaseClient,
  data: { userId: string; email: string; firstName?: string | null },
): Promise<DbUser> {
  const { data: row, error } = await client.rpc("upsert_user", {
    p_user_id: data.userId,
    p_email: data.email,
    p_first_name: data.firstName ?? null,
  });

  return assertOk(row, error, "upsertUser") as DbUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde (créé ou met à jour) le profil utilisateur.
 * Utilisé à la fin de l'onboarding et depuis la page Profil (Settings).
 */
export async function saveProfile(
  client: SupabaseClient,
  internalUserId: string,
  profile: UserProfile,
): Promise<void> {
  const { error } = await client
    .from("user_profiles")
    .upsert(profileToDbRow(internalUserId, profile), { onConflict: "user_id" });

  if (error) throw new Error(`[db/saveProfile] ${error.message}`);
}

/**
 * Charge le profil de l'utilisateur.
 * Retourne null si aucun profil n'a encore été créé.
 */
export async function getProfile(
  client: SupabaseClient,
  internalUserId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from("user_profiles")
    .select("*")
    .eq("user_id", internalUserId)
    .maybeSingle();

  if (error) throw new Error(`[db/getProfile] ${error.message}`);
  if (!data) return null;

  return dbRowToProfile(data as Record<string, unknown>);
}

/**
 * Supprime le profil de l'utilisateur (remise à zéro depuis Settings).
 */
export async function deleteProfile(client: SupabaseClient, internalUserId: string): Promise<void> {
  const { error } = await client.from("user_profiles").delete().eq("user_id", internalUserId);

  if (error) throw new Error(`[db/deleteProfile] ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde un programme complet généré par l'IA.
 * 1. Désactive l'éventuel programme actif précédent
 * 2. Insère le programme + semaines + séances + blocs + exercices
 * Retourne l'UUID du nouveau programme.
 */
export async function saveProgram(
  client: SupabaseClient,
  internalUserId: string,
  program: Program,
): Promise<string> {
  // 1. Désactiver le programme actif précédent
  await client
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", internalUserId)
    .eq("is_active", true);

  // 2. Insérer le programme principal
  const { data: progRow, error: progErr } = await client
    .from("programs")
    .insert({
      user_id: internalUserId,
      duration_weeks: program.program_overview.duration_weeks,
      training_days_per_week: program.program_overview.training_days_per_week,
      summary: program.program_overview.summary,
      agent_used: program.program_overview.agent_used ?? null,
      general_advice: program.general_advice ?? null,
      legal_disclaimer: program.legal_disclaimer ?? null,
      nutrition_daily_calories: program.nutrition_recommendations?.daily_calories_estimate ?? null,
      nutrition_protein_g: program.nutrition_recommendations?.protein_target_g ?? null,
      nutrition_water_l: program.nutrition_recommendations?.water_intake_l ?? null,
      nutrition_notes: program.nutrition_recommendations?.notes ?? null,
      is_active: true,
      started_at: new Date().toISOString().split("T")[0],
      profile_snapshot: program.user_profile ?? null,
    })
    .select("id")
    .single();

  const prog = assertOk(progRow, progErr, "saveProgram");
  const programId = (prog as { id: string }).id;

  // 3. Insérer les semaines
  for (const week of program.weeks) {
    const { data: weekRow, error: weekErr } = await client
      .from("program_weeks")
      .insert({ program_id: programId, week_number: week.week_number, focus: week.focus })
      .select("id")
      .single();

    const wk = assertOk(weekRow, weekErr, "saveProgram/week");
    const weekId = (wk as { id: string }).id;

    // 4. Insérer les séances de la semaine
    for (const [si, session] of week.sessions.entries()) {
      const { data: sessRow, error: sessErr } = await client
        .from("program_sessions")
        .insert({
          week_id: weekId,
          day: session.day,
          session_label: session.session_id,
          type: session.type,
          duration_min: session.duration_min,
          intensity: session.intensity,
          warmup: session.warmup,
          cooldown: session.cooldown,
          notes: session.notes ?? null,
          sort_order: si,
        })
        .select("id")
        .single();

      const sess = assertOk(sessRow, sessErr, "saveProgram/session");
      const sessionId = (sess as { id: string }).id;

      // 5. Insérer les blocs
      for (const [bi, block] of session.blocks.entries()) {
        const { data: blockRow, error: blockErr } = await client
          .from("program_session_blocks")
          .insert({ session_id: sessionId, block_name: block.block_name, sort_order: bi })
          .select("id")
          .single();

        const blk = assertOk(blockRow, blockErr, "saveProgram/block");
        const blockId = (blk as { id: string }).id;

        // 6. Insérer les exercices du bloc
        if (block.exercises.length > 0) {
          const exercises = block.exercises.map((ex, ei) => ({
            block_id: blockId,
            name: ex.name,
            sets: ex.sets,
            reps: String(ex.reps),
            load_kg: ex.load_kg ?? null,
            tempo: ex.tempo ?? null,
            rest_sec: ex.rest_sec ?? null,
            alternative: ex.alternative ?? null,
            notes: ex.notes ?? null,
            sort_order: ei,
          }));

          const { error: exErr } = await client.from("exercises").insert(exercises);
          if (exErr) throw new Error(`[db/saveProgram/exercises] ${exErr.message}`);
        }
      }
    }
  }

  return programId;
}

/**
 * Charge le programme actif de l'utilisateur avec toutes les données imbriquées.
 * Retourne null si aucun programme actif.
 */
export async function deactivateProgram(
  client: SupabaseClient,
  internalUserId: string,
): Promise<void> {
  const { error } = await client
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", internalUserId)
    .eq("is_active", true);
  if (error) throw new Error(`[db/deactivateProgram] ${error.message}`);
}

/**
 * Retourne null si aucun programme actif.
 */
export async function getActiveProgram(
  client: SupabaseClient,
  internalUserId: string,
): Promise<{ program: Program; startedAt: string | null } | null> {
  const { data, error } = await client
    .from("programs")
    .select(`
      *,
      program_weeks (
        *,
        program_sessions (
          *,
          program_session_blocks (
            *,
            exercises ( * )
          )
        )
      )
    `)
    .eq("user_id", internalUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`[db/getActiveProgram] ${error.message}`);
  if (!data) return null;

  // Reconstruire l'objet Program depuis la structure DB
  const row = data as Record<string, unknown>;

  const weeks = ((row.program_weeks as Record<string, unknown>[]) ?? [])
    .sort((a, b) => (a.week_number as number) - (b.week_number as number))
    .map(
      (w): Week => ({
        week_number: w.week_number as number,
        focus: w.focus as string,
        sessions: ((w.program_sessions as Record<string, unknown>[]) ?? [])
          .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
          .map(
            (s): Session => ({
              day: s.day as string,
              session_id: s.session_label as string,
              type: s.type as string,
              duration_min: s.duration_min as number,
              intensity: s.intensity as string,
              warmup: (s.warmup as WarmupItem[]) ?? [],
              cooldown: (s.cooldown as WarmupItem[]) ?? [],
              notes: s.notes as string | undefined,
              blocks: ((s.program_session_blocks as Record<string, unknown>[]) ?? [])
                .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
                .map((b) => dbRowToBlock(b, "exercises")),
            }),
          ),
      }),
    );

  return {
    startedAt: (row.started_at as string | null) ?? null,
    program: {
      program_overview: {
        duration_weeks: row.duration_weeks as number,
        training_days_per_week: row.training_days_per_week as number,
        summary: row.summary as string,
        agent_used: row.agent_used as string | undefined,
      },
      weeks,
      nutrition_recommendations: row.nutrition_daily_calories
        ? {
            daily_calories_estimate: row.nutrition_daily_calories as number,
            protein_target_g: row.nutrition_protein_g as number,
            water_intake_l: row.nutrition_water_l as number,
            notes: (row.nutrition_notes as string) ?? "",
          }
        : undefined,
      general_advice: row.general_advice as string | undefined,
      legal_disclaimer: row.legal_disclaimer as string | undefined,
      user_profile: row.profile_snapshot as Partial<UserProfile> | undefined,
    },
  };
}

/**
 * Supprime tous les programmes de l'utilisateur (remise à zéro).
 */
export async function deleteAllPrograms(
  client: SupabaseClient,
  internalUserId: string,
): Promise<void> {
  const { error } = await client.from("programs").delete().eq("user_id", internalUserId);

  if (error) throw new Error(`[db/deleteAllPrograms] ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde une séance quotidienne générée par l'IA.
 * Chaque séance possède un UUID unique (session.uid) utilisé comme id DB.
 * Plusieurs séances par jour sont autorisées.
 */
export async function saveDailySession(
  client: SupabaseClient,
  internalUserId: string,
  session: DailySession,
): Promise<void> {
  // Insérer la séance en utilisant le uid local comme id DB
  const { data: sessRow, error: sessErr } = await client
    .from("daily_sessions")
    .insert({
      id: session.uid,
      user_id: internalUserId,
      session_date: new Date().toISOString().split("T")[0],
      session_date_label: session.date,
      intensity: session.intensity,
      goal: session.goal,
      duration_min: session.duration_min,
      motivation_message: session.motivation_message ?? null,
      feedback: session.feedback ?? null,
      warmup: session.warmup,
      cooldown: session.cooldown,
    })
    .select("id")
    .single();

  const sess = assertOk(sessRow, sessErr, "saveDailySession");
  const sessionId = (sess as { id: string }).id;

  // Insérer les blocs
  for (const [bi, block] of session.blocks.entries()) {
    const { data: blockRow, error: blockErr } = await client
      .from("daily_session_blocks")
      .insert({ session_id: sessionId, block_name: block.block_name, sort_order: bi })
      .select("id")
      .single();

    const blk = assertOk(blockRow, blockErr, "saveDailySession/block");
    const blockId = (blk as { id: string }).id;

    if (block.exercises.length > 0) {
      const exercises = block.exercises.map((ex, ei) => ({
        block_id: blockId,
        name: ex.name,
        sets: ex.sets,
        reps: String(ex.reps),
        load_kg: ex.load_kg ?? null,
        tempo: ex.tempo ?? null,
        rest_sec: ex.rest_sec ?? null,
        alternative: ex.alternative ?? null,
        notes: ex.notes ?? null,
        sort_order: ei,
      }));

      const { error: exErr } = await client.from("daily_session_exercises").insert(exercises);

      if (exErr) throw new Error(`[db/saveDailySession/exercises] ${exErr.message}`);
    }
  }
}

/**
 * Charge toutes les séances quotidiennes de l'utilisateur.
 * Retourne les séances ordonnées par date décroissante.
 */
export async function getDailySessions(
  client: SupabaseClient,
  internalUserId: string,
  limit = 30,
): Promise<DailySession[]> {
  const { data, error } = await client
    .from("daily_sessions")
    .select(`
      *,
      daily_session_blocks (
        *,
        daily_session_exercises ( * )
      )
    `)
    .eq("user_id", internalUserId)
    .order("session_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[db/getDailySessions] ${error.message}`);
  if (!data) return [];

  return (data as Record<string, unknown>[]).map(
    (row): DailySession => ({
      uid: row.id as string,
      date: row.session_date_label as string,
      intensity: row.intensity as string,
      goal: row.goal as string,
      duration_min: row.duration_min as number,
      motivation_message: (row.motivation_message as string) ?? "",
      feedback: row.feedback as DailySession["feedback"],
      warmup: (row.warmup as WarmupItem[]) ?? [],
      cooldown: (row.cooldown as WarmupItem[]) ?? [],
      blocks: ((row.daily_session_blocks as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map((b) => dbRowToBlock(b, "daily_session_exercises")),
    }),
  );
}

/**
 * Met à jour le feedback d'une séance identifiée par son uid (= id DB UUID).
 */
export async function updateSessionFeedback(
  client: SupabaseClient,
  internalUserId: string,
  sessionUid: string,
  feedback: "good" | "normal" | "hard",
): Promise<void> {
  const { error } = await client
    .from("daily_sessions")
    .update({ feedback })
    .eq("user_id", internalUserId)
    .eq("id", sessionUid);

  if (error) throw new Error(`[db/updateSessionFeedback] ${error.message}`);
}

/**
 * Supprime toutes les séances quotidiennes (remise à zéro).
 */
export async function deleteAllDailySessions(
  client: SupabaseClient,
  internalUserId: string,
): Promise<void> {
  const { error } = await client.from("daily_sessions").delete().eq("user_id", internalUserId);

  if (error) throw new Error(`[db/deleteAllDailySessions] ${error.message}`);
}

/**
 * Supprime une séance quotidienne par son uid.
 */
export async function deleteDailySession(
  client: SupabaseClient,
  internalUserId: string,
  sessionUid: string,
): Promise<void> {
  const { error } = await client
    .from("daily_sessions")
    .delete()
    .eq("user_id", internalUserId)
    .eq("id", sessionUid);

  if (error) throw new Error(`[db/deleteDailySession] ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde l'étape courante de l'onboarding (0 à 12).
 */
export async function saveOnboardingStep(
  client: SupabaseClient,
  internalUserId: string,
  step: number,
): Promise<void> {
  const { error } = await client
    .from("onboarding_progress")
    .upsert(
      { user_id: internalUserId, current_step: step, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) throw new Error(`[db/saveOnboardingStep] ${error.message}`);
}

/**
 * Marque l'onboarding comme terminé et réinitialise le step à 0.
 */
export async function completeOnboarding(
  client: SupabaseClient,
  internalUserId: string,
): Promise<void> {
  const { error } = await client.from("onboarding_progress").upsert(
    {
      user_id: internalUserId,
      current_step: 0,
      is_complete: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`[db/completeOnboarding] ${error.message}`);
}

/**
 * Charge la progression de l'onboarding.
 * Retourne null si l'onboarding n'a jamais été commencé.
 */
export async function getOnboardingProgress(
  client: SupabaseClient,
  internalUserId: string,
): Promise<OnboardingProgress | null> {
  const { data, error } = await client
    .from("onboarding_progress")
    .select("current_step, is_complete")
    .eq("user_id", internalUserId)
    .maybeSingle();

  if (error) throw new Error(`[db/getOnboardingProgress] ${error.message}`);
  if (!data) return null;

  const row = data as { current_step: number; is_complete: boolean };
  return { step: row.current_step, isComplete: row.is_complete };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge le statut d'abonnement de l'utilisateur.
 */
export async function getSubscription(
  client: SupabaseClient,
  internalUserId: string,
): Promise<SubscriptionInfo> {
  const { data } = await client
    .from("subscriptions")
    .select("status, current_period_end, cancelled_at")
    .eq("user_id", internalUserId)
    .maybeSingle();

  if (!data) return { status: "free", currentPeriodEnd: null, cancelledAt: null };

  const row = data as {
    status: SubscriptionStatus;
    current_period_end: string | null;
    cancelled_at: string | null;
  };

  return {
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde un message du ChatWidget.
 */
export async function saveChatMessage(
  client: SupabaseClient,
  internalUserId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const { error } = await client
    .from("chat_messages")
    .insert({ user_id: internalUserId, role, content });

  if (error) throw new Error(`[db/saveChatMessage] ${error.message}`);
}

/**
 * Charge l'historique du chat (les N derniers messages, ordre chronologique).
 */
export async function getChatHistory(
  client: SupabaseClient,
  internalUserId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", internalUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[db/getChatHistory] ${error.message}`);
  if (!data) return [];

  return (data as Record<string, unknown>[]).reverse().map((row) => ({
    id: row.id as string,
    role: row.role as "user" | "assistant",
    content: row.content as string,
    createdAt: row.created_at as string,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARGEMENT GLOBAL — hydratation initiale de l'app
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge tout l'état de l'app depuis Supabase en parallèle.
 * À appeler une fois après la connexion pour remplacer / fusionner le localStorage.
 */
export async function loadAppState(
  client: SupabaseClient,
  internalUserId: string,
): Promise<RemoteAppState> {
  const [profile, result, sessions, onboarding] = await Promise.all([
    getProfile(client, internalUserId),
    getActiveProgram(client, internalUserId),
    getDailySessions(client, internalUserId),
    getOnboardingProgress(client, internalUserId),
  ]);

  return {
    profile,
    program: result?.program ?? null,
    programStartDate: result?.startedAt ?? null,
    sessions,
    onboardingStep: onboarding?.step ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL RECORDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insère un record personnel.
 */
export async function saveRecord(
  client: SupabaseClient,
  internalUserId: string,
  record: PersonalRecord,
): Promise<void> {
  const { error } = await client.from("personal_records").insert({
    id: record.id,
    user_id: internalUserId,
    name: record.name,
    category: record.category,
    record_date: record.date,
    weight_kg: record.weight_kg ?? null,
    reps: record.reps ?? null,
    distance_km: record.distance_km ?? null,
    time_min: record.time_min ?? null,
    notes: record.notes ?? null,
  });
  if (error) throw new Error(`[db/saveRecord] ${error.message}`);
}

/**
 * Supprime un record personnel par son id.
 */
export async function deleteRecord(
  client: SupabaseClient,
  internalUserId: string,
  recordId: string,
): Promise<void> {
  const { error } = await client
    .from("personal_records")
    .delete()
    .eq("id", recordId)
    .eq("user_id", internalUserId);
  if (error) throw new Error(`[db/deleteRecord] ${error.message}`);
}

/**
 * Charge tous les records personnels de l'utilisateur.
 */
export async function getRecords(
  client: SupabaseClient,
  internalUserId: string,
): Promise<PersonalRecord[]> {
  const { data, error } = await client
    .from("personal_records")
    .select("*")
    .eq("user_id", internalUserId)
    .order("record_date", { ascending: false });
  if (error) throw new Error(`[db/getRecords] ${error.message}`);
  if (!data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    category: row.category as RecordCategory,
    date: row.record_date as string,
    weight_kg: row.weight_kg === null ? undefined : Number(row.weight_kg),
    reps: row.reps === null ? undefined : Number(row.reps),
    distance_km: row.distance_km === null ? undefined : Number(row.distance_km),
    time_min: row.time_min === null ? undefined : Number(row.time_min),
    notes: row.notes as string | undefined,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// REMISE À ZÉRO COMPLÈTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supprime toutes les données utilisateur (profil, programme, séances).
 * Utilisé depuis Settings → "Réinitialiser".
 */
export async function resetUserData(client: SupabaseClient, internalUserId: string): Promise<void> {
  await Promise.all([
    deleteProfile(client, internalUserId),
    deleteAllPrograms(client, internalUserId),
    deleteAllDailySessions(client, internalUserId),
  ]);

  // Réinitialiser la progression de l'onboarding
  const { error } = await client.from("onboarding_progress").upsert(
    {
      user_id: internalUserId,
      current_step: 0,
      is_complete: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`[db/resetUserData] ${error.message}`);
}
