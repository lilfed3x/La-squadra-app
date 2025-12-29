import { Note, NoteCategory, Player, Scout } from '../types';

// --- CONFIGURACIÓN DE IMÁGENES POR DEFECTO ---
// REEMPLAZA ESTAS URLS CON LAS IMÁGENES ESPECÍFICAS QUE DESEAS USAR
export const DEFAULT_AVATARS = [
  'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140047.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
  'https://cdn-icons-png.flaticon.com/512/4139/4139981.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140077.png'
];

export const getRandomAvatar = (): string => {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
};

export const CURRENT_SCOUT: Scout = {
  id: 'scout-001',
  name: 'Alex Ferreira',
  avatar: getRandomAvatar(),
  isOnline: true,
};

export const OTHER_SCOUTS: Scout[] = [
  { id: 'scout-002', name: 'Sarah Jenkins', avatar: getRandomAvatar(), isOnline: true },
  { id: 'scout-003', name: 'Miguel Rossi', avatar: getRandomAvatar(), isOnline: true },
  { id: 'scout-004', name: 'David Okafor', avatar: getRandomAvatar(), isOnline: false },
];

// Helper to generate consistent mock details
const getMockDetails = (team: string, value: string, weightKg: number) => ({
  contract: {
    clubName: team,
    contractExpiration: '2027-06-30',
    agencyName: 'Elite Sports Management',
    agencyContact: 'Jorge Mendes',
    agencyContractExpiration: '2025-12-31',
    isLoan: false,
    marketValue: value
  },
  nutrition: {
    lastCheckup: '2024-03-15',
    weightStatus: 'Óptimo' as const,
    hydrationLevel: 94,
    dailyCalories: 3200,
    macros: {
      protein: 200,
      carbs: 400,
      fats: 80
    },
    bodyCompositionHistory: [
      { date: '2023-10-01', weight: weightKg - 1.5, bodyFatPercentage: 11.2 },
      { date: '2023-11-01', weight: weightKg - 0.8, bodyFatPercentage: 10.8 },
      { date: '2023-12-01', weight: weightKg - 0.2, bodyFatPercentage: 10.5 },
      { date: '2024-01-01', weight: weightKg + 0.5, bodyFatPercentage: 10.2 },
      { date: '2024-02-01', weight: weightKg, bodyFatPercentage: 9.8 },
      { date: '2024-03-15', weight: weightKg, bodyFatPercentage: 9.5 },
    ],
    dietaryRestrictions: ['Sin gluten'],
    supplements: ['Proteína de Suero', 'Creatina', 'Multivitamínico']
  },
  physical: {
    fatigueLevel: 12,
    injuryRisk: 'Bajo' as const,
    recoveryStatus: '100% Apto',
    lastInjury: 'Distensión de isquiotibiales (Oct 2023)',
    fitnessNotes: 'Condición física excepcional. Mantiene picos de velocidad constantes en el minuto 80+.'
  }
});

