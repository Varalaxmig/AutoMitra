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
  "h-13 w-full rounded-xl border-2 border-border bg-surface px-4 text-base outline-none focus:border-amber text-foreground transition-colors";

function Onboard() {
  const { user, isLoading } = useAuth();
  const { lang, t, tn } = useLang();
  const allDrivers = useStore((s) => s.drivers);
  const drivers = allDrivers.filter((d) => d.active);
  const [activeTab, setActiveTab] = useState<"fleet" | "register">("fleet");

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
    toast.success(`OTP ${code} simulated to driver phone ${f.driverPhone}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = f.vehicle.toUpperCase().replace(/\s/g, "");
    if (!f.firstName.trim()) return setError("Enter driver first name.");
    if (!/^MH\d{2}[A-Z]{1,3}\d{4}$/.test(vehicle))
      return setError("Vehicle number must match format like MH02AB1234.");
    if (!/^[6-9]\d{9}$/.test(f.proxyPhone)) return setError("Enter a valid 10-digit family phone.");
    if (!/^[6-9]\d{9}$/.test(f.driverPhone))
      return setError("Enter a valid 10-digit driver phone.");
    if (!otp || otpIn !== otp) return setError("Verify the driver's phone with the OTP.");
    if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(f.vpa)) return setError("UPI ID must look like name@bank.");
    if (vpaCount(f.vpa) >= 3) return setError("This UPI ID already serves 3 drivers maximum.");
    if (!consent) return setError("Both consents are required.");

    const d = addDriver({ ...f, vehicle });
    setSelected(d.slug);
    setError("");
    setActiveTab("fleet");
    toast.success(`Driver ${d.firstName} (${d.vehicle}) onboarded successfully!`);
  };

  const handleRotate = (slug: string) => {
    const nextSlug = rotateQr(slug);
    setSelected(nextSlug);
    toast.info(t("rotateQrBtn") + " — Old sticker deactivated.");
  };

  const sel = drivers.find((d) => d.slug === selected) ?? drivers[0];
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";
  const url = sel ? `${origin}/q/${sel.slug}` : "";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground">{t("onboardTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("onboardSubtitle")}</p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 rounded-xl border border-border bg-surface p-1 shadow-sm print:hidden">
          <button
            id="tab-btn-fleet"
            onClick={() => setActiveTab("fleet")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black transition-all ${
              activeTab === "fleet"
                ? "bg-amber text-ink shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CarTaxiFront className="size-4" />
            <span>
              {t("tabActiveStickers")} ({drivers.length})
            </span>
          </button>
          <button
            id="tab-btn-register"
            onClick={() => setActiveTab("register")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black transition-all ${
              activeTab === "register"
                ? "bg-amber text-ink shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="size-4" />
            <span>{t("tabRegisterNew")}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FLEET & PRINTABLE STICKERS */}
      {activeTab === "fleet" && (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_340px]">
          {/* Main Sticker Preview */}
          <section className="space-y-6">
            {/* Auto selector bar */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("vehicle")}:
              </span>
              {drivers.map((d) => (
                <button
                  key={d.slug}
                  id={`btn-select-driver-${d.slug}`}
                  onClick={() => setSelected(d.slug)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                    sel?.slug === d.slug
                      ? "bg-amber text-ink shadow-md"
                      : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{d.vehicle}</span>
                  <span className="opacity-80">({tn(d.firstName)})</span>
                </button>
              ))}
              <button
                id="btn-fleet-add-new"
                type="button"
                onClick={() => setActiveTab("register")}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-amber/60 bg-amber/10 px-3.5 py-2 text-xs font-black text-amber hover:bg-amber/20 transition-all"
              >
                <PlusCircle className="size-3.5" />
                <span>+ {t("tabRegisterNew")}</span>
              </button>
            </div>

            {sel ? (
              <div className="space-y-6">
                {/* Printable Dashboard Sticker Card */}
                <div
                  className="print-sticker flex flex-col justify-between overflow-hidden rounded-2xl bg-paper text-ink shadow-2xl border-4 border-border/80"
                  style={{ aspectRatio: "148 / 105", maxWidth: "620px" }}
                >
                  {/* Sticker Header Bar */}
                  <div className="bg-amber px-5 py-3 text-lg md:text-xl font-black text-ink flex items-center justify-between border-b-2 border-black/15 shrink-0">
                    <span className="flex items-center gap-2 tracking-tight">
                      <CarTaxiFront className="size-6 text-ink" strokeWidth={2.5} />
                      {t("stickerBrand")}
                    </span>
                    <span className="text-[11px] md:text-xs font-black uppercase tracking-wider bg-black/10 px-2.5 py-1 rounded-full border border-black/10">
                      {t("stickerTransit")}
                    </span>
                  </div>

                  {/* Sticker Main Content Body */}
                  <div className="flex flex-1 items-center gap-5 p-5 md:p-6">
                    {/* High-Resolution QR Box */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-black/15 bg-white p-2.5 shadow-sm shrink-0">
                      <QRCodeSVG value={url} level="Q" marginSize={1} size={200} />
                      <span className="mt-1.5 text-[10px] md:text-[11px] font-black tracking-wide text-ink/75 uppercase text-center">
                        {t("stickerScanQr")}
                      </span>
                    </div>

                    {/* Right Info Column (Enlarged to fill space) */}
                    <div className="flex flex-1 flex-col justify-between self-stretch py-0.5 min-w-0">
                      {/* Vehicle Plate */}
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-wider text-ink/60">
                          <CarTaxiFront className="size-3.5 text-ink/75 shrink-0" />
                          <span>{t("stickerAutoLabel")}</span>
                        </span>
                        <p className="font-mono text-3xl md:text-4xl font-black tracking-widest text-ink leading-tight">
                          {sel.vehicle}
                        </p>
                      </div>

                      {/* Driver Name */}
                      <div className="mt-1">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-ink/60">
                          {t("stickerDriverLabel")}:
                        </span>
                        <p className="text-2xl md:text-3xl font-black text-ink tracking-tight leading-tight">
                          {tn(sel.firstName)}
                        </p>
                      </div>

                      {/* Slug ID Badge */}
                      <div className="mt-1">
                        <span className="font-mono text-[11px] md:text-xs font-bold text-ink/80 bg-black/5 px-2.5 py-0.5 rounded-md border border-black/10">
                          {t("stickerSlugLabel")}: {sel.slug}
                        </span>
                      </div>

                      {/* Passenger Instruction Box */}
                      <div className="mt-2.5 rounded-xl bg-black/[0.04] p-2.5 border border-black/10 space-y-1">
                        <p className="inline-flex items-center gap-1.5 text-xs md:text-sm font-black text-ink leading-snug">
                          <QrCode className="size-3.5 text-ink/80 shrink-0" />
                          <span>{t("stickerInstructionTitle")}</span>
                        </p>
                        <p className="text-[11px] md:text-xs font-bold text-ink/80 leading-snug">
                          {t("stickerInstructionSubtitle")}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1 text-[10px] font-black text-ink/80 flex-wrap">
                          <span className="rounded bg-black/10 px-1.5 py-0.5">
                            {t("stickerStep1")}
                          </span>
                          <ArrowRight className="size-2.5 text-ink/60 shrink-0" />
                          <span className="rounded bg-black/10 px-1.5 py-0.5">
                            {t("stickerStep2")}
                          </span>
                          <ArrowRight className="size-2.5 text-ink/60 shrink-0" />
                          <span className="rounded bg-amber px-1.5 py-0.5 text-ink">
                            {t("stickerStep3")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sticker Security Bottom Strip */}
                  <div className="bg-black/[0.03] px-5 py-1.5 flex items-center justify-between text-[10px] md:text-[11px] font-bold text-ink/75 border-t border-black/10 shrink-0">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-ink/80 shrink-0" />
                      <span>{t("stickerSecurityVerify")}</span>
                    </span>
                    <span className="font-mono text-[10px] opacity-75">AM-MUMBAI-2026</span>
                  </div>
                </div>

                {/* Sticker Action Buttons */}
                <div className="flex flex-wrap gap-3 print:hidden max-w-[620px]">
                  <button
                    id="btn-print-sticker"
                    onClick={() => window.print()}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-amber font-black text-ink shadow-lg hover:bg-amber-deep transition-all active:scale-[0.99]"
                  >
                    <Printer className="size-5" /> {t("printStickerBtn")}
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
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-amber bg-amber/10 font-black text-amber hover:bg-amber hover:text-ink transition-all active:scale-[0.99]"
                  >
                    <Download className="size-5" /> Download A6 PDF
                  </button>
                  <button
                    id="btn-rotate-qr"
                    onClick={() => handleRotate(sel.slug)}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border bg-surface font-bold text-foreground hover:border-amber transition-all"
                  >
                    <RefreshCw className="size-5 text-amber" /> {t("rotateQrBtn")}
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
                      {t("navCommuter")}: {sel.vehicle} ({tn(sel.firstName)})
                    </span>
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                No active auto found. Click "Register New Auto" to add one.
              </div>
            )}
          </section>

          {/* Sidebar Info Card */}
          <aside className="space-y-4 print:hidden">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <FileCheck className="size-5 text-amber" /> {t("driverDetailsTitle")}
              </h2>
              {sel && (
                <dl className="mt-4 space-y-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">{t("driverFirstName")}</dt>
                    <dd className="font-bold text-foreground text-sm">{tn(sel.firstName)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("vehicleNumber")}</dt>
                    <dd className="font-mono font-bold text-foreground text-sm">{sel.vehicle}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("driverKeypadPhone")}</dt>
                    <dd className="font-mono font-semibold text-foreground">{sel.driverPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("familyPhone")}</dt>
                    <dd className="font-mono font-semibold text-foreground">{sel.proxyPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("familyUpiId")}</dt>
                    <dd className="font-mono font-semibold text-amber">{sel.vpa}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("driverSmsLang")}</dt>
                    <dd className="font-bold uppercase text-foreground">{sel.lang}</dd>
                  </div>
                </dl>
              )}
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

      {/* TAB 2: REGISTER NEW AUTO */}
      {activeTab === "register" && (
        <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-foreground">{t("tabRegisterNew")}</h2>
              <p className="text-xs text-muted-foreground">
                Fill driver and family account details below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("fleet")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5 text-muted-foreground shrink-0" />
                <span>{t("tabActiveStickers")}</span>
              </button>
              <button
                id="btn-fill-demo"
                type="button"
                onClick={handleFillDemo}
                className="flex items-center gap-1.5 rounded-lg border border-amber/40 bg-surface-2 px-3 py-1.5 text-xs font-bold text-amber hover:border-amber transition-colors"
              >
                <Sparkles className="size-3.5" /> Auto-fill Demo Driver
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <L t={t("driverFirstName")}>
              <input
                id="input-driver-name"
                className={field}
                placeholder="e.g. Ramesh"
                value={f.firstName}
                onChange={set("firstName")}
              />
            </L>

            <L t={t("vehicleNumber")}>
              <input
                id="input-vehicle-no"
                className={`${field} uppercase font-mono`}
                placeholder="MH02AB1234"
                value={f.vehicle}
                onChange={set("vehicle")}
              />
            </L>

            <L t={t("familyPhone")}>
              <input
                id="input-proxy-phone"
                className={field}
                inputMode="numeric"
                placeholder="9930054321"
                value={f.proxyPhone}
                onChange={set("proxyPhone")}
              />
            </L>

            <L t={t("driverKeypadPhone")}>
              <div className="flex gap-2">
                <input
                  id="input-driver-phone"
                  className={field}
                  inputMode="numeric"
                  placeholder="9820012345"
                  value={f.driverPhone}
                  onChange={set("driverPhone")}
                />
                <button
                  id="btn-send-otp"
                  type="button"
                  onClick={handleSendOtp}
                  className="h-13 shrink-0 rounded-xl border-2 border-amber px-4 font-black text-amber hover:bg-amber/10 transition-colors"
                >
                  {t("sendOtpBtn")}
                </button>
              </div>
            </L>

            {otp && (
              <L t={`${t("enterOtp")} (demo code: ${otp})`}>
                <input
                  id="input-driver-otp"
                  className={field}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4-digit OTP"
                  value={otpIn}
                  onChange={(e) => setOtpIn(e.target.value)}
                />
              </L>
            )}

            <L t={t("familyUpiId")}>
              <input
                id="input-family-vpa"
                className={field}
                placeholder="name@okaxis"
                value={f.vpa}
                onChange={set("vpa")}
              />
            </L>

            <L t={t("driverSmsLang")}>
              <select
                id="select-driver-lang"
                className={field}
                value={f.lang}
                onChange={set("lang")}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </L>

            <label className="flex gap-3 rounded-xl border border-border bg-surface-2 p-4 text-xs cursor-pointer">
              <input
                id="cb-consent"
                type="checkbox"
                className="mt-0.5 size-4 accent-amber"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-muted-foreground leading-relaxed">{t("consentText")}</span>
            </label>

            {error && (
              <p className="font-bold text-err text-xs" role="alert">
                {error}
              </p>
            )}

            <button
              id="btn-create-sticker"
              type="submit"
              className="h-14 w-full rounded-xl bg-amber text-lg font-black text-ink shadow-lg hover:bg-amber-deep transition-all active:scale-[0.99]"
            >
              {t("createStickerBtn")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold text-xs text-muted-foreground uppercase tracking-wider">
        {t}
      </span>
      {children}
    </label>
  );
}
