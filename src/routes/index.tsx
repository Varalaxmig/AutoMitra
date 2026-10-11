import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CarTaxiFront,
  Hash,
  QrCode,
  ShieldCheck,
  Smartphone,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { resetDemo, useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AutoMitra — UPI verification for keypad-phone auto drivers" },
      {
        name: "description",
        content:
          "Commuters scan, pay by UPI and show a 4-digit token. The driver gets a matching SMS on a 2G keypad phone.",
      },
      { property: "og:title", content: "AutoMitra — UPI verification for auto drivers" },
      {
        property: "og:description",
        content: "Zero-screen UPI verification and keypad SMS proxy for Mumbai auto-rickshaws.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { lang, t } = useLang();
  const slug = useStore((s) => s.drivers.find((d) => d.active)?.slug ?? "K7M2QX9A");

  const steps = [
    {
      i: QrCode,
      t: t("step1Title"),
      d: t("step1Desc"),
    },
    {
      i: ArrowRight,
      t: t("step2Title"),
      d: t("step2Desc"),
    },
    {
      i: Hash,
      t: t("step3Title"),
      d: t("step3Desc"),
    },
    {
      i: ShieldCheck,
      t: t("step4Title"),
      d: t("step4Desc"),
    },
  ];

  const handleReset = () => {
    resetDemo();
    toast.success("Demo reset: fresh seed driver restored.");
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-8" lang={lang}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-amber">
          <CarTaxiFront className="size-9 text-amber" strokeWidth={2.25} />
          <span className="text-2xl font-black tracking-wide text-foreground">
            Auto<span className="text-amber">Mitra</span>
          </span>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-amber/40 bg-surface text-amber">
          Zero-Screen UPI Proxy
        </span>
      </header>

      <section className="mt-10">
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl text-foreground">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
          {t("heroDesc")}
        </p>
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card
          id="card-nav-commuter"
          to="/q/$slug"
          params={{ slug }}
          icon={QrCode}
          title={t("navCommuter")}
          body="Pay a fare as the passenger and display your 4-digit token."
        />
        <Card
          id="card-nav-console"
          to="/console"
          icon={ShieldCheck}
          title={t("navConsole")}
          body="Confirm credits and watch the simulated driver's 2G SMS inbox."
        />
        <Card
          id="card-nav-onboard"
          to="/onboard"
          icon={Smartphone}
          title={t("navOnboard")}
          body="Register a driver, bind family UPI, and print the dashboard QR sticker."
        />
      </div>

      <ol className="mt-12 grid gap-6 md:grid-cols-4">
        {steps.map((s, n) => (
          <li
            key={n}
            className="border-t-2 border-border/80 pt-4 bg-surface/30 p-4 rounded-xl border border-border/40"
          >
            <s.i className="size-7 text-amber" strokeWidth={2.25} aria-hidden />
            <p className="mt-3 font-extrabold text-foreground">
              {n + 1}. {s.t}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-border pt-6 text-sm text-muted-foreground">
        <p>{t("demoNotice")}</p>
        <button
          id="btn-reset-demo"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-amber hover:border-amber transition-colors"
        >
          <RotateCcw className="size-3.5" /> {t("resetDemoBtn")}
        </button>
      </div>
    </main>
  );
}

function Card({
  id,
  icon: Icon,
  title,
  body,
  ...link
}: {
  id: string;
  icon: typeof QrCode;
  title: string;
  body: string;
  to: "/q/$slug" | "/console" | "/onboard";
  params?: { slug: string };
}) {
  return (
    <Link
      id={id}
      {...(link as { to: "/console" })}
      className="group rounded-2xl border border-border bg-surface p-6 shadow-sm hover:border-amber hover:shadow-lg transition-all"
    >
      <Icon
        className="size-8 text-amber group-hover:scale-105 transition-transform"
        strokeWidth={2.25}
        aria-hidden
      />
      <p className="mt-4 flex items-center justify-between text-xl font-extrabold text-foreground">
        {title}
        <ArrowRight className="size-5 text-amber opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground leading-snug">{body}</p>
    </Link>
  );
}
