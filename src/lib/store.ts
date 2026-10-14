import { useSyncExternalStore } from "react";
import { sendTelegramAlert, sendSms, buildSmsBody } from "./sms";

export type Lang = "en" | "hi" | "mr";
export type Status =
  "initiated" | "handed_off" | "claimed" | "confirmed" | "rejected" | "cancelled" | "expired";

export interface Driver {
  slug: string;
  firstName: string;
  vehicle: string;
  driverPhone: string;
  proxyPhone: string;
  vpa: string;
  lang: Lang;
  active: boolean;
  isSeed?: boolean;
}
export interface Session {
  id: string;
  slug: string;
  token: string;
  amount: number;
  senderName: string;
  senderUpi?: string;
  creditedAmount?: number;
  status: Status;
  createdAt: number;
  claimedAt?: number;
  resolvedAt?: number;
}
export interface Sms {
  id: string;
  to: string;
  body: string;
  at: number;
  kind: "claim" | "confirm" | "void" | "otp";
}
interface State {
  drivers: Driver[];
  sessions: Session[];
  sms: Sms[];
}

const KEY = "automitra-demo-v1";
const SESSION_TTL = 10 * 60 * 1000;

const seed: State = {
  drivers: [
    {
      slug: "K7M2QX9A",
      firstName: "Ramesh",
      vehicle: "MH02AB1234",
      driverPhone: "9820012345",
      proxyPhone: "9930054321",
      vpa: "sneha.patil@okaxis",
      lang: "hi",
      active: true,
      isSeed: true,
    },
  ],
  sessions: [],
  sms: [],
};

let state: State = seed;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.drivers)) {
        parsed.drivers = parsed.drivers.map((d: Driver) =>
          d.slug === "K7M2QX9A" || d.driverPhone === "9820012345"
            ? { ...d, isSeed: true }
            : d,
        );
      }
      state = parsed;
    }
  } catch {
    /* ignore */
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      state = JSON.parse(e.newValue);
      emit();
    }
  });
  setInterval(expireSweep, 5000);
}
function emit() {
  listeners.forEach((l) => l());
}
function save(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  emit();
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return sel(state);
    },
    () => sel(seed),
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

function sms(d: Driver, kind: "claim" | "confirm" | "void", s: Session, amt = s.amount): Sms {
  const upiId = s.senderUpi || s.senderName || "commuter@upi";
  const body = buildSmsBody({
    toPhone: d.driverPhone,
    kind,
    senderName: upiId,
    senderUpi: upiId,
    amount: amt,
    lang: d.lang,
  });
  return { id: uid(), to: d.driverPhone, body, at: Date.now(), kind };
}

export function getDriver(slug: string) {
  return state.drivers.find((d) => d.slug === slug && d.active);
}

export function upiUri(d: Driver, s: Session) {
  const p = new URLSearchParams({
    pa: d.vpa,
    pn: d.firstName,
    am: String(s.amount),
    cu: "INR",
    tn: `AM${s.token}`,
  });
  return `upi://pay?${p.toString()}`;
}

export function initiate(
  slug: string,
  amount: number,
  senderName = "commuter@upi",
  senderUpi?: string,
): Session {
  load();
  const live = state.sessions
    .filter((s) => s.slug === slug && ["initiated", "handed_off", "claimed"].includes(s.status))
    .map((s) => s.token);
  let token = "";
  do {
    token = String(Math.floor(1000 + Math.random() * 9000));
  } while (live.includes(token));
  const cleanSender = senderName.trim() || "commuter@upi";
  const cleanUpi = senderUpi?.trim() || cleanSender;
  const s: Session = {
    id: uid(),
    slug,
    token,
    amount,
    senderName: cleanSender,
    senderUpi: cleanUpi,
    status: "handed_off",
    createdAt: Date.now(),
  };
  save({ ...state, sessions: [s, ...state.sessions] });
  return s;
}

function patch(
  id: string,
  fn: (s: Session, d: Driver) => { s: Partial<Session>; sms?: Sms | undefined },
) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return;
  const d = state.drivers.find((x) => x.slug === s.slug)!;
  const r = fn(s, d);
  save({
    ...state,
    sessions: state.sessions.map((x) => (x.id === id ? { ...x, ...r.s } : x)),
    sms: r.sms ? [r.sms, ...state.sms] : state.sms,
  });
}

export const claim = (id: string) => {
  const existing = state.sessions.find((x) => x.id === id);
  if (existing && existing.status === "handed_off") {
    const d = state.drivers.find((x) => x.slug === existing.slug);
    const upiId = existing.senderUpi || existing.senderName || "commuter@upi";
    sendTelegramAlert({
      kind: "claim",
      senderName: upiId,
      amount: existing.amount,
      token: existing.token,
    }).catch(() => {});
    if (d?.driverPhone) {
      sendSms({
        toPhone: d.driverPhone,
        kind: "claim",
        senderName: upiId,
        senderUpi: upiId,
        amount: existing.amount,
        lang: d.lang,
      }).catch(() => {});
    }
  }
  return patch(id, (s, d) =>
    s.status === "handed_off"
      ? { s: { status: "claimed", claimedAt: Date.now() }, sms: sms(d, "claim", s) }
      : { s: {} },
  );
};

