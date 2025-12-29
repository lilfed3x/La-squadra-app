
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

// Helper to get env vars safely for the temp client
const getEnv = (key: string) => {
  // Try process.env first as it is explicitly defined in vite.config.ts
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Fallback to import.meta.env check
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return '';
};

// Helper to map Supabase user to App User type
const mapSupabaseUser = async (sbUser: any): Promise<User | null> => {
  if (!sbUser) return null;

  // Fetch profile details from 'profiles' table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sbUser.id)
    .single();

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: profile?.name || sbUser.user_metadata?.name || 'Usuario',
    role: profile?.role || 'scout',
    organization: profile?.organization || '',
    avatar: profile?.avatar || '',
    age: profile?.age,
    bio: profile?.bio,
    passwordHash: '', // Not needed for Supabase
    salt: ''          // Not needed for Supabase
  };
};

export const AuthService = {
  
  init: async () => {
    if (!isSupabaseConfigured) return;

    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log('Sesión de Supabase restaurada');
    }
  },

  getRememberedCredentials: () => {
    // Supabase handles persistence automatically via localStorage
    return null; 
  },

  login: async (email: string, password: string, rememberMe?: boolean): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Configuración de Supabase faltante. Revisa el archivo .env' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const user = await mapSupabaseUser(data.user);
    return { success: true, user: user || undefined };
  },

  register: async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Configuración de Supabase faltante.' };
    }

    // 1. Sign Up in Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name } // Pass metadata to trigger
      }
    });

    if (error) return { success: false, error: error.message };

    // 2. CRITICAL FIX: Manually insert into profiles table immediately
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          name: name,
          email: email,
          role: 'scout', // Default role
          organization: '',
        }
      ]);

      if (profileError) {
        console.error("Error creating profile record:", profileError);
        // We continue because the auth user was created, but log the error
      }
    }

    return { success: true };
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('lasquadra_session'); // Clear legacy if exists
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (!isSupabaseConfigured) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return await mapSupabaseUser(user);
  },

  getCurrentSessionUser: async () => {
     if (!isSupabaseConfigured) return null;
     
     const { data: { session } } = await supabase.auth.getSession();
     if (!session?.user) return null;
     return await mapSupabaseUser(session.user);
  },

  updateCurrentUser: async (updates: Partial<User> & { newPassword?: string }): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!isSupabaseConfigured) return { success: false, error: 'Sin conexión a base de datos' };

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: 'No hay sesión' };

    // 1. Update Password if provided
    if (updates.newPassword) {
      const { error } = await supabase.auth.updateUser({ password: updates.newPassword });
      if (error) return { success: false, error: error.message };
    }

    // 2. Update Profile Table
    const profileUpdates = {
      name: updates.name,
      organization: updates.organization,
      avatar: updates.avatar,
      age: updates.age,
      bio: updates.bio
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', currentUser.id);

    if (profileError) return { success: false, error: profileError.message };

    const updatedUser = await mapSupabaseUser(currentUser);
    return { success: true, user: updatedUser || undefined };
  },

  requestPasswordReset: async (email: string) => {
    if (!isSupabaseConfigured) return { success: false, message: 'Error de configuración.' };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    return { success: !error, message: error ? error.message : 'Se ha enviado el correo de recuperación.' };
  },

  // --- ADMIN FUNCTIONS ---

  adminCreateUser: async (name: string, email: string, password: string, role: string, organization: string) => {
    if (!isSupabaseConfigured) return { success: false, error: "Configuración incompleta." };

    // TRICK: Create a temporary Supabase client with in-memory storage.
    // This prevents the current Admin session from being overwritten in localStorage when signing up the new user.
    // Use the URL/Key from main client fallback if env vars missing
    const tempSupabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://jzaijvrabivetbgzvohk.supabase.co';
    const tempSupabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWlqdnJhYml2ZXRiZ3p2b2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDAzNjIsImV4cCI6MjA4MjYxNjM2Mn0.5qW6YhSgUKlWGsq5FD_PwOSUBpbIVLilCNx4znf7wk8';

    const tempClient = createClient(tempSupabaseUrl, tempSupabaseKey, {
        auth: {
            persistSession: false, // Don't touch localStorage
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    // 1. Create the user in Auth
    const { data, error } = await tempClient.auth.signUp({
        email,
        password,
        options: {
            data: { name }
        }
    });

    if (error) return { success: false, error: error.message };
    const newUserId = data.user?.id;

    if (!newUserId) return { success: false, error: "No se pudo obtener el ID del usuario." };

    // 2. FIX: Perform UPSERT (Insert or Update) into profiles
    // Use upsert to be safe: if a trigger created it, we update it; if not, we create it.
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: newUserId,
            email: email,
            role: role,
            organization: organization,
            name: name
        });

    if (profileError) {
        return { success: false, error: "Usuario creado en Auth, pero falló el registro en base de datos: " + profileError.message };
    }

    return { success: true };
  },

  adminUpdateUser: async (userId: string, updates: any) => {
     if (!isSupabaseConfigured) return { success: false, error: 'Error de configuración.' };
     
     // 1. Update Profile Data
     const { error } = await supabase
      .from('profiles')
      .update({
          name: updates.name,
          role: updates.role,
          organization: updates.organization
      })
      .eq('id', userId);
     
     if (error) return { success: false, error: error.message };

     // 2. Handle Password Update (Limitation)
     if (updates.newPassword) {
         // Client-side admins cannot update other users' passwords directly without Service Role key.
         // We return a specific warning.
         return { 
             success: true, 
             error: "Datos actualizados, pero la contraseña no se cambió. El usuario debe usar 'Olvidé mi contraseña' o cambiarla desde su perfil." 
         };
     }

     return { success: true };
  }
};
