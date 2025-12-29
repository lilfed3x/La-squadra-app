
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Player, Note, User, AppSettings } from '../types';

// ==========================================
// DATA MAPPERS (DB snake_case <-> App camelCase)
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
  isEdited: n.is_edited
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
            console.error("Error loading settings from storage", e);
        }
    }
    this.init();
  }

  public getSetupSQL(): string {
    return `-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Entra en tu proyecto y ve a "SQL Editor"
-- 3. Crea una "New Query", pega este código y dale a "Run"

-- CREAR TABLA DE JUGADORES
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

-- CREAR TABLA DE NOTAS
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  scout_id UUID,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]'::jsonb,
  timestamp BIGINT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CREAR TABLA DE PERFILES (USUARIOS)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'scout',
  organization TEXT,
  avatar TEXT,
  age INTEGER,
  bio TEXT,
  email TEXT
);

-- CREAR TABLA DE CONFIGURACIÓN
CREATE TABLE IF NOT EXISTS public.app_config (
  id INTEGER PRIMARY KEY,
  app_name TEXT DEFAULT 'LA SQUADRA',
  app_logo_url TEXT
);

-- INSERTAR CONFIGURACIÓN INICIAL
INSERT INTO public.app_config (id, app_name) VALUES (1, 'LA SQUADRA') ON CONFLICT (id) DO NOTHING;

-- HABILITAR TIEMPO REAL (REALTIME)
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- HABILITAR RLS Y POLÍTICAS DE ACCESO PÚBLICO (PARA DESARROLLO)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total jugadores" ON public.players FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total notas" ON public.notes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total perfiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total config" ON public.app_config FOR ALL USING (true) WITH CHECK (true);`;
  }

  private async init() {
    if (!isSupabaseConfigured) return;
    
    await this.refreshAll();
    this.initialized = true;

    // Configurar suscripciones realtime
    supabase.channel('public:players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => this.fetchPlayers())
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
        console.warn('⚠️ Intento de carga de jugadores fallido:', error.message);
        // Detección más amplia de errores de esquema
        if (
          error.message.includes("public.players") || 
          error.message.includes("schema cache") || 
          error.code === 'PGRST116' || 
          error.code === '42P01'
        ) {
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
      console.error('Error fatal cargando jugadores:', err);
    }
  }

  private async fetchNotes() {
    try {
      const { data, error } = await supabase
          .from('notes')
          .select('*')
          .order('timestamp', { ascending: false });

      if (!error && data) {
        this.notes = data.map(mapNoteFromDB);
        this.notifyListeners();
      }
    } catch (e) {}
  }

  private async fetchUsers() {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        this.users = data.map((p: any) => ({
          id: p.id,
          email: p.email || '',
          name: p.name || 'Usuario',
          role: p.role,
          organization: p.organization,
          avatar: p.avatar,
          age: p.age,
          bio: p.bio,
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
          this.settings = {
              ...this.settings,
              appName: data.app_name || this.settings.appName,
              appLogoUrl: data.app_logo_url || this.settings.appLogoUrl
          };
          localStorage.setItem('lasquadra_app_settings', JSON.stringify(this.settings));
          document.title = this.settings.appName;
          this.notifyListeners();
      }
    } catch (e) {}
  }

  public getPlayers(): Player[] { return this.players; }
  public getNotes(): Note[] { return this.notes; }
  public getUsers(): User[] { return this.users; }
  public getSettings(): AppSettings { return this.settings; }

  public async addPlayer(player: Player) {
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
    const { error } = await supabase.from('players').insert([dbPlayer]);
    if (error) console.error("Error guardando jugador:", error.message);
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
    await supabase.from('players').update(dbPlayer).eq('id', player.id);
  }

  public async deletePlayer(id: string) {
    await supabase.from('notes').delete().eq('player_id', id);
    await supabase.from('players').delete().eq('id', id);
  }

  public async clearPlayers() {
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
    await supabase.from('notes').insert([dbNote]);
  }

  public async updateNote(note: Note) {
    await supabase.from('notes').update({
       content: note.content,
       category: note.category,
       tags: note.tags,
       is_edited: true,
       attachments: note.attachments
    }).eq('id', note.id);
  }

  public async deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id);
  }

  public async deleteUser(id: string) {
     await supabase.from('profiles').delete().eq('id', id);
     this.fetchUsers();
  }

  public async saveSettings(s: AppSettings) {
      this.settings = s;
      localStorage.setItem('lasquadra_app_settings', JSON.stringify(s));
      document.title = s.appName;
      await supabase.from('app_config').upsert({ id: 1, app_name: s.appName, app_logo_url: s.appLogoUrl });
      this.notifyListeners();
  }
  
  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

export const dataService = new DataService();
