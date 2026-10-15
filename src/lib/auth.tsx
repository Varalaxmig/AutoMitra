import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, LogOut, ArrowRight, CarTaxiFront, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "./supabase";
import { useLang, type Lang } from "./i18n";

export type UserRole = "proxy" | "driver" | "commuter" | "admin";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  language: Lang;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (roleHint?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  assignRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Brute-force rate limiting helper (client-side 5 attempts per 5 minutes)
const RATE_LIMIT_PREFIX = "am_login_attempts_";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

interface AttemptRecord {
  count: number;
  timestamp: number;
}

export function isRateLimited(email: string): boolean {
  if (typeof window === "undefined" || !email) return false;
  try {
    const raw = localStorage.getItem(RATE_LIMIT_PREFIX + email.toLowerCase().trim());
    if (!raw) return false;
    const rec: AttemptRecord = JSON.parse(raw);
    if (Date.now() - rec.timestamp > LOCKOUT_MS) {
      localStorage.removeItem(RATE_LIMIT_PREFIX + email.toLowerCase().trim());
      return false;
    }
    return rec.count >= MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

export function recordFailedAttempt(email: string): void {
  if (typeof window === "undefined" || !email) return;
  try {
    const key = RATE_LIMIT_PREFIX + email.toLowerCase().trim();
    const raw = localStorage.getItem(key);
    const now = Date.now();
    let count = 1;
    if (raw) {
      const rec: AttemptRecord = JSON.parse(raw);
      if (now - rec.timestamp <= LOCKOUT_MS) {
        count = rec.count + 1;
      }
    }
    localStorage.setItem(key, JSON.stringify({ count, timestamp: now }));
  } catch {
    // Ignore storage issues
  }
}

export function clearFailedAttempts(email: string): void {
  if (typeof window === "undefined" || !email) return;
  try {
    localStorage.removeItem(RATE_LIMIT_PREFIX + email.toLowerCase().trim());
  } catch {
    // Ignore
  }
}

function inferRoleFromUser(user: User): UserRole {
  const metaRole = user.user_metadata?.role as UserRole | undefined;
  if (metaRole && ["proxy", "driver", "commuter", "admin"].includes(metaRole)) {
    return metaRole;
  }
  const email = (user.email ?? "").toLowerCase();
  if (email.includes("proxy")) return "proxy";
  if (email.includes("driver")) return "driver";
  return "proxy";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setLang } = useLang();

  const supabase = getSupabaseClient();

  const syncProfile = async (currentUser: User) => {
    if (!supabase) {
      const fallbackRole = inferRoleFromUser(currentUser);
      setRole(fallbackRole);
      setProfile({
        id: currentUser.id,
        role: fallbackRole,
        display_name: currentUser.user_metadata?.display_name ?? null,
        language: "en",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!error && data) {
        const userProfile = data as unknown as Profile;
        setProfile(userProfile);
        setRole(userProfile.role);
        if (userProfile.language) {
          setLang(userProfile.language);
        }
      } else {
        // Fallback if profiles table row does not exist yet
        const inferred = inferRoleFromUser(currentUser);
        const fallbackProfile: Profile = {
          id: currentUser.id,
          role: inferred,
          display_name: currentUser.user_metadata?.display_name ?? null,
          language: (currentUser.user_metadata?.language as Lang) ?? "en",
        };
        setProfile(fallbackProfile);
        setRole(inferred);
        if (fallbackProfile.language) {
          setLang(fallbackProfile.language);
        }
      }
    } catch {
      const inferred = inferRoleFromUser(currentUser);
      setRole(inferred);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        syncProfile(currentUser).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(currentUser);
      } else {
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isRateLimited(email)) {
      return {
        success: false,
        error: "Too many failed attempts. Please try again after 5 minutes.",
      };
    }

    if (!supabase) {
      return { success: false, error: "Authentication service not configured." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      recordFailedAttempt(email);
      if (isRateLimited(email)) {
        return {
          success: false,
          error: "Too many failed attempts. Please try again after 5 minutes.",
        };
      }
      return { success: false, error: "Invalid email or password." };
    }

    clearFailedAttempts(email);
    setUser(data.user);
    await syncProfile(data.user);
    return { success: true };
  };

  const signInWithGoogle = async (roleHint?: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: "Authentication service not configured." };
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login${roleHint ? `?role=${roleHint}` : ""}`
        : undefined;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? "OAuth initialization failed." };
    }
  };

  const signOut = async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const assignRole = async (newRole: UserRole): Promise<void> => {
    if (!user) return;
    if (supabase) {
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          role: newRole,
          display_name: user.user_metadata?.display_name ?? null,
          language: "en",
        });
    }
    setRole(newRole);
    if (profile) {
      setProfile({ ...profile, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        signIn,
        signInWithGoogle,
        signOut,
        assignRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function Forbidden403({
  currentRole,
  requiredRole,
}: {
  currentRole: UserRole | null;
  requiredRole: UserRole;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const roleLabel = (r: UserRole | null) => {
    if (r === "proxy") return "Family Proxy";
    if (r === "driver") return "Auto Driver";
    if (r === "commuter") return "Commuter";
    return "User";
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
        <ShieldAlert className="size-8" />
      </div>

      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-destructive border border-destructive/20">
        403 Forbidden
      </span>

      <h1 className="mt-4 text-2xl md:text-3xl font-black text-foreground">
        Access Restricted
      </h1>

      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        You are currently signed in as a{" "}
        <strong className="text-foreground font-bold">{roleLabel(currentRole)}</strong>, but this
        area is strictly restricted to{" "}
        <strong className="text-foreground font-bold">{roleLabel(requiredRole)}</strong> accounts.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        {currentRole === "driver" && (
          <Link
            to="/driver"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber px-5 py-2.5 text-xs font-black text-ink shadow-md hover:bg-amber/90 transition-all"
          >
            <CarTaxiFront className="size-4" />
            <span>Go to Driver Dashboard</span>
          </Link>
        )}

        {currentRole === "proxy" && (
          <Link
            to="/onboard"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber px-5 py-2.5 text-xs font-black text-ink shadow-md hover:bg-amber/90 transition-all"
          >
            <ShieldCheck className="size-4" />
            <span>Go to My Driver & QR</span>
          </Link>
        )}

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login", search: { role: requiredRole } });
          }}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-black text-muted-foreground hover:text-foreground transition-all"
        >
          <LogOut className="size-4" />
          <span>Switch Account</span>
        </button>
      </div>
    </main>
  );
}

export function ProtectedRoute({
  requiredRole,
  children,
}: {
  requiredRole: UserRole;
  children: ReactNode;
}) {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({
        to: "/login",
        search: { role: requiredRole },
      });
    }
  }, [user, isLoading, requiredRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-amber border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (role && role !== requiredRole) {
    return <Forbidden403 currentRole={role} requiredRole={requiredRole} />;
  }

  return <>{children}</>;
}