export const cancel = (id: string) => {
  const existing = state.sessions.find((x) => x.id === id);
  if (existing && existing.status === "claimed") {
    const d = state.drivers.find((x) => x.slug === existing.slug);
    const upiId = existing.senderUpi || existing.senderName || "commuter@upi";
    sendTelegramAlert({
      kind: "void",
      senderName: upiId,
      amount: existing.amount,
      token: existing.token,
    }).catch(() => {});
    if (d?.driverPhone) {
      sendSms({
        toPhone: d.driverPhone,
        kind: "void",
        senderName: upiId,
        senderUpi: upiId,
        amount: existing.amount,
        lang: d.lang,
      }).catch(() => {});
    }
  }
  return patch(id, (s, d) =>
    s.status === "claimed"
      ? {
          s: { status: "cancelled", resolvedAt: Date.now() },
          sms: sms(d, "void", s),
        }
      : { s: { status: "cancelled" } },
  );
};

export const confirm = (id: string, credited?: number) => {
  const existing = state.sessions.find((x) => x.id === id);
  if (existing && ["claimed", "handed_off"].includes(existing.status)) {
    const d = state.drivers.find((x) => x.slug === existing.slug);
    const upiId = existing.senderUpi || existing.senderName || "commuter@upi";
    const finalAmt = credited ?? existing.amount;
    sendTelegramAlert({
      kind: "confirm",
      senderName: upiId,
      amount: finalAmt,
      token: existing.token,
    }).catch(() => {});
    if (d?.driverPhone) {
      sendSms({
        toPhone: d.driverPhone,
        kind: "confirm",
        senderName: upiId,
        senderUpi: upiId,
        amount: finalAmt,
        lang: d.lang,
      }).catch(() => {});
    }
  }
  return patch(id, (s, d) =>
    ["claimed", "handed_off"].includes(s.status)
      ? {
          s: { status: "confirmed", resolvedAt: Date.now(), creditedAmount: credited ?? s.amount },
          sms: sms(d, "confirm", s, credited ?? s.amount),
        }
      : { s: {} },
  );
};

export const reject = (id: string) => {
  const existing = state.sessions.find((x) => x.id === id);
  if (existing && existing.status === "claimed") {
    const d = state.drivers.find((x) => x.slug === existing.slug);
    const upiId = existing.senderUpi || existing.senderName || "commuter@upi";
    sendTelegramAlert({
      kind: "void",
      senderName: upiId,
      amount: existing.amount,
      token: existing.token,
    }).catch(() => {});
    if (d?.driverPhone) {
      sendSms({
        toPhone: d.driverPhone,
        kind: "void",
        senderName: upiId,
        senderUpi: upiId,
        amount: existing.amount,
        lang: d.lang,
      }).catch(() => {});
    }
  }
  return patch(id, (s, d) => ({
    s: { status: "rejected", resolvedAt: Date.now() },
    sms: sms(d, "void", s),
  }));
};

export function expireSweep() {
  const now = Date.now();
  const stale = state.sessions.filter(
    (s) =>
      ["initiated", "handed_off", "claimed"].includes(s.status) && now - s.createdAt > SESSION_TTL,
  );
  if (!stale.length) return;
  let next = state;
  for (const s of stale) {
    const d = next.drivers.find((x) => x.slug === s.slug)!;
    next = {
      ...next,
      sessions: next.sessions.map((x) =>
        x.id === s.id ? { ...x, status: "expired" as Status, resolvedAt: now } : x,
      ),
      sms: s.status === "claimed" ? [sms(d, "void", s), ...next.sms] : next.sms,
    };
  }
  save(next);
}

export function addDriver(d: Omit<Driver, "slug" | "active">): Driver {
  load();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let slug = "";
  do {
    slug = Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (state.drivers.some((x) => x.slug === slug));

  const nd: Driver = { ...d, slug, active: true, isSeed: false };
  save({ ...state, drivers: [...state.drivers, nd] });

  // Send onboarding registration confirmation SMS to the driver's phone
  sendSms({
    toPhone: nd.driverPhone,
    kind: "otp",
    senderName: "AutoMitra",
    amount: 0,
    otpCode: `AutoMitra QR registered for ${nd.vehicle}! You will receive SMS alerts on this number for all UPI fares.`,
  }).catch(() => {});

  return nd;
}
export function rotateQr(slug: string): string {
  const d = state.drivers.find((x) => x.slug === slug)!;
  save({
    ...state,
    drivers: state.drivers.map((x) => (x.slug === slug ? { ...x, active: false } : x)),
  });
  return addDriver(d).slug;
}
export function sendOtp(to: string): string {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  sendTelegramAlert({
    kind: "otp",
    token: code,
    senderName: "Driver Onboarding",
  }).catch(() => {});
  sendSms({
    toPhone: to,
    kind: "otp",
    senderName: "",
    amount: 0,
    otpCode: code,
  }).catch(() => {});
  save({
    ...state,
    sms: [
      { id: uid(), to, body: `AutoMitra OTP: ${code}`, at: Date.now(), kind: "otp" },
      ...state.sms,
    ],
  });
  return code;
}
export function resetDemo() {
  save(seed);
}
export function resetStoreForTesting() {
  state = {
    drivers: [
      {
        slug: "K7M2QX9A",
        firstName: "Ramesh",
        vehicle: "MH02AB1234",
        driverPhone: "9820012345",
        proxyPhone: "9930054321",
        vpa: "sneha.patil@okaxis",
        lang: "hi",
        active: true,
      },
    ],
    sessions: [],
    sms: [],
  };
  emit();
}
export function getState(): State {
  return state;
}
export function recordEscalatedSms(to: string, senderName: string, amount: number) {
  load();
  const body = `Sender's name: ${senderName}\nAmount: ${amount}\nStatus: Pending`;
  save({
    ...state,
    sms: [
      { id: uid(), to, body, at: Date.now(), kind: "claim" },
      ...state.sms,
    ],
  });
}

export const vpaCount = (vpa: string) =>
  state.drivers.filter((d) => d.active && d.vpa === vpa).length;
