
import React, { useState, useEffect, useMemo } from 'react';
import { Attachment, Note, NoteCategory, Player, User, AppSettings } from './types';
import { AuthService } from './services/authService';
import { dataService } from './services/dataService'; 
import { isSupabaseConfigured } from './services/supabaseClient';
import { exportPlayersToExcel } from './services/exportService'; 
import { AuthPage } from './components/AuthPage';
import { PlayerCard } from './components/PlayerCard';
import { PlayerProfile } from './components/PlayerProfile';
import { PlayerFormModal, ModalTab } from './components/PlayerFormModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { Dashboard } from './components/Dashboard';
import { Menu, Search, UserPlus, LayoutDashboard, Users, Activity, LogOut, Settings, ChevronUp, ChevronDown, ChevronRight, User as UserIcon, CloudLightning, Shield, Download, CloudOff, AlertTriangle, Copy, Check, RefreshCw, X } from 'lucide-react';
import { nanoid } from 'nanoid';

type ViewMode = 'dashboard' | 'database';

const App: React.FC = () => {
  // DEV MODE: Login desactivado temporalmente (User inicializado)
  const [user, setUser] = useState<User | null>({
    id: 'dev-mode-admin',
    name: 'Desarrollador (Admin)',
    email: 'dev@lasquadra.com',
    role: 'admin',
    passwordHash: '',
    salt: '',
    approved: true
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(dataService.getSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  
  // Responsive State
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile logic
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [playerFilter, setPlayerFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<ModalTab>('general');
  const [modalRestrictToTab, setModalRestrictToTab] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dbError, setDbError] = useState<string | null>(dataService.dbError);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Resize Listener for Responsive Logic
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true); // Always open sidebar on desktop by default
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      // Intentamos obtener sesión real, pero si no hay, mantenemos el usuario dev
      const currentUser = await AuthService.getCurrentSessionUser();
      if (currentUser) {
          setUser(currentUser);
      }
      
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings());
      setDbError(dataService.dbError);
      
      const initialPlayers = dataService.getPlayers();
      // On desktop, select first player automatically. On mobile, start with none (to show list).
      if (initialPlayers.length > 0 && window.innerWidth >= 768) {
         setActivePlayerId(initialPlayers[0].id);
      }

      setIsLoadingAuth(false);
    };
    initApp();
    document.title = appSettings.appName;

    const unsubscribe = dataService.subscribe(() => {
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings()); 
      setDbError(dataService.dbError);
    });

    return () => unsubscribe();
  }, [appSettings.appName]);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(dataService.getSetupSQL());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await dataService.refreshAll();
    setTimeout(() => {
      setIsRefreshing(false);
      setDbError(dataService.dbError);
    }, 1000);
  };

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

  const handleSaveSettings = (newSettings: AppSettings) => dataService.saveSettings(newSettings);

  const handleUpdateProfile = async (updates: Partial<User>) => {
    const result = await AuthService.updateCurrentUser(updates);
    if (result.success && result.user) setUser(result.user);
  };

  const activePlayer = players.find(p => p.id === activePlayerId);
  const activeNotes = notes
    .filter(n => n.playerId === activePlayerId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleAddNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[] = []) => {
    if (!user) return;
    const newNote: Note = {
      id: `temp-${nanoid()}`,
      playerId: activePlayerId,
      scoutId: user.id, 
      content, category, tags,
      timestamp: Date.now(),
      attachments,
    };
    dataService.addNote(newNote);
  };

  const handleEditNote = (updatedNote: Note) => {
    if (!user) return; 
    dataService.updateNote(updatedNote); 
  };

  const handleDeleteNote = (noteId: string) => {
    if (!user) return;
    dataService.deleteNote(noteId); 
  };

  const handleSavePlayer = (playerData: Partial<Player>) => {
    if (editingPlayer) {
      const updated = { ...editingPlayer, ...playerData } as Player;
      dataService.updatePlayer(updated); 
    } else {
      const newPlayer: Player = { id: `temp-p-${nanoid()}`, ...playerData as any };
      dataService.addPlayer(newPlayer); 
      setActivePlayerId(newPlayer.id);
    }
    setEditingPlayer(null);
  };

  const handleUpdatePlayer = (player: Player) => dataService.updatePlayer(player);

  const handleDeletePlayer = (id: string) => {
    dataService.deletePlayer(id); 
    const remaining = players.filter(p => p.id !== id);
    if (activePlayerId === id) {
        setActivePlayerId(remaining.length > 0 && !isMobile ? remaining[0].id : '');
    }
  };

  const openAddModal = () => { 
    setEditingPlayer(null); 
    setModalInitialTab('general');
    setModalRestrictToTab(false);
    setIsModalOpen(true); 
  };

  const openEditModal = (player: Player, initialTab: ModalTab = 'general', restrictMode: boolean = false) => { 
    setEditingPlayer(player); 
    setModalInitialTab(initialTab);
    setModalRestrictToTab(restrictMode);
    setIsModalOpen(true); 
  };

  const handleExportAll = () => exportPlayersToExcel(filteredPlayers);

  const filteredPlayers = useMemo(() => {
    const term = (playerFilter || '').toLowerCase().trim();
    if (!term) return players;
    return players.filter(p => 
      (p.name || '').toLowerCase().includes(term) ||
      (p.team || '').toLowerCase().includes(term) ||
      (p.position || '').toLowerCase().includes(term) || 
      (p.country || '').toLowerCase().includes(term)
    );
  }, [players, playerFilter]);

  const groupedPlayers = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    filteredPlayers.forEach(p => {
      const team = p.team || 'Agentes Libres';
      if (!groups[team]) groups[team] = [];
      groups[team].push(p);
    });
    return groups;
  }, [filteredPlayers]);

  const sortedTeams = Object.keys(groupedPlayers).sort();
  const toggleTeam = (team: string) => setExpandedTeams(prev => ({ ...prev, [team]: !prev[team] }));

  // Navigation Logic
  const handleNavClick = (mode: ViewMode) => {
      setViewMode(mode);
      if (isMobile) setSidebarOpen(false);
      // If switching to database on mobile, reset selection to show list
      if (mode === 'database' && isMobile) setActivePlayerId(''); 
  };

  const handlePlayerSelect = (id: string) => {
      setActivePlayerId(id);
      if (isMobile) {
          // In mobile, selection implies going to details view
          // ViewMode stays database, but we conditionally render details
      }
  };

  const handleBackToList = () => {
      setActivePlayerId('');
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center">
        <Activity className="w-8 h-8 text-scout-gold animate-spin" />
      </div>
    );
  }

  if (dbError === "TABLAS_FALTANTES") {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden">
        <div className="max-w-3xl w-full bg-scout-800 border border-scout-700 rounded-2xl p-8 shadow-2xl animate-scaleIn flex flex-col max-h-full">
          <div className="flex items-center gap-4 mb-6 shrink-0">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Configuración de Base de Datos</h2>
              <p className="text-scout-400">Las tablas 'players', 'notes', etc. no existen aún en tu proyecto.</p>
            </div>
          </div>
          
          <div className="bg-scout-900/50 border-l-4 border-scout-gold p-4 mb-6 rounded-r-lg shrink-0">
             <p className="text-sm text-scout-100 font-medium">Solución rápida:</p>
             <p className="text-xs text-scout-400 mt-1">Copia el SQL de abajo, ve al <b>SQL Editor</b> de Supabase, pégalo y presiona <b>Run</b>.</p>
          </div>

          <div className="relative group mb-6 flex-1 min-h-0">
            <pre className="h-full bg-scout-900 border border-scout-700 rounded-xl p-4 text-[10px] text-scout-400 font-mono overflow-y-auto custom-scrollbar leading-relaxed">
              {dataService.getSetupSQL()}
            </pre>
            <button 
              onClick={handleCopySQL}
              className="absolute top-2 right-2 p-2 bg-scout-700 hover:bg-scout-600 text-white rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar SQL'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
             <a href="https://supabase.com/dashboard" target="_blank" className="text-scout-gold hover:underline text-sm font-medium">Abrir Supabase Dashboard →</a>
             <button 
                onClick={handleManualRefresh} 
                disabled={isRefreshing}
                className="w-full sm:w-auto px-8 py-3 bg-scout-accent hover:bg-emerald-400 text-scout-900 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
             >
                {isRefreshing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Ya lo hice, reintentar conexión
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;

  return (
    <div className="flex h-screen bg-scout-900 text-scout-100 font-sans overflow-hidden">
      
      {/* MOBILE OVERLAY */}
      {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
          />
      )}

      {/* SIDEBAR (Responsive) */}
      <div className={`
        fixed md:relative z-50 h-full bg-scout-900 border-r border-scout-800 
        transition-transform duration-300 ease-in-out flex flex-col shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'w-0 md:w-64'} 
      `}>
        {/* Mobile Close Button */}
        <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 text-scout-400 hover:text-white"
        >
            <X className="w-6 h-6" />
        </button>

        <div className="p-6 flex flex-col items-center gap-3 mb-2 cursor-pointer hover:opacity-80 transition-opacity text-center mt-6 md:mt-0" onClick={() => handleNavClick('dashboard')}>
           <div className="w-16 h-16 bg-gradient-to-br from-scout-900 to-black rounded-xl flex items-center justify-center shadow-lg border border-scout-gold/30 overflow-hidden">
             {appSettings.appLogoUrl ? <img src={appSettings.appLogoUrl} alt="App Logo" className="w-full h-full object-cover" /> : <svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10"><path d="M4 21h16" /><path d="M5 21V10a7 7 0 0 1 14 0v11" /><path d="M5 10l7-5 7 5" /><path d="M8 21V12a4 4 0 0 1 8 0v9" /><path d="M12 2v3" /></svg>}
           </div>
           {sidebarOpen && <h1 className="font-black text-2xl tracking-widest text-white uppercase break-words w-full animate-fadeIn">{appSettings.appName}</h1>}
        </div>

        <div className="px-4 space-y-2 mt-4 flex-1 overflow-y-auto">
           <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}>
             <LayoutDashboard className="w-5 h-5 shrink-0" /> {sidebarOpen && <span>Panel</span>}
           </button>
           <button onClick={() => handleNavClick('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'database' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}>
               <Users className="w-5 h-5 shrink-0" /> {sidebarOpen && <span>Base de Datos</span>}
           </button>
        </div>
        
        <div className="mt-auto border-t border-scout-800 p-4 relative">
           {showUserMenu && (
             <div className="absolute bottom-full left-4 right-4 mb-2 bg-scout-800 border border-scout-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-50 min-w-[200px]">
               <div className="py-1">
                 <button onClick={() => { setIsProfileModalOpen(true); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-scout-200 hover:bg-scout-700 flex items-center gap-2 transition-colors"><UserIcon className="w-3.5 h-3.5" /> Perfil</button>
                 {user.role === 'admin' && <button onClick={() => { setIsSettingsModalOpen(true); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-scout-200 hover:bg-scout-700 flex items-center gap-2 transition-colors"><Settings className="w-3.5 h-3.5" /> Configuración</button>}
                 <div className="border-t border-scout-700 my-1"></div>
                 <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"><LogOut className="w-3.5 h-3.5" /> Cerrar Sesión</button>
               </div>
             </div>
           )}
           <div className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${showUserMenu ? 'bg-scout-800' : 'hover:bg-scout-800'}`} onClick={() => setShowUserMenu(!showUserMenu)}>
             <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full border border-scout-600 object-cover shrink-0" />
             {sidebarOpen && (
                 <div className="flex-1 overflow-hidden animate-fadeIn">
                   <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                   <p className="text-[10px] text-scout-500 truncate">{user.email}</p>
                 </div>
             )}
             {sidebarOpen && <ChevronUp className={`w-4 h-4 text-scout-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />}
           </div>
           {sidebarOpen && (
               <div className="mt-3 px-2 animate-fadeIn">
                 <div className={`flex items-center gap-2 text-sm font-medium ${isSupabaseConfigured ? 'text-scout-gold' : 'text-gray-500'}`}>
                    {isSupabaseConfigured ? <CloudLightning className="w-3 h-3 text-scout-gold animate-pulse" /> : <CloudOff className="w-3 h-3 text-gray-500" />}
                    <span className="text-xs">{isSupabaseConfigured ? 'Conectado' : 'Offline'}</span>
                 </div>
               </div>
           )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b1120] relative w-full">
        <header className="h-16 border-b border-scout-800 bg-scout-900/50 backdrop-blur-sm flex items-center px-4 md:px-6 justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
             {/* Mobile Toggle */}
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-scout-400 hover:text-white md:hidden p-1">
                 <Menu className="w-6 h-6"/>
             </button>
             <h2 className="text-lg font-bold text-white truncate">
                {viewMode === 'dashboard' ? 'Panel de Análisis' : 'Base de Datos'}
             </h2>
          </div>
          <div className="flex items-center gap-4">
             {/* Search: Hide on very small screens if needed, or make expandable. For now keep simple. */}
             <div className="relative w-32 md:w-64">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500" />
               <input type="text" value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} placeholder="Buscar..." className="w-full bg-scout-800 text-scout-200 pl-9 pr-4 py-2 rounded-full border border-scout-700 focus:border-scout-gold/50 outline-none text-xs transition-all placeholder:text-scout-500" />
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {viewMode === 'dashboard' && <Dashboard players={filteredPlayers} />}
          
          {viewMode === 'database' && (
             <div className="flex h-full relative">
                
                {/* LIST PANEL */}
                {/* On mobile: Hidden if a player is selected. On desktop: Always visible. */}
                <div className={`
                    ${isMobile && activePlayerId ? 'hidden' : 'flex'}
                    w-full md:w-72 bg-scout-900/30 border-r border-scout-800 flex-col transition-all duration-300
                `}>
                   <div className="w-full flex flex-col h-full">
                     <div className="p-4 border-b border-scout-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">Jugadores ({filteredPlayers.length})</span>
                        <div className="flex gap-1">
                          <button onClick={handleExportAll} className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md transition-colors"><Download className="w-4 h-4" /></button>
                          <button onClick={openAddModal} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md transition-colors"><UserPlus className="w-4 h-4" /></button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {sortedTeams.map(team => {
                          const isExpanded = expandedTeams[team] !== false; 
                          return (
                            <div key={team} className="mb-2">
                              <div onClick={() => toggleTeam(team)} className="flex items-center justify-between px-2 py-1.5 bg-scout-800/50 hover:bg-scout-800 rounded-lg cursor-pointer transition-colors mb-1 group">
                                 <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-scout-500 group-hover:text-scout-gold" /><span className="text-xs font-bold text-scout-300 group-hover:text-white uppercase tracking-wide truncate max-w-[140px]">{team}</span></div>
                                 {isExpanded ? <ChevronDown className="w-3 h-3 text-scout-500"/> : <ChevronRight className="w-3 h-3 text-scout-500"/>}
                              </div>
                              {isExpanded && (
                                <div className="space-y-1 pl-1 border-l-2 border-scout-800 ml-2">
                                  {groupedPlayers[team].map(player => (
                                    <PlayerCard 
                                        key={player.id} 
                                        player={player} 
                                        isActive={player.id === activePlayerId} 
                                        onClick={() => handlePlayerSelect(player.id)} 
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                     </div>
                   </div>
                </div>
                
                {/* DETAIL PANEL */}
                {/* On mobile: Visible ONLY if player selected (Full width). On desktop: Always visible (Flex-1) */}
                <div className={`
                    ${isMobile && !activePlayerId ? 'hidden' : 'flex-1'}
                    bg-[#0b1120] overflow-hidden absolute md:relative inset-0 md:inset-auto z-10 md:z-auto
                `}>
                   {activePlayer ? (
                      <PlayerProfile 
                        player={activePlayer} 
                        notes={activeNotes} 
                        onAddNote={handleAddNote} 
                        onEditPlayer={openEditModal} 
                        onPlayerUpdate={handleUpdatePlayer} 
                        onDeletePlayer={handleDeletePlayer} 
                        currentUser={user} 
                        allUsers={dataService.getUsers()} 
                        onEditNote={handleEditNote} 
                        onDeleteNote={handleDeleteNote}
                        onBack={isMobile ? handleBackToList : undefined} 
                      />
                   ) : (
                       // Empty state for desktop
                       <div className="hidden md:flex flex-col items-center justify-center h-full text-scout-500">
                           <Shield className="w-16 h-16 opacity-20 mb-4" />
                           <p>Selecciona un jugador para ver detalles</p>
                       </div>
                   )}
                </div>
             </div>
          )}
        </main>
      </div>
      <PlayerFormModal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         onSave={handleSavePlayer} 
         initialData={editingPlayer}
         initialTab={modalInitialTab}
         restrictToTab={modalRestrictToTab}
      />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentSettings={appSettings} onSave={handleSaveSettings} currentUser={user} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={user} onSave={handleUpdateProfile} />
    </div>
  );
};

export default App;
