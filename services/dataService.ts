import { Player, Note, User, AppSettings } from '../types';
import { getRandomAvatar } from './mockData';

// Keys for persistence
const KEYS = {
  INIT_FLAG: 'lasquadra_sys_init', // Flag to check if app has ever run
  PLAYERS: 'lasquadra_db_players',
  NOTES: 'lasquadra_db_notes',
  USERS: 'lasquadra_users_db',
  SETTINGS: 'lasquadra_app_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'LA SQUADRA',
  appLogoUrl: '',
  launchAtStartup: false,
  minimizeToTray: false
};

// Event types for the BroadcastChannel
type ChangeEvent = {
  type: 'PLAYERS_UPDATE' | 'NOTES_UPDATE' | 'USERS_UPDATE' | 'SETTINGS_UPDATE';
};

class DataService {
  private channel: BroadcastChannel;
  private listeners: Set<() => void> = new Set();

  // In-memory cache
  private players: Player[] = [];
  private notes: Note[] = [];
  private users: User[] = [];
  private settings: AppSettings = DEFAULT_SETTINGS;

  constructor() {
    this.channel = new BroadcastChannel('lasquadra_realtime_sync');
    this.init();
    
    // Listen for changes from other tabs/windows
    this.channel.onmessage = (event) => {
      const data: ChangeEvent = event.data;
      if (data.type === 'PLAYERS_UPDATE') this.loadPlayersFromStorage();
      if (data.type === 'NOTES_UPDATE') this.loadNotesFromStorage();
      if (data.type === 'USERS_UPDATE') this.loadUsersFromStorage();
      if (data.type === 'SETTINGS_UPDATE') this.loadSettingsFromStorage();
      
      this.notifyListeners();
    };
  }

  private init() {
    // CRITICAL: Always load settings FIRST so the App Name and Logo are applied immediately
    // regardless of whether it is the first run or not.
    this.loadSettingsFromStorage();

    const hasInitialized = localStorage.getItem(KEYS.INIT_FLAG);

    if (!hasInitialized) {
      // --- FIRST RUN EVER ---
      // Clean slate: Start with EMPTY arrays as requested (no mock players by default)
      this.players = [];
      this.notes = [];
      this.users = []; // Auth service will handle admin creation if empty
      
      // Save initial empty state to storage
      this.safeSetItem(KEYS.PLAYERS, JSON.stringify(this.players));
      this.safeSetItem(KEYS.NOTES, JSON.stringify(this.notes));
      this.safeSetItem(KEYS.USERS, JSON.stringify(this.users));
      // Settings are already handled/saved via loadSettingsFromStorage or defaults
      if (!localStorage.getItem(KEYS.SETTINGS)) {
          this.safeSetItem(KEYS.SETTINGS, JSON.stringify(this.settings));
      }
      
      // Mark as initialized so we know the environment is set up
      localStorage.setItem(KEYS.INIT_FLAG, 'true');
    } else {
      // --- SUBSEQUENT RUNS ---
      // Load data from persistence
      this.loadPlayersFromStorage();
      this.loadNotesFromStorage();
      this.loadUsersFromStorage();
    }
  }

