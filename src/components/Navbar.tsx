import { Link, useRouterState } from "@tanstack/react-router";
import { CarTaxiFront, QrCode, ShieldCheck, Smartphone, Home, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const { user, profile, role, signOut } = useAuth();
  const slug = useStore(
    (s) => s.drivers.find((d) => d.active && !d.isSeed)?.slug ?? s.drivers.find((d) => d.active)?.slug ?? "K7M2QX9A",
  );
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  type NavTarget = "/" | "/driver" | "/onboard" | "/q/$slug";
  const navLinks: Array<{
    to: NavTarget;
    params?: { slug: string };
    label: string;
    icon: typeof Home;
    match: boolean;
  }> = [
    { to: "/", label: t("navHome"), icon: Home, match: currentPath === "/" },
    {
      to: "/q/$slug",
      params: { slug },
      label: t("navCommuter"),
      icon: QrCode,
      match: currentPath.startsWith("/q/"),
    },
    ...(role === "driver"
      ? [
          {
            to: "/driver" as const,
            label: "Driver Dashboard",
            icon: CarTaxiFront,
            match: currentPath === "/driver",
          },
        ]
      : []),
    {
      to: "/onboard",
      label: "My Driver & QR",
      icon: Smartphone,
      match: currentPath === "/onboard",
    },
  ];

  const langs: Array<{ code: "en" | "hi" | "mr"; label: string }> = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "mr", label: "मराठी" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white shadow-xs print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2">
          {/* Brand */}
          <Link
            to="/"
            id="nav-brand-logo"
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 shrink-0"
          >
            <CarTaxiFront className="size-6 sm:size-7 text-[#1e40af]" strokeWidth={2.5} />
            <span className="text-lg sm:text-xl font-black tracking-wide nav-gradient-text">
              AutoMitra
            </span>
          </Link>

          {/* Center Nav Tabs (Desktop / Tablet) */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                id={`nav-link-${link.to.replace(/[/\\$]/g, "")}`}
                to={link.to}
                {...(link.params ? { params: link.params } : {})}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  link.match
                    ? "bg-blue-50/90 border border-blue-200/60 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <link.icon className={`size-3.5 ${link.match ? "text-[#1e40af]" : "text-slate-500"}`} />
                <span className={link.match ? "nav-gradient-text font-black" : ""}>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right Section: Language + Auth State */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Global Language Switcher */}
            <div
              role="radiogroup"
              aria-label="Language selector"
              className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-0.5 shadow-inner"
            >
              {langs.map((l) => (
                <button
                  key={l.code}
                  id={`nav-lang-${l.code}`}
                  role="radio"
                  aria-checked={lang === l.code}
                  onClick={() => setLang(l.code)}
                  className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold transition-all ${
                    lang === l.code
                      ? "bg-white shadow-xs nav-gradient-text font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* User Auth Info & Sign In / Sign Out */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-1.5 pl-1 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-black nav-gradient-text truncate max-w-[90px] lg:max-w-[120px]">
                    {profile?.display_name ?? user.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] font-black uppercase text-[#1e40af] tracking-wider">
                    {role === "driver" ? "Driver" : "Owner"}
                  </span>
                </div>

                <button
                  id="btn-sign-out"
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-xs"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                id="nav-btn-login"
                className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-gradient-to-r from-[#020b1e] via-[#071f45] to-[#2563eb] px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-black text-white shadow-sm hover:opacity-90 transition-all ml-0.5 sm:ml-1 shrink-0"
              >
                <LogIn className="size-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Pinned at bottom of screen for natural thumb reach */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-1 sm:px-2 py-1.5 md:hidden shadow-lg print:hidden pb-[max(0.375rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation"
      >
        {navLinks.map((link) => (
          <Link
            key={link.to}
            id={`nav-mobile-${link.to.replace(/[/\\$]/g, "")}`}
            to={link.to}
            {...(link.params ? { params: link.params } : {})}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] sm:text-[11px] font-bold transition-colors min-w-[56px] text-center ${
              link.match ? "text-[#1e40af]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <link.icon className="size-4" />
            <span className={link.match ? "nav-gradient-text font-black" : ""}>{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
