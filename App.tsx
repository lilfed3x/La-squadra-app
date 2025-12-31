

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
import { LiveSession } from './components/LiveSession';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Search, UserPlus, LayoutDashboard, Users, Zap, LogOut, Settings, ChevronUp, ChevronDown, ChevronRight, User as UserIcon, Shield, CheckSquare, Trash2, ArrowRightLeft, FileSpreadsheet, Upload } from 'lucide-react';

type ViewMode = 'dashboard' | 'database' | 'live';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(dataService.getSettings());
  
  // Navigation & View State
  const [viewMode, setViewMode] = useState<ViewMode>('database');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Data State
  const [players, setPlayers] = useState<Player[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<ModalTab>('general');
  const [modalRestrictMode, setModalRestrictMode] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);

  // UI State for Player List
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // --- Auth & Data Initialization ---
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await AuthService.getCurrentSessionUser();
      setUser(currentUser);
      setIsLoadingAuth(false);
    };
    checkAuth();
    
    const unsubscribe = dataService.subscribe(() => {
      setPlayers(dataService.getPlayers());
      setNotes(dataService.getNotes());
      setAppSettings(dataService.getSettings());
      setAllUsers(dataService.getUsers());
    });

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Effect to handle clicking outside the user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuRef]);


  // --- Event Handlers ---
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    dataService.refreshAll();
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };
  
  const handleSaveSettings = (settings: AppSettings) => {
    dataService.saveSettings(settings);
    setAppSettings(settings);
  };

  const handleSaveProfile = async (updates: Partial<User> & { newPassword?: string }) => {
    const { success, user: updatedUser } = await AuthService.updateCurrentUser(updates);
    if (success && updatedUser) {
      setUser(updatedUser);
      alert('Perfil actualizado correctamente.');
    } else {
      alert('Error al actualizar el perfil.');
    }
  };

  const handleSelectPlayer = (id: string) => {
    if (isSelectionMode) {
      handleToggleSelectPlayer(id);
    } else {
      setActivePlayerId(id);
    }
  };
  
  const handleAddPlayerClick = () => {
    setEditingPlayer(null);
    setModalInitialTab('general');
    setModalRestrictMode(false);
    setIsPlayerModalOpen(true);
  };
  
  const handleEditPlayer = (player: Player, initialTab: ModalTab = 'general', restrictMode = false) => {
    setEditingPlayer(player);
    setModalInitialTab(initialTab);
    setModalRestrictMode(restrictMode);
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = async (playerData: Partial<Player>) => {
    if (editingPlayer) {
      await dataService.updatePlayer({ ...editingPlayer, ...playerData } as Player);
    } else {
      await dataService.addPlayer({
        id: generateUUID(),
        ...playerData
      } as Player);
    }
    setIsPlayerModalOpen(false);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (id: string) => {
    dataService.deletePlayer(id);
    if (activePlayerId === id) {
      setActivePlayerId('');
    }
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(ids => ids.filter(pId => pId !== id));
    }
  };

  const handlePlayerUpdate = (player: Player) => {
      dataService.updatePlayer(player);
  };

  const handleAddNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[]) => {
    if (!activePlayerId || !user) return;
    const newNote: Note = {
      id: generateUUID(),
      playerId: activePlayerId,
      scoutId: user.id,
      content,
      category,
      tags,
      attachments,
      timestamp: Date.now()
    };
    dataService.addNote(newNote);
  };
  
  const handleEditNote = (note: Note) => {
    dataService.updateNote(note);
    alert("Nota actualizada.");
  };

  const handleDeleteNote = (noteId: string) => {
    dataService.deleteNote(noteId);
  };

  // --- Bulk & Selection Logic ---
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) setSelectedPlayerIds([]); // Clear selection when exiting
  };
  
  const handleToggleSelectPlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    dataService.bulkDeletePlayers(selectedPlayerIds);
    setIsBulkDeleteModalOpen(false);
    setIsSelectionMode(false);
    setSelectedPlayerIds([]);
  };

  const handleBulkUpdateTeam = (newTeam: string) => {
    dataService.bulkUpdateTeam(selectedPlayerIds, newTeam);
    setIsBulkActionModalOpen(false);
    setIsSelectionMode(false);
    setSelectedPlayerIds([]);
  };
  
  const handleExport = () => {
    const playersToExport = isSelectionMode && selectedPlayerIds.length > 0 
      ? players.filter(p => selectedPlayerIds.includes(p.id)) 
      : players;
    exportPlayersToExcel(playersToExport);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const importedPlayers = await readPlayersFromExcel(e.target.files[0]);
        if (window.confirm(`Se importarán ${importedPlayers.length} jugadores. ¿Continuar?`)) {
          await dataService.bulkImportPlayers(importedPlayers);
          alert("Importación completada.");
        }
      } catch (error) {
        alert("Error al leer el archivo Excel.");
        console.error(error);
      }
      e.target.value = '';
    }
  };

  // --- Memoized Data for Rendering ---
  const activePlayer = useMemo(() => players.find(p => p.id === activePlayerId), [activePlayerId, players]);
  const activePlayerNotes = useMemo(() => notes.filter(n => n.playerId === activePlayerId).sort((a,b) => b.timestamp - a.timestamp), [activePlayerId, notes]);

  const groupedPlayers = useMemo(() => {
    const filtered = players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    // Fix: Use generic on reduce to ensure correct type inference for `groups` and `teamPlayers` below.
    // This resolves the 'unknown' type error on teamPlayers.
    const groups = filtered.reduce<Record<string, Player[]>>((acc, player) => {
      const team = player.team || 'Agente Libre';
      if (!acc[team]) acc[team] = [];
      acc[team].push(player);
      return acc;
    }, {});
    
    return groups;
  }, [players, searchQuery]);

  // Fix: Moved side-effect out of useMemo into useEffect to handle state updates correctly.
  useEffect(() => {
    // Set initial expanded state for all teams if not set
    if (Object.keys(expandedTeams).length === 0 && Object.keys(groupedPlayers).length > 0) {
      const initialExpanded = Object.keys(groupedPlayers).reduce((acc, team) => {
        acc[team] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedTeams(initialExpanded);
    }
  }, [groupedPlayers, expandedTeams]);

  const toggleTeamAccordion = (team: string) => {
    setExpandedTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };


  // --- Render Logic ---
  if (isLoadingAuth) {
    return <div className="bg-scout-900 h-screen w-screen flex items-center justify-center text-white">Cargando...</div>;
  }

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;
  }
  
  const Navigation = ({ isMobileNav = false }) => (
    <nav className={isMobileNav ? 'flex justify-around items-center' : 'flex flex-col gap-2'}>
      <button onClick={() => setViewMode('dashboard')} className={`nav-button ${viewMode === 'dashboard' ? 'active' : ''}`}>
        <LayoutDashboard className="w-5 h-5" /> {!isMobileNav && 'Panel'}
      </button>
      <button onClick={() => setViewMode('database')} className={`nav-button ${viewMode === 'database' ? 'active' : ''}`}>
        <Users className="w-5 h-5" /> {!isMobileNav && 'Base de Datos'}
      </button>
      <button onClick={() => setViewMode('live')} className={`nav-button ${viewMode === 'live' ? 'active' : ''}`}>
        <Zap className="w-5 h-5" /> {!isMobileNav && 'Sesión en Vivo'}
      </button>
    </nav>
  );

  return (
    <div className="h-screen w-screen bg-scout-900 text-scout-100 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-scout-900 p-4 border-r border-scout-800 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-8">
             <div className="w-8 h-8 rounded-lg bg-scout-800 flex items-center justify-center border border-scout-gold/30">
                <Shield className="w-5 h-5 text-scout-gold" />
             </div>
             <span className="font-bold text-lg tracking-wider text-white">{appSettings.appName}</span>
          </div>
          <Navigation />
          <div className="mt-auto relative" ref={userMenuRef}>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-scout-800 rounded-lg p-2 border border-scout-700 shadow-lg animate-fadeIn">
                <button onClick={() => { setIsProfileModalOpen(true); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-scout-300 hover:bg-scout-700 rounded">
                  <UserIcon className="w-4 h-4" /> Perfil
                </button>
                <button onClick={() => { setIsSettingsModalOpen(true); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-scout-300 hover:bg-scout-700 rounded">
                  <Settings className="w-4 h-4" /> Configuración
                </button>
                <div className="h-px bg-scout-700 my-1"></div>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded">
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            )}
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-full flex items-center gap-3 p-2 bg-scout-800/50 hover:bg-scout-800 rounded-lg text-left transition-colors">
              <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-scout-500 capitalize">{user.role}</p>
              </div>
              <ChevronUp className="w-4 h-4 text-scout-400" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'database' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Player List Panel (Left) */}
            <div className={`
              ${isMobile && activePlayerId ? 'hidden' : 'flex'} flex-col 
              w-full md:w-80 lg:w-96 shrink-0 bg-[#0b1120] border-r border-scout-800
            `}>
              <div className="p-4 border-b border-scout-800 space-y-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500"/>
                  <input type="text" placeholder="Buscar jugador..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-scout-gold outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddPlayerClick} className="flex-1 btn btn-primary"><UserPlus className="w-4 h-4" /> Añadir</button>
                  <button onClick={toggleSelectionMode} className={`btn ${isSelectionMode ? 'btn-active' : ''}`}><CheckSquare className="w-4 h-4" /> {isSelectionMode ? 'Cancelar' : 'Seleccionar'}</button>
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {Object.entries(groupedPlayers).map(([team, teamPlayers]) => (
                  <div key={team}>
                    <button onClick={() => toggleTeamAccordion(team)} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-scout-800 text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-scout-400">{team} ({teamPlayers.length})</span>
                      {expandedTeams[team] ? <ChevronUp className="w-4 h-4 text-scout-500" /> : <ChevronDown className="w-4 h-4 text-scout-500" />}
                    </button>
                    {expandedTeams[team] && (
                      <div className="pl-2 pt-1 space-y-1">
                        {teamPlayers.map(player => (
                          <PlayerCard 
                            key={player.id} 
                            player={player}
                            isActive={!isSelectionMode && player.id === activePlayerId}
                            onClick={() => handleSelectPlayer(player.id)}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedPlayerIds.includes(player.id)}
                            onToggleSelect={(e) => { e.stopPropagation(); handleToggleSelectPlayer(player.id); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Bulk Action Footer */}
              {isSelectionMode && (
                <div className="p-2 border-t border-scout-800 bg-[#0b1120] shrink-0 space-y-2">
                  <p className="text-xs text-center text-scout-400 font-medium">{selectedPlayerIds.length} seleccionados</p>
                  <div className="flex gap-2">
                    <button onClick={() => setIsBulkDeleteModalOpen(true)} disabled={selectedPlayerIds.length === 0} className="flex-1 btn btn-danger"><Trash2 className="w-4 h-4" /> Eliminar</button>
                    <button onClick={() => setIsBulkActionModalOpen(true)} disabled={selectedPlayerIds.length === 0} className="flex-1 btn"><ArrowRightLeft className="w-4 h-4" /> Mover</button>
                  </div>
                  <div className="flex gap-2">
                     <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
                     <button onClick={() => fileInputRef.current?.click()} className="flex-1 btn"><Upload className="w-4 h-4"/> Importar</button>
                     <button onClick={handleExport} className="flex-1 btn"><FileSpreadsheet className="w-4 h-4"/> Exportar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Player Profile Panel (Right) */}
            <div className={`
              flex-1 overflow-y-auto bg-scout-900 
              ${isMobile && !activePlayerId ? 'hidden' : 'block'}
            `}>
              {activePlayer ? (
                <PlayerProfile 
                  player={activePlayer} 
                  notes={activePlayerNotes} 
                  onAddNote={handleAddNote}
                  onEditPlayer={handleEditPlayer}
                  onPlayerUpdate={handlePlayerUpdate}
                  onDeletePlayer={handleDeletePlayer}
                  currentUser={user}
                  allUsers={allUsers}
                  onEditNote={handleEditNote}
                  onDeleteNote={handleDeleteNote}
                  onBack={() => setActivePlayerId('')}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-scout-600 p-8 text-center">
                  <Users className="w-16 h-16 mb-4" />
                  <h2 className="text-xl font-bold text-scout-400">Selecciona un jugador</h2>
                  <p className="max-w-xs">Elige un jugador de la lista para ver su perfil detallado, notas de scouting y análisis.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'dashboard' && <Dashboard players={players} />}
        {viewMode === 'live' && <LiveSession players={players} user={user} />}
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <footer className="bg-scout-900 border-t border-scout-800 p-2 shrink-0">
          <Navigation isMobileNav />
        </footer>
      )}

      {/* Modals & Prompts */}
      <UpdatePrompt />
      
      <PlayerFormModal 
        isOpen={isPlayerModalOpen}
        onClose={() => setIsPlayerModalOpen(false)}
        onSave={handleSavePlayer}
        initialData={editingPlayer}
        initialTab={modalInitialTab}
        restrictToTab={modalRestrictMode}
      />
      
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSettings={appSettings}
        onSave={handleSaveSettings}
        currentUser={user}
      />
      
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={user}
        onSave={handleSaveProfile}
      />

      <ConfirmModal 
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Eliminar Jugadores"
        message={`¿Estás seguro de que quieres eliminar ${selectedPlayerIds.length} jugadores? Esta acción es irreversible.`}
        isDestructive
      />
      
      <BulkActionModal 
        isOpen={isBulkActionModalOpen}
        onClose={() => setIsBulkActionModalOpen(false)}
        onConfirm={handleBulkUpdateTeam}
        count={selectedPlayerIds.length}
      />

      <style>{`
        .nav-button {
          display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0.25rem; padding: 0.5rem; border-radius: 0.5rem;
          font-weight: 600; font-size: 0.75rem; color: #94a3b8; transition: all 0.2s; flex: 1;
        }
        @media (min-width: 768px) {
          .nav-button { flex-direction: row; justify-content: flex-start; gap: 0.75rem; padding: 0.75rem; font-size: 0.875rem; }
        }
        .nav-button:hover { background-color: #334155; color: white; }
        .nav-button.active { background-color: #334155; color: white; }
        .btn {
          padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.75rem;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: all 0.2s; border: 1px solid #475569; background-color: #334155; color: #f1f5f9;
        }
        .btn:hover { background-color: #475569; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.btn-primary { background-color: #10b981; border-color: #10b981; color: #0f172a; }
        .btn.btn-primary:hover { background-color: #059669; }
        .btn.btn-danger { background-color: #ef4444; border-color: #ef4444; color: white; }
        .btn.btn-danger:hover { background-color: #dc2626; }
        .btn.btn-active { background-color: #d4af37; border-color: #d4af37; color: #0f172a; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slideInLeft { animation: slideInLeft 0.3s ease-out forwards; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slideInRight { animation: slideInRight 0.3s ease-out forwards; }
      `}</style>

    </div>
  );
};

export default App;
