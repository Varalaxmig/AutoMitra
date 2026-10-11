import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl =
  (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ??
  process.env['SUPABASE_URL'] ??
  '';
const supabaseAnonKey =
  (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ??
  process.env['SUPABASE_ANON_KEY'] ??
  '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseServiceClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}
