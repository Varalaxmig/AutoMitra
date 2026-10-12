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
