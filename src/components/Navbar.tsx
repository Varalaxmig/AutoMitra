import { Link, useRouterState } from "@tanstack/react-router";
import { CarTaxiFront, QrCode, ShieldCheck, Smartphone, Home } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const slug = useStore((s) => s.drivers.find((d) => d.active)?.slug ?? "K7M2QX9A");
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  type NavTarget = "/" | "/console" | "/onboard" | "/q/$slug";
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
    {
      to: "/console",
      label: t("navConsole"),
      icon: ShieldCheck,
      match: currentPath === "/console",
    },
    {
      to: "/onboard",
      label: t("navOnboard"),
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
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link
          to="/"
          id="nav-brand-logo"
          className="flex items-center gap-2.5 text-foreground hover:opacity-90"
        >
          <CarTaxiFront className="size-7 text-amber" strokeWidth={2.5} />
          <span className="text-xl font-black tracking-wide">
            Auto<span className="text-amber">Mitra</span>
          </span>
        </Link>

        {/* Center Nav Tabs */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              id={`nav-link-${link.to.replace(/[/\\$]/g, "")}`}
              to={link.to}
              {...(link.params ? { params: link.params } : {})}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                link.match
                  ? "bg-amber text-ink shadow-sm"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <link.icon className="size-3.5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Global Language Switcher */}
        <div
          role="radiogroup"
          aria-label="Language selector"
          className="flex items-center rounded-full border border-border bg-surface-2 p-1 shadow-inner"
        >
          {langs.map((l) => (
            <button
              key={l.code}
              id={`nav-lang-${l.code}`}
              role="radio"
              aria-checked={lang === l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                lang === l.code
                  ? "bg-amber text-ink shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Nav Tabs Bar */}
      <nav
        className="flex items-center justify-around border-t border-border/50 bg-surface px-2 py-1.5 md:hidden"
        aria-label="Mobile navigation"
      >
        {navLinks.map((link) => (
          <Link
            key={link.to}
            id={`nav-mobile-${link.to.replace(/[/\\$]/g, "")}`}
            to={link.to}
            {...(link.params ? { params: link.params } : {})}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
              link.match ? "text-amber" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <link.icon className="size-4" />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
