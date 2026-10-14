import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Check,
  CarTaxiFront,
  PlusCircle,
  FileCheck,
  Sparkles,
  ExternalLink,
  QrCode,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Download,
  Lock,
  LogIn,
  Phone,
  User,
  CreditCard,
  Hash,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { addDriver, rotateQr, sendOtp, useStore, vpaCount, type Lang } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { downloadA6StickerPdf } from "@/lib/sticker-pdf";

export const Route = createFileRoute("/onboard")({
  head: () => ({
    meta: [
      { title: "Onboard a driver — AutoMitra" },
      {
        name: "description",
        content: "Register an auto driver, bind the family UPI ID, and print a QR sticker.",
      },
      { property: "og:title", content: "Onboard a driver — AutoMitra" },
      { property: "og:description", content: "One-time family setup and printable QR sticker." },
    ],
  }),
  component: Onboard,
});

const field =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 text-foreground transition-all placeholder:text-muted-foreground/60";

function Onboard() {
  const { user, isLoading } = useAuth();
  const { lang, t, tn } = useLang();
  const allDrivers = useStore((s) => s.drivers);
  // Only user-registered drivers (not demo seed) are shown on the onboard stickers page
  const drivers = allDrivers.filter((d) => d.active && !d.isSeed);
  const [activeTab, setActiveTab] = useState<"fleet" | "register">(() =>
    drivers.length > 0 ? "fleet" : "register",
  );

  const [f, setF] = useState({
    firstName: "",
    vehicle: "",
    driverPhone: "",
    proxyPhone: "",
    vpa: "",
    lang: "hi" as Lang,
  });
  const [otp, setOtp] = useState<string | null>(null);
  const [otpIn, setOtpIn] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-amber border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-amber/15 text-amber shadow-sm mb-6 border border-amber/20">
          <Lock className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Sign In Required
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
          Driver onboarding and dashboard QR sticker generation is restricted to authorized family proxies and administrators. Please sign in to register an auto, bind 2G keypad phones, and generate stickers.
        </p>

        <div className="mt-8 flex w-full flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            search={{ redirectTo: "/onboard" }}
            id="btn-onboard-signin"
            className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber px-6 font-bold text-ink shadow-md hover:bg-amber-deep transition-all active:scale-[0.99]"
          >
            <LogIn className="size-5" />
            <span>Sign In to Continue</span>
          </Link>

          <Link
            to="/"
            id="btn-onboard-back-home"
            className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </main>
    );
  }

  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setF({ ...f, [k]: e.target.value });
      setError("");
    };

  const handleFillDemo = () => {
    setF({
      firstName: "Suresh",
      vehicle: "MH02CD5678",
      driverPhone: "9820098765",
      proxyPhone: "9930054321",
      vpa: "sneha.patil@okaxis",
      lang: "mr",
    });
    setOtp("7842");
    setOtpIn("7842");
    setConsent(true);
    setError("");
    toast.info("Demo driver details filled!");
  };

  const handleSendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(f.driverPhone)) {
      setError("Enter a valid 10-digit driver phone before sending OTP.");
      return;
    }
    const code = sendOtp(f.driverPhone);
    setOtp(code);
    toast.success(`OTP ${code} sent to driver phone ${f.driverPhone}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = f.vehicle.toUpperCase().replace(/\s/g, "");
    if (!/^[6-9]\d{9}$/.test(f.driverPhone)) {
      return setError("Enter a valid 10-digit driver phone.");
    }
    if (!otp || otpIn !== otp) return setError("Verify the driver's phone with the OTP.");
    if (!f.firstName.trim()) return setError("Enter driver first name.");
    if (!/^MH\d{2}[A-Z]{1,3}\d{4}$/.test(vehicle)) {
      return setError("Vehicle number must match format like MH02AB1234.");
    }
    if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(f.vpa)) return setError("UPI ID must look like name@bank.");
    if (vpaCount(f.vpa) >= 3) return setError("This UPI ID already serves 3 drivers maximum.");
    if (!/^[6-9]\d{9}$/.test(f.proxyPhone)) return setError("Enter a valid 10-digit family phone.");
    if (!consent) return setError("Both consents are required.");

    const d = addDriver({ ...f, vehicle });
    setSelected(d.slug);
    setError("");
    setActiveTab("fleet");
    toast.success(`Driver ${d.firstName} (${d.vehicle}) onboarded! Unique QR Code generated.`);
  };

  const handleRotate = (slug: string) => {
    const nextSlug = rotateQr(slug);
    setSelected(nextSlug);
    toast.info(t("rotateQrBtn") + " — Old sticker deactivated, new QR active.");
  };

  const sel = drivers.find((d) => d.slug === selected) ?? drivers[drivers.length - 1];
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";
  const url = sel ? `${origin}/q/${sel.slug}` : "";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-2.5">
            <CarTaxiFront className="size-7 text-amber" />
            <span>{t("onboardTitle")}</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {drivers.length > 0
              ? t("onboardSubtitle")
              : "Enter the driver's phone number and details to generate their dashboard QR sticker."}
          </p>
        </div>

        {/* Tab switch — ONLY visible if user has onboarded at least 1 driver */}
        {drivers.length > 0 && (
          <div className="flex gap-1.5 rounded-xl border border-border bg-surface p-1 shadow-xs print:hidden shrink-0">
            <button
              id="tab-btn-fleet"
              onClick={() => setActiveTab("fleet")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-black transition-all ${
                activeTab === "fleet"
                  ? "bg-amber text-ink shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <QrCode className="size-4" />
              <span>
                {t("tabActiveStickers")} ({drivers.length})
              </span>
            </button>
            <button
              id="tab-btn-register"
              onClick={() => setActiveTab("register")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-black transition-all ${
                activeTab === "register"
                  ? "bg-amber text-ink shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusCircle className="size-4" />
              <span>{t("tabRegisterNew")}</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: FLEET & PRINTABLE STICKERS (Shown ONLY if user has onboarded drivers and tab is fleet) */}
      {drivers.length > 0 && activeTab === "fleet" && sel && (
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_340px]">
          {/* Main Sticker Preview */}
          <section className="space-y-6">
            {/* Auto selector pill bar */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                {t("vehicle")}:
              </span>
              {drivers.map((d) => (
                <button
                  key={d.slug}
                  id={`btn-select-driver-${d.slug}`}
                  onClick={() => setSelected(d.slug)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                    sel.slug === d.slug
                      ? "bg-amber text-ink shadow-md"
                      : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CarTaxiFront className="size-3.5" />
                  <span>{d.vehicle}</span>
                  <span className="opacity-80 font-normal">({tn(d.firstName)})</span>
                </button>
              ))}

              <button
                id="btn-fleet-add-new"
                type="button"
                onClick={() => setActiveTab("register")}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-amber/60 bg-amber/10 px-3.5 py-2 text-xs font-black text-amber hover:bg-amber/20 transition-all ml-auto"
              >
                <PlusCircle className="size-3.5" />
                <span>+ {t("tabRegisterNew")}</span>
              </button>
            </div>

            <div className="space-y-5">
              {/* Printable Dashboard Sticker Card */}
              <div
                className="print-sticker flex flex-col justify-between overflow-hidden rounded-2xl bg-paper text-ink shadow-2xl border-4 border-border/80 w-full max-w-[620px] aspect-[148/105]"
              >
                {/* Sticker Header Bar */}
                <div className="bg-amber px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-lg md:text-xl font-black text-ink flex items-center justify-between border-b-2 border-black/15 shrink-0">
                  <span className="flex items-center gap-1.5 sm:gap-2 tracking-tight">
                    <CarTaxiFront className="size-4 sm:size-6 text-ink" strokeWidth={2.5} />
                    {t("stickerBrand")}
                  </span>
                  <span className="text-[9px] sm:text-[11px] md:text-xs font-black uppercase tracking-wider bg-black/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-black/10">
                    {t("stickerTransit")}
                  </span>
                </div>

                {/* Sticker Main Content Body */}
                <div className="flex flex-row flex-1 items-center gap-2.5 sm:gap-5 p-2.5 sm:p-5 md:p-6 min-h-0">
                  {/* High-Resolution QR Box */}
                  <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border-2 border-black/15 bg-white p-1.5 sm:p-2.5 shadow-xs shrink-0">
                    <QRCodeSVG
                      value={url}
                      level="Q"
                      marginSize={1}
                      size={110}
                      className="size-20 xs:size-24 sm:size-36 md:size-44 w-auto h-auto"
                    />
                    <span className="mt-1 text-[8px] sm:text-[11px] font-black tracking-wide text-ink/75 uppercase text-center whitespace-nowrap">
                      {t("stickerScanQr")}
                    </span>
                  </div>

                  {/* Right Info Column */}
                  <div className="flex flex-1 flex-col justify-between self-stretch py-0.5 min-w-0 text-left">
                    {/* Vehicle Plate */}
                    <div>
                      <span className="inline-flex items-center gap-1 text-[8px] sm:text-xs font-black uppercase tracking-wider text-ink/60">
                        <CarTaxiFront className="size-2.5 sm:size-3.5 text-ink/75 shrink-0" />
                        <span>{t("stickerAutoLabel")}</span>
                      </span>
                      <p className="font-mono text-base xs:text-lg sm:text-3xl md:text-4xl font-black tracking-widest text-ink leading-tight truncate">
                        {sel.vehicle}
                      </p>
                    </div>

                    {/* Driver Name */}
                    <div className="mt-0.5 sm:mt-1">
                      <span className="text-[8px] sm:text-xs font-bold uppercase tracking-wider text-ink/60">
                        {t("stickerDriverLabel")}:
                      </span>
                      <p className="text-sm xs:text-base sm:text-2xl md:text-3xl font-black text-ink tracking-tight leading-tight truncate">
                        {tn(sel.firstName)}
                      </p>
                    </div>

                    {/* Slug ID Badge */}
                    <div className="mt-0.5 sm:mt-1">
                      <span className="font-mono text-[8px] sm:text-[11px] md:text-xs font-bold text-ink/80 bg-black/5 px-1.5 sm:px-2.5 py-0.5 rounded border border-black/10 inline-block">
                        {t("stickerSlugLabel")}: {sel.slug}
                      </span>
                    </div>

                    {/* Passenger Instruction Box */}
                    <div className="mt-1 sm:mt-2.5 rounded-lg sm:rounded-xl bg-black/[0.04] p-1.5 sm:p-2.5 border border-black/10 space-y-0.5 sm:space-y-1 text-left">
                      <p className="inline-flex items-center gap-1 text-[10px] sm:text-sm font-black text-ink leading-snug">
                        <QrCode className="size-2.5 sm:size-3.5 text-ink/80 shrink-0" />
                        <span>{t("stickerInstructionTitle")}</span>
                      </p>
                      <div className="flex items-center gap-1 pt-0.5 text-[8px] sm:text-[10px] font-black text-ink/80 flex-wrap">
                        <span className="rounded bg-black/10 px-1 py-0.5">
                          {t("stickerStep1")}
                        </span>
                        <ArrowRight className="size-2 sm:size-2.5 text-ink/60 shrink-0" />
                        <span className="rounded bg-black/10 px-1 py-0.5">
                          {t("stickerStep2")}
                        </span>
                        <ArrowRight className="size-2 sm:size-2.5 text-ink/60 shrink-0" />
                        <span className="rounded bg-amber px-1 py-0.5 text-ink">
                          {t("stickerStep3")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticker Security Bottom Strip */}
                <div className="bg-black/[0.03] px-3 sm:px-5 py-1 sm:py-1.5 flex items-center justify-between text-[8px] sm:text-[11px] font-bold text-ink/75 border-t border-black/10 shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="size-2.5 sm:size-3.5 text-ink/80 shrink-0" />
                    <span>{t("stickerSecurityVerify")}</span>
                  </span>
                  <span className="font-mono text-[8px] sm:text-[10px] opacity-75">AM-MUMBAI-2026</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 print:hidden max-w-[620px]">
                <button
                  id="btn-print-sticker"
                  onClick={() => window.print()}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-amber font-black text-ink shadow-md hover:bg-amber-deep transition-all active:scale-[0.99] text-xs sm:text-sm"
                >
                  <Printer className="size-4" /> {t("printStickerBtn")}
                </button>
                <button
                  id="btn-download-pdf"
                  onClick={async () => {
                    try {
                      await downloadA6StickerPdf({
                        driverName: sel.firstName,
                        vehicleNumber: sel.vehicle,
                        slug: sel.slug,
                        vpa: sel.vpa,
                      });
                      toast.success("A6 PDF sticker downloaded!");
                    } catch {
                      toast.error("Failed to generate PDF");
                    }
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-amber bg-amber/10 font-black text-amber hover:bg-amber hover:text-ink transition-all active:scale-[0.99] text-xs sm:text-sm"
                >
                  <Download className="size-4" /> Download A6 PDF
                </button>
                <button
                  id="btn-rotate-qr"
                  onClick={() => handleRotate(sel.slug)}
                  className="col-span-2 sm:col-span-1 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface font-bold text-foreground hover:border-amber transition-all text-xs sm:text-sm"
                >
                  <RefreshCw className="size-4 text-amber" /> {t("rotateQrBtn")}
                </button>
              </div>

              <div className="max-w-[620px] print:hidden">
                <Link
                  to="/q/$slug"
                  params={{ slug: sel.slug }}
                  id="link-open-commuter"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm font-bold text-amber hover:border-amber transition-colors"
                >
                  <span>
                    Test Commuter UPI Page: {sel.vehicle} ({tn(sel.firstName)})
                  </span>
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Sidebar Driver Details */}
          <aside className="space-y-4 print:hidden">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <FileCheck className="size-5 text-amber" /> {t("driverDetailsTitle")}
              </h2>
              <dl className="mt-4 space-y-3 text-xs">
                <div>
                  <dt className="text-muted-foreground font-semibold">{t("driverFirstName")}</dt>
                  <dd className="font-bold text-foreground text-sm">{tn(sel.firstName)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-semibold">{t("vehicleNumber")}</dt>
                  <dd className="font-mono font-bold text-foreground text-sm">{sel.vehicle}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-semibold">{t("driverKeypadPhone")}</dt>
                  <dd className="font-mono font-bold text-amber text-sm">{sel.driverPhone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-semibold">{t("familyPhone")}</dt>
                  <dd className="font-mono font-semibold text-foreground">{sel.proxyPhone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-semibold">{t("familyUpiId")}</dt>
                  <dd className="font-mono font-semibold text-amber">{sel.vpa}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-semibold">{t("driverSmsLang")}</dt>
                  <dd className="font-bold uppercase text-foreground">{sel.lang}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface-2 p-4 text-xs text-muted-foreground space-y-2">
              <p className="inline-flex items-center gap-1.5 font-bold text-foreground">
                <Lightbulb className="size-4 text-amber shrink-0" />
                <span>{t("stickerGuidanceTitle")}</span>
              </p>
              <p>{t("stickerGuidanceDesc")}</p>
            </div>
          </aside>
        </div>
      )}

      {/* VIEW 2: REGISTER NEW AUTO / ONBOARD FORM (Shown if tab is register OR if no drivers exist yet) */}
      {(drivers.length === 0 || activeTab === "register") && (
        <div className="mt-6 max-w-2xl mx-auto rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-6 gap-3">
            <div>
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <Smartphone className="size-5 text-amber" />
                <span>Register Driver & 2G Keypad Phone</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                SMS transaction alerts will be sent directly to this driver number.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {drivers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("fleet")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Stickers ({drivers.length})</span>
                </button>
              )}
              <button
                id="btn-fill-demo"
                type="button"
                onClick={handleFillDemo}
                className="flex items-center gap-1.5 rounded-lg border border-amber/40 bg-surface-2 px-3 py-1.5 text-xs font-bold text-amber hover:border-amber transition-colors"
              >
                <Sparkles className="size-3.5" /> Auto-fill Demo
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* 1. Driver 2G Keypad Phone (Primary requirement) */}
            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("driverKeypadPhone")} *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-bold text-muted-foreground select-none">
                    +91
                  </span>
                  <input
                    id="input-driver-phone"
                    className={`${field} pl-12 font-mono text-sm tracking-wider`}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9082943684"
                    value={f.driverPhone}
                    onChange={set("driverPhone")}
                  />
                </div>
                <button
                  id="btn-send-otp"
                  type="button"
                  onClick={handleSendOtp}
                  className="h-12 shrink-0 rounded-xl border-2 border-amber px-4 font-black text-amber hover:bg-amber hover:text-ink transition-all active:scale-[0.98] text-xs uppercase tracking-wide"
                >
                  {t("sendOtpBtn")}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                All passenger payment SMS (Pending, Successful, Failed) will go to this number.
              </p>
            </div>

            {/* OTP Verification Input */}
            {otp && (
              <div className="rounded-2xl border border-amber/30 bg-amber/5 p-4 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  {t("enterOtp")}{" "}
                  <span className="text-amber font-mono font-black">(Demo OTP: {otp})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-driver-otp"
                    className={`${field} font-mono tracking-widest text-center text-lg font-black max-w-[200px]`}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    placeholder="••••"
                    value={otpIn}
                    onChange={(e) => setOtpIn(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setOtpIn(otp)}
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Quick-Paste OTP
                  </button>
                </div>
              </div>
            )}

            {/* 2. Driver Name & Auto Vehicle Number */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("driverFirstName")} *
                </label>
                <input
                  id="input-driver-name"
                  className={field}
                  placeholder="e.g. Ramesh"
                  value={f.firstName}
                  onChange={set("firstName")}
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("vehicleNumber")} *
                </label>
                <input
                  id="input-vehicle-no"
                  className={`${field} uppercase font-mono tracking-wider`}
                  placeholder="MH02AB1234"
                  value={f.vehicle}
                  onChange={set("vehicle")}
                />
              </div>
            </div>

            {/* 3. Family UPI ID & Family Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("familyUpiId")} *
                </label>
                <input
                  id="input-family-vpa"
                  className={field}
                  placeholder="name@okaxis"
                  value={f.vpa}
                  onChange={set("vpa")}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Fares will be received in this UPI bank account.
                </p>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("familyPhone")} *
                </label>
                <input
                  id="input-proxy-phone"
                  className={field}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9930054321"
                  value={f.proxyPhone}
                  onChange={set("proxyPhone")}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  For proxy console login & backup alerts.
                </p>
              </div>
            </div>

            {/* 4. Driver SMS Language */}
            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("driverSmsLang")}
              </label>
              <select
                id="select-driver-lang"
                className={field}
                value={f.lang}
                onChange={set("lang")}
              >
                <option value="en">English (From AutoMitra / UPI ID: ... / Amount: ...)</option>
                <option value="hi">हिन्दी — Hindi (सफल / विफल / लंबित)</option>
                <option value="mr">मराठी — Marathi (यशस्वी / अयशस्वी / प्रलंबित)</option>
              </select>
            </div>

            {/* 5. Consent Checkbox */}
            <label className="flex gap-3 rounded-2xl border border-border bg-surface-2 p-4 text-xs cursor-pointer hover:border-amber/50 transition-colors">
              <input
                id="cb-consent"
                type="checkbox"
                className="mt-0.5 size-4 accent-amber shrink-0 cursor-pointer"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-muted-foreground leading-relaxed select-none">
                {t("consentText")}
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-bold text-destructive" role="alert">
                {error}
              </div>
            )}

            <button
              id="btn-create-sticker"
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber text-base font-black text-ink shadow-lg hover:bg-amber-deep transition-all active:scale-[0.99]"
            >
              <QrCode className="size-5" />
              <span>{t("createStickerBtn")}</span>
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
