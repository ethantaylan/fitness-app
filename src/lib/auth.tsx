import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { getUserAccount, updateUserDisplayName as dbUpdateUserDisplayName } from "./db";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userEmail: string;
  userFirstName: string | null;
  updateUserDisplayName: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storedFirstName, setStoredFirstName] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  const meta = user?.user_metadata ?? {};
  const fullName = (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    ""
  ).trim();

  useEffect(() => {
    if (!user?.id) {
      setStoredFirstName(null);
      return;
    }

    let cancelled = false;

    void getUserAccount(supabase, user.id)
      .then((account) => {
        if (cancelled) return;
        setStoredFirstName(account?.first_name?.trim() || null);
      })
      .catch(() => {
        if (cancelled) return;
        setStoredFirstName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      isLoaded,
      isSignedIn: !!session,
      userId: user?.id ?? null,
      userEmail: user?.email ?? "",
      userFirstName: storedFirstName || fullName.split(/\s+/)[0] || null,
      updateUserDisplayName: async (displayName: string) => {
        if (!user?.id) throw new Error("Utilisateur non connecte");
        const updated = await dbUpdateUserDisplayName(supabase, user.id, displayName);
        setStoredFirstName(updated.first_name?.trim() || null);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, isLoaded, storedFirstName, fullName, user?.id],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
