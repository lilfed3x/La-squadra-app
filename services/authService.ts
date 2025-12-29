import { User } from '../types';
import { nanoid } from 'nanoid';
import { dataService } from './dataService';
import { getRandomAvatar } from './mockData';

const SESSION_KEY = 'lasquadra_session';
const REMEMBERED_CREDS_KEY = 'lasquadra_remembered_creds';

// --- Security Helpers ---

// Simulate a salt generation
const generateSalt = () => nanoid(16);

// Use Web Crypto API for SHA-256 Hashing
const hashPassword = async (password: string, salt: string): Promise<string> => {
  const enc = new TextEncoder();
  const msgBuffer = enc.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Auth Service Public API ---

export const AuthService = {
  
  init: async () => {
    // Rely on DataService to load users, but we check for Admin existence
    let users = dataService.getUsers();
    let admin = users.find(u => u.email === 'admin@lasquadra.com');

    // 1. Ensure Admin User Exists
    if (!admin) {
      const salt = generateSalt();
      const hash = await hashPassword('lasquadra123', salt);
      admin = {
        id: 'user-admin',
        email: 'admin@lasquadra.com',
        name: 'Jefe de Scouts',
        passwordHash: hash,
        salt: salt,
        role: 'admin',
        avatar: getRandomAvatar(), // Use random default
        organization: 'La Squadra HQ',
        age: 35,
        bio: 'Analista senior con más de 10 años de experiencia en ligas europeas.'
      };
      dataService.saveUser(admin);
      console.log('Initialized default admin user.');
    }

    // 2. AUTO-LOGIN Logic
    const currentSession = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    
    if (!currentSession && admin) {
       const sessionUser = { ...admin };
       // @ts-ignore
       delete sessionUser.passwordHash;
       // @ts-ignore
       delete sessionUser.salt;
       
       localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
       console.log('⚡ DEV MODE: Auto-logged in as Admin');
    }
  },

  getRememberedCredentials: () => {
    const stored = localStorage.getItem(REMEMBERED_CREDS_KEY);
    if (!stored) return null;
    try {
      const creds = JSON.parse(stored);
      return { email: creds.email, password: atob(creds.password) };
    } catch {
      return null;
    }
  },

  login: async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; user?: User; error?: string }> => {
    await delay(800); 

    const users = dataService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, error: 'Correo o contraseña inválidos.' };
    }

    const hashAttempt = await hashPassword(password, user.salt);
    
    if (hashAttempt !== user.passwordHash) {
      return { success: false, error: 'Correo o contraseña inválidos.' };
    }

    const sessionUser = { ...user };
    // @ts-ignore
    delete sessionUser.passwordHash;
    // @ts-ignore
    delete sessionUser.salt;

    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(REMEMBERED_CREDS_KEY, JSON.stringify({
        email: email,
        password: btoa(password)
      }));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.removeItem(REMEMBERED_CREDS_KEY);
    }

    return { success: true, user: sessionUser };
  },

  updateCurrentUser: async (updates: Partial<User> & { newPassword?: string }): Promise<{ success: boolean; user?: User; error?: string }> => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return { success: false, error: 'No hay sesión activa' };

    const users = dataService.getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex === -1) return { success: false, error: 'Usuario no encontrado' };
    
    // 1. Check Email Uniqueness
    if (updates.email && updates.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const emailExists = users.some(u => u.id !== currentUser.id && u.email.toLowerCase() === updates.email?.toLowerCase());
      if (emailExists) {
        return { success: false, error: 'Este correo electrónico ya está en uso por otro usuario.' };
      }
    }

    // 2. Handle Password Change
    if (updates.newPassword) {
      const newSalt = generateSalt();
      const newHash = await hashPassword(updates.newPassword, newSalt);
      updates.salt = newSalt;
      updates.passwordHash = newHash;
      delete updates.newPassword;
    }

    // 3. Merge Updates using DataService
    const updatedUserFull = { ...users[userIndex], ...updates };
    dataService.saveUser(updatedUserFull);

    // 4. Update Active Session
    const updatedSessionUser = { ...currentUser, ...updates };
    // @ts-ignore
    delete updatedSessionUser.passwordHash;
    // @ts-ignore
    delete updatedSessionUser.salt;
    // @ts-ignore
    delete updatedSessionUser.newPassword;

    if (localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSessionUser));
    } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSessionUser));
    }

    return { success: true, user: updatedSessionUser };
  },

  // --- ADMIN METHODS FOR USER MANAGEMENT ---

  adminCreateUser: async (name: string, email: string, password: string, role: 'admin' | 'scout', organization: string): Promise<{ success: boolean; error?: string }> => {
    const users = dataService.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Ya existe un usuario con este correo.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const newUser: User = {
      id: `user-${nanoid()}`,
      email,
      name,
      passwordHash: hash,
      salt,
      role,
      avatar: getRandomAvatar(),
      organization: organization || 'Agente Libre',
      age: undefined,
      bio: ''
    };

    dataService.saveUser(newUser);
    return { success: true };
  },

  adminUpdateUser: async (userId: string, updates: Partial<User> & { newPassword?: string }): Promise<{ success: boolean; error?: string }> => {
    const users = dataService.getUsers();
    const userToUpdate = users.find(u => u.id === userId);
    
    if (!userToUpdate) return { success: false, error: 'Usuario no encontrado' };

    // 1. Check Email Uniqueness if changing email
    if (updates.email && updates.email.toLowerCase() !== userToUpdate.email.toLowerCase()) {
      const emailExists = users.some(u => u.id !== userId && u.email.toLowerCase() === updates.email?.toLowerCase());
      if (emailExists) {
        return { success: false, error: 'Este correo ya está en uso.' };
      }
    }

    // 2. Handle Password Change (Admin Override)
    if (updates.newPassword && updates.newPassword.trim() !== '') {
      const newSalt = generateSalt();
      const newHash = await hashPassword(updates.newPassword, newSalt);
      updates.salt = newSalt;
      updates.passwordHash = newHash;
    }
    delete updates.newPassword;

    // 3. Merge Updates
    const finalUser = { ...userToUpdate, ...updates };
    dataService.saveUser(finalUser);
    
    return { success: true };
  },

  register: async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await delay(1000);
    
    const users = dataService.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Ya existe un usuario con este correo.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const newUser: User = {
      id: `user-${nanoid()}`,
      email,
      name,
      passwordHash: hash,
      salt,
      role: 'scout',
      avatar: getRandomAvatar(), // Use random default
      organization: 'Agente Libre',
      age: 25,
      bio: 'Nuevo scout en la plataforma.'
    };

    dataService.saveUser(newUser);
    return { success: true };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const storedLocal = localStorage.getItem(SESSION_KEY);
    if (storedLocal) return JSON.parse(storedLocal);

    const storedSession = sessionStorage.getItem(SESSION_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  },

  requestPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
    await delay(1500);
    const users = dataService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: true, message: 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.' };
    }

    console.log(`[SIMULATION] Password reset email sent to ${email}`);
    return { success: true, message: 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.' };
  }
};