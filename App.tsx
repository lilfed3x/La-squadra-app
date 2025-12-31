
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User, AppSettings } from './types';
import { AuthService } from './services/authService';
import { dataService } from './services/dataService'; 
import { exportPlayersToExcel } from './services/exportService'; 
import { AuthPage } from './components/AuthPage';
import { PlayerCard } from './components/PlayerCard';
import { PlayerProfile } from './components/PlayerProfile';
import { PlayerFormModal, ModalTab } from './components/PlayerFormModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BulkActionModal } from './components/BulkActionModal';
import { Dashboard } from './components/Dashboard';
import { UpdatePrompt } from './components/UpdatePrompt'; 
import { LiveSession } from './components/LiveSession';
import { Menu, Search, UserPlus, LayoutDashboard, Users, Activity, LogOut, Settings, ChevronUp, ChevronDown, ChevronRight, User as UserIcon, Shield, Download, X, CheckSquare, Trash2, ArrowRightLeft, Zap } from 'lucide-react';
import { nanoid } from 'nanoid';

type ViewMode = 'dashboard' | 'database' | 'live';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(dataService.getSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [playerFilter, setPlayerFilter] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      const currentUser = await AuthService.getCurrentSessionUser();
      if (currentUser) setUser(currentUser);
      
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings());
      
      const initialPlayers = dataService.getPlayers();
      if (initialPlayers.length > 0 && window.innerWidth >= 768) {
         setActivePlayerId(initialPlayers[0].id);
      }
      setIsLoadingAuth(false);
    };
    initApp();

    const unsubscribe = dataService.subscribe(() => {
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings()); 
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    setPlayers(dataService.getPlayers());
    setNotes(dataService.getNotes());
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setShowUserMenu(false);
    window.location.reload();
  };

  const activePlayer = players.find(p => p.id === activePlayerId);
  const activeNotes = notes.filter(n => n.playerId === activePlayerId).sort((a, b) => b.timestamp - a.timestamp);

  const handleAddNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[] = []) => {
    if (!user) return;
    const newNote: Note = {
      id: nanoid(),
      playerId: activePlayerId,
      scoutId: user.id, 
      content, category, tags,
      timestamp: Date.now(),
      attachments,
      comments: [],
      likes: []
    };
    dataService.addNote(newNote);
  };

  const filteredPlayers = useMemo(() => {
    const term = (playerFilter || '').toLowerCase().trim();
    if (!term) return players;
    return players.filter(p => 
      p.name.toLowerCase().includes(term) || p.team.toLowerCase().includes(term)
    );
  }, [players, playerFilter]);

  const groupedPlayers = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    filteredPlayers.forEach(p => {
      const team = p.team || 'Sin Equipo';
      if (!groups[team]) groups[team] = [];
      groups[team].push(p);
    });
    return groups;
  }, [filteredPlayers]);

  if (isLoadingAuth) return <div className="h-screen bg-[#0f172a] flex items-center justify-center"><Activity className="w-8 h-8 text-scout-gold animate-spin" /></div>;
  if (!user) return <AuthPage onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;

  return (
    <div className="flex h-screen bg-scout-900 text-scout-100 font-sans overflow-hidden">
      <UpdatePrompt />

      {/* SIDEBAR */}
      {!isMobile && (
        <div className="w-64 bg-scout-900 border-r border-scout-800 flex flex-col flex-shrink-0">
          <div className="p-6 flex flex-col items-center gap-3 mb-2 cursor-pointer" onClick={() => setViewMode('dashboard')}>
             <div className="w-16 h-16 bg-gradient-to-br from-scout-900 to-black rounded-xl flex items-center justify-center shadow-lg border border-scout-gold/30">
               <Shield className="w-8 h-8 text-scout-gold"/>
             </div>
             <h1 className="font-black text-xl tracking-widest text-white uppercase">{appSettings.appName}</h1>
          </div>

          <div className="px-4 space-y-2 mt-4 flex-1">
             <button onClick={() => setViewMode('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}>
               <LayoutDashboard className="w-5 h-5" /> <span>Panel</span>
             </button>
             <button onClick={() => setViewMode('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'database' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}>
                 <Users className="w-5 h-5" /> <span>Base de Datos</span>
             </button>
             <button onClick={() => setViewMode('live')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${viewMode === 'live' ? 'bg-emerald-500 text-scout-900' : 'bg-scout-800/30 text-emerald-400 hover:bg-scout-800/50'}`}>
                 <Zap className="w-5 h-5" /> <span>SESIÓN EN VIVO</span>
             </button>
          </div>
          
          <div className="mt-auto border-t border-scout-800 p-4 relative" onClick={() => setShowUserMenu(!showUserMenu)}>
             <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-scout-800">
               <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt="" className="w-8 h-8 rounded-full border border-scout-600" />
               <div className="flex-1 overflow-hidden"><p className="text-sm font-semibold truncate text-white">{user.name}</p></div>
               <ChevronUp className={`w-4 h-4 text-scout-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
             </div>
             {showUserMenu && (
               <div className="absolute bottom-full left-4 right-4 mb-2 bg-scout-800 border border-scout-700 rounded-xl shadow-xl overflow-hidden z-50">
                   <button onClick={() => setIsProfileModalOpen(true)} className="w-full text-left px-4 py-2 text-xs hover:bg-scout-700 flex items-center gap-2 text-white"><UserIcon className="w-3 h-3" /> Perfil</button>
                   <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2 border-t border-scout-700"><LogOut className="w-3 h-3" /> Salir</button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b1120] relative w-full pb-16 md:pb-0">
        <header className="h-16 border-b border-scout-800 bg-scout-900/50 backdrop-blur-sm flex items-center px-4 md:px-6 justify-between shrink-0 z-30">
          <h2 className="text-lg font-bold text-white">
            {viewMode === 'dashboard' ? 'Análisis Global' : viewMode === 'live' ? 'Scouting en Tiempo Real' : 'Jugadores'}
          </h2>
          {viewMode !== 'live' && (
            <div className="relative w-64 md:w-80">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500" />
                <input 
                    type="text" 
                    value={playerFilter} 
                    onChange={(e) => setPlayerFilter(e.target.value)} 
                    placeholder="Buscar..." 
                    className="w-full bg-scout-800 text-scout-200 pl-9 pr-4 py-2 rounded-full border border-scout-700 focus:border-scout-gold/50 outline-none text-xs transition-all" 
                />
            </div>
          )}
        </header>

        <main className="flex-1 overflow-hidden relative">
          {viewMode === 'dashboard' && <Dashboard players={players} />}
          {viewMode === 'live' && <LiveSession players={players} user={user} />}
          {viewMode === 'database' && (
             <div className="flex h-full relative">
                <div className={`${isMobile && activePlayerId ? 'hidden' : 'flex'} w-full md:w-72 bg-scout-900/30 border-r border-scout-800 flex-col`}>
                   <div className="p-4 border-b border-scout-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-scout-400 uppercase">Lista</span>
                      <button onClick={() => setIsModalOpen(true)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md"><UserPlus className="w-4 h-4" /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {Object.keys(groupedPlayers).map(team => (
                        <div key={team} className="mb-2">
                           <div className="px-2 py-1 text-[10px] font-bold text-scout-500 uppercase">{team}</div>
                           {groupedPlayers[team].map(player => (
                             <PlayerCard 
                                key={player.id} 
                                player={player} 
                                isActive={player.id === activePlayerId} 
                                onClick={() => setActivePlayerId(player.id)} 
                             />
                           ))}
                        </div>
                      ))}
                   </div>
                </div>
                <div className={`${isMobile && !activePlayerId ? 'hidden' : 'flex-1'} bg-[#0b1120] overflow-hidden`}>
                   {activePlayer ? (
                      <PlayerProfile 
                        player={activePlayer} notes={activeNotes} 
                        onAddNote={handleAddNote} onPlayerUpdate={(p) => dataService.updatePlayer(p)}
                        onEditPlayer={(p) => { setEditingPlayer(p); setIsModalOpen(true); }}
                        onDeletePlayer={(id) => dataService.deletePlayer(id)}
                        currentUser={user} allUsers={dataService.getUsers()}
                        onEditNote={(n) => dataService.updateNote(n)} onDeleteNote={(id) => dataService.deleteNote(id)}
                        onBack={() => setActivePlayerId('')}
                      />
                   ) : <div className="hidden md:flex flex-col items-center justify-center h-full text-scout-500"><Shield className="w-16 h-16 opacity-20 mb-4" /><p>Selecciona un jugador</p></div>}
                </div>
             </div>
          )}
        </main>
      </div>

      {/* MOBILE NAV */}
      {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 h-16 bg-scout-900 border-t border-scout-800 flex justify-around items-center z-50">
              <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center ${viewMode === 'dashboard' ? 'text-scout-gold' : 'text-scout-500'}`}><LayoutDashboard className="w-6 h-6" /><span className="text-[10px]">Panel</span></button>
              <button onClick={() => setViewMode('live')} className={`flex flex-col items-center ${viewMode === 'live' ? 'text-emerald-400' : 'text-scout-500'}`}><Zap className="w-6 h-6" /><span className="text-[10px]">EN VIVO</span></button>
              <button onClick={() => setViewMode('database')} className={`flex flex-col items-center ${viewMode === 'database' ? 'text-scout-gold' : 'text-scout-500'}`}><Users className="w-6 h-6" /><span className="text-[10px]">Base</span></button>
          </div>
      )}

      <PlayerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(p) => editingPlayer ? dataService.updatePlayer({...editingPlayer, ...p}) : dataService.addPlayer(p as Player)} initialData={editingPlayer} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentSettings={appSettings} onSave={(s) => dataService.saveSettings(s)} currentUser={user} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={user} onSave={(u) => AuthService.updateCurrentUser(u)} />
    </div>
  );
};

export default App;
