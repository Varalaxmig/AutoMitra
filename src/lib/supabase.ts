import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl =
  (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ??
  (import.meta.env['NEXT_PUBLIC_SUPABASE_URL'] as string | undefined) ??
  process.env['VITE_SUPABASE_URL'] ??
  process.env['NEXT_PUBLIC_SUPABASE_URL'] ??
  process.env['SUPABASE_URL'] ??
  '';
const supabaseAnonKey =
  (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ??
  process.env['VITE_SUPABASE_ANON_KEY'] ??
  process.env['SUPABASE_ANON_KEY'] ??
  '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient<Database> | null = null;
let hasAutoPinged = false;

function triggerBackgroundKeepAlive(client: SupabaseClient<Database>) {
  if (hasAutoPinged || typeof window === 'undefined') return;
  hasAutoPinged = true;
  // Non-blocking query to keep Supabase database active on app usage
  setTimeout(() => {
    client
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .then(() => {})
      .catch(() => {});
  }, 2000);
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    triggerBackgroundKeepAlive(browserClient);
  }
  return browserClient;
}

let serviceClient: SupabaseClient<Database> | null = null;

export function getSupabaseServiceClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  if (!serviceClient) {
    serviceClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return serviceClient;
}
