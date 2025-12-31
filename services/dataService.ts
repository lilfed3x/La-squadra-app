
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Player, Note, User, AppSettings } from '../types';

// Utility for safe UUIDs
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- DATA MAPPERS (Safety First) ---
const defaultStats = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 };

const mapPlayerFromDB = (p: any): Player => ({
  id: p.id,
  name: p.name || 'Jugador Sin Nombre',
  team: p.team || 'Agente Libre',
  position: p.position || 'Jugador',
  country: p.country || '',
  age: Number(p.age) || 0,
  height: p.height || '',
  weight: p.weight || '',
  foot: p.foot || 'Derecha',
  imageUrl: p.image_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png', 
  marketValue: p.market_value || '€0M',
  scoutRating: Number(p.scout_rating) || 60,
  // CRITICAL: Ensure stats object is never undefined to prevent Profile crash
  stats: p.stats ? { ...defaultStats, ...p.stats } : defaultStats, 
  contract: p.contract || {}, 
  physical: p.physical || {}, 
  nutrition: p.nutrition || {}
});

const mapNoteFromDB = (n: any): Note => ({
  id: n.id,
  playerId: n.player_id,
  scoutId: n.scout_id,
  content: n.content || '',
  category: n.category,
  tags: n.tags || [],
  attachments: n.attachments || [], 
  timestamp: n.timestamp ? Number(n.timestamp) : Date.now(),
  isEdited: n.is_edited || false,
  comments: n.comments || [],
  likes: n.likes || []
});

class DataService {
  private listeners: Set<() => void> = new Set();
  
  private players: Player[] = [];
  private notes: Note[] = [];
  private users: User[] = [];
  private settings: AppSettings = {
    appName: 'LA SQUADRA',
    appLogoUrl: '',
    launchAtStartup: false,
    minimizeToTray: false
  };

  private initialized = false;

  constructor() {
    const stored = localStorage.getItem('lasquadra_app_settings');
    if (stored) {
        try {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
        } catch (e) { console.error(e); }
    }
    this.init();
  }

