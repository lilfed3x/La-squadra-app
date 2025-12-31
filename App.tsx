
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User, AppSettings } from './types';
import { AuthService } from './services/authService';
import { dataService, generateUUID } from './services/dataService'; 
import { exportPlayersToExcel, readPlayersFromExcel } from './services/exportService'; 
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
import { Menu, Search, UserPlus, LayoutDashboard, Users, Activity, LogOut, Settings, ChevronUp, ChevronDown, ChevronRight, User as UserIcon, Shield, Download, X, CheckSquare, Trash2, ArrowRightLeft, FileSpreadsheet, Upload } from 'lucide-react';

type ViewMode = 'dashboard' | 'database';

// Usuario por defecto para saltar el Login (Auth Desactivado)
const BYPASS_USER: User = {
  id: 'admin-bypass',
  email: 'admin@lasquadra.com',
  name: 'Admin La Squadra',
  role: 'admin',
  passwordHash: '',
  salt: '',
  organization: 'La Squadra Pro',
  approved: true,
  avatar: 'https://ui-avatars.com/api/?name=Admin+LS&background=d4af37&color=0f172a'
};

const App: React.FC = () => {
  // Inicializamos con el usuario bypass directamente
  const [user, setUser] = useState<User | null>(BYPASS_USER);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(dataService.getSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  
  // Selection & Bulk Actions State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkGroupOpen, setIsBulkGroupOpen] = useState(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [playerFilter, setPlayerFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  
  // Accordion State
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<ModalTab>('general');
  const [modalRestrictMode, setModalRestrictMode] = useState(false);
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      // Intentamos obtener sesión real, si no, mantenemos el BYPASS_USER
      const currentUser = await AuthService.getCurrentSessionUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Aseguramos que el usuario bypass persista
        setUser(BYPASS_USER);
      }
      
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

  // Initialize all teams as expanded on first load of data
  useEffect(() => {
      if (players.length > 0 && Object.keys(expandedTeams).length === 0) {
          const initialExpanded: Record<string, boolean> = {};
          const teams = Array.from(new Set(players.map(p => p.team || 'Sin Equipo')));
          teams.forEach(t => initialExpanded[t] = true);
          setExpandedTeams(initialExpanded);
      }
  }, [players.length]);

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    setPlayers(dataService.getPlayers());
    setNotes(dataService.getNotes());
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.reload();
  };

  const activePlayer = players.find(p => p.id === activePlayerId);
  const activeNotes = notes.filter(n => n.playerId === activePlayerId).sort((a, b) => b.timestamp - a.timestamp);

  const handleAddNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[] = []) => {
    if (!user) return;
    const newNote: Note = {
      id: generateUUID(),
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

  const handleOpenAddPlayerModal = () => {
    setEditingPlayer(null);
    setModalInitialTab('general');
    setModalRestrictMode(false);
    setIsModalOpen(true);
  };

  const toggleTeam = (team: string) => {
      setExpandedTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedPlayers);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedPlayers(newSet);
  };

  const handleSelectAll = () => {
      if (selectedPlayers.size === filteredPlayers.length) {
          setSelectedPlayers(new Set());
      } else {
          setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
      }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const importedPlayers = await readPlayersFromExcel(e.target.files[0]);
              if (confirm(`Se encontraron ${importedPlayers.length} jugadores. ¿Deseas importarlos a la base de datos?`)) {
                  await dataService.bulkImportPlayers(importedPlayers);
                  alert('Importación completada.');
              }
          } catch (err) {
              alert('Error al leer el archivo Excel.');
              console.error(err);
          }
      }
      if (importFileRef.current) importFileRef.current.value = '';
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

      {/* SIDEBAR (Desktop) */}
      {!isMobile && (
        <div className="w-64 bg-scout-900 border-r border-scout-800 flex flex-col flex-shrink-0">
          {/* Sidebar Header: Usa Logo Manual */}
          <div className="p-6 flex flex-col items-center gap-3 mb-2 cursor-pointer" onClick={() => setViewMode('dashboard')}>
             <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-scout-gold/30 bg-scout-900">
               {appSettings.appLogoUrl ? (
                  <img src={appSettings.appLogoUrl} alt="App Logo" className="w-full h-full object-cover" />
               ) : (
                  <Shield className="w-8 h-8 text-scout-gold"/>
               )}
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
                   <button onClick={() => setIsSettingsModalOpen(true)} className="w-full text-left px-4 py-2 text-xs hover:bg-scout-700 flex items-center gap-2 text-white"><Settings className="w-3 h-3" /> Configuración</button>
                   <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2 border-t border-scout-700"><LogOut className="w-3 h-3" /> Salir</button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b1120] relative w-full pb-16 md:pb-0">
        <header className="h-16 border-b border-scout-800 bg-scout-900/50 backdrop-blur-sm flex items-center px-4 md:px-6 justify-between shrink-0 z-30 gap-4">
          <div className="flex items-center gap-4 flex-1">
             <h2 className="text-lg font-bold text-white hidden md:block">
               {viewMode === 'dashboard' ? 'Análisis Global' : 'Jugadores'}
             </h2>
             <div className="relative w-full md:w-80">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500" />
                 <input 
                     type="text" 
                     value={playerFilter} 
                     onChange={(e) => setPlayerFilter(e.target.value)} 
                     placeholder="Buscar jugador o equipo..." 
                     className="w-full bg-scout-800 text-scout-200 pl-9 pr-4 py-2 rounded-full border border-scout-700 focus:border-scout-gold/50 outline-none text-xs transition-all" 
                 />
             </div>
          </div>
          
          <div className="flex items-center gap-2">
              {viewMode === 'database' && (
                  <>
                     <button 
                        onClick={() => {
                            if (isSelectionMode) {
                                setIsSelectionMode(false);
                                setSelectedPlayers(new Set());
                            } else {
                                setIsSelectionMode(true);
                            }
                        }}
                        className={`p-2 rounded-lg border transition-colors ${isSelectionMode ? 'bg-scout-gold text-scout-900 border-scout-gold' : 'bg-scout-800 text-scout-400 border-scout-700 hover:text-white'}`}
                        title="Selección Múltiple"
                     >
                        <CheckSquare className="w-5 h-5" />
                     </button>
                     <input type="file" ref={importFileRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls" />
                     <button 
                        onClick={() => importFileRef.current?.click()}
                        className="p-2 bg-scout-800 text-scout-400 hover:text-white border border-scout-700 rounded-lg transition-colors"
                        title="Importar Excel"
                     >
                        <Upload className="w-5 h-5" />
                     </button>
                     <button 
                        onClick={() => exportPlayersToExcel(players)}
                        className="p-2 bg-scout-800 text-scout-400 hover:text-white border border-scout-700 rounded-lg transition-colors"
                        title="Exportar Excel"
                     >
                        <FileSpreadsheet className="w-5 h-5" />
                     </button>
                  </>
              )}
          </div>
        </header>

        {/* BULK ACTIONS TOOLBAR */}
        {isSelectionMode && selectedPlayers.size > 0 && (
            <div className="bg-scout-800 border-b border-scout-700 p-2 flex items-center justify-between px-6 animate-slideIn">
                <span className="text-sm font-bold text-white">{selectedPlayers.size} Seleccionados</span>
                <div className="flex gap-2">
                    <button onClick={() => setIsBulkGroupOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1">
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Cambiar Grupo
                    </button>
                    <button onClick={() => setIsBulkDeleteOpen(true)} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                </div>
            </div>
        )}

        <main className="flex-1 overflow-hidden relative">
          {viewMode === 'dashboard' && <Dashboard players={players} />}
          {viewMode === 'database' && (
             <div className="flex h-full relative">
                
                {/* LISTA LATERAL (COLLAPSIBLE) */}
                <div className={`${isMobile && activePlayerId ? 'hidden' : 'flex'} w-full md:w-80 bg-scout-900/30 border-r border-scout-800 flex-col`}>
                   <div className="p-4 border-b border-scout-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-scout-400 uppercase">
                              Base de Datos ({players.length})
                          </span>
                          {isSelectionMode && (
                              <button onClick={handleSelectAll} className="text-[10px] text-scout-gold hover:underline">
                                  {selectedPlayers.size === filteredPlayers.length ? 'Deseleccionar' : 'Todos'}
                              </button>
                          )}
                      </div>
                      <button onClick={handleOpenAddPlayerModal} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md transition-colors">
                          <UserPlus className="w-4 h-4" />
                      </button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                      {Object.keys(groupedPlayers).length === 0 ? (
                          <div className="text-center p-8 text-scout-500 text-sm">No se encontraron jugadores.</div>
                      ) : (
                          Object.keys(groupedPlayers).map(team => (
                            <div key={team} className="mb-1">
                               {/* Team Header */}
                               <div 
                                 onClick={() => toggleTeam(team)}
                                 className="flex items-center justify-between px-3 py-2 bg-scout-800/50 hover:bg-scout-800 rounded-lg cursor-pointer transition-colors group select-none"
                               >
                                  <div className="flex items-center gap-2">
                                      {expandedTeams[team] ? <ChevronDown className="w-3 h-3 text-scout-400" /> : <ChevronRight className="w-3 h-3 text-scout-400" />}
                                      <span className="text-xs font-bold text-scout-200 uppercase tracking-wide group-hover:text-white transition-colors">{team}</span>
                                  </div>
                                  <span className="text-[10px] bg-scout-900 text-scout-500 px-1.5 py-0.5 rounded-full">{groupedPlayers[team].length}</span>
                               </div>
                               
                               {/* Player List */}
                               {expandedTeams[team] && (
                                   <div className="mt-1 space-y-1 pl-2 border-l border-scout-800 ml-2 animate-fadeIn">
                                       {groupedPlayers[team].map(player => (
                                         <PlayerCard 
                                            key={player.id} 
                                            player={player} 
                                            isActive={player.id === activePlayerId} 
                                            onClick={() => isSelectionMode ? toggleSelection(player.id) : setActivePlayerId(player.id)}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedPlayers.has(player.id)}
                                            onToggleSelect={(e) => { e.stopPropagation(); toggleSelection(player.id); }}
                                         />
                                       ))}
                                   </div>
                               )}
                            </div>
                          ))
                      )}
                   </div>
                </div>

                {/* AREA PRINCIPAL (PERFIL) */}
                <div className={`${isMobile && !activePlayerId ? 'hidden' : 'flex-1'} bg-[#0b1120] overflow-hidden`}>
                   {activePlayer ? (
                      <PlayerProfile 
                        player={activePlayer} notes={activeNotes} 
                        onAddNote={handleAddNote} onPlayerUpdate={(p) => dataService.updatePlayer(p)}
                        onEditPlayer={(p, tab, restrict) => { 
                          setEditingPlayer(p); 
                          setModalInitialTab(tab || 'general');
                          setModalRestrictMode(!!restrict);
                          setIsModalOpen(true); 
                        }}
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

      {/* MOBILE NAV: Panel | Jugadores | Yo */}
      {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 h-16 bg-scout-900 border-t border-scout-800 flex justify-around items-center z-50">
              <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center w-20 ${viewMode === 'dashboard' ? 'text-scout-gold' : 'text-scout-500'}`}>
                  <LayoutDashboard className="w-6 h-6" />
                  <span className="text-[10px] mt-1">Panel</span>
              </button>
              
              <button onClick={() => setViewMode('database')} className={`flex flex-col items-center w-20 ${viewMode === 'database' ? 'text-scout-gold' : 'text-scout-500'}`}>
                  <Users className="w-6 h-6" />
                  <span className="text-[10px] mt-1">Jugadores</span>
              </button>
              
              <button onClick={() => setIsProfileModalOpen(true)} className="flex flex-col items-center w-20 text-scout-500">
                  <div className={`w-6 h-6 rounded-full overflow-hidden border ${isProfileModalOpen ? 'border-scout-gold' : 'border-scout-600'}`}>
                      <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} alt="Yo" className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[10px] mt-1 ${isProfileModalOpen ? 'text-scout-gold' : ''}`}>Yo</span>
              </button>
          </div>
      )}

      {/* MODALES */}
      <PlayerFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        // Corregido: Si editingPlayer es null, usa addPlayer con el nuevo objeto (que no tendrá ID)
        onSave={(p) => {
            if (editingPlayer) {
                dataService.updatePlayer({...editingPlayer, ...p});
            } else {
                // Ensure new player has a generated UUID if not present in partial
                const newPlayer = { ...p, id: p.id || generateUUID() } as Player;
                dataService.addPlayer(newPlayer);
            }
        }} 
        initialData={editingPlayer} 
        initialTab={modalInitialTab}
        restrictToTab={modalRestrictMode}
      />
      
      <ConfirmModal 
         isOpen={isBulkDeleteOpen}
         onClose={() => setIsBulkDeleteOpen(false)}
         title={`Eliminar ${selectedPlayers.size} Jugadores`}
         message="¿Estás seguro de eliminar estos jugadores de forma permanente? Esta acción no se puede deshacer."
         confirmText="Eliminar"
         isDestructive
         onConfirm={() => {
             dataService.bulkDeletePlayers(Array.from(selectedPlayers));
             setSelectedPlayers(new Set());
             setIsSelectionMode(false);
         }}
      />

      <BulkActionModal 
          isOpen={isBulkGroupOpen}
          onClose={() => setIsBulkGroupOpen(false)}
          count={selectedPlayers.size}
          onConfirm={(teamName) => {
              dataService.bulkUpdateTeam(Array.from(selectedPlayers), teamName);
              setSelectedPlayers(new Set());
              setIsSelectionMode(false);
          }}
      />

      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} currentSettings={appSettings} onSave={(s) => dataService.saveSettings(s)} currentUser={user} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={user} onSave={(u) => AuthService.updateCurrentUser(u)} />
    </div>
  );
};

export default App;
