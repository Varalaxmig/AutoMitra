import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, LogIn, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

type LoginSearch = {
  role?: "proxy" | "driver";
  redirectTo?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      role: search.role as "proxy" | "driver" | undefined,
      redirectTo: search.redirectTo as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Sign In — AutoMitra" },
      {
        name: "description",
        content: "Secure login for AutoMitra accounts.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user, role: userRole } = useAuth();
  const { lang, t } = useLang();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // If already logged in, redirect to respective destination
  useEffect(() => {
    if (user && userRole) {
      if (redirectTo) {
        navigate({ to: redirectTo as any });
      } else if (userRole === "driver") {
        navigate({ to: "/driver" });
      } else {
        navigate({ to: "/console" });
      }
    }
  }, [user, userRole, redirectTo, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 10) {
      setErrorMessage("Password must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error ?? "Invalid email or password.");
      toast.error(result.error ?? "Invalid email or password.");
    } else {
      toast.success("Signed in successfully!");
      if (redirectTo) {
        navigate({ to: redirectTo as any });
      } else if (result.role === "driver") {
        navigate({ to: "/driver" });
      } else {
        navigate({ to: "/console" });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await signInWithGoogle("proxy");
    setIsSubmitting(false);

    if (!result.success) {
      if (
        result.error?.includes("provider is not enabled") ||
        result.error?.includes("validation_failed") ||
        result.error?.includes("Unsupported provider")
      ) {
        const msg =
          "Google sign-in is not enabled in your Supabase project yet. Please enable Google under Supabase Dashboard > Authentication > Providers.";
        setErrorMessage(msg);
        toast.error(msg, { duration: 6000 });
      } else {
        setErrorMessage(result.error ?? "Failed to sign in with Google.");
        toast.error(result.error ?? "Failed to sign in with Google.");
      }
    }
  };

  const handleQuickFill = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setErrorMessage(null);
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber/15 text-amber shadow-sm mb-4">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Sign In
        </h1>
        <p className="mt-2 text-xs md:text-sm text-muted-foreground">
          Sign in to AutoMitra to onboard drivers, verify rides, and manage fares
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-md">
        {errorMessage && (
          <div
            id="login-error-alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email-input"
              className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Email Address
            </label>
            <input
              id="login-email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
            />
          </div>

          <div>
            <label
              htmlFor="login-password-input"
              className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Password (min. 10 chars)
            </label>
            <input
              id="login-password-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={10}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3 text-sm font-black text-ink shadow-md hover:bg-amber/90 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            <LogIn className="size-4" />
            <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-surface px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            or continue with
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          id="btn-google-login"
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground hover:bg-surface-2 transition-all shadow-sm"
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign In with Google</span>
        </button>
      </div>

      {/* Quick Test Accounts Switcher for Developers & Evaluators */}
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/50 p-4">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
          <Sparkles className="size-3.5 text-amber" />
          <span>Quick Test Accounts</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            id="btn-quick-proxy1"
            onClick={() => handleQuickFill("proxy1@automitra.test", "ProxyOne#2026-Test")}
            className="flex flex-col items-start rounded-xl border border-border bg-surface p-2.5 text-left text-xs hover:border-amber/60 hover:bg-amber/5 transition-all"
          >
            <span className="font-bold text-foreground">Sneha Test</span>
            <span className="text-[10px] text-muted-foreground font-mono">proxy1 (EN)</span>
          </button>

          <button
            type="button"
            id="btn-quick-proxy2"
            onClick={() => handleQuickFill("proxy2@automitra.test", "ProxyTwo#2026-Test")}
            className="flex flex-col items-start rounded-xl border border-border bg-surface p-2.5 text-left text-xs hover:border-amber/60 hover:bg-amber/5 transition-all"
          >
            <span className="font-bold text-foreground">Meera Test</span>
            <span className="text-[10px] text-muted-foreground font-mono">proxy2 (MR मराठी)</span>
          </button>

          <button
            type="button"
            id="btn-quick-driver1"
            onClick={() => handleQuickFill("driver1@automitra.test", "DriverOne#2026-Test")}
            className="flex flex-col items-start rounded-xl border border-border bg-surface p-2.5 text-left text-xs hover:border-amber/60 hover:bg-amber/5 transition-all"
          >
            <span className="font-bold text-foreground">Ramesh Test</span>
            <span className="text-[10px] text-muted-foreground font-mono">driver1 (HI हिन्दी)</span>
          </button>

          <button
            type="button"
            id="btn-quick-driver2"
            onClick={() => handleQuickFill("driver2@automitra.test", "DriverTwo#2026-Test")}
            className="flex flex-col items-start rounded-xl border border-border bg-surface p-2.5 text-left text-xs hover:border-amber/60 hover:bg-amber/5 transition-all"
          >
            <span className="font-bold text-foreground">Suresh Test</span>
            <span className="text-[10px] text-muted-foreground font-mono">driver2 (MR मराठी)</span>
          </button>
        </div>
      </div>
    </main>
  );
}