  private safeSetItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert("¡Atención! El almacenamiento local está lleno. No se pueden guardar más datos o imágenes grandes. Intenta eliminar algunos jugadores o usar imágenes más pequeñas.");
        console.error("Local Storage Quota Exceeded");
      } else {
        console.error("Error saving to local storage", e);
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private broadcast(type: ChangeEvent['type']) {
    this.channel.postMessage({ type });
    this.notifyListeners();
  }

  // --- INTERNAL LOADERS ---

  private loadPlayersFromStorage() {
    const stored = localStorage.getItem(KEYS.PLAYERS);
    // Parse stored players or default to empty
    let loadedPlayers: Player[] = stored ? JSON.parse(stored) : [];
    
    // BACKFILL & MIGRATE
    // Logic to replace old realistic photos or DiceBear 9.x with new Abstract Splashes
    const oldRealisticIds = [
        'photo-1535713875002', 'photo-1633332755192', 'photo-1580489944761',
        'photo-1527980965255', 'photo-1438761681033', 'photo-1472099645785',
        'photo-1507003211169', 'photo-1628157588553'
    ];

    let hasUpdates = false;
    loadedPlayers = loadedPlayers.map(p => {
        const isMissing = !p.imageUrl || p.imageUrl.trim() === '';
        // Check for DiceBear or Old Realistic Photos
        const isDiceBear = p.imageUrl && p.imageUrl.includes('dicebear.com');
        const isOldRealistic = p.imageUrl && oldRealisticIds.some(id => p.imageUrl.includes(id));
        
        if (isMissing || isDiceBear || isOldRealistic) {
            hasUpdates = true;
            return { ...p, imageUrl: getRandomAvatar() };
        }
        return p;
    });

    this.players = loadedPlayers;
    
    // If we backfilled images, save immediately so it persists
    if (hasUpdates) {
        this.safeSetItem(KEYS.PLAYERS, JSON.stringify(this.players));
    }
  }

  private loadNotesFromStorage() {
    const stored = localStorage.getItem(KEYS.NOTES);
    this.notes = stored ? JSON.parse(stored) : [];
  }

  private loadUsersFromStorage() {
    const stored = localStorage.getItem(KEYS.USERS);
    let loadedUsers: User[] = stored ? JSON.parse(stored) : [];

    // BACKFILL USERS TOO
    let hasUpdates = false;
    loadedUsers = loadedUsers.map(u => {
        const isMissing = !u.avatar || u.avatar.trim() === '';
        const isDiceBear = u.avatar && u.avatar.includes('dicebear.com');
        if (isMissing || isDiceBear) {
            hasUpdates = true;
            return { ...u, avatar: getRandomAvatar() };
        }
        return u;
    });

    this.users = loadedUsers;
    if (hasUpdates) {
        this.safeSetItem(KEYS.USERS, JSON.stringify(this.users));
    }
  }

  private loadSettingsFromStorage() {
    const stored = localStorage.getItem(KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new keys in future updates don't break,
      // but favor stored values (persistence).
      this.settings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      this.settings = DEFAULT_SETTINGS;
    }
    // Update document title immediately on load
    document.title = this.settings.appName;
  }

  // --- PUBLIC API: PLAYERS ---

  public getPlayers(): Player[] {
    return this.players;
  }

  public updatePlayer(updatedPlayer: Player) {
    this.players = this.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
    this.safeSetItem(KEYS.PLAYERS, JSON.stringify(this.players));
    this.broadcast('PLAYERS_UPDATE');
  }

  public addPlayer(newPlayer: Player) {
    this.players = [newPlayer, ...this.players];
    this.safeSetItem(KEYS.PLAYERS, JSON.stringify(this.players));
    this.broadcast('PLAYERS_UPDATE');
  }

  public deletePlayer(id: string) {
    this.players = this.players.filter(p => p.id !== id);
    this.safeSetItem(KEYS.PLAYERS, JSON.stringify(this.players));
    this.broadcast('PLAYERS_UPDATE');
  }

  // DANGER: Clears all players to return to initial clean state (Empty Array)
  public clearPlayers() {
    this.players = [];
    this.safeSetItem(KEYS.PLAYERS, JSON.stringify(this.players));
    this.broadcast('PLAYERS_UPDATE');
  }

  // --- PUBLIC API: NOTES ---

  public getNotes(): Note[] {
    return this.notes;
  }

  public addNote(note: Note) {
    this.notes = [note, ...this.notes];
    this.safeSetItem(KEYS.NOTES, JSON.stringify(this.notes));
    this.broadcast('NOTES_UPDATE');
  }

  public updateNote(updatedNote: Note) {
    this.notes = this.notes.map(n => n.id === updatedNote.id ? updatedNote : n);
    this.safeSetItem(KEYS.NOTES, JSON.stringify(this.notes));
    this.broadcast('NOTES_UPDATE');
  }

  public deleteNote(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.safeSetItem(KEYS.NOTES, JSON.stringify(this.notes));
    this.broadcast('NOTES_UPDATE');
  }

  // --- PUBLIC API: USERS ---

  public getUsers(): User[] {
    return this.users;
  }

  public saveUser(user: User) {
    // Reload first to ensure no race condition on simple updates
    this.loadUsersFromStorage();
    const exists = this.users.find(u => u.id === user.id);
    if (exists) {
      this.users = this.users.map(u => u.id === user.id ? user : u);
    } else {
      this.users.push(user);
    }
    this.safeSetItem(KEYS.USERS, JSON.stringify(this.users));
    this.broadcast('USERS_UPDATE');
  }

  public deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    this.safeSetItem(KEYS.USERS, JSON.stringify(this.users));
    this.broadcast('USERS_UPDATE');
  }

  // --- PUBLIC API: SETTINGS ---

  public getSettings(): AppSettings {
    return this.settings;
  }

  public saveSettings(newSettings: AppSettings) {
    this.settings = newSettings;
    this.safeSetItem(KEYS.SETTINGS, JSON.stringify(this.settings));
    this.broadcast('SETTINGS_UPDATE');
    
    // Immediate effect for title
    document.title = newSettings.appName;
  }
}

export const dataService = new DataService();