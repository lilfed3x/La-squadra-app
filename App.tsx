
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

type ViewMode = 'dashboard' | 'database' | 'profile_view';

const App: React.FC = () => {
  // DEV MODE: Usamos un UUID válido para evitar errores en Postgres
  const [user, setUser] = useState<User | null>({
    id: '00000000-0000-0000-0000-000000000001', // UUID válido para dev
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [playerFilter, setPlayerFilter] = useState('');
  // Search Dropdown State
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click Outside Listener for Search Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  useEffect(() => {
    const initApp = async () => {
      const currentUser = await AuthService.getCurrentSessionUser();
      if (currentUser) {
          setUser(currentUser);
      }
      
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings());
      setDbError(dataService.dbError);
      
      const initialPlayers = dataService.getPlayers();
      // On desktop, select first player automatically. 
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

    return () => { unsubscribe(); };
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
      // If mobile, go to list to see new player. If desktop, select it.
      if (!isMobile) setActivePlayerId(newPlayer.id);
    }
    setEditingPlayer(null);
  };

  const handleUpdatePlayer = (player: Player) => dataService.updatePlayer(player);

  const handleDeletePlayer = (id: string) => {
    // Optimistic UI handled in DataService, just manage selection state here
    dataService.deletePlayer(id); 
    setActivePlayerId(''); // Clear selection immediately
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

  // Search Suggestions (Autocomplete)
  const searchSuggestions = useMemo(() => {
      if (!playerFilter.trim()) return [];
      // Use filteredPlayers as source but limit results for dropdown
      return filteredPlayers.slice(0, 5);
  }, [filteredPlayers, playerFilter]);

  const handleSearchResultClick = (playerId: string) => {
      setActivePlayerId(playerId);
      setViewMode('database');
      setPlayerFilter(''); // Clear search to show full context, or keep it if preferred
      setShowSearchSuggestions(false);
  };

  const groupedPlayers = useMemo(() => {
    // If filtering, we still show the filtered list structure
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

  // Mobile Navigation Helpers
  const handleNavClick = (mode: ViewMode) => {
      setViewMode(mode);
      // Reset player selection when going to database in mobile to show list
      if (mode === 'database' && isMobile) {
          setActivePlayerId('');
      }
  };

  const handlePlayerSelect = (id: string) => {
      setActivePlayerId(id);
      // In mobile, stay in 'database' view mode but the renderer handles showing the detail component
      // because activePlayerId is set.
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

  // Database Error Screen (unchanged logic)
  if (dbError === "TABLAS_FALTANTES") {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden">
        <div className="max-w-3xl w-full bg-scout-800 border border-scout-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-4">Error de Base de Datos</h2>
          <button onClick={handleManualRefresh} className="px-6 py-2 bg-scout-accent text-scout-900 rounded font-bold">Reintentar</button>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;

  return (
    <div className="flex h-screen bg-scout-900 text-scout-100 font-sans overflow-hidden">
      
      {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
      {!isMobile && (
        <div className="w-64 bg-scout-900 border-r border-scout-800 flex flex-col flex-shrink-0 relative">
          {/* Logo */}
          <div className="p-6 flex flex-col items-center gap-3 mb-2 cursor-pointer text-center" onClick={() => handleNavClick('dashboard')}>
             <div className="w-16 h-16 bg-gradient-to-br from-scout-900 to-black rounded-xl flex items-center justify-center shadow-lg border border-scout-gold/30 overflow-hidden">
               {appSettings.appLogoUrl ? <img src={appSettings.appLogoUrl} alt="App Logo" className="w-full h-full object-cover" /> : <Shield className="w-8 h-8 text-scout-gold"/>}
             </div>
             <h1 className="font-black text-xl tracking-widest text-white uppercase">{appSettings.appName}</h1>
          </div>

          {/* Navigation */}
          <div className="px-4 space-y-2 mt-4 flex-1">
             <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}>
               <LayoutDashboard className="w-5 h-5 shrink-0" /> <span>Panel</span>
             </button>
             <button onClick={() => handleNavClick('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'database' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}>
                 <Users className="w-5 h-5 shrink-0" /> <span>Base de Datos</span>
             </button>
          </div>
          
          {/* User Footer */}
          <div className="mt-auto border-t border-scout-800 p-4 relative">
             {showUserMenu && (
               <div className="absolute bottom-full left-4 right-4 mb-2 bg-scout-800 border border-scout-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-50">
                 <div className="py-1">
                   <button onClick={() => { setIsProfileModalOpen(true); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-scout-200 hover:bg-scout-700 flex items-center gap-2"><UserIcon className="w-3.5 h-3.5" /> Perfil</button>
                   {user.role === 'admin' && <button onClick={() => { setIsSettingsModalOpen(true); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-scout-200 hover:bg-scout-700 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Configuración</button>}
                   <div className="border-t border-scout-700 my-1"></div>
                   <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Cerrar Sesión</button>
                 </div>
               </div>
             )}
             <div className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${showUserMenu ? 'bg-scout-800' : 'hover:bg-scout-800'}`} onClick={() => setShowUserMenu(!showUserMenu)}>
               <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full border border-scout-600 object-cover shrink-0" />
               <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                 <p className="text-[10px] text-scout-500 truncate">{user.email}</p>
               </div>
               <ChevronUp className={`w-4 h-4 text-scout-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
             </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b1120] relative w-full pb-16 md:pb-0">
        
        {/* HEADER (Simplified for Mobile) */}
        <header className="h-16 border-b border-scout-800 bg-scout-900/50 backdrop-blur-sm flex items-center px-4 md:px-6 justify-between shrink-0 z-30 gap-4">
          <div className="flex items-center gap-3 shrink-0">
             {/* Logo in Header for Mobile only */}
             {isMobile && (
                 <div className="w-8 h-8 bg-scout-800 rounded-lg flex items-center justify-center border border-scout-700">
                     <Shield className="w-5 h-5 text-scout-gold" />
                 </div>
             )}
             <h2 className="text-lg font-bold text-white truncate hidden md:block">
                {viewMode === 'dashboard' ? 'Panel de Control' : viewMode === 'profile_view' ? 'Mi Perfil' : 'Base de Datos'}
             </h2>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-2 max-w-xl">
             
             {/* SEARCH BAR (GLOBAL) */}
             <div className="relative w-full max-w-md" ref={searchContainerRef}>
                <div className="relative">
                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500" />
                   <input 
                      type="text" 
                      value={playerFilter} 
                      onChange={(e) => {
                         setPlayerFilter(e.target.value);
                         setShowSearchSuggestions(true);
                      }} 
                      onFocus={() => {
                        if (playerFilter) setShowSearchSuggestions(true);
                      }}
                      placeholder="Buscar jugador, equipo..." 
                      className="w-full bg-scout-800 text-scout-200 pl-9 pr-4 py-2 rounded-full border border-scout-700 focus:border-scout-gold/50 outline-none text-xs transition-all placeholder:text-scout-500" 
                   />
                   {playerFilter && (
                     <button onClick={() => { setPlayerFilter(''); setShowSearchSuggestions(false); }} className="absolute right-3 top-2.5 text-scout-500 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                     </button>
                   )}
                </div>

                {/* SEARCH SUGGESTIONS DROPDOWN */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-scout-800 border border-scout-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                      <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                         {searchSuggestions.map(player => (
                            <div 
                              key={player.id} 
                              onClick={() => handleSearchResultClick(player.id)}
                              className="px-4 py-3 hover:bg-scout-700 cursor-pointer flex items-center gap-3 transition-colors border-b border-scout-700/50 last:border-0"
                            >
                               <img src={player.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-scout-900 border border-scout-600" />
                               <div className="flex-1 overflow-hidden">
                                  <div className="text-sm font-bold text-white truncate">{player.name}</div>
                                  <div className="text-[10px] text-scout-400 flex items-center gap-2">
                                     <span>{player.team}</span>
                                     <span className="w-1 h-1 rounded-full bg-scout-600"></span>
                                     <span>{player.position}</span>
                                  </div>
                               </div>
                               <div className={`text-xs font-bold ${player.scoutRating >= 80 ? 'text-scout-gold' : 'text-scout-400'}`}>
                                  {player.scoutRating}
                               </div>
                            </div>
                         ))}
                      </div>
                      <div className="px-3 py-2 bg-scout-900/50 text-[10px] text-center text-scout-500 border-t border-scout-700">
                         Mostrando {searchSuggestions.length} coincidencias
                      </div>
                   </div>
                )}
             </div>

             {/* Mobile Settings Shortcut */}
             {isMobile && user.role === 'admin' && (
                 <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-scout-400 hover:text-white shrink-0">
                     <Settings className="w-5 h-5" />
                 </button>
             )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          
          {/* DASHBOARD VIEW */}
          {viewMode === 'dashboard' && <Dashboard players={players} />}
          
          {/* PROFILE VIEW (Mobile Only for User Profile) */}
          {viewMode === 'profile_view' && (
              <div className="p-6 flex flex-col items-center justify-center h-full">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-scout-700 mb-4">
                      <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <p className="text-scout-400 mb-6">{user.email}</p>
                  
                  <div className="w-full max-w-xs space-y-3">
                      <button onClick={() => setIsProfileModalOpen(true)} className="w-full py-3 bg-scout-800 rounded-xl border border-scout-700 text-white font-medium flex items-center justify-center gap-2">
                          <UserIcon className="w-4 h-4" /> Editar Perfil
                      </button>
                      <button onClick={handleLogout} className="w-full py-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 font-medium flex items-center justify-center gap-2">
                          <LogOut className="w-4 h-4" /> Cerrar Sesión
                      </button>
                  </div>
              </div>
          )}

          {/* DATABASE VIEW */}
          {viewMode === 'database' && (
             <div className="flex h-full relative">
                
                {/* LIST PANEL */}
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
                <div className={`
                    ${isMobile && !activePlayerId ? 'hidden' : 'flex-1'}
                    bg-[#0b1120] overflow-hidden absolute md:relative inset-0 md:inset-auto z-20 md:z-auto
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

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 h-16 bg-scout-900 border-t border-scout-800 flex justify-around items-center z-50 shadow-2xl safe-area-bottom">
              <button 
                onClick={() => handleNavClick('dashboard')}
                className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'dashboard' ? 'text-scout-gold' : 'text-scout-500'}`}
              >
                  <LayoutDashboard className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Panel</span>
              </button>
              
              <button 
                onClick={() => handleNavClick('database')}
                className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'database' ? 'text-scout-gold' : 'text-scout-500'}`}
              >
                  <Users className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Jugadores</span>
              </button>

              <button 
                onClick={() => handleNavClick('profile_view')}
                className={`flex flex-col items-center justify-center w-full h-full ${viewMode === 'profile_view' ? 'text-scout-gold' : 'text-scout-500'}`}
              >
                  <div className={`w-7 h-7 rounded-full overflow-hidden border-2 mb-0.5 ${viewMode === 'profile_view' ? 'border-scout-gold' : 'border-scout-600'}`}>
                      <img src={user.avatar} alt="Me" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-medium">Yo</span>
              </button>
          </div>
      )}

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
