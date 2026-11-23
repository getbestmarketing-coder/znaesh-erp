'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** true, якщо ERP підключена до спільної бази */
export const CLOUD = !!(URL && KEY);

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) client = createClient(URL, KEY, { auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true } });
  return client;
}
export const TABLE = 'erp_records';
export const BUCKET = 'docs';
