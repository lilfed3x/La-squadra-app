
import { createClient } from '@supabase/supabase-js';

// Usa process.env ya que vite.config.ts define estas variables explícitamente para el cliente
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzaijvrabivetbgzvohk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWlqdnJhYml2ZXRiZ3p2b2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDAzNjIsImV4cCI6MjA4MjYxNjM2Mn0.5qW6YhSgUKlWGsq5FD_PwOSUBpbIVLilCNx4znf7wk8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Check simple de configuración
export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http');
