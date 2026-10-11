import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CarTaxiFront,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  Hash,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { cancel, claim, initiate, upiUri, useStore, type Lang } from "@/lib/store";
import { useLang, type Key } from "@/lib/i18n";
import { soundbox } from "@/lib/audio";

export const Route = createFileRoute("/q/$slug")({
  head: () => ({
    meta: [
      { title: "Pay your auto driver — AutoMitra" },
      {
        name: "description",
        content:
          "Enter the meter fare and pay the driver with your UPI app. Show the token to the driver.",
      },
      { property: "og:title", content: "Pay your auto driver — AutoMitra" },
      {
        property: "og:description",
        content: "Scan, pay with UPI, show the token. No app install.",
      },
    ],
  }),
  component: Commuter,
});

type View = "fare" | "handoff" | "return" | "token";

function Commuter() {
  const { slug } = Route.useParams();
  const { lang, setLang, t, tn } = useLang();
  const driver = useStore((s) => s.drivers.find((d) => d.active && d.slug === slug));
  const [sid, setSid] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`am_session_${slug}`);
    }
    return null;
  });
  const session = useStore((s) => s.sessions.find((x) => x.id === sid));
  const [view, setView] = useState<View>(() => {
    if (session?.status === "claimed") return "token";
    if (session?.status === "handed_off") return "return";
    return "fare";
  });
  const [senderName, setSenderName] = useState("Test xyz");
  const [fare, setFare] = useState("");
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Sync view state if restored session changes
  useEffect(() => {
    if (!session) return;
    if (session.status === "claimed" && view !== "token") {
      setView("token");
    } else if (session.status === "handed_off" && view === "fare") {
      setView("return");
    }
  }, [session, view]);

  // Return State when tab regains focus after UPI handoff
  useEffect(() => {
    if (view !== "handoff") return;
    const onVis = () => {
      if (document.visibilityState === "visible") setView("return");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [view]);

  const handleCopyVpa = () => {
    if (!driver) return;
    navigator.clipboard?.writeText(driver.vpa);
    setCopied(true);
    toast.success(`Copied UPI ID: ${driver.vpa}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCancel = () => {
    if (session) {
      cancel(session.id);
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`am_session_${slug}`);
    }
    setSid(null);
    setView("fare");
    setFare("");
    toast.info("Payment cancelled. Enter meter fare to retry.");
  };

  if (!driver) {
    return (
      <Full
        tone="err"
        icon={<AlertTriangle className="size-[40vw] max-w-56" strokeWidth={2.25} aria-hidden />}
        title={t("invalidQr")}
      >
        <Link to="/" id="btn-back-home" className="underline font-semibold text-ink">
          AutoMitra Home
        </Link>
      </Full>
    );
  }

  const status = session?.status;
  if (status === "confirmed") {
    return (
      <Final
        tone="ok"
        t={t}
        token={session!.token}
        amount={session!.creditedAmount ?? session!.amount}
        onDone={() => {
          if (typeof window !== "undefined") sessionStorage.removeItem(`am_session_${slug}`);
          setSid(null);
          setView("fare");
          setFare("");
        }}
      />
    );
  }

  if (status && ["rejected", "expired"].includes(status)) {
    return (
      <Final
        tone="err"
        t={t}
        token={session!.token}
        amount={session!.amount}
        onRetry={() => {
          if (typeof window !== "undefined") sessionStorage.removeItem(`am_session_${slug}`);
          setSid(null);
          setView("fare");
          setFare("");
        }}
      />
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(fare);
    if (!/^\d+(\.\d)?$/.test(fare) || n < 10 || n > 5000) {
      setErr(true);
      return;
    }
    const s = initiate(slug, n, senderName);
    setSid(s.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`am_session_${slug}`, s.id);
    }
    setView("handoff");

    // Launch UPI intent
    const uri = upiUri(driver, s);
    try {
      window.location.href = uri;
    } catch {
      // Fallback on desktop browsers
    }
  };

  if (view === "token" && session) {
    return (
      <TokenScreen
        t={t}
        token={session.token}
        amount={session.amount}
        since={session.claimedAt ?? Date.now()}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-4" lang={lang}>
      <header className="flex items-center justify-between gap-3">
        <LangSwitch lang={lang} setLang={setLang} />
        {view === "fare" ? (
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-amber/40 bg-surface px-4 font-semibold text-amber shadow-sm">
            <QrCode className="size-5" aria-hidden />
            {t("ready")}
          </span>
        ) : (
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-amber px-4 font-bold text-ink shadow-sm">
            <Clock className="size-5" aria-hidden />
            {t("awaiting")}
          </span>
        )}
      </header>

      <section className="mt-8 flex items-center gap-4">
        <CarTaxiFront className="size-12 text-amber" strokeWidth={2.25} aria-hidden />
        <div>
          <p className="text-2xl font-extrabold text-foreground">{tn(driver.firstName)}</p>
          <span className="plate mt-1 inline-block text-lg bg-surface border-border text-foreground">
            {driver.vehicle}
          </span>
        </div>
      </section>

      {view === "fare" && (
        <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
          <label
            htmlFor="sender-name-input"
            className="font-semibold text-muted-foreground text-sm"
          >
            {t("passengerName")}
          </label>
          <div className="mt-1 mb-4 flex items-center rounded-xl border-2 border-border bg-surface px-4 py-3 focus-within:border-amber transition-colors">
            <input
              id="sender-name-input"
              type="text"
              autoComplete="name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full bg-transparent outline-none text-foreground font-semibold placeholder:text-muted-foreground text-base"
              placeholder={t("passengerPlaceholder")}
            />
          </div>

          <label htmlFor="fare-input" className="font-semibold text-muted-foreground text-sm">
            {t("meterFare")}
          </label>
          <div className="mt-1 flex items-baseline gap-2 rounded-xl border-2 border-border bg-surface px-4 py-3 focus-within:border-amber transition-colors">
            <span className="fare-readout text-muted-foreground">₹</span>
            <input
              id="fare-input"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={fare}
              onChange={(e) => {
                setFare(e.target.value.replace(/[^\d.]/g, ""));
                setErr(false);
              }}
              className="fare-readout w-full min-w-0 bg-transparent outline-none text-foreground placeholder:text-surface-2"
              placeholder="0"
              aria-invalid={err}
              aria-describedby="fare-help"
            />
          </div>
          <p
            id="fare-help"
            className={`mt-2 text-sm ${err ? "font-semibold text-err" : "text-muted-foreground"}`}
          >
            {t("amountRule")}
          </p>
          <button
            id="btn-pay-fare"
            type="submit"
            className="mt-auto flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-amber text-xl font-black text-ink shadow-lg transition-transform active:scale-[0.99] hover:bg-amber-deep"
          >
            {t("pay")} <ArrowRight className="size-7" strokeWidth={2.5} aria-hidden />
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden />
            {t("footer")}
          </p>
        </form>
      )}

      {view === "handoff" && session && (
        <div className="mt-8 flex flex-1 flex-col gap-4">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fare to pay
            </p>
            <p className="fare-readout text-amber">₹{session.amount}</p>
          </div>

          <a
            id="btn-open-upi"
            href={upiUri(driver, session)}
            className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-amber text-xl font-black text-ink shadow-lg hover:bg-amber-deep"
          >
            {t("openUpi")} <ArrowRight className="size-7" aria-hidden />
          </a>

          <div className="rounded-xl border border-border bg-surface p-4 text-sm shadow-sm space-y-3">
            <p className="text-muted-foreground">{t("noUpi")}</p>
            <button
              id="btn-copy-vpa"
              type="button"
              onClick={handleCopyVpa}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-3 font-mono text-base border border-border/50 hover:border-amber transition-colors"
            >
              <span>{driver.vpa}</span>
              {copied ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-ok">
                  <Check className="size-5" /> Copied!
                </span>
              ) : (
                <Copy className="size-5 text-amber" aria-hidden />
              )}
            </button>
            <p className="text-muted-foreground">
              {t("noteToken")}:{" "}
              <b className="font-mono text-foreground font-black">AM{session.token}</b>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <button
              id="btn-toggle-qr"
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber underline"
            >
              <Smartphone className="size-4" />{" "}
              {showQr ? "Hide scan QR code" : "Scan QR with another phone (Desktop mode)"}
            </button>
            {showQr && (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-lg bg-paper p-4 text-ink">
                <QRCodeSVG value={upiUri(driver, session)} size={180} level="M" />
                <p className="text-xs font-semibold text-ink/80">
                  Scan with GPay, PhonePe, or Paytm
                </p>
              </div>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button
              id="btn-proceed-paid"
              onClick={() => setView("return")}
              className="flex h-12 items-center justify-center rounded-xl bg-surface-2 text-foreground font-semibold hover:border-amber border border-transparent"
            >
              {t("didPay")}
            </button>
            <button
              id="btn-handoff-cancel"
              onClick={handleCancel}
              className="text-sm text-muted-foreground underline py-1"
            >
              Cancel and change fare
            </button>
          </div>
        </div>
      )}

      {view === "return" && session && (
        <div className="mt-8 flex flex-1 flex-col gap-4" aria-live="assertive">
          <h1 className="text-3xl font-extrabold">{t("didPay")}</h1>
          <p className="fare-readout text-amber">₹{session.amount}</p>
          <div className="mt-auto flex flex-col gap-4">
            <button
              id="btn-confirm-i-paid"
              onClick={() => {
                claim(session.id);
                setView("token");
              }}
              className="flex h-20 items-center justify-center gap-3 rounded-2xl bg-amber text-2xl font-black text-ink shadow-xl hover:bg-amber-deep active:scale-[0.99]"
            >
              <CircleCheck className="size-8" aria-hidden />
              {t("iPaid")}
            </button>
            <button
              id="btn-return-cancel"
              onClick={handleCancel}
              className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-border bg-surface text-xl font-bold text-foreground hover:border-err"
            >
              <CircleX className="size-6 text-err" aria-hidden />
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const opts: [Lang, string][] = [
    ["en", "English"],
    ["hi", "हिन्दी"],
    ["mr", "मराठी"],
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex rounded-full border border-border bg-surface p-1"
    >
      {opts.map(([k, l]) => (
        <button
          key={k}
          id={`lang-${k}`}
          role="radio"
          aria-checked={lang === k}
          onClick={() => setLang(k)}
          className={`h-8 rounded-full px-3 text-sm font-bold transition-colors ${
            lang === k
              ? "bg-amber text-ink shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    (
      navigator as unknown as { wakeLock?: { request: (t: string) => Promise<typeof lock> } }
    ).wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);
}

function TokenScreen({
  t,
  token,
  amount,
  since,
  onCancel,
}: {
  t: (k: Key) => string;
  token: string;
  amount: number;
  since: number;
  onCancel: () => void;
}) {
  useWakeLock();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const secs = Math.max(0, Math.floor((now - since) / 1000));

  return (
    <main
      className="flex min-h-dvh flex-col border-[6px] border-amber bg-background px-4 py-5"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-amber px-4 font-bold text-ink shadow-sm">
          <Clock className="size-5" aria-hidden />
          {t("awaiting")}
        </span>
        <span className="font-mono text-xl font-bold tabular-nums text-amber">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-8 flex items-center justify-center gap-2 text-xl font-bold tracking-widest text-muted-foreground">
        <Hash className="size-6" aria-hidden />
        {t("token")}
      </p>
      <div
        className="token-digits mt-2 flex justify-center text-foreground"
        aria-label={`Token ${token.split("").join(" ")}`}
      >
        {token.split("").map((d, i) => (
          <span key={i} className={`px-[0.04em] ${i ? "border-l-2 border-border" : ""}`}>
            {d}
          </span>
        ))}
      </div>
      <p className="fare-readout mt-6 text-center text-amber font-black">₹{amount}</p>
      <p className="mt-4 text-center text-xl font-extrabold text-foreground">{t("showDriver")}</p>
      <p className="mt-auto flex items-center justify-center gap-2 text-center text-muted-foreground">
        <Clock className="size-4" aria-hidden />
        {t("waitingConfirm")}
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{t("brightness")}</p>

      <button
        id="btn-cancel-token"
        type="button"
        onClick={onCancel}
        className="mt-4 text-center text-xs text-muted-foreground hover:text-err underline"
      >
        Paying cash instead? Cancel verification
      </button>
    </main>
  );
}

function Final({
  tone,
  t,
  token,
  amount,
  onRetry,
  onDone,
}: {
  tone: "ok" | "err";
  t: (k: Key) => string;
  token: string;
  amount: number;
  onRetry?: () => void;
  onDone?: () => void;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    navigator.vibrate?.(tone === "ok" ? 200 : [300, 100, 300]);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", tone === "ok" ? "#A2DDA9" : "#F87171");
    }
    if (tone === "ok") {
      soundbox.playSuccessChime();
    } else {
      soundbox.playRejectBuzz();
    }
  }, [tone]);

  const Icon = tone === "ok" ? ShieldCheck : AlertTriangle;
  return (
    <Full
      tone={tone}
      icon={<Icon className="size-[35vw] max-w-64" strokeWidth={2.25} aria-hidden />}
      title={t(tone === "ok" ? "confirmed" : "notPaid")}
    >
      {tone === "err" && <p className="text-2xl font-extrabold">{t("doNotRelease")}</p>}
      <p className="mt-4 font-mono text-5xl font-black tabular-nums">#{token}</p>
      <p className="text-4xl font-black">₹{amount}</p>
      {onRetry && (
        <button
          id="btn-final-retry"
          onClick={onRetry}
          className="mt-8 h-14 rounded-2xl border-2 border-ink px-8 text-lg font-extrabold bg-paper/20 hover:bg-paper/40"
        >
          {t("retry")}
        </button>
      )}
      {onDone && (
        <button
          id="btn-final-done"
          onClick={onDone}
          className="mt-8 h-14 rounded-2xl border-2 border-ink px-8 text-lg font-extrabold bg-paper/20 hover:bg-paper/40"
        >
          Done
        </button>
      )}
    </Full>
  );
}

function Full({
  tone,
  icon,
  title,
  children,
}: {
  tone: "ok" | "err";
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      role="status"
      aria-live="assertive"
      className={`flex min-h-dvh flex-col items-center justify-center px-6 text-center ${
        tone === "ok" ? "bg-ok text-ink" : "bg-err text-white"
      }`}
    >
      {icon}
      <h1 className="mt-4 text-5xl font-black">{title}</h1>
      {children}
    </main>
  );
}
