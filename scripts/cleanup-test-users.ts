import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";

// Load environment files if present
if (typeof process.loadEnvFile === "function") {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  } else if (existsSync(".env")) {
    process.loadEnvFile(".env");
  }
}

if (process.env.ALLOW_TEST_SEED !== "true") {
  console.error("Set ALLOW_TEST_SEED=true to cleanup test users.");
  process.exit(1);
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(
  supabaseUrl,
  serviceRoleKey,
  { auth: { persistSession: false } }
);

const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
for (const u of data?.users ?? []) {
  if (u.email?.endsWith("@automitra.test")) {
    await admin.auth.admin.deleteUser(u.id);
    console.log("deleted", u.email);
  }
}
