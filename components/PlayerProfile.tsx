
import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User, MedicalReport } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService';
import { BrainCircuit, Edit, Trash2, Activity as ActivityIcon, Apple, ArrowLeft, ArrowRight, Briefcase, Shirt, PieChart as PieChartIcon, TrendingUp, AlertCircle, CheckCircle2, ClipboardList, FileDown, Download, Youtube, MoreVertical, Scale, Zap, HeartPulse, DollarSign, Calendar, FileText, X, ChevronDown, ChevronRight, Plus, Paperclip, Image as ImageIcon, Save, MapPin, Footprints, Flag } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { TacticalPitch } from './TacticalPitch';
import { PlayerFormModal, ModalTab } from './PlayerFormModal';
import { ConfirmModal } from './ConfirmModal';
import { nanoid } from 'nanoid';

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

// --- Helper for Attachments Rendering ---
const AttachmentPreview: React.FC<{ attachment: Attachment, onRemove?: () => void }> = ({ attachment, onRemove }) => {
    const isYoutube = attachment.type === 'youtube';
    
    return (
        <div className="relative group w-20 h-20 rounded-md overflow-hidden bg-scout-900 border border-scout-700 shrink-0">
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
            
            <div className="absolute inset-0 cursor-pointer" onClick={() => {
                if (isYoutube) window.open(attachment.url, '_blank');
                else {
                    const w = window.open('about:blank');
                    w?.document.write(`<img src="${attachment.url}" style="max-width:100%"/>`);
                }
            }}></div>
        </div>
    );
};

// --- Extracted Components with FULL VISUALIZATION ---

