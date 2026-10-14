import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CarTaxiFront,
  QrCode,
  Smartphone,
  CheckCircle2,
  Clock,
  IndianRupee,
  Share2,
  ExternalLink,
  PhoneCall,
  Inbox,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useStore, type Session } from "@/lib/store";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver Dashboard — AutoMitra" },
      {
        name: "description",
        content: "Track your rides, confirmed UPI fares, and 2G SMS deliveries.",
      },
    ],
  }),
  component: DriverDashboardPage,
});

function DriverDashboardPage() {
  return (
    <ProtectedRoute requiredRole="driver">
      <DriverDashboard />
    </ProtectedRoute>
  );
}

function DriverDashboard() {
  const { user, profile, signOut } = useAuth();
  const { lang, t, tn } = useLang();
  const drivers = useStore((s) => s.drivers);
  const sessions = useStore((s) => s.sessions);
  const smsLogs = useStore((s) => s.sms);

  // Match driver by email or name, or default to first driver
  const driver =
    drivers.find(
      (d) =>
        (user?.email && d.proxyEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (profile?.display_name && profile.display_name.toLowerCase().includes(d.firstName.toLowerCase()))
    ) ?? drivers[0];

  const driverSessions = driver ? sessions[driver.id] ?? [] : [];
  const confirmedSessions = driverSessions.filter((s) => s.status === "confirmed");
  const awaitingSessions = driverSessions.filter(
    (s) => s.status === "claimed" || s.status === "initiated"
  );

  const totalEarnings = confirmedSessions.reduce(
    (sum, s) => sum + (s.creditedAmount ?? s.amount),
    0
  );

  const driverSms = driver
    ? smsLogs.filter((l) => l.to === driver.driverPhone || l.to === driver.proxyPhone)
    : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Driver Profile Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber text-ink shadow-sm shrink-0">
            <CarTaxiFront className="size-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground">
                {profile?.display_name ?? (driver ? tn(driver.firstName) : "Auto Driver")}
              </h1>
              <span className="rounded-full bg-amber/20 px-2.5 py-0.5 text-[11px] font-black uppercase text-amber border border-amber/30">
                Driver
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-muted-foreground mt-0.5">
              Plate: {driver?.vehicle ?? "MH02AB1234"} • VPA: {driver?.vpa ?? "driver@upi"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {driver && (
            <Link
              to="/q/$slug"
              params={{ slug: driver.slug }}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-black text-foreground hover:bg-surface-2 transition-all shadow-sm"
            >
              <QrCode className="size-4 text-amber" />
              <span>Open My QR Page</span>
              <ExternalLink className="size-3 opacity-60 ml-0.5" />
            </Link>
          )}

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs font-black text-destructive hover:bg-destructive/20 transition-all"
            title="Sign Out"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Today's Earnings
          </span>
          <div className="mt-2 flex items-baseline gap-1 text-2xl md:text-3xl font-black text-foreground">
            <span className="text-amber">₹</span>
            <span>{totalEarnings}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Confirmed Rides
          </span>
          <div className="mt-2 text-2xl md:text-3xl font-black text-foreground">
            {confirmedSessions.length}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Awaiting Verification
          </span>
          <div className="mt-2 text-2xl md:text-3xl font-black text-amber">
            {awaitingSessions.length}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            2G Phone Alerts
          </span>
          <div className="mt-2 text-2xl md:text-3xl font-black text-foreground">
            {driverSms.length}
          </div>
        </div>
      </div>

      {/* Rides Ledger */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">Recent Ride Payments</h2>
          <span className="text-xs text-muted-foreground">
            Synced live with family proxy confirmations
          </span>
        </div>

        {driverSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center shadow-sm">
            <Inbox className="size-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-bold text-foreground">Nothing here yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              When passengers scan your QR sticker and pay, transactions will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {driverSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-amber/15 font-mono text-xs font-black text-ink shrink-0">
                    AM{session.token}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {session.senderName || "Passenger"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          session.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                            : session.status === "claimed"
                              ? "bg-amber/20 text-amber border border-amber/30"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(session.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-foreground">
                    ₹{session.creditedAmount ?? session.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2G SMS Dispatch Audit Log */}
      {driver && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">Keypad Phone SMS Dispatch Log</h2>
            <span className="text-xs font-mono text-muted-foreground">
              {driver.driverPhone} (2G Keypad)
            </span>
          </div>

          {driverSms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-xs text-muted-foreground">
              <span>No SMS messages dispatched yet.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {driverSms.map((sms) => (
                <div
                  key={sms.id}
                  className="rounded-xl border border-border bg-surface p-3 text-xs font-mono flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="size-4 text-amber shrink-0" />
                    <span className="truncate">{sms.body}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(sms.sentAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
