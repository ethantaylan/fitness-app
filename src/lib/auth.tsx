import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userEmail: string;
  userFirstName: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
  const fullName =
    (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? "";

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      isLoaded,
      isSignedIn: !!session,
      userId: user?.id ?? null,
      userEmail: user?.email ?? "",
      userFirstName: fullName.split(" ")[0] || null,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, isLoaded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