export const MOCK_PLAYERS: Player[] = [
  {
    id: 'p-1',
    name: 'Mateo Kovacic',
    position: 'Mediocentro',
    team: 'Man City',
    country: 'Croacia',
    age: 29,
    height: '178 cm',
    weight: '78 kg',
    foot: 'Derecha',
    imageUrl: getRandomAvatar(),
    marketValue: '€35M',
    scoutRating: 84,
    stats: {
      pace: 78,
      shooting: 70,
      passing: 88,
      dribbling: 90,
      defending: 72,
      physical: 75,
    },
    ...getMockDetails('Man City', '€35M', 78)
  },
  {
    id: 'p-2',
    name: 'Erling Haaland',
    position: 'Delantero',
    team: 'Man City',
    country: 'Noruega',
    age: 23,
    height: '194 cm',
    weight: '88 kg',
    foot: 'Izquierda',
    imageUrl: getRandomAvatar(),
    marketValue: '€180M',
    scoutRating: 95,
    stats: {
      pace: 92,
      shooting: 96,
      passing: 74,
      dribbling: 82,
      defending: 45,
      physical: 90,
    },
    ...getMockDetails('Man City', '€180M', 88)
  },
  {
    id: 'p-3',
    name: 'Vinicius Jr',
    position: 'Extremo Izquierdo',
    team: 'Real Madrid',
    country: 'Brasil',
    age: 23,
    height: '176 cm',
    weight: '73 kg',
    foot: 'Derecha',
    imageUrl: getRandomAvatar(),
    marketValue: '€150M',
    scoutRating: 92,
    stats: {
      pace: 97,
      shooting: 85,
      passing: 84,
      dribbling: 95,
      defending: 32,
      physical: 74,
    },
    ...getMockDetails('Real Madrid', '€150M', 73)
  },
  {
    id: 'p-4',
    name: 'Jude Bellingham',
    position: 'Mediocentro Ofensivo',
    team: 'Real Madrid',
    country: 'Inglaterra',
    age: 20,
    height: '186 cm',
    weight: '75 kg',
    foot: 'Derecha',
    imageUrl: getRandomAvatar(),
    marketValue: '€180M',
    scoutRating: 94,
    stats: {
      pace: 84,
      shooting: 88,
      passing: 89,
      dribbling: 91,
      defending: 78,
      physical: 86,
    },
    ...getMockDetails('Real Madrid', '€180M', 75)
  },
  {
    id: 'p-5',
    name: 'Ruben Dias',
    position: 'Defensa Central',
    team: 'Man City',
    country: 'Portugal',
    age: 26,
    height: '187 cm',
    weight: '83 kg',
    foot: 'Derecha',
    imageUrl: getRandomAvatar(),
    marketValue: '€80M',
    scoutRating: 89,
    stats: {
      pace: 62,
      shooting: 40,
      passing: 75,
      dribbling: 68,
      defending: 93,
      physical: 88,
    },
    ...getMockDetails('Man City', '€80M', 83)
  },
  {
    id: 'p-6',
    name: 'Kevin De Bruyne',
    position: 'Mediocentro',
    team: 'Man City',
    country: 'Bélgica',
    age: 32,
    height: '181 cm',
    weight: '70 kg',
    foot: 'Derecha',
    imageUrl: getRandomAvatar(),
    marketValue: '€60M',
    scoutRating: 91,
    stats: {
      pace: 72,
      shooting: 85,
      passing: 98,
      dribbling: 87,
      defending: 65,
      physical: 74,
    },
    ...getMockDetails('Man City', '€60M', 70)
  },
  {
    id: 'p-7',
    name: 'Bukayo Saka',
    position: 'Extremo Derecho',
    team: 'Arsenal',
    country: 'Inglaterra',
    age: 22,
    height: '178 cm',
    weight: '72 kg',
    foot: 'Izquierda',
    imageUrl: getRandomAvatar(),
    marketValue: '€120M',
    scoutRating: 88,
    stats: {
      pace: 88,
      shooting: 82,
      passing: 84,
      dribbling: 89,
      defending: 55,
      physical: 70,
    },
    ...getMockDetails('Arsenal', '€120M', 72)
  }
];

export const MOCK_NOTES: Note[] = [
  {
    id: 'n-1',
    playerId: 'p-1',
    scoutId: 'scout-001',
    content: 'Excelente retención de balón bajo presión. Rara vez pierde la posesión en el mediocampo.',
    timestamp: Date.now() - 10000000,
    category: NoteCategory.STRENGTH,
    tags: ['Resistente a presión', 'Regate'],
    attachments: [],
  },
  {
    id: 'n-2',
    playerId: 'p-1',
    scoutId: 'scout-001',
    content: 'Tendencia a regatear demasiado en zonas peligrosas en lugar de soltar el pase rápido.',
    timestamp: Date.now() - 5000000,
    category: NoteCategory.WEAKNESS,
    tags: ['Toma de decisiones', 'Riesgo'],
    attachments: [],
  },
];