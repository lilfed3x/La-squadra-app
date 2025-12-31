
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Player, Note, User, AppSettings } from '../types';

// ==========================================
// DATA MAPPERS
// ==========================================

const mapPlayerFromDB = (p: any): Player => ({
  id: p.id,
  name: p.name || 'Sin Nombre',
  team: p.team || '',
  position: p.position || '',
  country: p.country || '',
  age: Number(p.age) || 0,
  height: p.height || '',
  weight: p.weight || '',
  foot: p.foot || 'Derecha',
  imageUrl: p.image_url || '',
  marketValue: p.market_value || '',
  scoutRating: Number(p.scout_rating) || 0,
  stats: p.stats || {},       
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
  isEdited: n.is_edited,
  comments: n.comments || [],
  likes: n.likes || []
});

// ==========================================
// SERVICE CLASS
// ==========================================

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
  public dbError: string | null = null;

  constructor() {
    const stored = localStorage.getItem('lasquadra_app_settings');
    if (stored) {
        try {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
        } catch (e) {
            console.error("Error loading settings", e);
        }
    }
    this.init();
  }

  public getSetupSQL(): string {
    return `-- SQL SETUP (Simplificado) --
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  team TEXT,
  position TEXT,
  country TEXT,
  age INTEGER,
  height TEXT,
  weight TEXT,
  foot TEXT,
  image_url TEXT,
  market_value TEXT,
  scout_rating INTEGER DEFAULT 70,
  stats JSONB DEFAULT '{}'::jsonb,
  contract JSONB DEFAULT '{}'::jsonb,
  physical JSONB DEFAULT '{}'::jsonb,
  nutrition JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  scout_id UUID,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb, 
  likes JSONB DEFAULT '[]'::jsonb,   
  timestamp BIGINT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'scout',
  organization TEXT,
  avatar TEXT,
  age INTEGER,
  bio TEXT,
  email TEXT,
  approved BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.app_config (
  id INTEGER PRIMARY KEY,
  app_name TEXT DEFAULT 'LA SQUADRA',
  app_logo_url TEXT
);
INSERT INTO public.app_config (id, app_name) VALUES (1, 'LA SQUADRA') ON CONFLICT (id) DO NOTHING;

-- Policies --
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON public.players;
CREATE POLICY "Public Access" ON public.players FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Access Notes" ON public.notes;
CREATE POLICY "Public Access Notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Access Profiles" ON public.profiles;
CREATE POLICY "Public Access Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Access Config" ON public.app_config;
CREATE POLICY "Public Access Config" ON public.app_config FOR ALL USING (true) WITH CHECK (true);

-- Realtime --
ALTER TABLE public.players REPLICA IDENTITY FULL;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.players, public.notes, public.profiles, public.app_config;
`;
  }

  private async init() {
    if (!isSupabaseConfigured) return;
    
    await this.refreshAll();
    this.initialized = true;

    // Suscripciones Realtime
    supabase.channel('public:players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        // Si el evento viene de mi propia acción (insert/delete), ya lo actualicé localmente.
        // Pero para sincronizar con otros, hacemos fetch.
        this.fetchPlayers();
      })
      .subscribe();
      
    supabase.channel('public:notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => this.fetchNotes())
      .subscribe();

    supabase.channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => this.fetchUsers())
      .subscribe();

    supabase.channel('public:app_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => this.fetchSettings())
      .subscribe();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  public async refreshAll() {
      await Promise.all([
        this.fetchPlayers(),
        this.fetchNotes(),
        this.fetchUsers(),
        this.fetchSettings()
      ]);
  }

  private async fetchPlayers() {
    try {
      const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('created_at', { ascending: false });
          
      if (error) {
        if (error.message.includes("does not exist")) {
          this.dbError = "TABLAS_FALTANTES";
        } else {
          this.dbError = error.message;
        }
        this.notifyListeners();
        return;
      }
      
      if (data) {
        this.dbError = null;
        this.players = data.map(mapPlayerFromDB);
        this.notifyListeners();
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
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
          passwordHash: '',
          salt: ''
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

  // --- WRITE OPERATIONS (Optimistic) ---

  public async addPlayer(player: Player) {
    // 1. Crear objeto DB
    const dbPlayer = {
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
    
    // 2. ACTUALIZACIÓN OPTIMISTA: Agregar localmente antes de que la DB responda
    // Asignamos un ID temporal si es necesario, aunque en refresh se sobrescribirá
    const tempPlayer = { ...player, id: player.id.startsWith('temp') ? player.id : 'temp-' + Date.now() };
    this.players = [tempPlayer, ...this.players]; 
    this.notifyListeners(); // Actualizar UI inmediatamente

    // 3. Insertar en DB
    const { data, error } = await supabase.from('players').insert([dbPlayer]).select();
    
    if (error) {
        alert("Error al guardar: " + error.message);
        // Revertir si falla
        this.players = this.players.filter(p => p.id !== tempPlayer.id);
        this.notifyListeners();
    } else if (data && data[0]) {
        // Reemplazar el temporal con el real de la DB
        const realPlayer = mapPlayerFromDB(data[0]);
        this.players = this.players.map(p => p.id === tempPlayer.id ? realPlayer : p);
        this.notifyListeners();
    }
  }

  public async updatePlayer(player: Player) {
    const dbPlayer = {
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
    
    // Optimistic Update
    this.players = this.players.map(p => p.id === player.id ? player : p);
    this.notifyListeners();

    const { error } = await supabase.from('players').update(dbPlayer).eq('id', player.id);
    if (error) {
        console.error(error);
        this.fetchPlayers(); // Revertir
    }
  }

  public async deletePlayer(id: string) {
    // 1. Optimistic Delete
    const originalList = [...this.players];
    this.players = this.players.filter(p => p.id !== id);
    this.notifyListeners();

    // 2. DB Delete
    const { error } = await supabase.from('players').delete().eq('id', id);
    
    if (error) {
        alert("Error al eliminar: " + error.message);
        this.players = originalList; // Revertir
        this.notifyListeners();
    }
  }

  public async clearPlayers() {
    this.players = [];
    this.notifyListeners();
    await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  public async addNote(note: Note) {
    const dbNote = {
      player_id: note.playerId,
      scout_id: note.scoutId,
      content: note.content,
      category: note.category,
      tags: note.tags,
      attachments: note.attachments,
      timestamp: note.timestamp,
      is_edited: false
    };

    // Optimistic
    this.notes = [note, ...this.notes];
    this.notifyListeners();

    const { data, error } = await supabase.from('notes').insert([dbNote]).select();
    if (error) {
         this.notes = this.notes.filter(n => n.id !== note.id);
         this.notifyListeners();
    } else if (data && data[0]) {
         const realNote = mapNoteFromDB(data[0]);
         this.notes = this.notes.map(n => n.id === note.id ? realNote : n);
         this.notifyListeners();
    }
  }

  public async updateNote(note: Note) {
    const dbNote = {
      content: note.content,
      category: note.category,
      tags: note.tags,
      attachments: note.attachments,
      is_edited: true
    };
    
    this.notes = this.notes.map(n => n.id === note.id ? note : n);
    this.notifyListeners();

    await supabase.from('notes').update(dbNote).eq('id', note.id);
  }

  public async deleteNote(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.notifyListeners();
    await supabase.from('notes').delete().eq('id', id);
  }

  public async saveSettings(newSettings: AppSettings) {
    this.settings = newSettings;
    localStorage.setItem('lasquadra_app_settings', JSON.stringify(newSettings));
    document.title = newSettings.appName;
    this.notifyListeners();

    await supabase.from('app_config').upsert({
       id: 1,
       app_name: newSettings.appName,
       app_logo_url: newSettings.appLogoUrl
    });
  }

  public async deleteUser(userId: string) {
      this.users = this.users.filter(u => u.id !== userId);
      this.notifyListeners();
      await supabase.from('profiles').delete().eq('id', userId);
      // Nota: auth.users no se puede borrar desde el cliente sin una Edge Function de admin,
      // pero borrar el perfil bloquea el acceso en la app.
  }
}

export const dataService = new DataService();
