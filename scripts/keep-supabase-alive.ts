/**
 * AutoMitra — Supabase Keep-Alive Ping Script
 *
 * Prevents Supabase free-tier project from pausing due to 7 days of inactivity.
 * Performs an active query against PostgreSQL via PostgREST to register activity.
 *
 * Usage:
 *   1. One-shot ping (manual / CI cron):
 *      npm run supabase:ping
 *
 *   2. Continuous automated daemon (runs every 24h automatically):
 *      npm run supabase:auto
 *      or: tsx scripts/keep-supabase-alive.ts --loop --interval=24
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local or .env if present
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      if (typeof process.loadEnvFile === "function") {
        try {
          process.loadEnvFile(fullPath);
        } catch {
          parseEnvFile(fullPath);
        }
      } else {
        parseEnvFile(fullPath);
      }
      break;
    }
  }
}

function parseEnvFile(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

// Parse CLI flags: --loop, --interval=24 (in hours)
const isLoop = process.argv.includes("--loop") || process.argv.includes("-l");
const intervalArg = process.argv.find((a) => a.startsWith("--interval="));
const intervalHours = intervalArg ? parseFloat(intervalArg.split("=")[1] || "24") : 24;
const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;

export async function pingSupabase(): Promise<boolean> {
  console.log("\n==================================================");
  console.log(" AutoMitra — Supabase Free-Tier Keep-Alive Ping   ");
  console.log("==================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.");
    console.error("Please ensure .env.local has valid Supabase credentials.");
    return false;
  }

  console.log(`Connecting to: ${supabaseUrl}`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const startTime = Date.now();
    const { error, count } = await supabase
      .from("drivers")
      .select("id", { count: "exact", head: true });

    const latency = Date.now() - startTime;

    if (error) {
      // Fallback: ping auth getSession
      console.warn(`⚠️ Table query notice (${error.message}). Checking auth health...`);
      const authRes = await supabase.auth.getSession();
      if (authRes.error) throw authRes.error;
      console.log(`✅ Supabase Auth Ping Successful (${latency}ms)`);
    } else {
      console.log(`✅ Supabase PostgreSQL Query Successful! (${latency}ms)`);
      console.log(`   Table: 'drivers' | Active Rows: ${count ?? 0}`);
    }

    console.log("🎉 Keep-alive ping completed. Activity recorded to prevent project pause.");
    console.log("==================================================");
    return true;
  } catch (err: any) {
    console.error("❌ Failed to ping Supabase:", err.message || err);
    return false;
  }
}

async function main() {
  const success = await pingSupabase();

  if (!isLoop) {
    process.exit(success ? 0 : 1);
  }

  console.log(`\n⏳ Automated loop active: Next ping scheduled in ${intervalHours} hours.`);
  console.log("Keep this process running in background or terminal (Ctrl+C to stop).\n");

  setInterval(async () => {
    await pingSupabase();
    console.log(`\n⏳ Next ping scheduled in ${intervalHours} hours.\n`);
  }, intervalMs);
}

// Handle clean shutdown on Ctrl+C
process.on("SIGINT", () => {
  console.log("\n🛑 Supabase keep-alive daemon stopped.");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\n🛑 Supabase keep-alive daemon terminated.");
  process.exit(0);
});

main();
