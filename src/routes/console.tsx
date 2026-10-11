import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  X,
  AlertTriangle,
  ArrowLeft,
  SlidersHorizontal,
  Edit3,
  Hash,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { confirm, reject, useStore, type Session } from "@/lib/store";
import { useLang, type Key } from "@/lib/i18n";
import { soundbox } from "@/lib/audio";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Family Proxy Console — AutoMitra" },
      {
        name: "description",
        content:
          "Confirm or reject claimed auto fares after checking the real UPI credit, and see the driver's SMS.",
      },
      { property: "og:title", content: "Family Proxy Console — AutoMitra" },
      {
        property: "og:description",
        content: "Confirm real UPI credits so the driver gets a CONFIRMED SMS.",
      },
    ],
  }),
  component: Console,
});

type Filter = "awaiting" | "confirmed" | "failed";

function Console() {
  const { lang, t, tn } = useLang();
  const sessions = useStore((s) => s.sessions);
  const drivers = useStore((s) => s.drivers);
  const sms = useStore((s) => s.sms);
  const [filter, setFilter] = useState<Filter>("awaiting");
  const [selectedDriverSlug, setSelectedDriverSlug] = useState<string>("all");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [searchToken, setSearchToken] = useState<string>("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const activeDrivers = drivers.filter((d) => d.active);

  // Filter sessions by status and by selected driver and optional AM token search
  const matchStatus = (s: Session) =>
    filter === "awaiting"
      ? ["claimed", "handed_off"].includes(s.status)
      : filter === "confirmed"
        ? s.status === "confirmed"
        : ["rejected", "cancelled", "expired"].includes(s.status);

  const matchToken = (s: Session) => {
    if (!searchToken.trim()) return true;
    const cleanSearch = searchToken.trim().replace(/^AM/i, "");
    return s.token.includes(cleanSearch);
  };

  const filteredSessions = sessions.filter(
    (s) =>
      matchStatus(s) &&
      (selectedDriverSlug === "all" || s.slug === selectedDriverSlug) &&
      matchToken(s),
  );

  // Active driver for keypad phone simulation
  const targetDriver =
    selectedDriverSlug !== "all"
      ? drivers.find((d) => d.slug === selectedDriverSlug)
      : activeDrivers[0] || drivers[0];

  const targetPhone = targetDriver?.driverPhone;
  const driverSms = sms.filter((m) => !targetPhone || m.to === targetPhone);

  const handleConfirm = (id: string, amount?: number) => {
    const s = sessions.find((x) => x.id === id);
    confirm(id, amount);
    soundbox.playSuccessChime();
    const finalAmt = amount ?? s?.amount ?? 0;
    toast.success(
      `Confirmed fare from ${s?.senderName || "Test xyz"} for ₹${finalAmt}. SMS dispatched.`,
    );
    setEditingSessionId(null);
  };

  const handleReject = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    reject(id);
    soundbox.playRejectBuzz();
    toast.error(`Rejected fare from ${s?.senderName || "Test xyz"}. Status: Failed SMS sent.`);
    setEditingSessionId(null);
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:grid-cols-[1fr_340px]">
      <section>
        <Link
          to="/"
          id="link-console-home"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("navHome")}
        </Link>
        <h1 className="mt-2 text-3xl font-black text-foreground">{t("proxyConsole")}</h1>
        <p className="text-muted-foreground text-sm">{t("proxySubtitle")}</p>

        {/* Driver Vehicle Filter */}
        {activeDrivers.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <SlidersHorizontal className="size-3.5" /> {t("vehicle")}:
            </span>
            <button
              id="btn-filter-vehicle-all"
              onClick={() => setSelectedDriverSlug("all")}
              className={`h-8 rounded-lg px-3 text-xs font-bold transition-colors ${
                selectedDriverSlug === "all"
                  ? "bg-amber text-ink shadow-sm"
                  : "border border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              All Autos ({activeDrivers.length})
            </button>
            {activeDrivers.map((d) => (
              <button
                key={d.slug}
                id={`btn-filter-vehicle-${d.slug}`}
                onClick={() => setSelectedDriverSlug(d.slug)}
                className={`h-8 rounded-lg px-3 text-xs font-bold transition-colors ${
                  selectedDriverSlug === d.slug
                    ? "bg-amber text-ink shadow-sm"
                    : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.vehicle} ({tn(d.firstName)})
              </button>
            ))}
          </div>
        )}

        {/* Status Filters */}
        <div className="mt-5 flex gap-2">
          {(["awaiting", "confirmed", "failed"] as Filter[]).map((f) => {
            const count = sessions.filter(
              (s) =>
                (f === "awaiting"
                  ? ["claimed", "handed_off"].includes(s.status)
                  : f === "confirmed"
                    ? s.status === "confirmed"
                    : ["rejected", "cancelled", "expired"].includes(s.status)) &&
                (selectedDriverSlug === "all" || s.slug === selectedDriverSlug),
            ).length;
            const label =
              f === "awaiting"
                ? t("awaitingTab")
                : f === "confirmed"
                  ? t("confirmedTab")
                  : t("failedTab");

            return (
              <button
                key={f}
                id={`tab-filter-${f}`}
                onClick={() => setFilter(f)}
                className={`h-10 rounded-full px-4 text-sm font-bold capitalize transition-all ${
                  filter === f
                    ? "bg-amber text-ink shadow-md"
                    : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {label} <span className="tabular-nums font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Quick AM Token Search Input (TASK-15 / TASK-23) */}
        <div className="mt-4 flex items-center rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-amber transition-colors">
          <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
          <input
            id="input-token-search"
            type="text"
            placeholder="Search by 4-digit AM token (e.g. 4827 or AM4827)..."
            value={searchToken}
            onChange={(e) => setSearchToken(e.target.value)}
            className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground font-mono"
          />
          {searchToken && (
            <button
              onClick={() => setSearchToken("")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Session List */}
        <ul className="mt-4 space-y-3">
          {filteredSessions.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              {searchToken
                ? `No sessions found matching AM token "${searchToken}"`
                : t("emptySessions")}
            </li>
          )}
          {filteredSessions.map((s) => {
            const d = drivers.find((x) => x.slug === s.slug);
            const secs = Math.floor((now - (s.claimedAt ?? s.createdAt)) / 1000);
            const isEditing = editingSessionId === s.id;

            return (
              <li
                key={s.id}
                id={`session-${s.id}`}
                className="rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    {/* Sender's Name & AM Token Badge Prominent */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("senderNameLabel")}:
                      </span>
                      <span className="text-xl font-black text-foreground">
                        {tn(s.senderName || "Test xyz")}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-amber/15 text-amber px-2 py-0.5 rounded border border-amber/30">
                        <Hash className="size-3" />
                        AM{s.token}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("amountLabel")}:
                      </span>
                      <span className="text-2xl font-black text-amber">
                        ₹{s.creditedAmount ?? s.amount}
                        {s.creditedAmount && s.creditedAmount !== s.amount && (
                          <span className="text-xs ml-2 text-err font-medium line-through">
                            ₹{s.amount}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Status & Token */}
                    <div className="flex items-center gap-2 text-xs pt-0.5">
                      <span className="font-bold text-muted-foreground uppercase">
                        {t("statusLabel")}:
                      </span>
                      <span
                        className={`font-black ${
                          s.status === "confirmed"
                            ? "text-ok"
                            : ["rejected", "cancelled", "expired"].includes(s.status)
                              ? "text-err"
                              : "text-amber"
                        }`}
                      >
                        {s.status === "confirmed"
                          ? t("statusSuccess")
                          : ["rejected", "cancelled", "expired"].includes(s.status)
                            ? t("statusFailed")
                            : t("statusPending")}
                      </span>
                      <span className="font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded text-[11px] border border-border/50">
                        Token: AM{s.token}
                      </span>
                    </div>

                    {/* Driver & Vehicle */}
                    <p className="text-xs text-muted-foreground pt-1">
                      {t("driver")}: <b className="text-foreground">{tn(d?.firstName || "")}</b> ·{" "}
                      {t("vehicle")}:{" "}
                      <span className="font-mono text-foreground font-semibold">{d?.vehicle}</span>
                    </p>
                  </div>
                  <StatusPill s={s} secs={secs} t={t} />
                </div>

                {filter === "awaiting" && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    {isEditing ? (
                      <div className="rounded-lg bg-surface-2 p-3 space-y-2">
                        <label
                          htmlFor={`input-amount-${s.id}`}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          Actual amount received in bank (INR):
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber">₹</span>
                          <input
                            id={`input-amount-${s.id}`}
                            type="number"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="h-10 w-32 rounded-lg border border-border bg-surface px-3 font-mono font-bold text-foreground outline-none focus:border-amber"
                            placeholder={String(s.amount)}
                          />
                          <button
                            id={`btn-confirm-custom-${s.id}`}
                            onClick={() => handleConfirm(s.id, Number(customAmount) || s.amount)}
                            className="h-10 rounded-lg bg-ok px-4 text-sm font-black text-ink shadow hover:opacity-90"
                          >
                            {t("confirmBtn")} ₹{customAmount || s.amount}
                          </button>
                          <button
                            id={`btn-cancel-custom-${s.id}`}
                            onClick={() => setEditingSessionId(null)}
                            className="h-10 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            id={`btn-confirm-${s.id}`}
                            onClick={() => handleConfirm(s.id)}
                            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-ok font-black text-ink shadow hover:opacity-90 active:scale-[0.99]"
                          >
                            <Check className="size-5" /> {t("confirmBtn")} ₹{s.amount}
                          </button>
                          <button
                            id={`btn-reject-${s.id}`}
                            onClick={() => handleReject(s.id)}
                            className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-err bg-transparent font-extrabold text-err hover:bg-err/10"
                          >
                            <X className="size-5" /> {t("rejectBtn")}
                          </button>
                        </div>
                        <button
                          id={`btn-edit-amount-${s.id}`}
                          onClick={() => {
                            setEditingSessionId(s.id);
                            setCustomAmount(String(s.amount));
                          }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber underline pt-1"
                        >
                          <Edit3 className="size-3.5" /> Commuter paid different amount? Adjust
                          credited fare
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {filter === "awaiting" && s.status === "claimed" && secs > 20 && (
                  <p className="mt-2 text-xs font-semibold text-amber">
                    ⚠️ Reminder: commuter is waiting {secs}s at destination.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Driver Simulated 2G Keypad Inbox */}
      <aside aria-label="Driver keypad phone" className="print:hidden">
        <div className="sticky top-6 rounded-[2rem] border-4 border-surface-2 bg-surface p-4 shadow-xl">
          <div className="border-b border-border pb-3">
            <p className="flex items-center gap-2 font-bold text-foreground">
              <Smartphone className="size-5 text-amber" />
              <span>
                {tn(targetDriver?.firstName || "Driver")} ({targetDriver?.vehicle})
              </span>
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              SIM phone: {targetPhone || "No driver phone"}
            </p>
            <p className="text-xs text-amber mt-0.5 font-bold">{t("simulatedInbox")}</p>
          </div>

          <ul className="mt-3 max-h-[60vh] space-y-2 overflow-auto pr-1">
            {driverSms.length === 0 && (
              <li className="text-sm text-muted-foreground py-4 text-center">
                No SMS messages yet.
              </li>
            )}
            {driverSms.map((m) => (
              <li
                key={m.id}
                className={`rounded-lg border-l-4 bg-surface-2 p-3 font-mono text-xs ${
                  m.kind === "confirm"
                    ? "border-ok"
                    : m.kind === "void"
                      ? "border-err"
                      : "border-amber"
                }`}
              >
                <div className="flex items-center justify-between text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1 font-semibold uppercase text-[10px]">
                    <MessageSquare className="size-3" aria-hidden /> {m.kind} SMS
                  </span>
                  <span className="text-[10px]">{new Date(m.at).toLocaleTimeString()}</span>
                </div>
                {/* Formatted SMS Body */}
                <p className="text-foreground whitespace-pre-line font-bold leading-relaxed">
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}

function StatusPill({ s, secs, t }: { s: Session; secs: number; t: (k: Key) => string }) {
  if (s.status === "confirmed") {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ok px-3 text-xs font-black text-ink shadow-sm">
        <ShieldCheck className="size-4" /> {t("statusSuccess")}
      </span>
    );
  }
  if (["rejected", "cancelled", "expired"].includes(s.status)) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-err px-3 text-xs font-bold capitalize text-white shadow-sm">
        <AlertTriangle className="size-4" /> {t("statusFailed")}
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber px-3 text-xs font-black text-ink shadow-sm">
      <Clock className="size-4" />{" "}
      {s.status === "claimed" ? `Claimed ${secs}s` : t("statusPending")}
    </span>
  );
}
