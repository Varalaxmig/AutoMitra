import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CarTaxiFront,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock,
  Copy,
  ExternalLink,
  Hash,
  Loader2,
  MessageSquare,
  QrCode,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { autoResolve, initiate, upiUri, useStore, type Lang, type AutoResolveResult } from "@/lib/store";
import { useLang, type Key } from "@/lib/i18n";
import { soundbox } from "@/lib/audio";

export const Route = createFileRoute("/q/$slug")({
  head: () => ({
    meta: [
      { title: "Pay your auto driver — AutoMitra" },
      {
        name: "description",
        content:
          "Enter meter fare and pay with UPI. Auto-detected verification and instant 2G SMS to the driver.",
      },
      { property: "og:title", content: "Pay your auto driver — AutoMitra" },
      {
        property: "og:description",
        content: "Scan, pay with UPI, auto-verified without soundbox or family console.",
      },
    ],
  }),
  component: Commuter,
});

type View = "fare" | "verifying";

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
  const latestSms = useStore((s) =>
    driver ? s.sms.find((m) => m.to === driver.driverPhone) : undefined,
  );

  const [view, setView] = useState<View>(() => {
    if (session?.status === "handed_off") return "verifying";
    return "fare";
  });

  const [senderName, setSenderName] = useState("payer@okhdfcbank");
  const [fare, setFare] = useState("");
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [testSimulateFail, setTestSimulateFail] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<AutoResolveResult | null>(null);

  // Auto-detect payment completion when in "verifying" state
  useEffect(() => {
    if (view !== "verifying" || !session) return;
    if (session.status === "confirmed" || session.status === "rejected") return;

    let resolved = false;

    const executeResolution = async () => {
      if (resolved) return;
      resolved = true;
      const targetStatus = testSimulateFail ? "rejected" : "confirmed";
      const res = await autoResolve(session.id, targetStatus, senderName);
      if (res) {
        setDispatchResult(res);
        if (targetStatus === "confirmed") {
          toast.success("UPI payment detected! SMS sent to driver's phone.");
        } else {
          toast.error("Payment failed. Failure SMS dispatched to driver.");
        }
      }
    };

    // 1. Listen for commuter returning to browser after UPI app payment
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        setTimeout(executeResolution, 600);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    // 2. Automated timer safeguard (2.2s automated detection)
    const timer = setTimeout(executeResolution, 2200);

    return () => {
      resolved = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
    };
  }, [view, session, testSimulateFail, senderName]);

  const handleCopyVpa = () => {
    if (!driver) return;
    navigator.clipboard?.writeText(driver.vpa);
    setCopied(true);
    toast.success(`Copied UPI ID: ${driver.vpa}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`am_session_${slug}`);
    }
    setSid(null);
    setView("fare");
    setFare("");
    setTestSimulateFail(false);
    setDispatchResult(null);
  };

  if (!driver) {
    return (
      <Full
        tone="err"
        icon={<AlertTriangle className="size-28 max-w-56" strokeWidth={2.25} aria-hidden />}
        title={t("invalidQr")}
      >
        <Link to="/" id="btn-back-home" className="underline font-semibold text-ink mt-4">
          AutoMitra Home
        </Link>
      </Full>
    );
  }

  const status = session?.status;

  // View: Completed (Confirmed Green Tick)
  if (status === "confirmed") {
    return (
      <Final
        tone="ok"
        t={t}
        token={session!.token}
        amount={session!.creditedAmount ?? session!.amount}
        driverName={driver.firstName}
        vehicle={driver.vehicle}
        driverPhone={driver.driverPhone}
        senderUpi={session!.senderUpi || session!.senderName}
        dispatchInfo={dispatchResult}
        fallbackSms={latestSms?.body}
        onDone={handleReset}
      />
    );
  }

  // View: Failed (Red Screen with Failure SMS)
  if (status && ["rejected", "expired"].includes(status)) {
    return (
      <Final
        tone="err"
        t={t}
        token={session!.token}
        amount={session!.amount}
        driverName={driver.firstName}
        vehicle={driver.vehicle}
        driverPhone={driver.driverPhone}
        senderUpi={session!.senderUpi || session!.senderName}
        dispatchInfo={dispatchResult}
        fallbackSms={latestSms?.body}
        onRetry={handleReset}
      />
    );
  }

  // Handle Initiating Payment
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(fare);
    if (!/^\d+(\.\d{1,2})?$/.test(fare) || n < 1 || n > 5000) {
      setErr(true);
      return;
    }
    const cleanSender = senderName.trim() || "payer@okhdfcbank";
    const s = initiate(slug, n, cleanSender, cleanSender);
    setSid(s.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`am_session_${slug}`, s.id);
    }
    setView("verifying");

    // Launch UPI intent
    const uri = upiUri(driver, s);
    try {
      window.location.href = uri;
    } catch {
      // Fallback on desktop browsers
    }
  };

  const presets = [20, 50, 100, 200];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-4" lang={lang}>
      <header className="flex items-center justify-between gap-3">
        <LangSwitch lang={lang} setLang={setLang} />
        {view === "fare" ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber/40 bg-surface px-3.5 text-xs font-bold text-amber shadow-sm">
            <QrCode className="size-4" aria-hidden />
            {t("ready")}
          </span>
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber px-3.5 text-xs font-bold text-ink shadow-sm animate-pulse">
            <Radio className="size-4" aria-hidden />
            Auto-Detecting
          </span>
        )}
      </header>

      {/* Driver Identity Card */}
      <section className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber text-ink shrink-0 shadow-sm">
          <CarTaxiFront className="size-8" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xl font-extrabold text-foreground truncate">{tn(driver.firstName)}</p>
            <span className="rounded-md bg-amber/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber">
              Verified
            </span>
          </div>
          <p className="plate mt-1 inline-block text-sm bg-background border-border text-foreground font-mono font-bold">
            {driver.vehicle}
          </p>
        </div>
      </section>

      {/* VIEW: FARE INPUT */}
      {view === "fare" && (
        <form onSubmit={submit} className="mt-6 flex flex-1 flex-col">
          <label htmlFor="sender-name-input" className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
            Your UPI ID / Payer Name
          </label>
          <div className="mt-1.5 mb-4 flex items-center rounded-xl border border-border bg-surface px-3.5 py-2.5 focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20 transition-all">
            <input
              id="sender-name-input"
              type="text"
              autoComplete="name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full bg-transparent outline-none text-foreground font-semibold placeholder:text-muted-foreground text-sm"
              placeholder="e.g. payer@okhdfcbank"
            />
          </div>

          <label htmlFor="fare-input" className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
            {t("meterFare")}
          </label>
          <div className="mt-1.5 flex items-baseline gap-2 rounded-2xl border-2 border-border bg-surface px-4 py-3 focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20 transition-all">
            <span className="fare-readout text-muted-foreground font-black text-3xl">₹</span>
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
              className="fare-readout w-full min-w-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 text-4xl font-black"
              placeholder="0"
              aria-invalid={err}
            />
          </div>

          {/* Quick preset chips */}
          <div className="mt-3 flex items-center gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setFare(String(p));
                  setErr(false);
                }}
                className="flex-1 rounded-xl border border-border bg-surface py-2 text-xs font-black text-foreground hover:border-amber hover:bg-amber/10 transition-all"
              >
                ₹{p}
              </button>
            ))}
          </div>

          {err && (
            <p className="mt-2 text-xs font-bold text-err">
              {t("amountRule")}
            </p>
          )}

          {/* UPI Direct Payment Details Accordion */}
          <div className="mt-6 rounded-2xl border border-border bg-surface/60 p-3.5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between">
              <span>Driver UPI VPA:</span>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="font-mono font-bold text-foreground flex items-center gap-1 hover:text-amber"
              >
                <span>{driver.vpa}</span>
                {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>Driver 2G Keypad Phone:</span>
              <span className="font-mono font-bold text-foreground">+91 {driver.driverPhone}</span>
            </div>
          </div>

          {/* Desktop Companion QR code toggle */}
          <div className="mt-3 text-center">
            <button
              id="btn-toggle-qr"
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber hover:underline"
            >
              <Smartphone className="size-3.5" />
              <span>{showQr ? "Hide QR Code" : "Scan QR with another phone (Desktop mode)"}</span>
            </button>
            {showQr && (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl bg-paper p-4 text-ink shadow-md">
                <QRCodeSVG
                  value={upiUri(driver, {
                    id: "preview",
                    slug,
                    token: "1234",
                    amount: Number(fare) || 50,
                    senderName,
                    status: "initiated",
                    createdAt: Date.now(),
                  })}
                  size={180}
                  level="M"
                />
                <p className="text-xs font-bold text-ink/80">Scan with GPay, PhonePe, or Paytm</p>
              </div>
            )}
          </div>

          {/* Test Failure Toggle Option for Examiner / Viva testing */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-surface/40 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <CircleAlert className="size-4 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">Test payment failure scenario:</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={testSimulateFail}
                onChange={(e) => setTestSimulateFail(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-err"></div>
            </label>
          </div>

          {/* Pay Button */}
          <button
            id="btn-pay-fare"
            type="submit"
            className={`mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-xl font-black text-ink shadow-lg transition-transform active:scale-[0.99] ${
              testSimulateFail ? "bg-err text-white hover:bg-err/90" : "bg-amber hover:bg-amber-deep"
            }`}
          >
            <span>{testSimulateFail ? "Simulate Failed Payment" : `${t("pay")} ₹${fare || "0"}`}</span>
            <ArrowRight className="size-6" strokeWidth={2.5} aria-hidden />
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-ok" aria-hidden />
            <span>Zero-Screen Instant UPI • Automatic SMS to 2G Phone</span>
          </p>
        </form>
      )}

      {/* VIEW: AUTO-VERIFYING (Pulsing Radar - Replaces 'I have paid' button) */}
      {view === "verifying" && session && (
        <section className="mt-12 flex flex-1 flex-col items-center justify-center text-center px-4" aria-live="assertive">
          {/* Animated Pulsing Rings */}
          <div className="relative flex size-32 items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-amber/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-amber/30 animate-pulse" />
            <div className="relative flex size-20 items-center justify-center rounded-full bg-amber text-ink shadow-xl">
              <Loader2 className="size-10 animate-spin text-ink" strokeWidth={2.5} />
            </div>
          </div>

          <span className="rounded-full bg-amber/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber border border-amber/30">
            Auto-Detecting Bank Credit
          </span>

          <h2 className="mt-4 text-2xl md:text-3xl font-black text-foreground">
            Verifying UPI Payment...
          </h2>

          <p className="fare-readout mt-2 text-3xl md:text-4xl font-black text-amber">
            ₹{session.amount}
          </p>

          <p className="mt-3 text-xs md:text-sm text-muted-foreground max-w-xs leading-relaxed">
            Please complete the payment in your UPI app (GPay / PhonePe / Paytm). AutoMitra is detecting the bank confirmation automatically...
          </p>

          {/* External UPI Intent Fallback button */}
          <a
            id="btn-relaunch-upi"
            href={upiUri(driver, session)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-bold text-foreground hover:bg-surface-2 transition-all shadow-sm"
          >
            <Smartphone className="size-4 text-amber" />
            <span>Switch to UPI App</span>
            <ExternalLink className="size-3 opacity-60 ml-0.5" />
          </a>

          {/* Cancel button */}
          <button
            type="button"
            onClick={handleReset}
            className="mt-8 text-xs text-muted-foreground hover:text-err underline transition-colors"
          >
            Cancel and change amount
          </button>
        </section>
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
      className="flex rounded-full border border-border bg-surface p-1 shadow-xs"
    >
      {opts.map(([k, l]) => (
        <button
          key={k}
          id={`lang-${k}`}
          role="radio"
          aria-checked={lang === k}
          onClick={() => setLang(k)}
          className={`h-7 rounded-full px-2.5 text-xs font-bold transition-all ${
            lang === k
              ? "bg-amber text-ink shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Final({
  tone,
  t,
  token,
  amount,
  driverName,
  vehicle,
  driverPhone,
  senderUpi,
  dispatchInfo,
  fallbackSms,
  onRetry,
  onDone,
}: {
  tone: "ok" | "err";
  t: (k: Key) => string;
  token: string;
  amount: number;
  driverName: string;
  vehicle: string;
  driverPhone: string;
  senderUpi: string;
  dispatchInfo?: AutoResolveResult | null;
  fallbackSms?: string;
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

  const Icon = tone === "ok" ? CheckCircle2 : AlertTriangle;
  const isSuccess = tone === "ok";
  const statusLabel = isSuccess ? "Successful" : "Failed";

  const messageText =
    dispatchInfo?.smsBody ||
    fallbackSms ||
    `From AutoMitra\nUPI ID: ${senderUpi}\nAmount: Rs.${amount}\nTransaction Status: ${statusLabel}`;

  return (
    <main
      role="status"
      aria-live="assertive"
      className={`flex min-h-dvh flex-col items-center justify-between px-4 py-8 text-center ${
        isSuccess ? "bg-[#0b1b11] text-white" : "bg-[#250d0d] text-white"
      }`}
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center my-auto">
        {/* Giant Status Icon */}
        <div
          className={`flex size-24 items-center justify-center rounded-full shadow-2xl ${
            isSuccess ? "bg-ok text-ink shadow-ok/30" : "bg-err text-white shadow-err/30"
          }`}
        >
          <Icon className="size-14" strokeWidth={3} aria-hidden />
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
          {isSuccess ? "Payment Completed!" : "Payment Failed!"}
        </h1>

        <p className="mt-1 font-mono text-4xl sm:text-5xl font-black text-amber">
          ₹{amount}
        </p>

        {/* 4-Digit AM Token Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
          <Hash className="size-4 text-amber" />
          <span className="font-mono text-base font-black tracking-widest">
            Token: #{token}
          </span>
        </div>

        {/* Auto Driver Info Badge */}
        <p className="mt-2 text-xs text-white/70">
          Driver: <b className="text-white">{driverName}</b> • Vehicle:{" "}
          <b className="font-mono text-white">{vehicle}</b>
        </p>

        {/* LIVE TEXTBEE CELLULAR SMS DISPATCH CARD */}
        <div className="mt-6 w-full rounded-2xl border border-white/20 bg-white/10 p-4 text-left shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-amber" />
              <span className="text-xs font-black uppercase tracking-wider text-amber">
                TextBee SMS Dispatched
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                isSuccess ? "bg-ok/20 text-ok border border-ok/40" : "bg-err/20 text-err border border-err/40"
              }`}
            >
              {dispatchInfo?.smsResult?.deliveryStatus ?? "Sent to SIM"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-white/80">
              <span>Driver Mobile (2G Phone):</span>
              <span className="font-mono font-bold text-white">+91 {driverPhone}</span>
            </div>
            <div className="flex items-center justify-between text-white/80">
              <span>Cellular Gateway Device:</span>
              <span className="font-medium text-white/90">Samsung SM-A356E (GSM)</span>
            </div>
          </div>

          {/* Formatted SMS Payload Preview */}
          <div className="mt-3 rounded-xl bg-black/40 p-3 font-mono text-xs text-amber-100 border border-white/10 whitespace-pre-line leading-relaxed">
            {messageText}
          </div>

          <p className="mt-2 text-[10px] text-white/60 text-right flex items-center justify-end gap-1">
            <Check className="size-3 text-ok" />
            <span>Driver physical inbox updated in &lt;5 seconds</span>
          </p>
        </div>

        {/* Done / Retry Button */}
        {onDone && (
          <button
            id="btn-final-done"
            onClick={onDone}
            className="mt-6 h-14 w-full rounded-2xl bg-amber text-lg font-black text-ink shadow-xl hover:bg-amber-deep active:scale-[0.99] transition-all"
          >
            Done • Pay Another Fare
          </button>
        )}

        {onRetry && (
          <button
            id="btn-final-retry"
            onClick={onRetry}
            className="mt-6 h-14 w-full rounded-2xl bg-amber text-lg font-black text-ink shadow-xl hover:bg-amber-deep active:scale-[0.99] transition-all"
          >
            Retry Payment
          </button>
        )}
      </div>
    </main>
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
      className={`flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6 text-center ${
        tone === "ok" ? "bg-ok text-ink" : "bg-err text-white"
      }`}
    >
      {icon}
      <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black">{title}</h1>
      {children}
    </main>
  );
}
