
import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService';
import { BrainCircuit, Edit, Trash2, Activity as ActivityIcon, Apple, ArrowLeft, ArrowRight, Briefcase, Shirt, PieChart as PieChartIcon, TrendingUp, AlertCircle, CheckCircle2, ClipboardList, FileDown, Download, Youtube, MoreVertical, Scale, Zap, HeartPulse, DollarSign, Calendar, FileText, X } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { TacticalPitch } from './TacticalPitch';
import { PlayerFormModal, ModalTab } from './PlayerFormModal';

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

const STAT_LABELS: Record<string, string> = {
  pace: 'Ritmo',
  shooting: 'Tiro',
  passing: 'Pase',
  dribbling: 'Regate',
  defending: 'Defensa',
  physical: 'Físico'
};

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- Extracted Components with FULL VISUALIZATION ---

const NutritionContent: React.FC<{ player: Player }> = ({ player }) => {
  const macros = player.nutrition?.macros || { protein: 0, carbs: 0, fats: 0 };
  const macroData = [
     { name: 'Proteínas', value: macros.protein, color: '#3b82f6' },
     { name: 'Carbohidratos', value: macros.carbs, color: '#10b981' },
     { name: 'Grasas', value: macros.fats, color: '#f59e0b' },
  ];
  const historyData = player.nutrition?.bodyCompositionHistory || [];
  
  return (
    <div className="space-y-6 animate-fadeIn pb-6">
         {/* Top Stats Cards */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 relative overflow-hidden">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Estado de Peso</div>
               <div className="flex items-center gap-2">
                  <div className={`text-lg md:text-xl font-bold ${player.nutrition?.weightStatus === 'Óptimo' ? 'text-emerald-400' : player.nutrition?.weightStatus === 'Sobrepeso' ? 'text-red-400' : 'text-yellow-400'}`}>
                     {player.nutrition?.weightStatus || 'N/A'}
                  </div>
                  {player.nutrition?.weightStatus === 'Óptimo' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
               </div>
            </div>
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Hidratación</div>
               <div className="text-lg md:text-xl font-bold text-blue-400">{player.nutrition?.hydrationLevel || 0}%</div>
               <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${player.nutrition?.hydrationLevel || 0}%` }}></div>
               </div>
            </div>
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Calorías Diarias</div>
               <div className="text-lg md:text-xl font-bold text-orange-400">{player.nutrition?.dailyCalories || 0} kcal</div>
            </div>
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Último Chequeo</div>
               <div className="text-lg md:text-xl font-bold text-scout-200">{player.nutrition?.lastCheckup || '-'}</div>
            </div>
         </div>

         {/* Charts Row */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg flex flex-col">
               <h3 className="text-sm font-bold text-scout-100 flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-4 h-4 text-scout-gold" /> Distribución Macros
               </h3>
               {/* Fixed Height Container for Recharts - Critical for width/height -1 error */}
               <div className="w-full h-64 min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={macroData}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                       >
                          {macroData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                          ))}
                       </Pie>
                       <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                       <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg flex flex-col">
               <h3 className="text-sm font-bold text-scout-100 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-scout-gold" /> Evolución de Peso
               </h3>
               {historyData.length > 0 ? (
                  /* Fixed Height Container for Recharts */
                  <div className="w-full h-64 min-h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                           <defs>
                              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                           <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.substring(5)} />
                           <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#64748b" fontSize={10} width={30} />
                           <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                           <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               ) : (
                  <div className="flex-1 flex items-center justify-center text-scout-500 text-sm italic h-64">
                     Sin datos históricos
                  </div>
               )}
            </div>
         </div>

         {/* Lists Row */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700">
               <h3 className="text-xs uppercase font-bold text-scout-400 mb-3 tracking-wider">Suplementación</h3>
               <div className="flex flex-wrap gap-2">
                  {player.nutrition?.supplements && player.nutrition.supplements.length > 0 ? (
                     player.nutrition.supplements.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20">{s}</span>
                     ))
                  ) : <span className="text-scout-500 text-sm">No registrado</span>}
               </div>
            </div>
            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700">
               <h3 className="text-xs uppercase font-bold text-scout-400 mb-3 tracking-wider">Restricciones Dietéticas</h3>
               <div className="flex flex-wrap gap-2">
                  {player.nutrition?.dietaryRestrictions && player.nutrition.dietaryRestrictions.length > 0 ? (
                     player.nutrition.dietaryRestrictions.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium border border-red-500/20">{s}</span>
                     ))
                  ) : <span className="text-scout-500 text-sm">Ninguna</span>}
               </div>
            </div>
         </div>
    </div>
  );
};

const PhysicalContent: React.FC<{ player: Player }> = ({ player }) => {
   const stats = [
      { subject: 'Velocidad', A: player.stats.pace, fullMark: 100 },
      { subject: 'Físico', A: player.stats.physical, fullMark: 100 },
      { subject: 'Resistencia', A: 100 - (player.physical?.fatigueLevel || 0), fullMark: 100 },
      { subject: 'Potencia', A: Math.round((player.stats.physical + player.stats.shooting)/2), fullMark: 100 },
      { subject: 'Agilidad', A: player.stats.dribbling, fullMark: 100 },
   ];

   return (
      <div className="space-y-6 animate-fadeIn pb-6">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Radar Chart */}
            <div className="bg-scout-800 p-4 md:p-6 rounded-xl border border-scout-700 md:col-span-1 shadow-lg flex flex-col justify-center">
               <h3 className="text-sm font-bold text-scout-100 mb-4 text-center uppercase tracking-wider">Perfil Atlético</h3>
               {/* Fixed Height Container - Critical */}
               <div className="h-64 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartsRadar name="Jugador" dataKey="A" stroke="#d4af37" strokeWidth={2} fill="#d4af37" fillOpacity={0.3} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} itemStyle={{ color: '#d4af37' }} />
                     </RadarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Metrics */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-scout-800 p-5 rounded-xl border border-scout-700">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">Riesgo de Lesión</span>
                     <ActivityIcon className={`w-5 h-5 ${player.physical?.injuryRisk === 'Alto' ? 'text-red-500' : player.physical?.injuryRisk === 'Medio' ? 'text-yellow-500' : 'text-green-500'}`} />
                  </div>
                  <div className={`text-2xl font-black ${player.physical?.injuryRisk === 'Alto' ? 'text-red-400' : player.physical?.injuryRisk === 'Medio' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                     {player.physical?.injuryRisk || 'N/A'}
                  </div>
                  <p className="text-[10px] text-scout-500 mt-1">Basado en carga de trabajo reciente</p>
               </div>

               <div className="bg-scout-800 p-5 rounded-xl border border-scout-700">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">Fatiga Acumulada</span>
                     <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-2xl font-black text-white">{player.physical?.fatigueLevel || 0}%</div>
                  <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2">
                     <div 
                        className={`h-1.5 rounded-full ${player.physical?.fatigueLevel && player.physical.fatigueLevel > 80 ? 'bg-red-500' : 'bg-orange-500'}`} 
                        style={{ width: `${player.physical?.fatigueLevel || 0}%` }}
                     ></div>
                  </div>
               </div>

               <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 sm:col-span-2">
                  <h3 className="text-xs uppercase font-bold text-scout-400 mb-3 tracking-wider flex items-center gap-2">
                     <HeartPulse className="w-4 h-4"/> Informe Médico / Estado
                  </h3>
                  <div className="flex flex-col gap-3">
                     <div className="flex justify-between border-b border-scout-700 pb-2">
                        <span className="text-sm text-scout-300">Estado Recuperación</span>
                        <span className="text-sm font-medium text-white">{player.physical?.recoveryStatus || 'No disponible'}</span>
                     </div>
                     <div className="flex justify-between border-b border-scout-700 pb-2">
                        <span className="text-sm text-scout-300">Última Lesión</span>
                        <span className="text-sm font-medium text-red-300">{player.physical?.lastInjury || 'Ninguna reciente'}</span>
                     </div>
                     <div className="bg-scout-900/50 p-3 rounded-lg text-sm text-scout-200 italic border border-scout-700/50">
                        "{player.physical?.fitnessNotes || 'Sin notas del preparador físico.'}"
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

const ContractContent: React.FC<{ player: Player }> = ({ player }) => {
   return (
      <div className="space-y-6 animate-fadeIn pb-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Value Card */}
            <div className="bg-gradient-to-br from-scout-800 to-scout-900 p-6 rounded-xl border border-scout-700 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign className="w-24 h-24 text-scout-gold" />
               </div>
               <div className="relative z-10">
                  <h3 className="text-xs font-bold text-scout-400 uppercase tracking-wider mb-2">Valor de Mercado</h3>
                  <div className="text-4xl font-black text-white mb-1">{player.marketValue || 'N/A'}</div>
                  <p className="text-xs text-emerald-400 font-medium">Actualizado: Hoy</p>
               </div>
            </div>

            {/* Contract Summary */}
            <div className="bg-scout-800 p-6 rounded-xl border border-scout-700 shadow-lg flex flex-col justify-center">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-scout-700 rounded-full flex items-center justify-center">
                     <Briefcase className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                     <div className="text-xs text-scout-500 uppercase font-bold">Club Propietario</div>
                     <div className="text-lg font-bold text-white">{player.contract?.clubName || player.team}</div>
                  </div>
               </div>
               {player.contract?.isLoan && (
                  <div className="bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold self-start border border-purple-500/30">
                     JUGADOR CEDIDO
                  </div>
               )}
            </div>
         </div>

         {/* Detailed Grid */}
         <div className="bg-scout-800 rounded-xl border border-scout-700 overflow-hidden">
            <div className="p-4 border-b border-scout-700 bg-scout-900/30">
               <h3 className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-scout-gold" /> Detalles Contractuales
               </h3>
            </div>
            <div className="divide-y divide-scout-700">
               <div className="grid grid-cols-2 p-4 hover:bg-scout-700/20 transition-colors">
                  <div className="text-sm text-scout-400">Vencimiento Contrato</div>
                  <div className="text-sm font-medium text-white text-right">{player.contract?.contractExpiration || '-'}</div>
               </div>
               <div className="grid grid-cols-2 p-4 hover:bg-scout-700/20 transition-colors">
                  <div className="text-sm text-scout-400">Agencia Representación</div>
                  <div className="text-sm font-medium text-white text-right">{player.contract?.agencyName || '-'}</div>
               </div>
               <div className="grid grid-cols-2 p-4 hover:bg-scout-700/20 transition-colors">
                  <div className="text-sm text-scout-400">Contacto Agente</div>
                  <div className="text-sm font-medium text-white text-right">{player.contract?.agencyContact || '-'}</div>
               </div>
               {player.contract?.isLoan && (
                   <div className="grid grid-cols-2 p-4 hover:bg-scout-700/20 transition-colors bg-purple-500/5">
                     <div className="text-sm text-purple-300">Club de Origen</div>
                     <div className="text-sm font-medium text-white text-right">{player.contract?.loanOriginClub || '-'}</div>
                   </div>
               )}
            </div>
         </div>
      </div>
   );
};

// --- Main Component ---

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
  const [activeTab, setActiveTab] = useState<'overview' | 'physical' | 'nutrition' | 'contract' | 'notes'>('overview');
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  
  // Note filtering
  const [noteSearch, setNoteSearch] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory | 'All'>('All');
  
  // AI Report State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'General', icon: ActivityIcon },
    { id: 'physical', label: 'Físico', icon: HeartPulse },
    { id: 'nutrition', label: 'Nutrición', icon: Apple },
    { id: 'contract', label: 'Contrato', icon: Briefcase },
    { id: 'notes', label: 'Notas', icon: ClipboardList },
  ];

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setShowAiModal(true);
    const report = await generateScoutingReport(player, notes);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  const handleEditNoteRequest = (note: Note) => {
      setEditingNote(note);
      setIsNoteEditorOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1120] relative overflow-hidden">
      
      {/* Top Bar with Back Button for Mobile */}
      <div className="flex items-center justify-between p-4 border-b border-scout-800 bg-scout-900/50 backdrop-blur-md sticky top-0 z-20">
         <div className="flex items-center gap-3">
             {/* Back Button only visible if onBack prop is provided (Mobile) */}
             {onBack && (
                 <button onClick={onBack} className="p-2 -ml-2 text-scout-400 hover:text-white rounded-full hover:bg-scout-800">
                     <ArrowLeft className="w-5 h-5" />
                 </button>
             )}
             
             <div className="relative">
                 <img 
                    src={player.imageUrl} 
                    alt={player.name} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-scout-600"
                 />
                 <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-scout-800 rounded-full flex items-center justify-center border border-scout-600 text-[10px] font-bold text-white">
                    {player.scoutRating}
                 </div>
             </div>
             
             <div>
                 <h2 className="text-sm font-bold text-white leading-tight">{player.name}</h2>
                 <p className="text-[10px] text-scout-400">{player.position} • {player.age} Años</p>
             </div>
         </div>

         <div className="flex items-center gap-1">
             <button onClick={handleGenerateReport} className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg" title="Generar Informe IA">
                 <BrainCircuit className="w-5 h-5" />
             </button>
             <button onClick={() => exportPlayerProfileToPDF(player, notes)} className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg" title="Exportar PDF">
                 <FileDown className="w-5 h-5" />
             </button>
             <div className="h-6 w-px bg-scout-700 mx-1"></div>
             <button onClick={() => onEditPlayer(player)} className="p-2 text-scout-400 hover:text-white hover:bg-scout-800 rounded-lg">
                 <Edit className="w-4 h-4" />
             </button>
             <button onClick={() => onDeletePlayer(player.id)} className="p-2 text-scout-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                 <Trash2 className="w-4 h-4" />
             </button>
         </div>
      </div>

      {/* Tabs Navigation (Scrollable) */}
      <div className="flex border-b border-scout-800 overflow-x-auto no-scrollbar bg-scout-900/30 shrink-0">
         {tabs.map((tab) => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2
                  ${activeTab === tab.id 
                     ? 'border-emerald-500 text-white bg-scout-800' 
                     : 'border-transparent text-scout-400 hover:text-scout-200 hover:bg-scout-800/50'}
               `}
            >
               <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-400' : ''}`} />
               {tab.label}
            </button>
         ))}
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-20 md:pb-6">
        
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Left Col: Pitch & Basic Stats */}
              <div className="space-y-6">
                 <div className="bg-scout-800 rounded-xl border border-scout-700 overflow-hidden shadow-lg h-80 relative group">
                    <div className="absolute inset-0 bg-gradient-to-t from-scout-900/80 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute bottom-3 left-3 z-20">
                        <span className="text-[10px] text-scout-400 uppercase font-bold tracking-wider">Mapa de Calor / Posición</span>
                        <div className="flex items-center gap-2">
                             <span className="text-white font-bold">{player.position}</span>
                             <span className="text-xs text-scout-400">({player.foot})</span>
                        </div>
                    </div>
                    {/* Pitch Visualizer */}
                    <TacticalPitch position={player.position} />
                 </div>

                 {/* Basic Stats Grid */}
                 <div className="bg-scout-800 rounded-xl border border-scout-700 p-4 relative group">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-scout-500 uppercase tracking-wider">Atributos Principales</h3>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEditPlayer(player, 'general'); }}
                            className="text-scout-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="space-y-3">
                       {Object.entries(player.stats).map(([key, value]) => (
                          <div key={key}>
                             <div className="flex justify-between items-end mb-1">
                                <span className="text-xs text-scout-300 capitalize">{STAT_LABELS[key] || key}</span>
                                <span className={`text-xs font-bold ${value >= 80 ? 'text-emerald-400' : value >= 70 ? 'text-yellow-400' : 'text-scout-400'}`}>{value}</span>
                             </div>
                             <div className="w-full bg-scout-900 h-1.5 rounded-full">
                                <div 
                                   className={`h-1.5 rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 70 ? 'bg-yellow-500' : 'bg-scout-500'}`} 
                                   style={{ width: `${value}%` }}
                                ></div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Middle/Right Col: Detailed Views */}
              <div className="lg:col-span-2 space-y-6">
                  {/* Latest Note Teaser */}
                  <div className="bg-gradient-to-r from-scout-800 to-scout-900 p-5 rounded-xl border border-scout-700 shadow-md">
                      <div className="flex justify-between items-start mb-3">
                         <h3 className="font-bold text-white flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-scout-gold" /> Última Observación
                         </h3>
                         <button onClick={() => setActiveTab('notes')} className="text-xs text-scout-400 hover:text-white flex items-center gap-1">
                            Ver todas <ArrowRight className="w-3 h-3" />
                         </button>
                      </div>
                      {notes.length > 0 ? (
                         <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <p className="text-sm text-scout-200 line-clamp-2 italic">"{notes[0].content}"</p>
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-scout-500">
                               <span>{new Date(notes[0].timestamp).toLocaleDateString()}</span>
                               <span>•</span>
                               <span className="uppercase font-bold text-scout-400">{notes[0].category}</span>
                            </div>
                         </div>
                      ) : (
                         <p className="text-sm text-scout-500 italic">No hay notas registradas aún.</p>
                      )}
                  </div>

                  {/* Physical & Contract Teasers (Clickable to switch tabs OR edit) */}
                  <div className="grid grid-cols-2 gap-4">
                     <div onClick={() => setActiveTab('physical')} className="bg-scout-800 p-4 rounded-xl border border-scout-700 hover:border-blue-500/50 cursor-pointer transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                           <ActivityIcon className="w-5 h-5 text-blue-400" />
                           <div className="flex gap-2">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onEditPlayer(player, 'physical'); }} 
                                 className="text-scout-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                               >
                                   <Edit className="w-3.5 h-3.5" />
                               </button>
                               <ArrowRight className="w-4 h-4 text-scout-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all mt-1" />
                           </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{player.physical?.recoveryStatus || 'N/A'}</div>
                        <p className="text-xs text-scout-500">Estado Físico Actual</p>
                     </div>
                     <div onClick={() => setActiveTab('contract')} className="bg-scout-800 p-4 rounded-xl border border-scout-700 hover:border-purple-500/50 cursor-pointer transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                           <Briefcase className="w-5 h-5 text-purple-400" />
                           <div className="flex gap-2">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onEditPlayer(player, 'contract'); }} 
                                 className="text-scout-500 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                               >
                                   <Edit className="w-3.5 h-3.5" />
                               </button>
                               <ArrowRight className="w-4 h-4 text-scout-600 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all mt-1" />
                           </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{player.contract?.contractExpiration ? new Date(player.contract.contractExpiration).getFullYear() : 'N/A'}</div>
                        <p className="text-xs text-scout-500">Fin de Contrato</p>
                     </div>
                  </div>

                  {/* AI Quick Analysis (If available) */}
                  {aiReport && (
                     <div className="bg-purple-900/10 border border-purple-500/20 p-5 rounded-xl">
                        <h3 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                           <BrainCircuit className="w-4 h-4" /> Análisis IA Reciente
                        </h3>
                        <div className="text-sm text-scout-200 line-clamp-4 leading-relaxed">
                           {aiReport.substring(0, 300)}...
                        </div>
                     </div>
                  )}
              </div>
           </div>
        )}

        {activeTab === 'physical' && <PhysicalContent player={player} />}
        
        {activeTab === 'nutrition' && <NutritionContent player={player} />}
        
        {activeTab === 'contract' && <ContractContent player={player} />}

        {activeTab === 'notes' && (
           <div className="h-full flex flex-col animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-white">Historial de Scouting</h3>
                 <button 
                    onClick={() => { setEditingNote(undefined); setIsNoteEditorOpen(true); }}
                    className="bg-scout-accent hover:bg-emerald-400 text-scout-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                 >
                    <Edit className="w-4 h-4" /> Nueva Nota
                 </button>
              </div>

              {/* Notes List Component */}
              <div className="flex-1 min-h-0 relative">
                  {isNoteEditorOpen ? (
                      <div className="absolute inset-0 z-10 bg-[#0b1120]">
                          <NoteEditor 
                             onSave={(content, category, tags, attachments) => {
                                 if (editingNote) {
                                     onEditNote({ ...editingNote, content, category, tags, attachments, timestamp: Date.now(), isEdited: true });
                                 } else {
                                     onAddNote(content, category, tags, attachments);
                                 }
                                 setIsNoteEditorOpen(false);
                                 setEditingNote(undefined);
                             }}
                             onCancel={() => { setIsNoteEditorOpen(false); setEditingNote(undefined); }}
                             initialData={editingNote}
                          />
                      </div>
                  ) : (
                      <NoteList 
                         notes={notes}
                         searchQuery={noteSearch}
                         setSearchQuery={setNoteSearch}
                         selectedCategory={noteCategory}
                         setSelectedCategory={setNoteCategory}
                         currentUser={currentUser}
                         allUsers={allUsers}
                         onEditNote={handleEditNoteRequest}
                         onDeleteNote={onDeleteNote}
                      />
                  )}
              </div>
           </div>
        )}
      </div>

      {/* AI Report Modal Overlay */}
      {showAiModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-scout-800 w-full max-w-2xl max-h-[80vh] rounded-2xl border border-scout-700 shadow-2xl flex flex-col animate-scaleIn">
               <div className="p-4 border-b border-scout-700 flex justify-between items-center bg-scout-900/50">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <BrainCircuit className="w-5 h-5 text-purple-400" />
                     Informe de Scouting IA
                  </h3>
                  <button onClick={() => setShowAiModal(false)} className="text-scout-400 hover:text-white">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0b1120]/30">
                  {isGeneratingReport ? (
                     <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <p className="text-purple-300 animate-pulse font-medium">Analizando datos del jugador...</p>
                     </div>
                  ) : (
                     <div className="prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-scout-200 leading-relaxed font-sans">
                           {aiReport}
                        </div>
                     </div>
                  )}
               </div>

               {!isGeneratingReport && (
                  <div className="p-4 border-t border-scout-700 bg-scout-900/50 flex justify-end gap-3">
                      <button onClick={() => aiReport && exportAIReportToPDF(player, aiReport)} className="px-4 py-2 bg-scout-700 hover:bg-scout-600 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                          <FileDown className="w-4 h-4" /> Guardar PDF
                      </button>
                      <button onClick={() => setShowAiModal(false)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold">
                          Cerrar
                      </button>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};
