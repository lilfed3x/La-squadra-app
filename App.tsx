import React, { useState, useEffect, useMemo } from 'react';
import { Attachment, Note, NoteCategory, Player, User, AppSettings } from './types';
import { AuthService } from './services/authService';
import { dataService } from './services/dataService'; // Import DataService
import { exportPlayersToExcel } from './services/exportService'; // Import Export Service
import { AuthPage } from './components/AuthPage';
import { PlayerCard } from './components/PlayerCard';
import { PlayerProfile } from './components/PlayerProfile';
import { PlayerFormModal } from './components/PlayerFormModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { Dashboard } from './components/Dashboard';
import { Menu, Search, UserPlus, LayoutDashboard, Users, Activity, LogOut, Settings, ChevronUp, ChevronDown, ChevronRight, User as UserIcon, CloudLightning, Shield, Download } from 'lucide-react';
import { nanoid } from 'nanoid';

type ViewMode = 'dashboard' | 'database';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // App Settings State (now reactive via dataService)
  const [appSettings, setAppSettings] = useState<AppSettings>(dataService.getSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // App State (Connected to DataService)
  const [players, setPlayers] = useState<Player[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [playerFilter, setPlayerFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  
  // UI State
  const [isPlayerListOpen, setIsPlayerListOpen] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Sidebar Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Initialization & Real-time Subscription
  useEffect(() => {
    const initApp = async () => {
      await AuthService.init();
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      
      // Load initial data
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings());
      
      const initialPlayers = dataService.getPlayers();
      if (initialPlayers.length > 0) {
        setActivePlayerId(initialPlayers[0].id);
      }
      
      setIsLoadingAuth(false);
    };
    initApp();
    document.title = appSettings.appName;

    // Subscribe to real-time changes
    const unsubscribe = dataService.subscribe(() => {
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings()); // Update settings in real-time
    });

    return () => unsubscribe();
  }, [appSettings.appName]); // Keep dependency for title update mainly

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    // Refresh data on login just in case
    setPlayers(dataService.getPlayers());
    setNotes(dataService.getNotes());
    setAppSettings(dataService.getSettings());
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setShowUserMenu(false);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    dataService.saveSettings(newSettings);
    // setAppSettings is handled by the subscription above
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    const result = await AuthService.updateCurrentUser(updates);
    if (result.success && result.user) {
        setUser(result.user);
    }
  };

  const activePlayer = players.find(p => p.id === activePlayerId);
  const activeNotes = notes
    .filter(n => n.playerId === activePlayerId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleAddNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[] = []) => {
    if (!user) return;
    const newNote: Note = {
      id: `note-${nanoid()}`,
      playerId: activePlayerId,
      scoutId: user.id, // Attribute note to logged in user
      content,
      category,
      tags,
      timestamp: Date.now(),
      attachments,
    };
    dataService.addNote(newNote); // Push to service
  };

  const handleEditNote = (updatedNote: Note) => {
    if (!user || user.id !== updatedNote.scoutId) return; 
    dataService.updateNote(updatedNote); // Push to service
  };

  const handleDeleteNote = (noteId: string) => {
    if (!user) return;
    dataService.deleteNote(noteId); // Push to service
  };

  const handleSavePlayer = (playerData: Partial<Player>) => {
    if (editingPlayer) {
      const updated = { ...editingPlayer, ...playerData } as Player;
      dataService.updatePlayer(updated); // Push to service
    } else {
      const newPlayer: Player = {
        id: `p-${nanoid()}`,
        ...playerData as any
      };
      dataService.addPlayer(newPlayer); // Push to service
      setActivePlayerId(newPlayer.id);
    }
    setEditingPlayer(null);
  };

  // Direct update without modal flow (for internal profile edits)
  const handleUpdatePlayer = (player: Player) => {
    dataService.updatePlayer(player);
  };

  const handleDeletePlayer = (id: string) => {
    dataService.deletePlayer(id); // Push to service
    // Logic to select next player is handled by effect or next render, but lets be safe
    const remaining = players.filter(p => p.id !== id);
    if (activePlayerId === id && remaining.length > 0) {
      setActivePlayerId(remaining[0].id);
    }
  };

  const openAddModal = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleExportAll = () => {
    exportPlayersToExcel(filteredPlayers);
  };

  // --- ENHANCED SEARCH LOGIC ---
  const filteredPlayers = useMemo(() => {
    const term = (playerFilter || '').toLowerCase().trim();
    if (!term) return players;

    return players.filter(p => 
      (p.name || '').toLowerCase().includes(term) ||
      (p.team || '').toLowerCase().includes(term) ||
      (p.position || '').toLowerCase().includes(term) || // Search by Position
      (p.country || '').toLowerCase().includes(term)     // Search by Country
    );
  }, [players, playerFilter]);

  // Group players by team (based on filtered results)
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

  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  const togglePlayerList = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'database') {
      setIsPlayerListOpen(!isPlayerListOpen);
    } else {
      setViewMode('database');
      setIsPlayerListOpen(true);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center">
        <Activity className="w-8 h-8 text-scout-gold animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;
  }

  return (
    <div className="flex h-screen bg-scout-900 text-scout-100 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-scout-900 border-r border-scout-800 transition-all duration-300 flex flex-col flex-shrink-0 relative overflow-hidden`}>
        {/* Logo Area */}
        <div 
          className="p-6 flex flex-col items-center gap-3 mb-2 cursor-pointer hover:opacity-80 transition-opacity text-center"
          onClick={() => setViewMode('dashboard')}
        >
           {/* Custom Logo Render */}
           <div className="w-16 h-16 bg-gradient-to-br from-scout-900 to-black rounded-xl flex items-center justify-center shadow-lg border border-scout-gold/30 overflow-hidden">
             {appSettings.appLogoUrl ? (
                <img src={appSettings.appLogoUrl} alt="App Logo" className="w-full h-full object-cover" />
             ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                    <path d="M4 21h16" />
                    <path d="M5 21V10a7 7 0 0 1 14 0v11" />
                    <path d="M5 10l7-5 7 5" />
                    <path d="M8 21V12a4 4 0 0 1 8 0v9" />
                    <path d="M12 2v3" />
                </svg>
             )}
           </div>
           <h1 className="font-black text-2xl tracking-widest text-white uppercase break-words w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
             {appSettings.appName}
           </h1>
        </div>

        {/* Navigation Links */}
        <div className="px-4 space-y-2 mt-4">
           <button 
             onClick={() => setViewMode('dashboard')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-scout-800 text-scout-gold border border-scout-700' : 'text-scout-400 hover:text-white hover:bg-scout-800/50'}`}
           >
             <LayoutDashboard className="w-5 h-5" />
             Panel
           </button>

           <div className={`group w-full flex items-center rounded-lg transition-all ${viewMode === 'database' ? 'bg-scout-800 border border-scout-700' : 'hover:bg-scout-800/50'}`}>
             <button 
               onClick={() => {
                 setViewMode('database');
                 if (!isPlayerListOpen) setIsPlayerListOpen(true);
               }}
               className={`flex-1 flex items-center gap-3 px-4 py-3 text-sm font-medium text-left outline-none ${viewMode === 'database' ? 'text-scout-gold' : 'text-scout-400 group-hover:text-white'}`}
             >
               <Users className="w-5 h-5" />
               Base de Datos
             </button>
             <button 
                onClick={togglePlayerList}
                className={`mr-2 p-1.5 rounded-md hover:bg-scout-700/50 transition-colors ${viewMode === 'database' ? 'text-scout-gold' : 'text-scout-400 group-hover:text-white'}`}
                title={isPlayerListOpen ? "Colapsar Lista" : "Expandir Lista"}
             >
                <Menu className="w-4 h-4" />
             </button>
           </div>
        </div>
        
        {/* Bottom Status & User */}
        <div className="mt-auto border-t border-scout-800 p-4 relative">
           
           {/* Dropdown Menu (Drop-up) */}
           {showUserMenu && (
             <div className="absolute bottom-full left-4 right-4 mb-2 bg-scout-800 border border-scout-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-50">
               <div className="py-1">
                 <button 
                    onClick={() => {
                        setIsProfileModalOpen(true);
                        setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-scout-200 hover:bg-scout-700 flex items-center gap-2 transition-colors"
                 >
                    <UserIcon className="w-3.5 h-3.5" /> Perfil
                 </button>
                 
                 <button 
                    onClick={() => {
                        setIsSettingsModalOpen(true);
                        setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-scout-200 hover:bg-scout-700 flex items-center gap-2 transition-colors"
                 >
                    <Settings className="w-3.5 h-3.5" /> Configuración
                 </button>
                 
                 <div className="border-t border-scout-700 my-1"></div>
                 <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                 >
                   <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                 </button>
               </div>
             </div>
           )}

           <div 
             className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${showUserMenu ? 'bg-scout-800' : 'hover:bg-scout-800'}`}
             onClick={() => setShowUserMenu(!showUserMenu)}
           >
             <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full border border-scout-600 object-cover" />
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-semibold truncate text-white">{user.name}</p>
               <p className="text-[10px] text-scout-500 truncate">{user.email}</p>
             </div>
             <ChevronUp className={`w-4 h-4 text-scout-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
           </div>
           
           <div className="mt-3 px-2">
             <div className="flex items-center gap-2 text-scout-gold text-sm font-medium">
                <CloudLightning className="w-3 h-3 text-scout-gold animate-pulse" />
                <span className="text-xs">Sincronización Activa</span>
             </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b1120] relative">
        
        {/* Header (Top Bar) */}
        <header className="h-16 border-b border-scout-800 bg-scout-900/50 backdrop-blur-sm flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-scout-400 hover:text-white lg:hidden"><Menu className="w-6 h-6"/></button>
             <h2 className="text-lg font-bold text-white">{viewMode === 'dashboard' ? 'Panel de Análisis' : 'Base de Datos de Jugadores'}</h2>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block w-64">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500" />
               <input 
                 type="text" 
                 value={playerFilter}
                 onChange={(e) => setPlayerFilter(e.target.value)}
                 placeholder="Buscar equipo, posición, país..." 
                 className="w-full bg-scout-800 text-scout-200 pl-9 pr-4 py-2 rounded-full border border-scout-700 focus:border-scout-gold/50 outline-none text-xs transition-all placeholder:text-scout-500"
               />
             </div>
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-scout-gold to-yellow-600 shadow-lg border border-yellow-500/20"></div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-hidden relative">
          
          {viewMode === 'dashboard' && <Dashboard players={filteredPlayers} />}

          {viewMode === 'database' && (
             <div className="flex h-full">
                {/* Database Sidebar List */}
                <div 
                  className={`${isPlayerListOpen ? 'w-72 border-r opacity-100' : 'w-0 border-none opacity-0'} bg-scout-900/30 border-scout-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
                >
                   <div className="w-72 flex flex-col h-full min-w-[18rem]">
                     <div className="p-4 border-b border-scout-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">
                           {playerFilter ? 'Resultados Búsqueda' : 'Equipos / Jugadores'} ({filteredPlayers.length})
                        </span>
                        <div className="flex gap-1">
                          <button onClick={handleExportAll} className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md transition-colors" title="Exportar Lista a Excel">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={openAddModal} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md transition-colors" title="Añadir Jugador">
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        
                        {sortedTeams.length === 0 && (
                          <div className="text-center py-8 text-scout-500 text-sm">
                            No se encontraron jugadores.
                          </div>
                        )}

                        {sortedTeams.map(team => {
                          const isExpanded = expandedTeams[team] !== false; // Default to open
                          return (
                            <div key={team} className="mb-2">
                              {/* Team Header */}
                              <div 
                                onClick={() => toggleTeam(team)}
                                className="flex items-center justify-between px-2 py-1.5 bg-scout-800/50 hover:bg-scout-800 rounded-lg cursor-pointer transition-colors mb-1 group"
                              >
                                 <div className="flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-scout-500 group-hover:text-scout-gold transition-colors" />
                                    <span className="text-xs font-bold text-scout-300 group-hover:text-white uppercase tracking-wide truncate max-w-[140px]" title={team}>
                                      {team}
                                    </span>
                                    <span className="text-[10px] text-scout-600 bg-scout-900 px-1.5 rounded-full border border-scout-800 group-hover:border-scout-700">
                                      {groupedPlayers[team].length}
                                    </span>
                                 </div>
                                 {isExpanded ? <ChevronDown className="w-3 h-3 text-scout-500"/> : <ChevronRight className="w-3 h-3 text-scout-500"/>}
                              </div>
                              
                              {/* Players List */}
                              {isExpanded && (
                                <div className="space-y-1 pl-1 border-l-2 border-scout-800 ml-2">
                                  {groupedPlayers[team].map(player => (
                                    <PlayerCard 
                                      key={player.id} 
                                      player={player} 
                                      isActive={player.id === activePlayerId}
                                      onClick={() => setActivePlayerId(player.id)}
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

                {/* Player Detail View */}
                <div className="flex-1 bg-[#0b1120] overflow-hidden">
                   {activePlayer ? (
                      <PlayerProfile 
                        player={activePlayer} 
                        notes={activeNotes}
                        onAddNote={handleAddNote}
                        onEditPlayer={openEditModal} // Keeps main modal logic
                        onPlayerUpdate={handleUpdatePlayer} // New prop for direct updates from subsections
                        onDeletePlayer={handleDeletePlayer}
                        currentUser={user}
                        onEditNote={handleEditNote}
                        onDeleteNote={handleDeleteNote}
                      />
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-scout-500">
                        <p>Ningún jugador seleccionado</p>
                      </div>
                   )}
                </div>
             </div>
          )}
        </main>
      </div>

      {/* Database Modal */}
      <PlayerFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlayer}
        initialData={editingPlayer}
      />

      {/* Admin Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSettings={appSettings}
        onSave={handleSaveSettings}
        currentUser={user}
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={user}
        onSave={handleUpdateProfile}
      />
    </div>
  );
};

export default App;