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

// Safety gate: refuses to run unless you opt in explicitly.
if (process.env.ALLOW_TEST_SEED !== "true") {
  console.error("Set ALLOW_TEST_SEED=true to seed test users. Never do this in production.");
  process.exit(1);
}
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BASE_URL ?? "";
if (!/localhost|127\.0\.0\.1|staging/.test(siteUrl)) {
  console.error(`Refusing to seed: NEXT_PUBLIC_SITE_URL (${siteUrl}) is not local or staging.`);
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

const USERS = [
  { email: "proxy1@automitra.test",  password: "ProxyOne#2026-Test",  role: "proxy",  name: "Sneha Test",  lang: "en" },
  { email: "proxy2@automitra.test",  password: "ProxyTwo#2026-Test",  role: "proxy",  name: "Meera Test",  lang: "mr" },
  { email: "driver1@automitra.test", password: "DriverOne#2026-Test", role: "driver", name: "Ramesh Test", lang: "hi" },
  { email: "driver2@automitra.test", password: "DriverTwo#2026-Test", role: "driver", name: "Suresh Test", lang: "mr" },
] as const;

async function findUserId(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data?.users.find((u) => u.email === email)?.id ?? null;
}

for (const u of USERS) {
  let id: string | null = null;
  const created = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { display_name: u.name },
  });

  if (created.error) {
    // Already exists: reset the password so the credentials in test.md always work.
    id = await findUserId(u.email);
    if (!id) { console.error(`FAILED ${u.email}: ${created.error.message}`); continue; }
    await admin.auth.admin.updateUserById(id, { password: u.password, email_confirm: true });
  } else {
    id = created.data.user.id;
  }

  const { error } = await admin.from("profiles").upsert({
    id, role: u.role, display_name: u.name, language: u.lang,
  });
  console.log(error ? `PROFILE FAILED ${u.email}: ${error.message}` : `OK ${u.role.padEnd(6)} ${u.email}`);
}
