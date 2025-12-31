
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
  passwordHash: string;
  salt: string;
  role: 'admin' | 'scout';
  avatar?: string;
  organization?: string;
  age?: number;
  bio?: string;
  approved?: boolean;
}

export interface Scout {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

export interface Comment {
  id: string;
  scoutId: string;
  scoutName: string;
  scoutAvatar?: string;
  content: string;
  timestamp: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'youtube';
  url: string;
  name: string;
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
  comments?: Comment[];
  likes?: string[]; // IDs of scouts who liked
}

export interface PlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface ContractDetails {
  clubName: string;
  contractExpiration: string;
  agencyName: string;
  agencyContact: string;
  agencyContractExpiration: string;
  isLoan: boolean;
  loanOriginClub?: string;
  marketValue: string;
}

export interface Macronutrients {
  protein: number;
  carbs: number;
  fats: number;
}

export interface BodyCompositionEntry {
  date: string;
  weight: number;
  bodyFatPercentage: number;
}

export interface NutritionalReport {
  lastCheckup: string;
  weightStatus: 'Bajo' | 'Óptimo' | 'Sobrepeso';
  hydrationLevel: number;
  dailyCalories: number;
  macros: Macronutrients;
  bodyCompositionHistory: BodyCompositionEntry[];
  dietaryRestrictions: string[];
  supplements: string[];
}

export interface MedicalReport {
  id: string;
  date: string;
  title: string;
  description: string;
  severity: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  status: 'Activo' | 'Recuperado' | 'En Tratamiento';
  doctorName?: string;
  attachments: Attachment[];
}

export interface PhysicalProfile {
  fatigueLevel: number;
  injuryRisk: 'Bajo' | 'Medio' | 'Alto';
  recoveryStatus: string;
  lastInjury?: string;
  fitnessNotes: string;
  medicalHistory?: MedicalReport[];
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  country: string;
  age: number;
  height: string;
  weight: string;
  foot: 'Derecha' | 'Izquierda' | 'Ambos';
  imageUrl: string;
  marketValue: string;
  stats: PlayerStats;
  scoutRating: number;
  contract?: ContractDetails;
  nutrition?: NutritionalReport;
  physical?: PhysicalProfile;
}

export interface AppSettings {
  appName: string;
  appLogoUrl: string;
  launchAtStartup: boolean;
  minimizeToTray: boolean;
}
