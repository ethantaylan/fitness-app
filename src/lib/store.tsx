import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from "react";
import type { UserProfile, Program, DailySession } from "./types";

interface AppState {
  profile: Partial<UserProfile> | null;
  program: Program | null;
  sessions: DailySession[];
  onboardingStep: number;
}

type Action =
  | { type: "SET_PROFILE_PARTIAL"; data: Partial<UserProfile> }
  | { type: "SET_PROGRAM"; program: Program }
  | { type: "ADD_SESSION"; session: DailySession }
  | { type: "UPDATE_SESSION_FEEDBACK"; date: string; feedback: "good" | "normal" | "hard" }
  | { type: "SET_ONBOARDING_STEP"; step: number }
  | { type: "RESET" };

const initialState: AppState = {
  profile: null,
  program: null,
  sessions: [],
  onboardingStep: 0,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROFILE_PARTIAL":
      return { ...state, profile: { ...state.profile, ...action.data } };
    case "SET_PROGRAM":
      return { ...state, program: action.program };
    case "ADD_SESSION":
      return {
        ...state,
        sessions: [action.session, ...state.sessions.filter((s) => s.date !== action.session.date)],
      };
    case "UPDATE_SESSION_FEEDBACK":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.date === action.date ? { ...s, feedback: action.feedback } : s,
        ),
      };
    case "SET_ONBOARDING_STEP":
      return { ...state, onboardingStep: action.step };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

/** State is keyed by Clerk userId (or "anon" for unauthenticated sessions). */
function storageKey(userId?: string | null) {
  return `sportai_state_${userId ?? "anon"}`;
}

export function AppProvider({
  children,
  userId,
}: Readonly<{
  children: ReactNode;
  userId?: string | null;
}>) {
  const key = storageKey(userId);

  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as AppState) : initialState;
    } catch {
      return initialState;
    }
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [state, key]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
