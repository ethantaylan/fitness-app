import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { UserProfile, Program, DailySession, Exercise, PersonalRecord } from "./types";
import { supabase } from "./supabase";
import {
  upsertUser,
  getProfile,
  saveProfile,
  getActiveProgram,
  saveProgram as dbSaveProgram,
  deactivateProgram as dbClearProgram,
  updateProgramSessionCompletion as dbUpdateProgramSessionCompletion,
  getDailySessions,
  saveDailySession as dbSaveSession,
  updateSessionFeedback as dbUpdateFeedback,
  updateSessionNotes as dbUpdateSessionNotes,
  deleteDailySession as dbDeleteSession,
  getOnboardingProgress,
  saveOnboardingStep,
  saveRecord as dbSaveRecord,
  deleteRecord as dbDeleteRecord,
  getRecords as dbGetRecords,
} from "./db";

interface AppState {
  profile: Partial<UserProfile> | null;
  program: Program | null;
  programStartDate: string | null;
  sessions: DailySession[];
  records: PersonalRecord[];
  onboardingStep: number;
  /** true une fois l'hydratation Supabase terminée (ou si pas de client) */
  _hydrated: boolean;
  _loadError?: string | null;
}

function reportSyncError(error?: unknown) {
  console.warn("[store] Synchronisation distante échouée", error);
  window.dispatchEvent(new Event("app-sync-error"));
}

type Action =
  | { type: "SET_PROFILE_PARTIAL"; data: Partial<UserProfile> }
  | { type: "SET_PROGRAM"; program: Program }
  | {
      type: "SET_PROGRAM_SESSION_COMPLETION";
      weekNumber: number;
      sessionId: string;
      completed: boolean;
    }
  | { type: "ADD_SESSION"; session: DailySession }
  | { type: "DELETE_SESSION"; uid: string }
  | { type: "UPDATE_SESSION_FEEDBACK"; uid: string; feedback: "good" | "normal" | "hard" }
  | { type: "UPDATE_SESSION_NOTES"; uid: string; notes?: string }
  | {
      type: "REPLACE_EXERCISE";
      sessionUid: string;
      blockName: string;
      exerciseName: string;
      newExercise: Exercise;
    }
  | { type: "ADD_RECORD"; record: PersonalRecord }
  | { type: "DELETE_RECORD"; id: string }
  | { type: "SET_ONBOARDING_STEP"; step: number }
  | { type: "CLEAR_PROGRAM" }
  | { type: "HYDRATE"; state: Partial<AppState> }
  | { type: "RESET" };

const initialState: AppState = {
  profile: null,
  program: null,
  programStartDate: null,
  sessions: [],
  records: [],
  onboardingStep: 0,
  _hydrated: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROFILE_PARTIAL":
      return { ...state, profile: { ...state.profile, ...action.data } };
    case "SET_PROGRAM":
      return {
        ...state,
        program: action.program,
        programStartDate: new Date().toLocaleDateString("en-CA"),
      };
    case "SET_PROGRAM_SESSION_COMPLETION":
      if (!state.program) return state;

      return {
        ...state,
        program: {
          ...state.program,
          weeks: state.program.weeks.map((week) =>
            week.week_number !== action.weekNumber
              ? week
              : {
                  ...week,
                  sessions: week.sessions.map((session) =>
                    session.session_id !== action.sessionId
                      ? session
                      : {
                          ...session,
                          completed: action.completed,
                          completedAt: action.completed ? new Date().toISOString() : null,
                        },
                  ),
                },
          ),
        },
      };
    case "ADD_SESSION":
      return { ...state, sessions: [action.session, ...state.sessions] };
    case "DELETE_SESSION":
      return { ...state, sessions: state.sessions.filter((s) => s.uid !== action.uid) };
    case "UPDATE_SESSION_FEEDBACK":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.uid === action.uid ? { ...s, feedback: action.feedback } : s,
        ),
      };
    case "UPDATE_SESSION_NOTES":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.uid === action.uid ? { ...s, notes: action.notes } : s,
        ),
      };
    case "REPLACE_EXERCISE":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.uid === action.sessionUid
            ? {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.block_name === action.blockName
                    ? {
                        ...b,
                        exercises: b.exercises.map((ex) =>
                          ex.name === action.exerciseName ? action.newExercise : ex,
                        ),
                      }
                    : b,
                ),
              }
            : s,
        ),
      };
    case "ADD_RECORD":
      return { ...state, records: [action.record, ...state.records] };
    case "DELETE_RECORD":
      return { ...state, records: state.records.filter((r) => r.id !== action.id) };
    case "SET_ONBOARDING_STEP":
      return { ...state, onboardingStep: action.step };
    case "CLEAR_PROGRAM":
      return { ...state, program: null, programStartDate: null };
    case "HYDRATE":
      return { ...state, ...action.state, _hydrated: action.state._hydrated ?? true };
    case "RESET":
      return { ...initialState, _hydrated: true };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addRecord: (record: PersonalRecord) => Promise<void>;
  persistProfile: (data: Partial<UserProfile>) => Promise<void>;
  persistProgram: (program: Program) => Promise<void>;
  retryHydration: () => void;
} | null>(null);

