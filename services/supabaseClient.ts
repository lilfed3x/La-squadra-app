import { createClient } from '@supabase/supabase-js';

// Credentials provided for the Project "Lasquadra"
const supabaseUrl = 'https://jzaijvrabivetbgzvohk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWlqdnJhYml2ZXRiZ3p2b2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDAzNjIsImV4cCI6MjA4MjYxNjM2Mn0.5qW6YhSgUKlWGsq5FD_PwOSUBpbIVLilCNx4znf7wk8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const isSupabaseConfigured = true;