  private async init() {
    if (!isSupabaseConfigured) return;
    await this.refreshAll();
    this.initialized = true;

    // Realtime subscriptions
    supabase.channel('public:players').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => this.fetchPlayers()).subscribe();
    supabase.channel('public:notes').on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => this.fetchNotes()).subscribe();
    supabase.channel('public:profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => this.fetchUsers()).subscribe();
    supabase.channel('public:app_config').on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => this.fetchSettings()).subscribe();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  public async refreshAll() {
      await Promise.all([this.fetchPlayers(), this.fetchNotes(), this.fetchUsers(), this.fetchSettings()]);
  }

  private async fetchPlayers() {
    try {
      const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false });
      if (data) {
        this.players = data.map(mapPlayerFromDB);
        this.notifyListeners();
      }
    } catch (err) { console.error(err); }
  }

  private async fetchNotes() {
    try {
      const { data } = await supabase.from('notes').select('*').order('timestamp', { ascending: false });
      if (data) {
        this.notes = data.map(mapNoteFromDB);
        this.notifyListeners();
      }
    } catch (e) {}
  }

  private async fetchUsers() {
    try {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        this.users = data.map((p: any) => ({
          id: p.id,
          email: p.email || '',
          name: p.name || 'Usuario',
          role: p.role,
          organization: p.organization,
          avatar: p.avatar,
          age: p.age,
          bio: p.bio,
          approved: p.approved,
          passwordHash: '', salt: ''
        }));
        this.notifyListeners();
      }
    } catch (e) {}
  }

  private async fetchSettings() {
    try {
      const { data } = await supabase.from('app_config').select('*').eq('id', 1).maybeSingle();
      if (data) {
          this.settings = { ...this.settings, appName: data.app_name, appLogoUrl: data.app_logo_url };
          this.notifyListeners();
      }
    } catch (e) {}
  }

  public getPlayers(): Player[] { return this.players; }
  public getNotes(): Note[] { return this.notes; }
  public getUsers(): User[] { return this.users; }
  public getSettings(): AppSettings { return this.settings; }

  // --- ACTIONS ---

  public async addPlayer(player: Player) {
    const playerId = player.id && player.id.length > 10 ? player.id : generateUUID();
    const dbPlayer = {
      id: playerId,
      name: player.name,
      team: player.team,
      position: player.position,
      country: player.country,
      age: player.age,
      height: player.height,
      weight: player.weight,
      foot: player.foot,
      image_url: player.imageUrl,
      market_value: player.marketValue,
      scout_rating: player.scoutRating,
      stats: player.stats,
      contract: player.contract,
      physical: player.physical,
      nutrition: player.nutrition
    };
    
    this.players = [{ ...player, id: playerId }, ...this.players];
    this.notifyListeners(); 

    const { error } = await supabase.from('players').insert([dbPlayer]);
    if (error) {
        alert("Error guardando jugador: " + error.message);
        this.fetchPlayers(); 
    }
  }

  public async bulkImportPlayers(players: Player[]) {
     const cleanPlayers = players.map(p => ({
         ...p,
         id: generateUUID(), // Ensure new IDs for import
         stats: p.stats || defaultStats
     }));
     // Optimistic
     this.players = [...cleanPlayers, ...this.players];
     this.notifyListeners();

     // Batch insert? Supabase allows array insert
     const dbPlayers = cleanPlayers.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        position: p.position,
        // ... simple mapping for DB
        scout_rating: p.scoutRating,
        stats: p.stats,
        contract: p.contract,
        physical: p.physical,
        nutrition: p.nutrition
     }));

     // Simple loop for safety against payload limits
     for (const p of cleanPlayers) {
         await this.addPlayer(p);
     }
  }

  public async updatePlayer(player: Player) {
    this.players = this.players.map(p => p.id === player.id ? player : p);
    this.notifyListeners();

    await supabase.from('players').update({
      name: player.name,
      team: player.team,
      position: player.position,
      country: player.country,
      age: player.age,
      height: player.height,
      weight: player.weight,
      foot: player.foot,
      image_url: player.imageUrl,
      market_value: player.marketValue,
      scout_rating: player.scoutRating,
      stats: player.stats,
      contract: player.contract,
      physical: player.physical,
      nutrition: player.nutrition
    }).eq('id', player.id);
  }

  public async deletePlayer(id: string) {
    const old = this.players;
    this.players = this.players.filter(p => p.id !== id);
    this.notifyListeners();

    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) {
        this.players = old;
        this.notifyListeners();
        alert("Error al eliminar.");
    }
  }

  public async bulkDeletePlayers(ids: string[]) {
      this.players = this.players.filter(p => !ids.includes(p.id));
      this.notifyListeners();
      await supabase.from('players').delete().in('id', ids);
  }

  public async bulkUpdateTeam(ids: string[], newTeam: string) {
      this.players = this.players.map(p => ids.includes(p.id) ? { ...p, team: newTeam } : p);
      this.notifyListeners();
      await supabase.from('players').update({ team: newTeam }).in('id', ids);
  }

  public async clearPlayers() {
    this.players = [];
    this.notifyListeners();
    await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  public async addNote(note: Note) {
    const dbNote = {
      id: generateUUID(),
      player_id: note.playerId,
      scout_id: note.scoutId,
      content: note.content,
      category: note.category,
      tags: note.tags,
      attachments: note.attachments,
      timestamp: note.timestamp,
      is_edited: false
    };
    this.notes = [note, ...this.notes];
    this.notifyListeners();
    await supabase.from('notes').insert([dbNote]);
  }

  public async updateNote(note: Note) {
    this.notes = this.notes.map(n => n.id === note.id ? note : n);
    this.notifyListeners();
    await supabase.from('notes').update({
      content: note.content,
      category: note.category,
      tags: note.tags,
      attachments: note.attachments,
      is_edited: true,
      comments: note.comments,
      likes: note.likes
    }).eq('id', note.id);
  }

  public async deleteNote(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.notifyListeners();
    await supabase.from('notes').delete().eq('id', id);
  }

  public async saveSettings(newSettings: AppSettings) {
    this.settings = newSettings;
    localStorage.setItem('lasquadra_app_settings', JSON.stringify(newSettings));
    this.notifyListeners();
    await supabase.from('app_config').upsert({ id: 1, app_name: newSettings.appName, app_logo_url: newSettings.appLogoUrl });
  }

  public async deleteUser(userId: string) {
      this.users = this.users.filter(u => u.id !== userId);
      this.notifyListeners();
      await supabase.from('profiles').delete().eq('id', userId);
  }
}

export const dataService = new DataService();
