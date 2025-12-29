import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService'; // Import Export Service
import { BrainCircuit, Edit, Trash2, ChevronDown, ChevronUp, ChevronRight, GripVertical, FileText, Activity as ActivityIcon, Apple, ArrowLeft, Building2, Calendar, Briefcase, Shirt, PieChart as PieChartIcon, TrendingUp, AlertCircle, CheckCircle2, ClipboardList, X, FileDown, Download, Maximize2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TacticalPitch } from './TacticalPitch';
import { PlayerFormModal, ModalTab } from './PlayerFormModal';

interface PlayerProfileProps {
  player: Player;
  notes: Note[];
  onAddNote: (content: string, category: NoteCategory, tags: string[], attachments: Attachment[]) => void;
  onEditPlayer: (player: Player) => void;
  onPlayerUpdate: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
  currentUser: User | null;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

type InfoModalType = 'nutrition' | 'physical' | 'contract' | null;

const STAT_LABELS: Record<string, string> = {
  pace: 'Ritmo',
  shooting: 'Tiro',
  passing: 'Pase',
  dribbling: 'Regate',
  defending: 'Defensa',
  physical: 'Físico'
};

// --- Extracted Components ---

const NutritionContent: React.FC<{ player: Player }> = ({ player }) => {
  const macros = player.nutrition?.macros || { protein: 0, carbs: 0, fats: 0 };
  const macroData = [
     { name: 'Proteínas', value: macros.protein, color: '#3b82f6' },
     { name: 'Carbohidratos', value: macros.carbs, color: '#10b981' },
     { name: 'Grasas', value: macros.fats, color: '#f59e0b' },
  ];

  const historyData = player.nutrition?.bodyCompositionHistory || [];

  return (
    <div className="space-y-6">
         {/* Top Stats Row */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-scout-900/50 p-4 rounded-xl border border-scout-700 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="w-12 h-12 text-emerald-400" /></div>
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-1">Estado de Peso</div>
               <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${player.nutrition?.weightStatus === 'Óptimo' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                     {player.nutrition?.weightStatus}
                  </div>
                  {player.nutrition?.weightStatus === 'Óptimo' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
               </div>
               <div className="text-xs text-scout-400 mt-1">Último: {player.nutrition?.lastCheckup}</div>
            </div>

            <div className="bg-scout-900/50 p-4 rounded-xl border border-scout-700 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><ActivityIcon className="w-12 h-12 text-blue-400" /></div>
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-1">Hidratación</div>
               <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-blue-400">{player.nutrition?.hydrationLevel}%</div>
               </div>
               <div className="w-full bg-scout-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${player.nutrition?.hydrationLevel}%` }}></div>
               </div>
            </div>

            <div className="bg-scout-900/50 p-4 rounded-xl border border-scout-700 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><PieChartIcon className="w-12 h-12 text-orange-400" /></div>
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-1">Calorías Diarias</div>
               <div className="text-2xl font-bold text-orange-400">{player.nutrition?.dailyCalories} <span className="text-sm text-scout-500 font-normal">kcal</span></div>
               <div className="text-xs text-scout-400 mt-1">Objetivo de mantenimiento</div>
            </div>

            <div className="bg-scout-900/50 p-4 rounded-xl border border-scout-700 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><AlertCircle className="w-12 h-12 text-red-400" /></div>
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-1">Restricciones</div>
               <div className="flex flex-wrap gap-1 mt-1">
                  {player.nutrition?.dietaryRestrictions.length ? player.nutrition?.dietaryRestrictions.map(r => (
                     <span key={r} className="px-2 py-0.5 bg-red-500/10 text-red-300 text-[10px] rounded border border-red-500/20">{r}</span>
                  )) : <span className="text-sm text-scout-400">Ninguna</span>}
               </div>
            </div>
         </div>

         {/* Charts Section */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Macro Chart */}
            <div className="bg-scout-900/50 p-5 rounded-xl border border-scout-700 lg:col-span-1 flex flex-col">
               <h3 className="text-sm font-bold text-scout-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-scout-400" /> Distribución Macros
               </h3>
               <div className="flex-1 min-h-[200px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={macroData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {macroData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                           ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                           itemStyle={{ color: '#f8fafc' }}
                           formatter={(value: number) => [`${value}g`, '']}
                        />
                        <Legend 
                           verticalAlign="bottom" 
                           height={36}
                           formatter={(value, entry: any) => <span className="text-xs text-scout-300 ml-1">{value} ({entry.payload.value}g)</span>}
                        />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                     <span className="text-xs text-scout-500 font-bold uppercase">Total</span>
                     <span className="text-xl font-bold text-white">{macros.protein + macros.carbs + macros.fats}g</span>
                  </div>
               </div>
            </div>

            {/* Weight/Fat History Chart */}
            <div className="bg-scout-900/50 p-5 rounded-xl border border-scout-700 lg:col-span-2 flex flex-col">
               <h3 className="text-sm font-bold text-scout-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-scout-400" /> Evolución Composición Corporal
               </h3>
               <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                           dataKey="date" 
                           stroke="#94a3b8" 
                           fontSize={10} 
                           tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short'})}
                        />
                        <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} domain={[0, 20]} label={{ value: 'Grasa %', angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 10 }} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                           labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Area yAxisId="left" type="monotone" dataKey="weight" name="Peso (kg)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2} />
                        <Area yAxisId="right" type="monotone" dataKey="bodyFatPercentage" name="Grasa Corp. (%)" stroke="#10b981" fillOpacity={1} fill="url(#colorFat)" strokeWidth={2} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700">
             <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider mb-4 border-b border-scout-700 pb-2">Plan de Suplementación</h3>
             <div className="flex flex-wrap gap-2">
                {player.nutrition?.supplements.map(s => (
                   <div key={s} className="flex items-center gap-2 px-3 py-2 bg-scout-800 border border-scout-600 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-scout-accent"></div>
                      <span className="text-sm text-scout-200">{s}</span>
                   </div>
                )) || <span className="text-sm text-scout-400">Ningún suplemento activo</span>}
             </div>
          </div>
    </div>
  );
};

const PhysicalContent: React.FC<{ player: Player }> = ({ player }) => (
  <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-scout-900/50 p-5 rounded-xl border border-scout-700 flex flex-col items-center justify-center text-center">
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-2">Nivel de Fatiga</div>
               <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle cx="48" cy="48" r="40" fill="transparent" stroke="#334155" strokeWidth="8" />
                     <circle cx="48" cy="48" r="40" fill="transparent" stroke={player.physical?.fatigueLevel! > 80 ? '#ef4444' : '#10b981'} strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (player.physical?.fatigueLevel || 0) / 100)} />
                  </svg>
                  <span className="absolute text-2xl font-bold text-white">{player.physical?.fatigueLevel}%</span>
               </div>
            </div>
            <div className="bg-scout-900/50 p-5 rounded-xl border border-scout-700 flex flex-col items-center justify-center text-center">
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-2">Riesgo de Lesión</div>
               <div className={`text-3xl font-bold ${player.physical?.injuryRisk === 'Alto' ? 'text-red-500' : player.physical?.injuryRisk === 'Medio' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                  {player.physical?.injuryRisk}
               </div>
               <div className="text-xs text-scout-400 mt-1">Basado en carga reciente</div>
            </div>
            <div className="bg-scout-900/50 p-5 rounded-xl border border-scout-700 flex flex-col items-center justify-center text-center">
               <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-2">Estado Recuperación</div>
               <div className="text-xl font-bold text-blue-400">{player.physical?.recoveryStatus}</div>
            </div>
        </div>
        
        <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 space-y-4">
           <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider mb-2 flex items-center gap-2"><ActivityIcon className="w-4 h-4" /> Historial Reciente</h3>
           <div className="p-4 bg-scout-800 rounded-lg border border-scout-700/50">
              <span className="text-scout-400 text-xs uppercase block mb-1">Última Lesión Registrada</span>
              <span className="text-white font-medium">{player.physical?.lastInjury || 'Sin registro reciente'}</span>
           </div>
        </div>

        <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 space-y-4">
           <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Notas del Preparador Físico</h3>
           <p className="text-scout-200 text-sm leading-relaxed p-4 bg-scout-800 rounded-lg border border-scout-700/50">
              {player.physical?.fitnessNotes || 'No hay notas disponibles.'}
           </p>
        </div>
  </div>
);

const ContractContent: React.FC<{ player: Player }> = ({ player }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 space-y-4">
           <div className="flex items-center gap-2 mb-4 border-b border-scout-700 pb-2">
              <Building2 className="w-5 h-5 text-scout-400" />
              <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider">Propiedad del Jugador</h3>
           </div>
           <div className="space-y-4">
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Club Propietario</label>
                 <div className="text-xl font-bold text-white">{player.contract?.isLoan ? player.contract.loanOriginClub : player.contract?.clubName}</div>
              </div>
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Situación Actual</label>
                 <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${player.contract?.isLoan ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                       {player.contract?.isLoan ? 'CEDIDO' : 'EN PROPIEDAD'}
                    </span>
                    {player.contract?.isLoan && <span className="text-sm text-scout-300">en {player.contract.clubName}</span>}
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 space-y-4">
           <div className="flex items-center gap-2 mb-4 border-b border-scout-700 pb-2">
              <Shirt className="w-5 h-5 text-scout-400" />
              <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider">Contrato Deportivo</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Vencimiento</label>
                 <div className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-scout-400" />
                    {player.contract?.contractExpiration}
                 </div>
              </div>
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Valor Mercado</label>
                 <div className="text-lg font-bold text-emerald-400">{player.marketValue}</div>
              </div>
           </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-scout-900/50 p-6 rounded-xl border border-scout-700 space-y-4">
           <div className="flex items-center gap-2 mb-4 border-b border-scout-700 pb-2">
              <Briefcase className="w-5 h-5 text-scout-400" />
              <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider">Representación (Agencia)</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Agencia</label>
                 <div className="text-lg font-medium text-white">{player.contract?.agencyName}</div>
              </div>
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Contacto Principal</label>
                 <div className="text-lg font-medium text-white">{player.contract?.agencyContact}</div>
              </div>
              <div>
                 <label className="text-xs text-scout-500 block mb-1">Vencimiento Representación</label>
                 <div className="text-lg font-medium text-scout-200">{player.contract?.agencyContractExpiration}</div>
              </div>
           </div>
        </div>
  </div>
);

// --- InfoModal ---

interface InfoModalProps {
   type: ModalTab;
   title: string;
   icon: any;
   children: React.ReactNode;
   onClose: () => void;
   onEdit: (type: ModalTab) => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ type, title, icon: Icon, children, onClose, onEdit }) => (
   <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-scout-800 rounded-2xl border border-scout-700 w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-scaleIn">
         {/* Modal Header */}
         <div className="p-4 border-b border-scout-700 bg-scout-900/50 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                    type === 'nutrition' ? 'bg-green-500/20 text-green-400' :
                    type === 'physical' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                }`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-xs text-scout-400">Detalles e historial completo</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={() => onEdit(type)} className="flex items-center gap-2 px-4 py-2 bg-scout-700 hover:bg-scout-600 rounded-lg text-sm text-white transition-colors border border-scout-600 shadow-lg">
                    <Edit className="w-4 h-4" /> Modificar
                </button>
                <button onClick={onClose} className="p-2 text-scout-400 hover:text-white transition-colors rounded-lg hover:bg-scout-700">
                    <X className="w-6 h-6" />
                </button>
             </div>
         </div>
         
         {/* Modal Body */}
         <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0b1120]/30">
             {children}
         </div>
      </div>
   </div>
);


export const PlayerProfile: React.FC<PlayerProfileProps> = ({ 
  player, 
  notes, 
  onAddNote, 
  onEditPlayer,
  onPlayerUpdate,
  onDeletePlayer,
  currentUser,
  onEditNote,
  onDeleteNote
}) => {
  // State for Information Modals
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalType>(null);
  
  // Local state for specific section editing
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ModalTab>('general');

  // Notes Drawer State
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'All'>('All');
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [isAiReportOpen, setIsAiReportOpen] = useState(false);

  // --- Resizing State ---
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [statsHeight, setStatsHeight] = useState(130); // px
  const [leftColWidth, setLeftColWidth] = useState(40); // %

  const statsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingStats = useRef(false);
  const isResizingCol = useRef(false);

  // Clear report when player changes
  useEffect(() => {
    setReport(null);
    setShowNoteEditor(false);
    setEditingNote(null);
    setIsAiReportOpen(false);
    setActiveInfoModal(null); // Close modals on player switch
    setIsNotesDrawerOpen(false); // Close notes drawer
  }, [player.id]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Resize Stats Height
      if (isResizingStats.current && statsRef.current) {
        const rect = statsRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        if (newHeight >= 80 && newHeight <= 400) {
          setStatsHeight(newHeight);
        }
      }

      // Resize Column Width
      if (isResizingCol.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidthPercent = ((e.clientX - rect.left) / rect.width) * 100;
        if (newWidthPercent >= 20 && newWidthPercent <= 80) {
          setLeftColWidth(newWidthPercent);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingStats.current || isResizingCol.current) {
        isResizingStats.current = false;
        isResizingCol.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizingStats = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingStats.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const startResizingCol = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingCol.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleGenerateReport = async () => {
    if (!isAiReportOpen) setIsAiReportOpen(true);
    if (!report) {
      setIsGeneratingReport(true);
      const result = await generateScoutingReport(player, notes);
      setReport(result);
      setIsGeneratingReport(false);
    }
  };
  
  const handleExportPDF = () => {
    exportPlayerProfileToPDF(player, notes);
  };

  const handleExportAIReport = () => {
      if (report) {
          exportAIReportToPDF(player, report);
      }
  };

  const startEditingNote = (note: Note) => {
    setEditingNote(note);
    setShowNoteEditor(true);
  };

  const handleSaveNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[]) => {
    if (editingNote) {
      const updatedNote = { ...editingNote, content, category, tags, attachments, timestamp: Date.now(), isEdited: true };
      onEditNote(updatedNote);
    } else {
      onAddNote(content, category, tags, attachments);
    }
    setShowNoteEditor(false);
    setEditingNote(null);
  };

  const handleOpenSectionEdit = (section: ModalTab) => {
      setEditingSection(section);
      setIsSectionModalOpen(true);
  };

  const handleSectionSave = (updatedPlayer: Partial<Player>) => {
      onPlayerUpdate({ ...player, ...updatedPlayer });
      setIsSectionModalOpen(false);
  };

  const statData = [
    { subject: 'Ritmo', A: player.stats.pace, fullMark: 100 },
    { subject: 'Tiro', A: player.stats.shooting, fullMark: 100 },
    { subject: 'Pase', A: player.stats.passing, fullMark: 100 },
    { subject: 'Regate', A: player.stats.dribbling, fullMark: 100 },
    { subject: 'Defensa', A: player.stats.defending, fullMark: 100 },
    { subject: 'Físico', A: player.stats.physical, fullMark: 100 },
  ];

  // Default Overview View
  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar p-2 relative">
      
      {/* 1. TOP CARD */}
      <div className="bg-scout-800 rounded-2xl p-6 border border-scout-700 shadow-xl relative overflow-hidden shrink-0">
         <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative">
            
            <div className="relative shrink-0">
              <img 
                src={player.imageUrl} 
                alt={player.name} 
                className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover border border-scout-600 shadow-lg"
              />
            </div>
            
            <div className="flex-1 text-center md:text-left w-full">
               <h1 className="text-3xl font-bold text-white mb-2">{player.name}</h1>
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs font-bold uppercase tracking-wide border border-blue-500/30">
                    {player.position}
                  </span>
                  <span className="text-scout-300 font-medium">{player.team}</span>
                  <span className="text-scout-500">•</span>
                  <span className="text-scout-300 font-medium">{player.country}</span>
               </div>
               
               {/* Quick Access Buttons (OPEN MODALS) */}
               <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
                  <button onClick={() => setActiveInfoModal('nutrition')} className="flex items-center gap-2 px-3 py-1.5 bg-scout-700 hover:bg-green-900/30 hover:text-green-400 hover:border-green-500/30 border border-scout-600 rounded-lg text-xs font-medium text-scout-300 transition-all">
                     <Apple className="w-3.5 h-3.5" /> Nutrición
                     <Maximize2 className="w-3 h-3 ml-1 opacity-50" />
                  </button>
                  <button onClick={() => setActiveInfoModal('physical')} className="flex items-center gap-2 px-3 py-1.5 bg-scout-700 hover:bg-blue-900/30 hover:text-blue-400 hover:border-blue-500/30 border border-scout-600 rounded-lg text-xs font-medium text-scout-300 transition-all">
                     <ActivityIcon className="w-3.5 h-3.5" /> Físico
                     <Maximize2 className="w-3 h-3 ml-1 opacity-50" />
                  </button>
                  <button onClick={() => setActiveInfoModal('contract')} className="flex items-center gap-2 px-3 py-1.5 bg-scout-700 hover:bg-purple-900/30 hover:text-purple-400 hover:border-purple-500/30 border border-scout-600 rounded-lg text-xs font-medium text-scout-300 transition-all">
                     <Briefcase className="w-3.5 h-3.5" /> Contrato
                     <Maximize2 className="w-3 h-3 ml-1 opacity-50" />
                  </button>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-4 gap-6 border-t border-scout-700/50 pt-4 max-w-lg mx-auto md:mx-0">
                  <div className="text-center md:text-left"><div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Edad</div><div className="text-lg font-semibold text-scout-100">{player.age}</div></div>
                  <div className="text-center md:text-left"><div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Altura</div><div className="text-lg font-semibold text-scout-100">{player.height}</div></div>
                  <div className="text-center md:text-left"><div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Peso</div><div className="text-lg font-semibold text-scout-100">{player.weight}</div></div>
                  <div className="text-center md:text-left"><div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Pie</div><div className="text-lg font-semibold text-scout-100">{player.foot}</div></div>
               </div>
            </div>

            <div className="flex flex-col items-center md:items-end min-w-[150px] w-full md:w-auto gap-4">
               
               {/* Action Toolbar */}
               <div className="flex items-center gap-1 bg-scout-900/80 p-1.5 rounded-lg border border-scout-700 shadow-sm backdrop-blur-sm mb-2">
                   <button onClick={handleExportPDF} className="p-2 text-scout-400 hover:text-white hover:bg-scout-700 rounded-md transition-all" title="Exportar PDF">
                      <FileDown className="w-4 h-4" />
                   </button>
                   <div className="w-px h-4 bg-scout-700 mx-0.5"></div>
                   <button onClick={() => onEditPlayer(player)} className="p-2 text-scout-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all" title="Editar Jugador">
                      <Edit className="w-4 h-4" />
                   </button>
                   <button onClick={() => onDeletePlayer(player.id)} className="p-2 text-scout-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all" title="Eliminar Jugador">
                      <Trash2 className="w-4 h-4" />
                   </button>
               </div>

               <div className="text-center md:text-right">
                  <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-1">Valor de Mercado</div>
                  <div className="text-4xl font-bold text-emerald-400">{player.marketValue}</div>
               </div>
               
               <div className="bg-scout-900 px-4 py-2 rounded-lg border border-scout-600 flex items-center gap-3">
                  <span className="text-3xl font-bold text-white">{player.scoutRating}</span>
                  <span className="text-[10px] text-scout-400 font-bold uppercase">GRAL</span>
               </div>
               
               {/* Notes Button */}
               <button 
                 onClick={() => setIsNotesDrawerOpen(true)}
                 className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20 transition-all w-full justify-center"
               >
                  <ClipboardList className="w-4 h-4" />
                  Ver Notas ({notes.length})
               </button>
            </div>
         </div>
      </div>

      {/* 2. STATS ROW */}
      <div 
        ref={statsRef}
        className="bg-scout-800 border border-scout-700 rounded-xl shadow-md shrink-0 transition-all duration-75 ease-linear relative flex flex-col overflow-hidden"
        style={{ height: statsExpanded ? statsHeight : 'auto' }}
      >
        <div 
          className="flex items-center justify-between px-3 py-2 border-b border-scout-700/50 bg-scout-800 cursor-pointer hover:bg-scout-700/50 select-none"
          onClick={() => setStatsExpanded(!statsExpanded)}
        >
          <div className="flex items-center gap-2">
            {statsExpanded ? <ChevronDown className="w-4 h-4 text-scout-400" /> : <ChevronRight className="w-4 h-4 text-scout-400" />}
            <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">Atributos del Jugador</span>
          </div>
          {!statsExpanded && <span className="text-[10px] text-scout-500">Clic para expandir</span>}
        </div>

        {statsExpanded && (
          <div className="flex-1 relative min-h-0">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3 h-full pb-5">
              {Object.entries(player.stats).map(([key, val]) => {
                const value = val as number;
                return (
                  <div key={key} className="bg-scout-900/50 border border-scout-700/50 rounded-lg p-2 flex flex-col items-center justify-center h-full shadow-sm hover:border-scout-600 transition-colors">
                      <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">{STAT_LABELS[key] || key}</div>
                      <div className={`text-2xl font-bold ${value > 85 ? 'text-emerald-400' : value > 70 ? 'text-white' : 'text-scout-400'}`}>
                        {value}
                      </div>
                  </div>
                );
              })}
            </div>
            <div onMouseDown={startResizingStats} className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-scout-700 flex justify-center items-center z-10 transition-colors bg-transparent"><div className="w-12 h-1 bg-scout-600 rounded-full opacity-50 hover:opacity-100" /></div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM GRID (Charts) */}
      <div 
        className="flex-1 min-h-[400px] flex flex-col lg:flex-row gap-0 overflow-hidden" 
        ref={containerRef}
        style={{ '--left-col-width': `${leftColWidth}%` } as React.CSSProperties}
      >
         {/* LEFT COLUMN */}
         <div className="flex flex-col gap-4 lg:pr-1 h-full w-full lg:w-[var(--left-col-width)] min-w-[200px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <div className="bg-scout-800 rounded-2xl p-4 border border-scout-700 shadow-lg flex flex-col h-full">
                  <h3 className="text-xs font-bold text-scout-300 uppercase tracking-wider mb-2">Perfil de Atributos</h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={statData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartsRadar name={player.name} dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              <div className="bg-scout-800 rounded-2xl p-4 border border-scout-700 shadow-lg flex flex-col h-full">
                  <h3 className="text-xs font-bold text-scout-300 uppercase tracking-wider mb-2">Posicionamiento</h3>
                  <div className="flex-1 relative rounded-xl overflow-hidden min-h-0">
                    <TacticalPitch position={player.position} />
                  </div>
              </div>
            </div>
         </div>

         {/* RESIZE HANDLE */}
         <div onMouseDown={startResizingCol} className="hidden lg:flex w-4 -ml-2 -mr-2 z-20 cursor-col-resize flex-col justify-center items-center group select-none relative">
            <div className="absolute inset-y-0 w-1 bg-transparent group-hover:bg-scout-accent/20 transition-colors"></div>
            <div className="w-1 h-8 bg-scout-600 rounded-full group-hover:bg-scout-accent transition-colors shadow-lg z-30 flex items-center justify-center">
              <GripVertical className="w-3 h-3 text-scout-900 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
         </div>

         {/* RIGHT COLUMN */}
         <div className="flex flex-col gap-4 lg:pl-1 h-full w-full lg:w-[calc(100%-var(--left-col-width))] min-w-[300px]">
             
                <div className="bg-scout-800 rounded-2xl p-1 border border-scout-700 shadow-lg flex flex-col relative h-full">
                    <div className="flex items-center justify-between p-3 border-b border-scout-700/50 bg-scout-800/80 z-20 rounded-t-2xl">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-purple-400" />
                          <span className="font-bold text-scout-100 text-sm">Informe de Scouting IA</span>
                        </div>
                        <button onClick={() => setIsAiReportOpen(!isAiReportOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded text-xs font-medium border border-purple-500/20 transition-colors">
                          {isAiReportOpen ? 'Cerrar Informe' : 'Generar / Ver'}
                          {isAiReportOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>

                    {isAiReportOpen && (
                      <div className="absolute top-[50px] left-0 right-0 mx-2 bg-scout-900/95 backdrop-blur-md border border-purple-500/30 shadow-2xl rounded-xl z-30 flex flex-col max-h-[85%] overflow-hidden animate-slideIn">
                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar relative">
                          {report && (
                              <div className="absolute top-2 right-2 z-10">
                                <button onClick={handleExportAIReport} className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-lg transition-colors" title="Exportar Informe IA a PDF">
                                    <Download className="w-4 h-4" />
                                </button>
                              </div>
                          )}

                          {!report && !isGeneratingReport && (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <p className="text-scout-400 text-sm mb-4">Genera un análisis de scouting completo usando Gemini AI.</p>
                                <button onClick={handleGenerateReport} className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-bold text-sm shadow-lg shadow-purple-500/20">Generar Análisis</button>
                              </div>
                          )}
                          {isGeneratingReport && (
                            <div className="flex flex-col items-center justify-center py-12">
                              <BrainCircuit className="w-8 h-8 text-purple-400 animate-pulse mb-3" />
                              <span className="text-scout-300 text-xs animate-pulse">Analizando estadísticas y notas...</span>
                            </div>
                          )}
                          {report && (
                            <div className="prose prose-invert prose-sm max-w-none text-scout-200 mt-2">
                                {report.split('\n').map((line, i) => (
                                  <p key={i} className="mb-2 text-xs leading-relaxed opacity-90">{line}</p>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Placeholder for overview */}
                    <div className="flex-1 flex flex-col items-center justify-center text-scout-500 p-8 text-center">
                        <ActivityIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">Selecciona una sección (Nutrición, Físico, Contrato) en la parte superior para ver más detalles.</p>
                    </div>
                </div>
         </div>
      </div>

      {/* --- RENDER ACTIVE INFO MODAL --- */}
      {activeInfoModal === 'nutrition' && (
          <InfoModal 
            type="nutrition" 
            title="Dashboard Nutricional" 
            icon={Apple}
            onClose={() => setActiveInfoModal(null)}
            onEdit={handleOpenSectionEdit}
          >
              <NutritionContent player={player} />
          </InfoModal>
      )}
      {activeInfoModal === 'physical' && (
          <InfoModal 
            type="physical" 
            title="Informes Físicos" 
            icon={ActivityIcon}
            onClose={() => setActiveInfoModal(null)}
            onEdit={handleOpenSectionEdit}
          >
              <PhysicalContent player={player} />
          </InfoModal>
      )}
      {activeInfoModal === 'contract' && (
          <InfoModal 
            type="contract" 
            title="Estado Contractual" 
            icon={Briefcase}
            onClose={() => setActiveInfoModal(null)}
            onEdit={handleOpenSectionEdit}
          >
              <ContractContent player={player} />
          </InfoModal>
      )}

      {/* NOTES DRAWER / MODAL */}
      {isNotesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsNotesDrawerOpen(false)}></div>
           <div className="relative w-full max-w-md bg-scout-800 h-full shadow-2xl border-l border-scout-700 flex flex-col animate-slideInRight">
              <div className="p-4 border-b border-scout-700 flex items-center justify-between bg-scout-900/50">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                   <ClipboardList className="w-5 h-5" /> Notas y Feedback
                 </h2>
                 <button onClick={() => setIsNotesDrawerOpen(false)} className="text-scout-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex-1 overflow-hidden p-4 flex flex-col">
                 {!showNoteEditor && (
                    <div className="flex justify-end mb-4">
                       <button onClick={() => setShowNoteEditor(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20">
                          <Edit className="w-3 h-3" /> Nueva Nota
                       </button>
                    </div>
                 )}

                 {showNoteEditor ? (
                    <NoteEditor 
                     initialData={editingNote ? {
                       content: editingNote.content,
                       category: editingNote.category,
                       tags: editingNote.tags,
                       attachments: editingNote.attachments
                     } : undefined}
                     onSave={handleSaveNote}
                     onCancel={() => {
                       setShowNoteEditor(false);
                       setEditingNote(null);
                     }}
                    />
                 ) : (
                    <NoteList 
                      notes={notes}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      currentUser={currentUser}
                      onEditNote={startEditingNote}
                      onDeleteNote={onDeleteNote}
                    />
                 )}
              </div>
           </div>
        </div>
      )}

      {/* SECTION EDIT MODAL */}
      <PlayerFormModal 
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        onSave={handleSectionSave}
        initialData={player}
        initialTab={editingSection}
        restrictToTab={true}
      />

    </div>
  );
};