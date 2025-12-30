
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

  // 1. Try to fetch profile details from 'profiles' table
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sbUser.id)
    .single();

  // FIX: Eliminar auto-reparación. Si el perfil no existe, es que fue borrado/bloqueado.
  // Esto soluciona el problema de que usuarios eliminados puedan volver a entrar.
  if (error || !profile) {
      console.warn('⚠️ Perfil no encontrado para usuario autenticado. Posiblemente eliminado.');
      return null; 
  }

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: profile.name || sbUser.user_metadata?.name || 'Usuario',
    role: profile.role || 'scout',
    organization: profile.organization || '',
    avatar: profile.avatar || '',
    age: profile.age,
    bio: profile.bio,
    approved: profile.approved, // Check approval status
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

    // SECURITY CHECK: If user is null (profile deleted) or not approved
    if (!user) {
        await supabase.auth.signOut();
        return { success: false, error: 'Esta cuenta ha sido eliminada o desactivada.' };
    }

    if (!user.approved) {
        await supabase.auth.signOut();
        return { success: false, error: 'Tu cuenta está pendiente de aprobación por un administrador.' };
    }

    return { success: true, user: user };
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

    // 2. ROBUST INSERT: Use UPSERT instead of INSERT
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert([
        {
          id: data.user.id,
          name: name,
          email: email,
          role: 'scout', 
          organization: '',
          approved: false // Explicitly unapproved
        }
      ]);

      if (profileError) {
        console.error("Error upserting profile record:", profileError);
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
     
     const user = await mapSupabaseUser(session.user);
     // Re-check validity on session restore
     if (!user || !user.approved) {
         await supabase.auth.signOut();
         return null;
     }
     return user;
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

    // Use temp client to avoid logging out current admin
    const tempSupabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://jzaijvrabivetbgzvohk.supabase.co';
    const tempSupabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWlqdnJhYml2ZXRiZ3p2b2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDAzNjIsImV4cCI6MjA4MjYxNjM2Mn0.5qW6YhSgUKlWGsq5FD_PwOSUBpbIVLilCNx4znf7wk8';

    const tempClient = createClient(tempSupabaseUrl, tempSupabaseKey, {
        auth: {
            persistSession: false, 
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

    // 2. Perform UPSERT into profiles (Admin created users are APPROVED by default)
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: newUserId,
            email: email,
            role: role,
            organization: organization,
            name: name,
            approved: true
        });

    if (profileError) {
        return { success: false, error: "Usuario creado, pero falló perfil: " + profileError.message };
    }

    return { success: true };
  },

  adminUpdateUser: async (userId: string, updates: any) => {
     if (!isSupabaseConfigured) return { success: false, error: 'Error de configuración.' };
     
     // 1. Update Profile Data including approval status
     const { error } = await supabase
      .from('profiles')
      .update({
          name: updates.name,
          role: updates.role,
          organization: updates.organization,
          approved: updates.approved
      })
      .eq('id', userId);
     
     if (error) return { success: false, error: error.message };

     // 2. Handle Password Update (Limitation)
     if (updates.newPassword) {
         return { 
             success: true, 
             error: "Datos actualizados, pero la contraseña no se cambió (requiere cambio por parte del usuario)." 
         };
     }

     return { success: true };
  }
};
