import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import type { UserProfile, Program, DailySession, StoredUser } from "./types";

interface AppState {
  profile: Partial<UserProfile> | null;
  program: Program | null;
  currentUser: StoredUser | null;
  sessions: DailySession[];
  onboardingStep: number;
}

type Action =
  | { type: "SET_PROFILE_PARTIAL"; data: Partial<UserProfile> }
  | { type: "SET_PROGRAM"; program: Program }
  | { type: "SET_USER"; user: StoredUser | null }
  | { type: "ADD_SESSION"; session: DailySession }
  | { type: "UPDATE_SESSION_FEEDBACK"; date: string; feedback: "good" | "normal" | "hard" }
  | { type: "SET_ONBOARDING_STEP"; step: number }
  | { type: "LOGOUT" };

const initialState: AppState = {
  profile: null,
  program: null,
  currentUser: null,
  sessions: [],
  onboardingStep: 0,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROFILE_PARTIAL":
      return { ...state, profile: { ...state.profile, ...action.data } };
    case "SET_PROGRAM":
      return { ...state, program: action.program };
    case "SET_USER":
      return { ...state, currentUser: action.user };
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
    case "LOGOUT":
      return { ...initialState };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

const STORAGE_KEY = "sportai_state";

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AppState) : initialState;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ----- Auth helpers (localStorage-based for V1, no real backend) -----

const USERS_KEY = "sportai_users";

function getUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Very basic hash for demo purposes only. Do NOT use in production without a real backend. */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export function registerUser(email: string, password: string): StoredUser | null {
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) return null;
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return user;
}

export function loginUser(email: string, password: string): StoredUser | null {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === simpleHash(password),
  );
  return user ?? null;
}
