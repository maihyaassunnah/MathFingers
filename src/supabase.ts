import { createClient } from '@supabase/supabase-js';

// Read from localStorage if configured dynamically by the user in Settings
const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('MATH_FINGERS_SUPABASE_URL') : null;
const savedKey = typeof window !== 'undefined' ? localStorage.getItem('MATH_FINGERS_SUPABASE_ANON_KEY') : null;

const supabaseUrl = savedUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = savedKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

