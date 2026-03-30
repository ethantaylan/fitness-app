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
        programStartDate: state.programStartDate ?? new Date().toISOString().split("T")[0],
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
      return { ...state, ...action.state, _hydrated: true };
    case "RESET":
      return { ...initialState, _hydrated: true };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
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

  /** ID interne Supabase (UUID), différent du Clerk userId */
  const internalIdRef = useRef<string | null>(null);

  /** Référence toujours à jour sur le state courant (pour les callbacks) */
  const stateRef = useRef<AppState>(initialState);

  const [state, rawDispatch] = useReducer(reducer, undefined, () => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        return { ...parsed, records: parsed.records ?? [], _hydrated: false };
      }
    } catch {
      /* ignore */
    }
    return { ...initialState };
  });

  stateRef.current = state;

  // ── Persistance localStorage ────────────────────────────────────────────────
  useEffect(() => {
    const { _hydrated: _h, ...toSave } = state;
    localStorage.setItem(key, JSON.stringify(toSave));
  }, [state, key]);

  // ── Dispatch wrappé : sync Supabase automatique ─────────────────────────────
  const dispatch = useCallback((action: Action) => {
    rawDispatch(action);

    if (!internalIdRef.current) return;
    const iuid = internalIdRef.current;

    switch (action.type) {
      case "SET_PROGRAM":
        dbSaveProgram(supabase, iuid, action.program).catch(console.warn);
        break;

      case "CLEAR_PROGRAM":
        dbClearProgram(supabase, iuid).catch(console.warn);
        break;

      case "SET_PROGRAM_SESSION_COMPLETION":
        dbUpdateProgramSessionCompletion(
          supabase,
          iuid,
          action.weekNumber,
          action.sessionId,
          action.completed,
        ).catch(console.warn);
        break;

      case "ADD_SESSION":
        dbSaveSession(supabase, iuid, action.session).catch(console.warn);
        break;

      case "DELETE_SESSION":
        dbDeleteSession(supabase, iuid, action.uid).catch(console.warn);
        break;

      case "UPDATE_SESSION_FEEDBACK":
        dbUpdateFeedback(supabase, iuid, action.uid, action.feedback).catch(console.warn);
        break;

      case "ADD_RECORD":
        dbSaveRecord(supabase, iuid, action.record).catch(console.warn);
        break;

      case "DELETE_RECORD":
        dbDeleteRecord(supabase, iuid, action.id).catch(console.warn);
        break;

      case "SET_ONBOARDING_STEP":
        saveOnboardingStep(supabase, iuid, action.step).catch(console.warn);
        break;

      case "SET_PROFILE_PARTIAL": {
        const merged = { ...stateRef.current.profile, ...action.data };
        if (isProfileSaveable(merged)) {
          saveProfile(supabase, iuid, merged).catch(console.warn);
        }
        break;
      }
    }
  }, []);

  // ── Hydratation Supabase au montage ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      rawDispatch({ type: "HYDRATE", state: {} });
      return;
    }

    void (async () => {
      try {
        const user = await upsertUser(supabase, {
          userId: userId,
          email: userEmail ?? "",
          firstName: userFirstName ?? undefined,
        });
        internalIdRef.current = user.id;

        const current = stateRef.current;
        const [profile, programResult, remoteSessions, onboarding, remoteRecords] =
          await Promise.all([
            getProfile(supabase, user.id).catch(() => null),
            getActiveProgram(supabase, user.id).catch(() => null),
            getDailySessions(supabase, user.id, 30).catch(() => [] as DailySession[]),
            getOnboardingProgress(supabase, user.id).catch(() => null),
            dbGetRecords(supabase, user.id).catch(() => [] as PersonalRecord[]),
          ]);

        rawDispatch({
          type: "HYDRATE",
          state: {
            profile: profile ?? current.profile,
            program: programResult?.program ?? current.program,
            programStartDate: programResult?.startedAt ?? current.programStartDate,
            sessions: remoteSessions.length > 0 ? remoteSessions : current.sessions,
            records: remoteRecords.length > 0 ? remoteRecords : current.records,
            onboardingStep:
              onboarding == null ? current.onboardingStep : (onboarding as { step: number }).step,
          },
        });

        // Upload des données locales si Supabase était vide (premier accès cross-device)
        if (!profile && isProfileSaveable(current.profile)) {
          saveProfile(supabase, user.id, current.profile).catch(console.warn);
        }
        if (!programResult?.program && current.program) {
          dbSaveProgram(supabase, user.id, current.program).catch(console.warn);
        }
      } catch (err) {
        console.warn("[store] Hydratation Supabase échouée, données locales conservées", err);
        rawDispatch({ type: "HYDRATE", state: {} });
      }
    })();
    // Intentionnellement déclenché uniquement au changement d'utilisateur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