const NutritionContent: React.FC<{ player: Player; onEdit?: () => void }> = ({ player, onEdit }) => {
  const macros = player.nutrition?.macros || { protein: 0, carbs: 0, fats: 0 };
  const macroData = [
     { name: 'Proteínas', value: macros.protein, color: '#3b82f6' },
     { name: 'Carbohidratos', value: macros.carbs, color: '#10b981' },
     { name: 'Grasas', value: macros.fats, color: '#f59e0b' },
  ];
  const historyData = player.nutrition?.bodyCompositionHistory || [];
  
  return (
    <div className="space-y-4 animate-fadeIn pb-6">
         {/* Edit Header for Tab */}
         <div className="flex justify-between items-center bg-scout-800 p-3 rounded-xl border border-scout-700">
             <h3 className="font-bold text-white flex items-center gap-2">
                 <Apple className="w-5 h-5 text-green-400" /> Resumen Nutricional
             </h3>
             {onEdit && (
                 <button onClick={onEdit} className="flex items-center gap-2 text-xs font-medium text-scout-400 hover:text-white bg-scout-700 hover:bg-scout-600 px-3 py-1.5 rounded-lg transition-colors">
                     <Edit className="w-3.5 h-3.5" /> Editar Datos
                 </button>
             )}
         </div>

         {/* Top Stats Cards */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-scout-800 p-3 rounded-xl border border-scout-700 relative overflow-hidden">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Estado de Peso</div>
               <div className="flex items-center gap-2">
                  <div className={`text-lg md:text-xl font-bold ${player.nutrition?.weightStatus === 'Óptimo' ? 'text-emerald-400' : player.nutrition?.weightStatus === 'Sobrepeso' ? 'text-red-400' : 'text-yellow-400'}`}>
                     {player.nutrition?.weightStatus || 'N/A'}
                  </div>
                  {player.nutrition?.weightStatus === 'Óptimo' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
               </div>
            </div>
            <div className="bg-scout-800 p-3 rounded-xl border border-scout-700">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Hidratación</div>
               <div className="text-lg md:text-xl font-bold text-blue-400">{player.nutrition?.hydrationLevel || 0}%</div>
               <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${player.nutrition?.hydrationLevel || 0}%` }}></div>
               </div>
            </div>
            <div className="bg-scout-800 p-3 rounded-xl border border-scout-700">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Calorías Diarias</div>
               <div className="text-lg md:text-xl font-bold text-orange-400">{player.nutrition?.dailyCalories || 0} kcal</div>
            </div>
            <div className="bg-scout-800 p-3 rounded-xl border border-scout-700">
               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Último Chequeo</div>
               <div className="text-lg md:text-xl font-bold text-scout-200">{player.nutrition?.lastCheckup || '-'}</div>
            </div>
         </div>

         {/* Charts Row */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 shadow-lg flex flex-col">
               <h3 className="text-sm font-bold text-scout-100 flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-4 h-4 text-scout-gold" /> Distribución Macros
               </h3>
               {/* Fixed Height Container for Recharts - Critical for width/height -1 error */}
               <div className="w-full h-56 min-h-[220px]">
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

            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 shadow-lg flex flex-col">
               <h3 className="text-sm font-bold text-scout-100 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-scout-gold" /> Evolución de Peso
               </h3>
               {historyData.length > 0 ? (
                  /* Fixed Height Container for Recharts */
                  <div className="w-full h-56 min-h-[220px]">
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
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
               <h3 className="text-xs uppercase font-bold text-scout-400 mb-3 tracking-wider">Suplementación</h3>
               <div className="flex flex-wrap gap-2">
                  {player.nutrition?.supplements && player.nutrition.supplements.length > 0 ? (
                     player.nutrition.supplements.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20">{s}</span>
                     ))
                  ) : <span className="text-scout-500 text-sm">No registrado</span>}
               </div>
            </div>
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
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

// --- Medical Report System ---

const MedicalHistorySection: React.FC<{ player: Player; onUpdate: (player: Player) => void }> = ({ player, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newReport, setNewReport] = useState<Partial<MedicalReport>>({
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        severity: 'Baja',
        status: 'Activo',
        attachments: []
    });
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({}); // Format: "YYYY-Month"
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Grouping Logic: Year -> Month -> Reports
    const groupedReports = (player.physical?.medicalHistory || []).reduce((acc, report) => {
        const date = new Date(report.date);
        const year = date.getFullYear();
        const month = date.toLocaleString('es-ES', { month: 'long' });
        
        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = [];
        
        acc[year][month].push(report);
        return acc;
    }, {} as Record<number, Record<string, MedicalReport[]>>);

    // Sort Years Descending
    const sortedYears = Object.keys(groupedReports).map(Number).sort((a, b) => b - a);

    // Initial Expansion: Expand the most recent year
    useEffect(() => {
        if (sortedYears.length > 0 && Object.keys(expandedYears).length === 0) {
            setExpandedYears({ [sortedYears[0]]: true });
            
            // Auto expand months of the first year too for better UX
            const firstYear = sortedYears[0];
            const months = Object.keys(groupedReports[firstYear] || {});
            const monthState: Record<string, boolean> = {};
            months.forEach(m => monthState[`${firstYear}-${m}`] = true);
            setExpandedMonths(prev => ({...prev, ...monthState}));
        }
    }, [sortedYears.length]);

    const toggleYear = (year: number) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const toggleMonth = (key: string) => {
        setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Simple validation
            if (file.size > 5 * 1024 * 1024) { alert("Archivo muy grande (Máx 5MB)"); return; }
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    const newAtt: Attachment = {
                        id: nanoid(),
                        type: file.type.startsWith('video') ? 'video' : 'image',
                        url: ev.target.result as string,
                        name: file.name
                    };
                    setNewReport(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveReport = () => {
        if (!newReport.title || !newReport.description) return;
        
        const report: MedicalReport = {
            id: nanoid(),
            date: newReport.date!,
            title: newReport.title!,
            description: newReport.description!,
            severity: newReport.severity as any,
            status: newReport.status as any,
            attachments: newReport.attachments || [],
            doctorName: 'Dr. Equipo' // Mock
        };

        const currentPhysical = player.physical || {
            fatigueLevel: 0,
            injuryRisk: 'Bajo',
            recoveryStatus: 'Apto',
            fitnessNotes: '',
            medicalHistory: []
        };

        const updatedHistory = [report, ...(currentPhysical.medicalHistory || [])];
        const updatedPlayer = {
            ...player,
            physical: {
                ...currentPhysical,
                medicalHistory: updatedHistory
            }
        };
        
        onUpdate(updatedPlayer);
        setIsEditing(false);
        setNewReport({ date: new Date().toISOString().split('T')[0], title: '', description: '', severity: 'Baja', status: 'Activo', attachments: [] });
    };

    const handleDeleteReport = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Stop propagation to prevent toggling accordion
        setReportToDelete(id);
    };

    const executeDeleteReport = () => {
        if (!reportToDelete) return;
        
        const currentPhysical = player.physical || {
            fatigueLevel: 0,
            injuryRisk: 'Bajo',
            recoveryStatus: 'Apto',
            fitnessNotes: '',
            medicalHistory: []
        };

        const updatedHistory = (currentPhysical.medicalHistory || []).filter(r => r.id !== reportToDelete);
        const updatedPlayer = { 
            ...player, 
            physical: { 
                ...currentPhysical, 
                medicalHistory: updatedHistory 
            } 
        };
        onUpdate(updatedPlayer);
        setReportToDelete(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-scout-200 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-scout-gold" /> Historial Clínico
                </h4>
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-scout-700 hover:bg-scout-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                >
                    {isEditing ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isEditing ? 'Cancelar' : 'Nuevo Informe'}
                </button>
            </div>

            {/* EDITOR */}
            {isEditing && (
                <div className="bg-scout-900 border border-scout-700 rounded-xl p-4 animate-scaleIn mb-6 shadow-xl">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="text-[10px] text-scout-400 uppercase font-bold">Fecha</label>
                            <input type="date" value={newReport.date} onChange={e => setNewReport({...newReport, date: e.target.value})} className="w-full bg-scout-800 border border-scout-600 rounded p-2 text-sm text-white focus:border-scout-gold outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] text-scout-400 uppercase font-bold">Estado</label>
                            <select value={newReport.status} onChange={e => setNewReport({...newReport, status: e.target.value as any})} className="w-full bg-scout-800 border border-scout-600 rounded p-2 text-sm text-white focus:border-scout-gold outline-none">
                                <option>Activo</option>
                                <option>En Tratamiento</option>
                                <option>Recuperado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mb-3">
                        <label className="text-[10px] text-scout-400 uppercase font-bold">Título / Lesión</label>
                        <input type="text" placeholder="Ej. Esguince de Tobillo Grado II" value={newReport.title} onChange={e => setNewReport({...newReport, title: e.target.value})} className="w-full bg-scout-800 border border-scout-600 rounded p-2 text-sm text-white focus:border-scout-gold outline-none" />
                    </div>

                    <div className="mb-3">
                        <label className="text-[10px] text-scout-400 uppercase font-bold">Descripción / Tratamiento</label>
                        <textarea placeholder="Detalles médicos..." value={newReport.description} onChange={e => setNewReport({...newReport, description: e.target.value})} className="w-full h-24 bg-scout-800 border border-scout-600 rounded p-2 text-sm text-white resize-none focus:border-scout-gold outline-none" />
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <label className="text-[10px] text-scout-400 uppercase font-bold block mb-1">Severidad</label>
                                <select value={newReport.severity} onChange={e => setNewReport({...newReport, severity: e.target.value as any})} className="bg-scout-800 border border-scout-600 rounded p-1.5 text-xs text-white">
                                    <option>Baja</option>
                                    <option>Media</option>
                                    <option>Alta</option>
                                    <option>Crítica</option>
                                </select>
                            </div>
                            <div className="pt-4">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-xs text-scout-400 hover:text-white bg-scout-800 px-2 py-1.5 rounded border border-scout-600 hover:border-scout-400 transition-colors">
                                    <Paperclip className="w-3.5 h-3.5" /> Adjuntar
                                </button>
                            </div>
                        </div>
                        <button onClick={handleSaveReport} className="bg-scout-gold hover:bg-yellow-500 text-scout-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg">
                            <Save className="w-4 h-4" /> Guardar Informe
                        </button>
                    </div>

                    {/* Attachments Preview */}
                    {newReport.attachments && newReport.attachments.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {newReport.attachments.map((att, idx) => (
                                <AttachmentPreview 
                                    key={idx} 
                                    attachment={att} 
                                    onRemove={() => setNewReport(prev => ({...prev, attachments: prev.attachments?.filter((_, i) => i !== idx)}))} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* CASCADE VIEW WITH SCROLL */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {sortedYears.length === 0 ? (
                    <div className="text-center py-8 text-scout-500 border border-dashed border-scout-700 rounded-lg">
                        <ActivityIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin historial médico registrado.</p>
                    </div>
                ) : (
                    sortedYears.map(year => (
                        <div key={year} className="border border-scout-700 rounded-xl overflow-hidden bg-scout-800/30">
                            {/* Year Header (Clickable) */}
                            <div 
                                onClick={() => toggleYear(year)}
                                className="bg-scout-800 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-scout-700/50 transition-colors border-b border-scout-700 select-none"
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-scout-gold" />
                                    <span className="font-bold text-white text-sm">{year}</span>
                                </div>
                                {expandedYears[year] ? <ChevronDown className="w-4 h-4 text-scout-400" /> : <ChevronRight className="w-4 h-4 text-scout-400" />}
                            </div>
                            
                            {/* Year Content */}
                            {expandedYears[year] && (
                                <div className="p-2 space-y-2 animate-fadeIn">
                                    {Object.entries(groupedReports[year] || {}).map(([month, reports]) => {
                                        const monthKey = `${year}-${month}`;
                                        return (
                                            <div key={month} className="border border-scout-700/50 rounded-lg overflow-hidden bg-scout-900/20">
                                                {/* Month Header (Clickable) */}
                                                <div 
                                                    onClick={() => toggleMonth(monthKey)}
                                                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-scout-800 transition-colors border-b border-scout-700/30"
                                                >
                                                    <h5 className="text-xs font-bold text-scout-400 uppercase">{month}</h5>
                                                    {expandedMonths[monthKey] ? <ChevronDown className="w-3 h-3 text-scout-500" /> : <ChevronRight className="w-3 h-3 text-scout-500" />}
                                                </div>

                                                {/* Month Content */}
                                                {expandedMonths[monthKey] && (
                                                    <div className="p-2 space-y-2 animate-fadeIn">
                                                        {(reports as MedicalReport[]).map(report => (
                                                            <div key={report.id} className="bg-scout-800 border border-scout-700 rounded-lg p-3 hover:border-scout-500 transition-colors group relative">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`w-2 h-2 rounded-full ${report.status === 'Activo' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                                                            <h6 className="text-sm font-bold text-white">{report.title}</h6>
                                                                        </div>
                                                                        <p className="text-xs text-scout-300 leading-relaxed mb-2">{report.description}</p>
                                                                        <div className="flex items-center gap-3 text-[10px] text-scout-500">
                                                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(report.date).toLocaleDateString()}</span>
                                                                            <span className={`px-1.5 py-0.5 rounded border ${report.severity === 'Alta' || report.severity === 'Crítica' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-scout-600 text-scout-400'}`}>{report.severity}</span>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => handleDeleteReport(report.id, e)} 
                                                                        className="text-scout-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Attachments */}
                                                                {report.attachments && report.attachments.length > 0 && (
                                                                    <div className="flex gap-2 mt-3 pt-3 border-t border-scout-700/50 overflow-x-auto">
                                                                        {report.attachments.map(att => (
                                                                            <AttachmentPreview key={att.id} attachment={att} />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal 
                isOpen={!!reportToDelete}
                onClose={() => setReportToDelete(null)}
                onConfirm={executeDeleteReport}
                title="Eliminar Informe Médico"
                message="¿Estás seguro de eliminar este registro del historial clínico? Esta acción no se puede deshacer."
                isDestructive={true}
            />
        </div>
    );
};

const PhysicalContent: React.FC<{ player: Player; onEdit?: () => void; onPlayerUpdate: (p: Player) => void }> = ({ player, onEdit, onPlayerUpdate }) => {
   return (
      <div className="space-y-4 animate-fadeIn pb-6">
         {/* Edit Header for Tab */}
         <div className="flex justify-between items-center bg-scout-800 p-3 rounded-xl border border-scout-700">
             <h3 className="font-bold text-white flex items-center gap-2">
                 <ActivityIcon className="w-5 h-5 text-blue-400" /> Informe Físico y Rendimiento
             </h3>
             {onEdit && (
                 <button onClick={onEdit} className="flex items-center gap-2 text-xs font-medium text-scout-400 hover:text-white bg-scout-700 hover:bg-scout-600 px-3 py-1.5 rounded-lg transition-colors">
                     <Edit className="w-3.5 h-3.5" /> Editar Métricas
                 </button>
             )}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* REMOVED: Performance Metrics Sliders (Moved to General Tab as requested) */}

            {/* Metrics & Medical History */}
            <div className="lg:col-span-2 space-y-4">
                
                {/* Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <ActivityIcon className="w-16 h-16" />
                        </div>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">Riesgo de Lesión</span>
                            <div className={`w-3 h-3 rounded-full ${player.physical?.injuryRisk === 'Alto' ? 'bg-red-500 animate-pulse' : player.physical?.injuryRisk === 'Medio' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                        </div>
                        <div className={`text-3xl font-black relative z-10 ${player.physical?.injuryRisk === 'Alto' ? 'text-red-400' : player.physical?.injuryRisk === 'Medio' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {player.physical?.injuryRisk || 'N/A'}
                        </div>
                        <p className="text-[10px] text-scout-500 mt-1 relative z-10">Basado en historial reciente</p>
                    </div>

                    <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-scout-400 uppercase tracking-wider">Fatiga Acumulada</span>
                            <Zap className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-black text-white">{player.physical?.fatigueLevel || 0}%</div>
                        </div>
                        <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                                className={`h-1.5 rounded-full ${player.physical?.fatigueLevel && player.physical.fatigueLevel > 80 ? 'bg-red-500' : 'bg-orange-500'}`} 
                                style={{ width: `${player.physical?.fatigueLevel || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Medical History Cascade System */}
                <div className="bg-scout-800/50 p-4 rounded-xl border border-scout-700">
                    <MedicalHistorySection player={player} onUpdate={onPlayerUpdate} />
                </div>

                {/* General Fitness Notes */}
                <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                    <h3 className="text-xs uppercase font-bold text-scout-400 mb-3 tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4"/> Notas del Preparador Físico
                    </h3>
                    <div className="bg-scout-900/50 p-3 rounded-lg text-sm text-scout-200 italic border border-scout-700/50 leading-relaxed">
                        "{player.physical?.fitnessNotes || 'Sin notas registradas actualmente.'}"
                    </div>
                </div>
            </div>
         </div>
      </div>
   );
};

const ContractContent: React.FC<{ player: Player; onEdit?: () => void }> = ({ player, onEdit }) => {
   return (
      <div className="space-y-4 animate-fadeIn pb-6">
         {/* Edit Header for Tab */}
         <div className="flex justify-between items-center bg-scout-800 p-3 rounded-xl border border-scout-700">
             <h3 className="font-bold text-white flex items-center gap-2">
                 <Briefcase className="w-5 h-5 text-purple-400" /> Información Contractual
             </h3>
             {onEdit && (
                 <button onClick={onEdit} className="flex items-center gap-2 text-xs font-medium text-scout-400 hover:text-white bg-scout-700 hover:bg-scout-600 px-3 py-1.5 rounded-lg transition-colors">
                     <Edit className="w-3.5 h-3.5" /> Editar Datos
                 </button>
             )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Value Card */}
            <div className="bg-gradient-to-br from-scout-800 to-scout-900 p-4 rounded-xl border border-scout-700 shadow-lg relative overflow-hidden group">
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
            <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 shadow-lg flex flex-col justify-center">
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
            <div className="p-3 border-b border-scout-700 bg-scout-900/30">
               <h3 className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-scout-gold" /> Detalles Contractuales
               </h3>
            </div>
            <div className="divide-y divide-scout-700">
               <div className="grid grid-cols-2 p-3 hover:bg-scout-700/20 transition-colors">
                  <div className="text-sm text-scout-400">Vencimiento Contrato</div>
                  <div className="text-sm font-medium text-white text-right">{player.contract?.contractExpiration || '-'}</div>
               </div>
               <div className="grid grid-cols-2 p-3 hover:bg-scout-700/20 transition-colors">
                  <div className="text-sm text-scout-400">Agencia Representación</div>
                  <div className="text-sm font-medium text-white text-right">{player.contract?.agencyName || '-'}</div>
               </div>
               <div className="grid grid-cols-2 p-3 hover:bg-scout-700/20 transition-colors">
                  <div className="text-sm text-scout-400">Contacto Agente</div>
                  <div className="text-sm font-medium text-white text-right">{player.contract?.agencyContact || '-'}</div>
               </div>
               {player.contract?.isLoan && (
                   <div className="grid grid-cols-2 p-3 hover:bg-scout-700/20 transition-colors bg-purple-500/5">
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
  const [activeTab, setActiveTab] = useState<'overview' | 'contract' | 'physical' | 'nutrition' | 'notes'>('overview');
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  
  // Note filtering
  const [noteSearch, setNoteSearch] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory | 'All'>('All');
  
  // AI Report State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Tabs configuration - REORDERED: General -> Contract -> Physical -> Nutrition -> Notes
  const tabs = [
    { id: 'overview', label: 'General', icon: ActivityIcon },
    { id: 'contract', label: 'Contrato', icon: Briefcase },
    { id: 'physical', label: 'Físico', icon: HeartPulse },
    { id: 'nutrition', label: 'Nutrición', icon: Apple },
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

  // Radar Data
  const radarData = [
      { subject: 'Ritmo', A: player.stats.pace, fullMark: 100 },
      { subject: 'Tiro', A: player.stats.shooting, fullMark: 100 },
      { subject: 'Pase', A: player.stats.passing, fullMark: 100 },
      { subject: 'Regate', A: player.stats.dribbling, fullMark: 100 },
      { subject: 'Defensa', A: player.stats.defending, fullMark: 100 },
      { subject: 'Físico', A: player.stats.physical, fullMark: 100 },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0b1120] relative overflow-hidden">
      
      {/* Enhanced Top Bar with better visibility and details - Denser Padding */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b border-scout-700 bg-gradient-to-r from-scout-900 via-scout-800 to-scout-900 relative overflow-hidden shrink-0">
         
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

         <div className="flex items-center gap-5 z-10 w-full md:w-auto">
             {/* Back Button only visible if onBack prop is provided (Mobile) */}
             {onBack && (
                 <button onClick={onBack} className="p-2 -ml-2 text-scout-400 hover:text-white rounded-full hover:bg-scout-800 md:hidden">
                     <ArrowLeft className="w-6 h-6" />
                 </button>
             )}
             
             {/* Large Player Avatar with Rating Badge - Slightly smaller for density */}
             <div className="relative shrink-0">
                 <img 
                    src={player.imageUrl} 
                    alt={player.name} 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-scout-700 shadow-2xl bg-scout-800"
                 />
                 <div className="absolute -bottom-2 -right-2 bg-scout-900 rounded-full p-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-scout-gold to-yellow-600 flex items-center justify-center text-scout-900 font-black text-sm border-2 border-scout-900 shadow-lg">
                        {player.scoutRating}
                    </div>
                 </div>
             </div>
             
             {/* Detailed Player Info Block */}
             <div className="flex-1 min-w-0">
                 <h2 className="text-2xl md:text-3xl font-black text-white truncate tracking-tight mb-2 leading-none">{player.name}</h2>
                 
                 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-scout-300 font-medium">
                    <div className="flex items-center gap-1.5 bg-scout-900/60 px-2 py-1 rounded border border-scout-700/50">
                        <Shirt className="w-3.5 h-3.5 text-scout-400"/>
                        <span className="text-white truncate max-w-[120px]">{player.team}</span>
                    </div>
                    
                    <span className="hidden md:inline w-1 h-1 rounded-full bg-scout-600"></span>
                    
                    <div className="flex items-center gap-1.5">
                        <span className="text-scout-100">{player.position}</span>
                    </div>

                    <span className="w-1 h-1 rounded-full bg-scout-600"></span>

                    <div>{player.age} Años</div>

                    <span className="w-1 h-1 rounded-full bg-scout-600"></span>

                    <div className="flex items-center gap-1.5" title="Nacionalidad">
                        <MapPin className="w-3.5 h-3.5 text-scout-400"/>
                        <span>{player.country}</span>
                    </div>

                    <span className="hidden md:inline w-1 h-1 rounded-full bg-scout-600"></span>

                    <div className="flex items-center gap-1.5" title="Pie Hábil">
                        <Footprints className="w-3.5 h-3.5 text-scout-400"/>
                        <span>{player.foot}</span>
                    </div>
                 </div>
             </div>
         </div>

         {/* Actions Toolbar */}
         <div className="flex items-center gap-2 mt-4 md:mt-0 z-10 self-end md:self-center ml-auto md:ml-0">
             <button onClick={handleGenerateReport} className="p-2 text-purple-400 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors border border-transparent hover:border-purple-500/30" title="Generar Informe IA">
                 <BrainCircuit className="w-5 h-5" />
             </button>
             <button onClick={() => exportPlayerProfileToPDF(player, notes)} className="p-2 text-green-400 hover:text-white hover:bg-green-600/20 rounded-lg transition-colors border border-transparent hover:border-green-500/30" title="Exportar PDF">
                 <FileDown className="w-5 h-5" />
             </button>
             <div className="h-8 w-px bg-scout-700 mx-1"></div>
             <button onClick={() => onEditPlayer(player)} className="p-2 text-scout-400 hover:text-white hover:bg-scout-700 rounded-lg transition-colors" title="Editar Perfil">
                 <Edit className="w-5 h-5" />
             </button>
             <button onClick={() => onDeletePlayer(player.id)} className="p-2 text-scout-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar Jugador">
                 <Trash2 className="w-5 h-5" />
             </button>
         </div>
      </div>

      {/* Tabs Navigation (Scrollable) - Reduced Padding */}
      <div className="flex border-b border-scout-800 overflow-x-auto no-scrollbar bg-scout-900/30 shrink-0">
         {tabs.map((tab) => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border-b-2
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

      {/* Main Scrollable Content - Denser Padding */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 pb-20 md:pb-4">
        
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fadeIn">
              
              {/* Left Col: Pitch & Basic Stats */}
              <div className="space-y-4">
                 <div className="bg-scout-800 rounded-xl border border-scout-700 overflow-hidden shadow-lg h-72 relative group">
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

                 {/* NEW: Radar Chart - Reduced Height */}
                 <div className="bg-scout-800 rounded-xl border border-scout-700 p-3 shadow-lg flex flex-col justify-center items-center relative">
                    <h3 className="text-xs font-bold text-scout-500 uppercase tracking-wider mb-2 self-start">Radar de Atributos</h3>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={player.name} dataKey="A" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.3} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Basic Stats Grid - Denser */}
                 <div className="bg-scout-800 rounded-xl border border-scout-700 p-3 relative group">
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
                       {Object.entries(player.stats).map(([key, val]) => {
                          const value = val as number;
                          return (
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
                       )})}
                    </div>
                 </div>
              </div>

              {/* Middle/Right Col: Detailed Views */}
              <div className="lg:col-span-2 space-y-4">
                  
                  {/* Physical & Contract Teasers (MOVED TO TOP) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div onClick={() => setActiveTab('physical')} className="bg-scout-800 p-3 rounded-xl border border-scout-700 hover:border-blue-500/50 cursor-pointer transition-all group relative">
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
                     <div onClick={() => setActiveTab('contract')} className="bg-scout-800 p-3 rounded-xl border border-scout-700 hover:border-purple-500/50 cursor-pointer transition-all group relative">
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

                  {/* Latest Note Teaser (MOVED DOWN) */}
                  <div className="bg-gradient-to-r from-scout-800 to-scout-900 p-4 rounded-xl border border-scout-700 shadow-md">
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

                  {/* AI Quick Analysis (If available) */}
                  {aiReport && (
                     <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl">
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

        {activeTab === 'physical' && <PhysicalContent player={player} onEdit={() => onEditPlayer(player, 'physical', true)} onPlayerUpdate={onPlayerUpdate} />}
        
        {activeTab === 'nutrition' && <NutritionContent player={player} onEdit={() => onEditPlayer(player, 'nutrition', true)} />}
        
        {activeTab === 'contract' && <ContractContent player={player} onEdit={() => onEditPlayer(player, 'contract', true)} />}

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
