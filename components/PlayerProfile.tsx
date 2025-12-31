
import React, { useState } from 'react';
import { Attachment, Note, NoteCategory, Player, User } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService';
import { BrainCircuit, Edit, Trash2, Activity as ActivityIcon, Apple, ArrowLeft, Briefcase, Shirt, PieChart as PieChartIcon, HeartPulse, DollarSign, Calendar, FileText, X, Plus, Download, Youtube, Footprints, ClipboardList } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { TacticalPitch } from './TacticalPitch';
import { ModalTab } from './PlayerFormModal';
import { ConfirmModal } from './ConfirmModal';
import { PlayerStatsDashboard } from './PlayerStatsDashboard';

interface PlayerProfileProps {
  player: Player;
  notes: Note[];
  onAddNote: (content: string, category: NoteCategory, tags: string[], attachments: Attachment[]) => void;
  onEditPlayer: (player: Player, initialTab?: ModalTab, restrictMode?: boolean) => void;
  onPlayerUpdate: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
  currentUser: User | null;
  allUsers: User[];
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onBack?: () => void; 
}

// --- Helper for Attachments Rendering ---
const AttachmentPreview: React.FC<{ attachment: Attachment, onRemove?: () => void, onClick?: () => void }> = ({ attachment, onRemove, onClick }) => {
    const isYoutube = attachment.type === 'youtube';
    
    return (
        <div className="relative group w-20 h-20 rounded-md overflow-hidden bg-scout-900 border border-scout-700 shrink-0 cursor-pointer hover:border-scout-gold transition-colors" onClick={onClick}>
            {isYoutube ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                    <Youtube className="w-6 h-6 text-red-500" />
                </div>
            ) : attachment.type === 'video' ? (
                 <div className="w-full h-full relative flex items-center justify-center bg-black">
                    <video src={attachment.url} className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-0.5"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
            )}
            
            {onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-0.5">
                <p className="text-[8px] text-white truncate text-center px-1">{attachment.name}</p>
            </div>
        </div>
    );
};

// --- Extracted Components with FULL VISUALIZATION ---

