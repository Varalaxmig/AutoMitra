-- AutoMitra: Core Schema Migration
-- Run against Supabase PostgreSQL (Mumbai ap-south-1)
-- Requires: pg_cron extension enabled in Supabase dashboard

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid(), crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "pg_cron";   -- scheduled session expiry

-- ============================================================
-- 2. CUSTOM TYPES
-- ============================================================
CREATE TYPE lang AS ENUM ('en', 'hi', 'mr');

CREATE TYPE session_status AS ENUM (
  'initiated',
  'handed_off',
  'claimed',
  'confirmed',
  'rejected',
  'cancelled',
  'expired'
);

CREATE TYPE sms_kind AS ENUM ('claim', 'confirm', 'void', 'otp');
CREATE TYPE sms_provider AS ENUM ('fast2sms', 'twilio', 'mock');
CREATE TYPE sms_delivery_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'unknown');

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3a. drivers: One row per auto-rickshaw driver
CREATE TABLE drivers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  first_name    TEXT NOT NULL,
  vehicle       TEXT NOT NULL,                          -- e.g. MH02AB1234
  driver_phone  TEXT NOT NULL,                          -- 10-digit Indian mobile
  proxy_phone   TEXT NOT NULL,                          -- family member's phone
  proxy_email   TEXT,                                   -- for magic-link login
  vpa           TEXT NOT NULL,                          -- UPI VPA e.g. name@bank
  lang          lang NOT NULL DEFAULT 'hi',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3b. qr_endpoints: Tracks QR sticker slugs per driver (supports rotation)
CREATE TABLE qr_endpoints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3c. otp_challenges: Phone verification during driver onboarding
CREATE TABLE otp_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,                          -- bcrypt hash of the 4-digit code
  expires_at    TIMESTAMPTZ NOT NULL,
  verified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3d. sessions: The core fare verification state machine
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,                        -- QR endpoint slug
  token           TEXT NOT NULL,                        -- 4-digit AM token e.g. "4827"
  seq             INTEGER NOT NULL DEFAULT 0,           -- per-driver sequence counter
  amount          NUMERIC(10,2) NOT NULL,
  credited_amount NUMERIC(10,2),
  sender_name     TEXT NOT NULL DEFAULT 'Passenger',
  status          session_status NOT NULL DEFAULT 'initiated',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at      TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3e. sms_logs: Every SMS dispatched, with delivery tracking
CREATE TABLE sms_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  to_phone      TEXT NOT NULL,
  kind          sms_kind NOT NULL,
  provider      sms_provider NOT NULL DEFAULT 'mock',
  delivery      sms_delivery_status NOT NULL DEFAULT 'queued',
  message_id    TEXT,                                   -- provider's external message ID
  payload       JSONB,                                  -- full request/response for debugging
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at  TIMESTAMPTZ
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Partial unique index: blocks duplicate live tokens per driver (spec 2.7.2)
CREATE UNIQUE INDEX idx_sessions_live_token
  ON sessions (driver_id, token)
  WHERE status IN ('initiated', 'handed_off', 'claimed');

-- One SMS per session per kind (prevents duplicate dispatch)
CREATE UNIQUE INDEX idx_sms_logs_session_kind
  ON sms_logs (session_id, kind)
  WHERE session_id IS NOT NULL;

-- Fast lookup for proxy console
CREATE INDEX idx_sessions_status ON sessions (status) WHERE status IN ('handed_off', 'claimed');
CREATE INDEX idx_sessions_driver ON sessions (driver_id, created_at DESC);

-- QR endpoint lookup
CREATE INDEX idx_qr_endpoints_slug ON qr_endpoints (slug) WHERE active = true;

-- OTP expiry cleanup
CREATE INDEX idx_otp_challenges_phone ON otp_challenges (phone, expires_at DESC);

-- ============================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. STATE TRANSITION GUARD
-- ============================================================
-- Only allow valid session status transitions
CREATE OR REPLACE FUNCTION check_session_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.status = 'initiated' AND NEW.status NOT IN ('handed_off', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'handed_off' AND NEW.status NOT IN ('claimed', 'confirmed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'claimed' AND NEW.status NOT IN ('confirmed', 'rejected', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
  END IF;
  IF OLD.status IN ('confirmed', 'rejected', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status %', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_transition
  BEFORE UPDATE OF status ON sessions FOR EACH ROW EXECUTE FUNCTION check_session_transition();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;

-- Anon (commuters): can read active QR endpoints and initiate/read own sessions
CREATE POLICY "anon_qr_read" ON qr_endpoints FOR SELECT TO anon USING (active = true);
CREATE POLICY "anon_session_insert" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_session_select" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_session_update" ON sessions FOR UPDATE TO anon
  USING (status IN ('initiated', 'handed_off'))
  WITH CHECK (status IN ('handed_off', 'claimed', 'cancelled'));

-- Authenticated proxies: full access to their drivers' data
CREATE POLICY "proxy_drivers_read" ON drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "proxy_sessions_read" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "proxy_sessions_update" ON sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "proxy_sms_read" ON sms_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "proxy_qr_read" ON qr_endpoints FOR SELECT TO authenticated USING (true);

-- Service role has unrestricted access (used by SMS dispatch, pg_cron, etc.)

-- ============================================================
-- 8. PG_CRON: Expire stale sessions every minute (spec 2.5)
-- ============================================================
SELECT cron.schedule(
  'expire-stale-sessions',
  '* * * * *',
  $$
  UPDATE sessions
  SET status = 'expired', resolved_at = now()
  WHERE status IN ('initiated', 'handed_off', 'claimed')
    AND created_at < now() - INTERVAL '10 minutes';
  $$
);

-- ============================================================
-- 9. SEED DATA (demo driver for development)
-- ============================================================
INSERT INTO drivers (slug, first_name, vehicle, driver_phone, proxy_phone, vpa, lang)
VALUES ('K7M2QX9A', 'Ramesh', 'MH02AB1234', '9820012345', '9930054321', 'sneha.patil@okaxis', 'hi')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO qr_endpoints (driver_id, slug)
SELECT id, slug FROM drivers WHERE slug = 'K7M2QX9A'
ON CONFLICT (slug) DO NOTHING;