function storageKey(userId?: string | null) {
  return `Vincere_state_${userId ?? "anon"}`;
}

/** Renvoie true si le profil contient les champs minimaux pour être sauvegardé. */
function isProfileSaveable(p: Partial<UserProfile> | null): p is UserProfile {
  return !!(p?.objective && p?.gender && p?.level && p?.age);
}

export function AppProvider({
  children,
  userId,
  userEmail,
  userFirstName,
}: Readonly<{
  children: ReactNode;
  userId?: string | null;
  userEmail?: string;
  userFirstName?: string | null;
}>) {
  const key = storageKey(userId);
  const [reload, reloadDispatch] = useReducer((value: number) => value + 1, 0);

  /** ID interne Supabase (UUID), différent du Clerk userId */
  const internalIdRef = useRef<string | null>(null);

  /** Référence toujours à jour sur le state courant (pour les callbacks) */
  const stateRef = useRef<AppState>(initialState);

  const [state, rawDispatch] = useReducer(reducer, undefined, () => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        return { ...parsed, records: parsed.records ?? [], _hydrated: false, _loadError: null };
      }
    } catch {
      /* ignore */
    }
    return { ...initialState };
  });

  stateRef.current = state;

  // ── Persistance localStorage ────────────────────────────────────────────────
  useEffect(() => {
    const { _hydrated: _h, _loadError: _e, ...toSave } = state;
    try {
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (error) {
      console.warn("[store] Stockage local saturé, état conservé en mémoire", error);
    }
  }, [state, key, userId]);

  // ── Dispatch wrappé : sync Supabase automatique ─────────────────────────────
  const dispatch = useCallback((action: Action) => {
    rawDispatch(action);

    if (!internalIdRef.current) return;
    const iuid = internalIdRef.current;

    switch (action.type) {
      case "SET_PROGRAM":
        dbSaveProgram(supabase, iuid, action.program).catch(reportSyncError);
        break;

      case "CLEAR_PROGRAM":
        dbClearProgram(supabase, iuid).catch(reportSyncError);
        break;

      case "SET_PROGRAM_SESSION_COMPLETION":
        dbUpdateProgramSessionCompletion(
          supabase,
          iuid,
          action.weekNumber,
          action.sessionId,
          action.completed,
        ).catch(reportSyncError);
        break;

      case "ADD_SESSION":
        dbSaveSession(supabase, iuid, action.session).catch(reportSyncError);
        break;

      case "DELETE_SESSION":
        dbDeleteSession(supabase, iuid, action.uid).catch(reportSyncError);
        break;

      case "REPLACE_EXERCISE": {
        const updated = reducer(stateRef.current, action).sessions.find(
          (session) => session.uid === action.sessionUid,
        );
        if (updated) dbSaveSession(supabase, iuid, updated).catch(reportSyncError);
        break;
      }

      case "UPDATE_SESSION_FEEDBACK":
        dbUpdateFeedback(supabase, iuid, action.uid, action.feedback).catch(reportSyncError);
        break;

      case "UPDATE_SESSION_NOTES":
        dbUpdateSessionNotes(supabase, iuid, action.uid, action.notes ?? null).catch(
          reportSyncError,
        );
        break;

      case "ADD_RECORD":
        dbSaveRecord(supabase, iuid, action.record).catch(reportSyncError);
        break;

      case "DELETE_RECORD":
        dbDeleteRecord(supabase, iuid, action.id).catch(reportSyncError);
        break;

      case "SET_ONBOARDING_STEP":
        saveOnboardingStep(supabase, iuid, action.step).catch(reportSyncError);
        break;

      case "SET_PROFILE_PARTIAL": {
        const merged = { ...stateRef.current.profile, ...action.data };
        if (isProfileSaveable(merged)) {
          saveProfile(supabase, iuid, merged).catch(reportSyncError);
        }
        break;
      }
    }
  }, []);

  const addRecord = useCallback(
    async (record: PersonalRecord) => {
      if (userId) {
        if (!internalIdRef.current) throw new Error("Le compte est encore en cours de chargement.");
        await dbSaveRecord(supabase, internalIdRef.current, record);
      }
      rawDispatch({ type: "ADD_RECORD", record });
    },
    [userId],
  );

  const persistProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      const merged = { ...stateRef.current.profile, ...data };
      if (!isProfileSaveable(merged))
        throw new Error("Complète ton profil avant de l'enregistrer.");
      if (userId) {
        if (!internalIdRef.current) throw new Error("Le compte est en cours de chargement.");
        await saveProfile(supabase, internalIdRef.current, merged);
      }
      rawDispatch({ type: "SET_PROFILE_PARTIAL", data });
    },
    [userId],
  );

  const retryHydration = useCallback(() => {
    rawDispatch({ type: "HYDRATE", state: { _hydrated: false, _loadError: null } });
    reloadDispatch();
  }, []);

  const persistProgram = useCallback(
    async (program: Program) => {
      if (userId) {
        if (!internalIdRef.current) throw new Error("Le compte est en cours de chargement.");
        await dbSaveProgram(supabase, internalIdRef.current, program);
      }
      rawDispatch({ type: "SET_PROGRAM", program });
    },
    [userId],
  );

  // ── Hydratation Supabase au montage ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      rawDispatch({ type: "HYDRATE", state: {} });
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const user = await upsertUser(supabase, {
          userId: userId,
          email: userEmail ?? "",
          firstName: userFirstName ?? undefined,
        });
        if (cancelled) return;
        internalIdRef.current = user.id;

        const current = stateRef.current;
        const [profile, programResult, remoteSessions, onboarding, remoteRecords] =
          await Promise.all([
            getProfile(supabase, user.id),
            getActiveProgram(supabase, user.id),
            getDailySessions(supabase, user.id, 30),
            getOnboardingProgress(supabase, user.id),
            dbGetRecords(supabase, user.id),
          ]);

        if (cancelled) return;

        rawDispatch({
          type: "HYDRATE",
          state: {
            _loadError: null,
            profile: profile ?? current.profile,
            program: programResult?.program ?? null,
            programStartDate: programResult?.startedAt ?? null,
            sessions: remoteSessions.length > 0 ? remoteSessions : current.sessions,
            records: remoteRecords.length > 0 ? remoteRecords : current.records,
            onboardingStep:
              onboarding == null ? current.onboardingStep : (onboarding as { step: number }).step,
          },
        });

        // Upload des données locales si Supabase était vide (premier accès cross-device)
        if (!profile && isProfileSaveable(current.profile)) {
          saveProfile(supabase, user.id, current.profile).catch(reportSyncError);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[store] Hydratation Supabase échouée, données locales conservées", err);
        rawDispatch({
          type: "HYDRATE",
          state: {
            _loadError:
              "Tes données n'ont pas pu être chargées. Vérifie ta connexion puis réessaie.",
          },
        });
      }
    })();
    return () => {
      cancelled = true;
      internalIdRef.current = null;
    };
    // Intentionnellement déclenché uniquement au changement d'utilisateur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reload]);

  const contextValue = useMemo(
    () => ({ state, dispatch, addRecord, persistProfile, persistProgram, retryHydration }),
    [state, dispatch, addRecord, persistProfile, persistProgram, retryHydration],
  );
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