const NutritionContent: React.FC<{ player: Player; onEdit?: () => void }> = ({ player, onEdit }) => {
  const macros = player.nutrition?.macros || { protein: 0, carbs: 0, fats: 0 };
  const macroData = [
     { name: 'Proteínas', value: macros.protein, color: '#3b82f6' },
     { name: 'Carbos', value: macros.carbs, color: '#10b981' },
     { name: 'Grasas', value: macros.fats, color: '#f97316' }
  ];

  return (
    <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                <Apple className="w-4 h-4" /> Nutrición & Dieta
            </h3>
            {onEdit && <button onClick={onEdit} className="text-scout-500 hover:text-white"><Edit className="w-3 h-3" /></button>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-scout-900/50 p-2 rounded-lg text-center">
                 <div className="text-[10px] text-scout-400 uppercase">Hidratación</div>
                 <div className="text-lg font-bold text-blue-400">{player.nutrition?.hydrationLevel || 0}%</div>
             </div>
             <div className="bg-scout-900/50 p-2 rounded-lg text-center">
                 <div className="text-[10px] text-scout-400 uppercase">Peso</div>
                 <div className={`text-lg font-bold ${player.nutrition?.weightStatus === 'Óptimo' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {player.nutrition?.weightStatus || 'N/A'}
                 </div>
             </div>
        </div>

        <div className="flex-1 min-h-[150px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={macroData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {macroData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} itemStyle={{color: '#fff'}} />
                    <Legend iconSize={8} formatter={(val) => <span className="text-xs text-scout-300">{val}</span>} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center">
                     <span className="text-[10px] text-scout-500 block">Calorías</span>
                     <span className="text-sm font-bold text-white">{player.nutrition?.dailyCalories || 0}</span>
                 </div>
            </div>
        </div>
    </div>
  );
};

const PhysicalContent: React.FC<{ player: Player; onEdit?: () => void }> = ({ player, onEdit }) => {
    return (
        <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4" /> Estado Físico
                </h3>
                {onEdit && <button onClick={onEdit} className="text-scout-500 hover:text-white"><Edit className="w-3 h-3" /></button>}
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-scout-400">Nivel de Fatiga</span>
                        <span className="text-red-400 font-bold">{player.physical?.fatigueLevel || 0}%</span>
                    </div>
                    <div className="w-full bg-scout-900 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-green-500 to-red-500 h-full" 
                            style={{ width: `${player.physical?.fatigueLevel || 0}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-scout-900/50 p-2 rounded-lg border border-scout-700/50">
                        <div className="text-[10px] text-scout-500 mb-1">Riesgo Lesión</div>
                        <div className={`text-sm font-bold ${player.physical?.injuryRisk === 'Alto' ? 'text-red-500' : player.physical?.injuryRisk === 'Medio' ? 'text-yellow-500' : 'text-green-500'}`}>
                            {player.physical?.injuryRisk || 'Bajo'}
                        </div>
                    </div>
                    <div className="bg-scout-900/50 p-2 rounded-lg border border-scout-700/50">
                        <div className="text-[10px] text-scout-500 mb-1">Recuperación</div>
                        <div className="text-sm font-bold text-blue-400">
                            {player.physical?.recoveryStatus || 'N/A'}
                        </div>
                    </div>
                </div>

                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <div className="text-[10px] text-red-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <HeartPulse className="w-3 h-3" /> Última Lesión
                    </div>
                    <p className="text-xs text-scout-200">{player.physical?.lastInjury || 'Sin registros recientes'}</p>
                </div>
            </div>
        </div>
    );
};

const ContractContent: React.FC<{ player: Player; onEdit?: () => void }> = ({ player, onEdit }) => {
    return (
        <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Situación Contractual
                </h3>
                {onEdit && <button onClick={onEdit} className="text-scout-500 hover:text-white"><Edit className="w-3 h-3" /></button>}
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-scout-700/50">
                    <span className="text-xs text-scout-400">Club Propietario</span>
                    <span className="text-sm font-bold text-white text-right">{player.contract?.clubName || player.team}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-scout-700/50">
                    <span className="text-xs text-scout-400">Vencimiento</span>
                    <span className="text-sm font-mono text-white">{player.contract?.contractExpiration || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-scout-700/50">
                    <span className="text-xs text-scout-400">Agencia</span>
                    <span className="text-sm text-white text-right">{player.contract?.agencyName || 'N/A'}</span>
                </div>
                
                <div className="mt-4 pt-2">
                    <div className="text-[10px] text-scout-500 uppercase font-bold mb-2">Valor de Mercado</div>
                    <div className="text-2xl font-black text-white flex items-center gap-1">
                        <DollarSign className="w-5 h-5 text-scout-gold" />
                        {player.marketValue}
                    </div>
                </div>

                {player.contract?.isLoan && (
                     <div className="mt-2 bg-purple-500/10 text-purple-300 px-3 py-2 rounded-lg text-xs border border-purple-500/20">
                        Jugador cedido desde <strong>{player.contract.loanOriginClub}</strong>
                     </div>
                )}
            </div>
        </div>
    );
};

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ 
  player, 
  notes, 
  onAddNote, 
  onEditPlayer,
  onPlayerUpdate,
  onDeletePlayer,
  currentUser,
  allUsers,
  onEditNote,
  onDeleteNote,
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'notes'>('overview');
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  
  // AI Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Stats for Radar Chart
  const radarStats = [
    { subject: 'Ritmo', A: player.stats.pace, fullMark: 100 },
    { subject: 'Tiro', A: player.stats.shooting, fullMark: 100 },
    { subject: 'Pase', A: player.stats.passing, fullMark: 100 },
    { subject: 'Regate', A: player.stats.dribbling, fullMark: 100 },
    { subject: 'Defensa', A: player.stats.defending, fullMark: 100 },
    { subject: 'Físico', A: player.stats.physical, fullMark: 100 },
  ];

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setIsAiModalOpen(true);
    const report = await generateScoutingReport(player, notes);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1120] overflow-hidden animate-fadeIn relative">
      
      {/* HEADER WITH BACKGROUND */}
      <div className="relative h-48 md:h-64 shrink-0 group">
         <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-transparent z-10"></div>
         {/* Simple abstract background or map pattern could go here */}
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         
         {/* Top Actions */}
         <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
             <button onClick={onBack} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all md:hidden">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div className="flex gap-2 ml-auto">
                 <button 
                    onClick={() => onEditPlayer(player)} 
                    className="p-2 bg-black/40 hover:bg-scout-accent/20 hover:text-scout-accent text-white rounded-full backdrop-blur-md transition-all border border-white/10"
                    title="Editar Perfil"
                 >
                    <Edit className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => exportPlayerProfileToPDF(player, notes)} 
                    className="p-2 bg-black/40 hover:bg-blue-500/20 hover:text-blue-400 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
                    title="Exportar PDF"
                 >
                    <Download className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="p-2 bg-black/40 hover:bg-red-500/20 hover:text-red-400 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
                    title="Eliminar Jugador"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
             </div>
         </div>

         {/* Player Info Overlay */}
         <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col md:flex-row items-end md:items-center gap-6">
             <div className="relative shrink-0">
                 <img 
                   src={player.imageUrl} 
                   alt={player.name} 
                   className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-4 border-[#0b1120] shadow-2xl bg-scout-800"
                 />
                 <div className="absolute -bottom-2 -right-2 bg-[#0b1120] rounded-lg p-1">
                    <div className="bg-scout-gold text-scout-900 font-black text-lg px-2 rounded">
                        {player.scoutRating}
                    </div>
                 </div>
             </div>
             
             <div className="flex-1 mb-2">
                 <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none">{player.name}</h1>
                    {player.country && <span className="text-sm md:text-lg text-scout-400 font-light border-l border-scout-600 pl-2">{player.country}</span>}
                 </div>
                 <div className="flex flex-wrap gap-3 text-sm text-scout-300">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                        <Shirt className="w-3.5 h-3.5" /> {player.team}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                        <Footprints className="w-3.5 h-3.5" /> {player.position}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                        <Calendar className="w-3.5 h-3.5" /> {player.age} años
                    </span>
                 </div>
             </div>

             {/* AI Button */}
             <button 
               onClick={handleGenerateReport}
               className="mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all border border-purple-400/20 group"
             >
                <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />
                <span className="hidden md:inline">Informe IA</span>
             </button>
         </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-scout-800 px-6 bg-[#0b1120] sticky top-0 z-30 shrink-0">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-scout-gold text-white' : 'border-transparent text-scout-500 hover:text-scout-300'}`}
          >
            <ClipboardList className="w-4 h-4" /> Resumen
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'analysis' ? 'border-scout-gold text-white' : 'border-transparent text-scout-500 hover:text-scout-300'}`}
          >
            <PieChartIcon className="w-4 h-4" /> Análisis
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes' ? 'border-scout-gold text-white' : 'border-transparent text-scout-500 hover:text-scout-300'}`}
          >
            <FileText className="w-4 h-4" /> Notas ({notes.length})
          </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-20 md:pb-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
                  
                  {/* Left Column (Stats Radar + Details) */}
                  <div className="md:col-span-4 flex flex-col gap-6">
                      {/* Radar Chart Card */}
                      <div className="bg-scout-800 rounded-xl p-4 border border-scout-700 shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10"><ActivityIcon className="w-24 h-24 text-white" /></div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 relative z-10">Perfil de Atributos</h3>
                          <div className="h-64 relative z-10">
                              <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarStats}>
                                      <PolarGrid stroke="#334155" />
                                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                      <Radar name={player.name} dataKey="A" stroke="#d4af37" strokeWidth={2} fill="#d4af37" fillOpacity={0.3} />
                                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} itemStyle={{color: '#d4af37'}} />
                                  </RadarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Contract Mini Card */}
                      <ContractContent player={player} onEdit={() => onEditPlayer(player, 'contract', true)} />
                  </div>

                  {/* Middle Column (Physical & Nutrition) */}
                  <div className="md:col-span-4 flex flex-col gap-6">
                      <PhysicalContent player={player} onEdit={() => onEditPlayer(player, 'physical', true)} />
                      <NutritionContent player={player} onEdit={() => onEditPlayer(player, 'nutrition', true)} />
                  </div>

                  {/* Right Column (Latest Notes Preview) */}
                  <div className="md:col-span-4 flex flex-col gap-6 h-full">
                      <div className="bg-scout-800 rounded-xl border border-scout-700 flex flex-col h-full overflow-hidden shadow-lg">
                          <div className="p-4 border-b border-scout-700 bg-scout-900/30 flex justify-between items-center">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-scout-gold" /> Últimas Notas
                              </h3>
                              <button onClick={() => setActiveTab('notes')} className="text-xs text-scout-400 hover:text-white">Ver Todo</button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar max-h-[500px]">
                              {notes.length === 0 ? (
                                  <div className="text-center py-10 text-scout-500 text-sm">Sin notas registradas.</div>
                              ) : (
                                  notes.slice(0, 3).map(note => (
                                      <div key={note.id} className="bg-scout-900/50 p-3 rounded-lg border border-scout-700/50 hover:border-scout-600 transition-colors cursor-pointer" onClick={() => setActiveTab('notes')}>
                                          <div className="flex justify-between items-start mb-1">
                                              <span className="text-[10px] font-bold text-scout-300 uppercase bg-scout-800 px-1.5 py-0.5 rounded">{note.category}</span>
                                              <span className="text-[10px] text-scout-500">{new Date(note.timestamp).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-xs text-scout-200 line-clamp-2">{note.content}</p>
                                      </div>
                                  ))
                              )}
                          </div>
                          <div className="p-3 border-t border-scout-700 bg-scout-900/30">
                              <button 
                                onClick={() => { setActiveTab('notes'); setIsNoteEditorOpen(true); }}
                                className="w-full py-2 bg-scout-700 hover:bg-scout-600 text-scout-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                  + Añadir Nota Rápida
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* ANALYSIS TAB */}
          {activeTab === 'analysis' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                  <div className="bg-scout-800 p-1 rounded-xl border border-scout-700 shadow-lg aspect-[3/4] lg:aspect-video relative overflow-hidden group">
                      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur px-3 py-1 rounded text-xs font-bold text-white border border-white/10">
                          Mapa de Posición
                      </div>
                      <TacticalPitch position={player.position} />
                  </div>
                  
                  <div className="flex flex-col gap-6">
                      <PlayerStatsDashboard player={player} />
                  </div>
              </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
              <div className="flex flex-col md:flex-row gap-6 h-full animate-fadeIn">
                  {/* Note List */}
                  <div className={`flex-1 flex flex-col h-full overflow-hidden ${isNoteEditorOpen ? 'hidden md:flex' : ''}`}>
                      <div className="flex justify-between items-center mb-4 shrink-0">
                          <h3 className="text-lg font-bold text-white">Historial de Observaciones</h3>
                          <button 
                            onClick={() => setIsNoteEditorOpen(true)}
                            className="bg-scout-gold hover:bg-yellow-500 text-scout-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
                          >
                              <Plus className="w-4 h-4" /> Nueva Nota
                          </button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                           <NoteList 
                             notes={notes}
                             searchQuery=""
                             setSearchQuery={() => {}}
                             selectedCategory="All"
                             setSelectedCategory={() => {}}
                             currentUser={currentUser}
                             allUsers={allUsers}
                             onEditNote={onEditNote}
                             onDeleteNote={onDeleteNote}
                           />
                      </div>
                  </div>

                  {/* Note Editor (Side Panel on Desktop, Full on Mobile when open) */}
                  {isNoteEditorOpen && (
                      <div className="w-full md:w-96 shrink-0 h-full flex flex-col animate-slideInRight z-20">
                          <NoteEditor 
                             onSave={(c, cat, t, a) => {
                                 onAddNote(c, cat, t, a);
                                 setIsNoteEditorOpen(false);
                             }}
                             onCancel={() => setIsNoteEditorOpen(false)}
                          />
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* AI Report Modal */}
      {isAiModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
              <div className="bg-[#0f172a] border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-purple-900/20 overflow-hidden relative">
                  
                  {/* Decorative Gradient Line */}
                  <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 animate-gradient"></div>

                  <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-purple-400" />
                          Informe de Inteligencia Artificial
                      </h3>
                      <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0f172a] relative">
                      {isGeneratingReport ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                              <h4 className="text-white font-bold text-lg mb-2">Analizando Datos...</h4>
                              <p className="text-slate-400 text-sm max-w-xs">Gemini está procesando estadísticas, notas y métricas para generar un perfil completo.</p>
                          </div>
                      ) : (
                          <div className="prose prose-invert prose-sm max-w-none">
                              {aiReport ? (
                                  <div className="whitespace-pre-wrap leading-relaxed text-slate-300">
                                      {/* Simple markdown parsing for bold headers */}
                                      {aiReport.split('\n').map((line, i) => {
                                          if (line.startsWith('**') || line.startsWith('#')) {
                                              return <h4 key={i} className="text-purple-300 font-bold mt-4 mb-2 text-base">{line.replace(/\*\*/g, '').replace(/#/g, '')}</h4>;
                                          }
                                          if (line.startsWith('- ')) {
                                              return <li key={i} className="ml-4 list-disc marker:text-purple-500">{line.replace('- ', '')}</li>
                                          }
                                          return <p key={i} className="mb-2">{line}</p>;
                                      })}
                                  </div>
                              ) : (
                                  <div className="text-center text-red-400">Error al generar el reporte.</div>
                              )}
                          </div>
                      )}
                  </div>

                  {!isGeneratingReport && aiReport && (
                      <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                          <button onClick={() => setIsAiModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cerrar</button>
                          <button 
                            onClick={() => exportAIReportToPDF(player, aiReport)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20"
                          >
                              <Download className="w-4 h-4" /> Guardar PDF
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDeletePlayer(player.id)}
        title="Eliminar Jugador"
        message={`¿Estás seguro de que deseas eliminar a ${player.name}? Esta acción eliminará también todas sus notas y estadísticas asociadas.`}
        isDestructive={true}
        confirmText="Eliminar Definitivamente"
      />

    </div>
  );
};
