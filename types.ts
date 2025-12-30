
export enum NoteCategory {
  GENERAL = 'General',
  STRENGTH = 'Fortaleza',
  WEAKNESS = 'Debilidad',
  PHYSICAL = 'Físico',
  TACTICAL = 'Táctico',
  TECHNICAL = 'Técnico',
  MENTAL = 'Mental'
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // Store hash, never plain text
  salt: string;
  role: 'admin' | 'scout';
  avatar?: string;
  // New Profile Fields
  organization?: string; // Team/Club
  age?: number;
  bio?: string;
  approved?: boolean; // New approval field
}

export type BackupFrequency = 'never' | 'daily' | 'weekly' | 'monthly';

export interface AppSettings {
  appName: string;
  appLogoUrl: string; // If empty, use default SVG
  // System Preferences
  launchAtStartup: boolean;
  minimizeToTray: boolean;
  // Backup Preferences
  backupFrequency: BackupFrequency;
  lastBackupDate: string | null; // ISO Date string
  googleDriveConnected?: boolean;
}

export interface Scout {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'youtube';
  url: string;
  name: string;
}

export interface NoteComment {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface Note {
  id: string;
  playerId: string;
  scoutId: string;
  content: string;
  timestamp: number;
  category: NoteCategory;
  tags: string[];
  attachments: Attachment[];
  isEdited?: boolean;
  comments?: NoteComment[]; // New: Threaded feedback
  likes?: string[]; // New: List of user IDs who liked/acknowledged
}

export interface PlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

// New Interfaces for detailed reports
export interface ContractDetails {
  clubName: string;
  contractExpiration: string; // YYYY-MM-DD
  agencyName: string;
  agencyContact: string;
  agencyContractExpiration: string; // YYYY-MM-DD
  isLoan: boolean;
  loanOriginClub?: string;
  marketValue: string;
}

export interface Macronutrients {
  protein: number; // grams
  carbs: number;   // grams
  fats: number;    // grams
}

export interface BodyCompositionEntry {
  date: string;
  weight: number;
  bodyFatPercentage: number;
}

export interface NutritionalReport {
  lastCheckup: string;
  weightStatus: 'Bajo' | 'Óptimo' | 'Sobrepeso';
  hydrationLevel: number; // 0-100%
  dailyCalories: number;
  macros: Macronutrients;
  bodyCompositionHistory: BodyCompositionEntry[];
  dietaryRestrictions: string[];
  supplements: string[];
}

export interface PhysicalProfile {
  fatigueLevel: number; // 0-100
  injuryRisk: 'Bajo' | 'Medio' | 'Alto';
  recoveryStatus: string;
  lastInjury?: string;
  fitnessNotes: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  country: string;
  age: number;
  height: string; // e.g., "185 cm"
  weight: string; // e.g., "78 kg"
  foot: 'Derecha' | 'Izquierda' | 'Ambos';
  imageUrl: string;
  marketValue: string; // e.g. "€35M"
  stats: PlayerStats;
  scoutRating: number; // 0-100
  
  // Extended Data
  contract?: ContractDetails;
  nutrition?: NutritionalReport;
  physical?: PhysicalProfile;
}
