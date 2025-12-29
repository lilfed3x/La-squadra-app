
import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService';
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
  allUsers: User[];
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
                  <div className="absolute text-xl font-bold text-white">{player.physical?.fatigueLevel}%</div>
               </div>
               <div className="text-xs text-scout-400 mt-2">Carga Actual</div>
            </div>
            
            <div className="bg-scout-900/50 p-5 rounded-xl border border-scout-700 col-span-1 md:col-span-2">
                 <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-scout-500 uppercase font-bold tracking-wider">Última Lesión</div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${player.physical?.injuryRisk === 'Alto' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                       Riesgo: {player.physical?.injuryRisk}
                    </div>
                 </div>
                 <div className="text-white font-medium mb-1">{player.physical?.lastInjury || 'Sin lesiones recientes'}</div>
                 <div className="text-xs text-scout-400">Estado: <span className="text-blue-400">{player.physical?.recoveryStatus}</span></div>
            </div>
        </div>

        <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700">
             <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider mb-2 border-b border-scout-700 pb-2">Evaluación Física</h3>
             <p className="text-sm text-scout-200 leading-relaxed whitespace-pre-wrap">{player.physical?.fitnessNotes || 'Sin notas del preparador físico.'}</p>
        </div>
  </div>
);

const ContractContent: React.FC<{ player: Player }> = ({ player }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Briefcase className="w-16 h-16 text-purple-400"/></div>
                 <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider mb-4 border-b border-scout-700 pb-2">Detalles del Club</h3>
                 
                 <div className="space-y-4">
                    <div>
                        <div className="text-xs text-scout-500 mb-1">Club Propietario</div>
                        <div className="text-lg font-bold text-white">{player.contract?.clubName || player.team}</div>
                    </div>
                    <div>
                        <div className="text-xs text-scout-500 mb-1">Vencimiento Contrato</div>
                        <div className="text-lg font-bold text-white">{player.contract?.contractExpiration || 'N/A'}</div>
                    </div>
                    {player.contract?.isLoan && (
                         <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                            <div className="text-xs text-purple-300 mb-1 font-bold uppercase">Jugador Cedido</div>
                            <div className="text-sm text-white">Desde: {player.contract.loanOriginClub}</div>
                         </div>
                    )}
                 </div>
             </div>

             <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><UserIcon className="w-16 h-16 text-blue-400"/></div>
                 <h3 className="text-sm font-bold text-scout-300 uppercase tracking-wider mb-4 border-b border-scout-700 pb-2">Representación</h3>
                 
                 <div className="space-y-4">
                    <div>
                        <div className="text-xs text-scout-500 mb-1">Agencia</div>
                        <div className="text-lg font-bold text-white">{player.contract?.agencyName || 'Sin Agente'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-scout-500 mb-1">Contacto Principal</div>
                        <div className="text-sm text-white">{player.contract?.agencyContact || 'N/A'}</div>
                    </div>
                     <div>
                        <div className="text-xs text-scout-500 mb-1">Vencimiento Contrato</div>
                        <div className="text-sm text-white">{player.contract?.agencyContractExpiration || 'N/A'}</div>
                    </div>
                 </div>
             </div>
        </div>
        
        <div className="bg-gradient-to-r from-scout-800 to-scout-900 p-6 rounded-xl border border-scout-700 flex items-center justify-between">
            <div>
                <div className="text-xs text-scout-500 uppercase font-bold tracking-wider mb-1">Valor de Mercado Actual</div>
                <div className="text-3xl font-black text-white">{player.contract?.marketValue || player.marketValue}</div>
            </div>
            <div className="h-12 w-px bg-scout-700 mx-6"></div>
            <div className="flex-1">
                 <div className="text-xs text-scout-400 mb-1">Estatus Transferible</div>
                 <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500"></span>
                     <span className="text-sm font-medium text-white">Disponible para negociar</span>
                 </div>
            </div>
        </div>
    </div>
);

// Helper User Icon to avoid type conflict
const UserIcon = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

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
  onDeleteNote
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'ai-report'>('overview');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  
  // Search state for notes
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<NoteCategory | 'All'>('All');

  // Specific Modal State for detailed views
  const [infoModal, setInfoModal] = useState<InfoModalType>(null);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
        const report = await generateScoutingReport(player, notes);
        setAiReport(report);
    } catch (e) {
        console.error(e);
        setAiReport("Error al generar el informe.");
    } finally {
        setIsGeneratingReport(false);
    }
  };

  const handleDelete = () => {
      if (window.confirm(`¿Estás seguro de eliminar a ${player.name}? Esta acción no se puede deshacer.`)) {
          onDeletePlayer(player.id);
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1120] relative">
       {/* Detailed Info Modals (Overlays) */}
       {infoModal && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-scout-800 w-full max-w-4xl max-h-[90%] rounded-2xl border border-scout-700 shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
                  <div className="p-4 border-b border-scout-700 flex justify-between items-center bg-scout-900/50">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {infoModal === 'nutrition' && <><Apple className="w-5 h-5 text-green-400"/> Informe Nutricional</>}
                          {infoModal === 'physical' && <><ActivityIcon className="w-5 h-5 text-blue-400"/> Perfil Físico</>}
                          {infoModal === 'contract' && <><Briefcase className="w-5 h-5 text-purple-400"/> Detalles Contractuales</>}
                      </h3>
                      <button onClick={() => setInfoModal(null)} className="text-scout-400 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0b1120]/50">
                      {infoModal === 'nutrition' && <NutritionContent player={player} />}
                      {infoModal === 'physical' && <PhysicalContent player={player} />}
                      {infoModal === 'contract' && <ContractContent player={player} />}
                  </div>
                  <div className="p-4 border-t border-scout-700 bg-scout-900/50 flex justify-end">
                      <button 
                        onClick={() => {
                            onEditPlayer(player);
                        }} 
                        className="flex items-center gap-2 px-4 py-2 bg-scout-700 hover:bg-scout-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                          <Edit className="w-4 h-4" /> Editar Datos
                      </button>
                  </div>
              </div>
          </div>
       )}

      {/* Header Banner */}
      <div className="relative h-48 bg-gradient-to-r from-scout-900 to-slate-900 border-b border-scout-700 shrink-0">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="absolute inset-0 flex items-center px-8 gap-6">
              <div className="relative group">
                  <div className="w-32 h-32 rounded-full border-4 border-scout-800 shadow-2xl overflow-hidden bg-scout-700 relative z-10">
                      <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 z-20 bg-scout-900 rounded-full p-1 border border-scout-700">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-scout-900 font-bold text-xs shadow-lg">
                          {player.scoutRating}
                      </div>
                  </div>
              </div>

              <div className="flex-1 z-10 pt-4">
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <h1 className="text-3xl font-black text-white tracking-tight">{player.name}</h1>
                              {player.physical?.injuryRisk === 'Alto' && <AlertCircle className="w-5 h-5 text-red-500" />}
                          </div>
                          <div className="flex items-center gap-4 text-scout-300 text-sm font-medium mb-3">
                              <span className="flex items-center gap-1.5"><Shirt className="w-4 h-4 text-scout-500"/> {player.team}</span>
                              <span className="w-1 h-1 rounded-full bg-scout-600"></span>
                              <span>{player.position}</span>
                              <span className="w-1 h-1 rounded-full bg-scout-600"></span>
                              <span>{player.age} Años</span>
                              <span className="w-1 h-1 rounded-full bg-scout-600"></span>
                              <span>{player.country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-1 bg-scout-800 border border-scout-600 rounded text-xs text-scout-300 font-mono">
                                {player.height} / {player.weight}
                             </span>
                             <span className="px-2 py-1 bg-scout-800 border border-scout-600 rounded text-xs text-scout-300 font-mono">
                                {player.foot}
                             </span>
                          </div>
                      </div>

                      <div className="flex gap-2">
                          <button 
                            onClick={() => exportPlayerProfileToPDF(player, notes)}
                            className="p-2 bg-scout-800/50 hover:bg-scout-700 text-scout-300 hover:text-white rounded-lg border border-scout-600 transition-colors"
                            title="Exportar PDF"
                          >
                             <FileDown className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => onEditPlayer(player)}
                            className="p-2 bg-scout-800/50 hover:bg-scout-700 text-blue-400 hover:text-blue-300 rounded-lg border border-scout-600 transition-colors"
                            title="Editar Jugador"
                          >
                             <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={handleDelete}
                            className="p-2 bg-scout-800/50 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-scout-600 transition-colors"
                            title="Eliminar Jugador"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Navigation Tabs */}
          <div className="absolute bottom-0 left-0 right-0 px-8 flex gap-6 z-10">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-scout-accent text-white' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
              >
                  <ActivityIcon className="w-4 h-4" /> Visión General
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes' ? 'border-scout-accent text-white' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
              >
                  <ClipboardList className="w-4 h-4" /> Notas de Scouting <span className="px-1.5 py-0.5 bg-scout-800 rounded-full text-[10px] text-scout-400">{notes.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('ai-report')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai-report' ? 'border-scout-accent text-white' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
              >
                  <BrainCircuit className="w-4 h-4" /> Informe IA
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                  
                  {/* Left Column: Stats & Pitch */}
                  <div className="lg:col-span-2 space-y-6">
                      {/* Technical/Radar Chart Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-scout-800 rounded-xl border border-scout-700 p-4 shadow-lg flex flex-col">
                              <h3 className="text-xs uppercase font-bold text-scout-400 tracking-wider mb-4">Radar de Atributos</h3>
                              <div className="flex-1 min-h-[250px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                          { subject: 'Ritmo', A: player.stats.pace, fullMark: 100 },
                                          { subject: 'Tiro', A: player.stats.shooting, fullMark: 100 },
                                          { subject: 'Pase', A: player.stats.passing, fullMark: 100 },
                                          { subject: 'Regate', A: player.stats.dribbling, fullMark: 100 },
                                          { subject: 'Defensa', A: player.stats.defending, fullMark: 100 },
                                          { subject: 'Físico', A: player.stats.physical, fullMark: 100 },
                                      ]}>
                                          <PolarGrid stroke="#334155" />
                                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                          <RechartsRadar name={player.name} dataKey="A" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.3} />
                                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} itemStyle={{ color: '#10b981' }} />
                                      </RadarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>

                          <div className="bg-scout-800 rounded-xl border border-scout-700 p-4 shadow-lg flex flex-col">
                              <h3 className="text-xs uppercase font-bold text-scout-400 tracking-wider mb-4">Mapa de Calor Táctico</h3>
                              <div className="flex-1 relative rounded-lg overflow-hidden bg-emerald-900/20 border border-white/5 p-2">
                                  <TacticalPitch position={player.position} />
                              </div>
                          </div>
                      </div>

                      {/* Extended Info Cards Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <button onClick={() => setInfoModal('contract')} className="bg-scout-800 p-4 rounded-xl border border-scout-700 hover:border-purple-500/50 hover:bg-scout-700/50 transition-all group text-left">
                              <div className="flex justify-between items-start mb-2">
                                  <Briefcase className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                                  <ChevronRight className="w-4 h-4 text-scout-600" />
                              </div>
                              <div className="text-sm font-bold text-white mb-0.5">Contrato</div>
                              <div className="text-xs text-scout-400">{player.contract?.contractExpiration || 'No disp.'}</div>
                          </button>

                          <button onClick={() => setInfoModal('physical')} className="bg-scout-800 p-4 rounded-xl border border-scout-700 hover:border-blue-500/50 hover:bg-scout-700/50 transition-all group text-left">
                              <div className="flex justify-between items-start mb-2">
                                  <ActivityIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                  <ChevronRight className="w-4 h-4 text-scout-600" />
                              </div>
                              <div className="text-sm font-bold text-white mb-0.5">Físico</div>
                              <div className="text-xs text-scout-400">{player.physical?.injuryRisk === 'Bajo' ? 'Apto' : 'Riesgo'}</div>
                          </button>

                          <button onClick={() => setInfoModal('nutrition')} className="bg-scout-800 p-4 rounded-xl border border-scout-700 hover:border-green-500/50 hover:bg-scout-700/50 transition-all group text-left">
                              <div className="flex justify-between items-start mb-2">
                                  <Apple className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                                  <ChevronRight className="w-4 h-4 text-scout-600" />
                              </div>
                              <div className="text-sm font-bold text-white mb-0.5">Nutrición</div>
                              <div className="text-xs text-scout-400">{player.nutrition?.weightStatus || 'No disp.'}</div>
                          </button>
                      </div>
                  </div>

                  {/* Right Column: Recent Notes Preview */}
                  <div className="space-y-6">
                      <div className="bg-scout-800 rounded-xl border border-scout-700 p-5 shadow-lg flex flex-col h-full max-h-[500px]">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xs uppercase font-bold text-scout-400 tracking-wider">Últimas Observaciones</h3>
                              <button onClick={() => setActiveTab('notes')} className="text-xs text-scout-accent hover:underline">Ver todas</button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                              {notes.slice(0, 3).map(note => (
                                  <div key={note.id} className="bg-scout-900/50 p-3 rounded-lg border border-scout-700/50">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-scout-800 text-scout-300 border border-scout-700">{note.category}</span>
                                          <span className="text-[10px] text-scout-500 ml-auto">{new Date(note.timestamp).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs text-scout-200 line-clamp-3">{note.content}</p>
                                  </div>
                              ))}
                              {notes.length === 0 && (
                                  <div className="text-center py-8 text-scout-500 text-xs">
                                      No hay notas recientes.
                                  </div>
                              )}
                          </div>
                          
                          <button 
                            onClick={() => { setActiveTab('notes'); setIsNoteEditorOpen(true); }}
                            className="w-full mt-4 py-2 border border-dashed border-scout-600 rounded-lg text-xs font-medium text-scout-400 hover:text-white hover:border-scout-500 hover:bg-scout-700/30 transition-all flex items-center justify-center gap-2"
                          >
                              <Edit className="w-3 h-3" /> Añadir Nota Rápida
                          </button>
                      </div>
                  </div>

              </div>
          )}

          {/* TAB: NOTES */}
          {activeTab === 'notes' && (
              <div className="h-full flex flex-col max-w-5xl mx-auto">
                  {/* Note Editor Collapsible */}
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isNoteEditorOpen ? 'max-h-[500px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                      <NoteEditor 
                        onSave={(content, category, tags, attachments) => {
                            onAddNote(content, category, tags, attachments);
                            setIsNoteEditorOpen(false);
                        }} 
                        onCancel={() => setIsNoteEditorOpen(false)}
                      />
                  </div>
                  
                  {/* Actions Bar (When editor is closed) */}
                  {!isNoteEditorOpen && (
                      <div className="flex justify-end mb-6 animate-fadeIn">
                          <button 
                            onClick={() => setIsNoteEditorOpen(true)}
                            className="px-4 py-2 bg-scout-accent hover:bg-emerald-400 text-scout-900 font-bold rounded-lg shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all"
                          >
                              <Edit className="w-4 h-4" /> Nueva Nota
                          </button>
                      </div>
                  )}

                  <div className="flex-1 min-h-0 bg-scout-800/30 rounded-xl border border-scout-700/50 overflow-hidden flex flex-col">
                      <NoteList 
                          notes={notes} 
                          searchQuery={noteSearchQuery}
                          setSearchQuery={setNoteSearchQuery}
                          selectedCategory={noteCategoryFilter}
                          setSelectedCategory={setNoteCategoryFilter}
                          currentUser={currentUser}
                          allUsers={allUsers}
                          onEditNote={onEditNote}
                          onDeleteNote={onDeleteNote}
                      />
                  </div>
              </div>
          )}

          {/* TAB: AI REPORT */}
          {activeTab === 'ai-report' && (
              <div className="max-w-4xl mx-auto h-full flex flex-col">
                  {/* Controls */}
                  <div className="flex justify-between items-center mb-6 p-4 bg-scout-800 rounded-xl border border-scout-700">
                      <div>
                          <h3 className="font-bold text-white text-lg flex items-center gap-2">
                              <BrainCircuit className="w-6 h-6 text-purple-400" /> 
                              Análisis Inteligente Gemini
                          </h3>
                          <p className="text-xs text-scout-400 mt-1">Genera un informe completo basado en todas las notas y estadísticas.</p>
                      </div>
                      <button 
                        onClick={handleGenerateReport} 
                        disabled={isGeneratingReport}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                          {isGeneratingReport ? (
                              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generando...</>
                          ) : (
                              <><BrainCircuit className="w-4 h-4" /> Generar Informe</>
                          )}
                      </button>
                  </div>

                  {/* Report Content */}
                  <div className="flex-1 bg-scout-800 rounded-xl border border-scout-700 p-8 overflow-y-auto custom-scrollbar shadow-2xl relative">
                      {aiReport ? (
                          <div className="animate-fadeIn">
                              <div className="absolute top-4 right-4 flex gap-2">
                                 <button 
                                    onClick={() => exportAIReportToPDF(player, aiReport)}
                                    className="p-2 bg-scout-900 hover:bg-scout-700 text-scout-400 hover:text-white rounded-lg border border-scout-600 transition-colors"
                                    title="Descargar PDF"
                                 >
                                    <Download className="w-4 h-4" />
                                 </button>
                              </div>
                              <div className="prose prose-invert prose-sm max-w-none">
                                  {/* Simple markdown rendering */}
                                  {aiReport.split('\n').map((line, i) => {
                                      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-purple-400 mt-6 mb-3 border-b border-purple-500/20 pb-1">{line.replace('## ', '')}</h2>;
                                      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-white mt-4 mb-4">{line.replace('# ', '')}</h1>;
                                      if (line.startsWith('**')) return <p key={i} className="font-bold text-scout-200 mb-2">{line.replace(/\*\*/g, '')}</p>;
                                      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-scout-300 mb-1">{line.replace('- ', '')}</li>;
                                      return <p key={i} className="text-scout-300 mb-3 leading-relaxed">{line}</p>;
                                  })}
                              </div>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-scout-500 opacity-50">
                              <BrainCircuit className="w-24 h-24 mb-4 stroke-1" />
                              <p>Haz clic en "Generar Informe" para comenzar el análisis.</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
