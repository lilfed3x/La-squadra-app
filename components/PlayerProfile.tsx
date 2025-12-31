
import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User, MedicalReport } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService';
import { generateUUID } from '../services/dataService';
import { BrainCircuit, Edit, Trash2, Activity as ActivityIcon, Apple, ArrowLeft, ArrowRight, Briefcase, Shirt, PieChart as PieChartIcon, TrendingUp, AlertCircle, CheckCircle2, ClipboardList, FileDown, Download, Youtube, MoreVertical, Scale, Zap, HeartPulse, DollarSign, Calendar, FileText, X, ChevronDown, ChevronRight, Plus, Paperclip, Image as ImageIcon, Save, MapPin, Footprints, Flag, Clock, Tag, Film, Maximize2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { TacticalPitch } from './TacticalPitch';
import { PlayerFormModal, ModalTab } from './PlayerFormModal';
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

interface MedicalHistorySectionProps {
    player: Player;
    onUpdate: (player: Player) => void;
    onViewReport: (report: MedicalReport) => void;
    onViewMedia: (attachment: Attachment) => void;
}

const MedicalHistorySection: React.FC<MedicalHistorySectionProps> = ({ player, onUpdate, onViewReport, onViewMedia }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newReport, setNewReport] = useState<Partial<MedicalReport>>({
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        severity: 'Baja',
        status: 'Activo',
        doctorName: '', // Campo Responsable Médico añadido
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
                        id: generateUUID(),
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
            id: generateUUID(),
            date: newReport.date!,
            title: newReport.title!,
            description: newReport.description!,
            severity: newReport.severity as any,
            status: newReport.status as any,
            doctorName: newReport.doctorName || 'Dr. Equipo', // Guardar nombre del doctor
            attachments: newReport.attachments || [],
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
        setNewReport({ date: new Date().toISOString().split('T')[0], title: '', description: '', severity: 'Baja', status: 'Activo', doctorName: '', attachments: [] });
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
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
                        <div>
                            {/* CAMPO MANUAL RESPONSABLE MÉDICO */}
                            <label className="text-[10px] text-scout-400 uppercase font-bold">Responsable Médico</label>
                            <input type="text" placeholder="Ej. Dr. Equipo" value={newReport.doctorName || ''} onChange={e => setNewReport({...newReport, doctorName: e.target.value})} className="w-full bg-scout-800 border border-scout-600 rounded p-2 text-sm text-white focus:border-scout-gold outline-none" />
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
                                    onClick={() => onViewMedia(att)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* CASCADE VIEW WITH SCROLL */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {sortedYears.length === 0 ? (
                    <div className="text-center py-8 text-scout-500 italic">
                        No hay historial médico registrado.
                    </div>
                ) : (
                    sortedYears.map(year => (
                        <div key={year} className="bg-scout-800 border border-scout-700 rounded-xl overflow-hidden">
                            <button 
                                onClick={() => toggleYear(year)}
                                className="w-full flex items-center justify-between p-3 bg-scout-900/50 hover:bg-scout-800 transition-colors"
                            >
                                <span className="text-sm font-bold text-white">{year}</span>
                                {expandedYears[year] ? <ChevronDown className="w-4 h-4 text-scout-400" /> : <ChevronRight className="w-4 h-4 text-scout-400" />}
                            </button>
                            
                            {expandedYears[year] && (
                                <div className="border-t border-scout-700">
                                    {Object.keys(groupedReports[year]).sort().reverse().map(month => (
                                        <div key={month}>
                                            <button 
                                                onClick={() => toggleMonth(`${year}-${month}`)}
                                                className="w-full flex items-center justify-between px-4 py-2 bg-scout-800/30 hover:bg-scout-800 border-b border-scout-700/50 transition-colors"
                                            >
                                                <span className="text-xs font-semibold text-scout-300">{month}</span>
                                                {expandedMonths[`${year}-${month}`] ? <ChevronDown className="w-3 h-3 text-scout-500" /> : <ChevronRight className="w-3 h-3 text-scout-500" />}
                                            </button>
                                            
                                            {expandedMonths[`${year}-${month}`] && (
                                                <div className="p-2 space-y-2 bg-black/20">
                                                    {groupedReports[year][month].map(report => (
                                                        <div key={report.id} onClick={() => onViewReport(report)} className="bg-scout-900 border border-scout-700 rounded-lg p-3 hover:border-scout-gold/50 cursor-pointer transition-colors relative group">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="font-bold text-sm text-white">{report.title}</div>
                                                                <div className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                                    report.severity === 'Baja' ? 'bg-green-500/20 text-green-400' :
                                                                    report.severity === 'Media' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                    {report.severity}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-scout-400 mb-2 line-clamp-2">{report.description}</div>
                                                            <div className="flex justify-between items-center text-[10px] text-scout-500">
                                                                <span>{report.date}</span>
                                                                {report.doctorName && <span>Dr: {report.doctorName}</span>}
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleDeleteReport(report.id, e)}
                                                                className="absolute top-2 right-2 p-1.5 bg-scout-800 rounded-md text-scout-500 hover:text-red-400 hover:bg-scout-700 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                            {/* Delete Confirmation Overlay */}
                                                            {reportToDelete === report.id && (
                                                                <div className="absolute inset-0 bg-scout-900/90 backdrop-blur-sm flex items-center justify-center gap-2 rounded-lg z-10" onClick={e => e.stopPropagation()}>
                                                                    <span className="text-xs text-white">¿Eliminar?</span>
                                                                    <button onClick={executeDeleteReport} className="text-red-400 hover:text-red-300 font-bold text-xs">SÍ</button>
                                                                    <button onClick={() => setReportToDelete(null)} className="text-scout-400 hover:text-white text-xs">NO</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
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
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'medical' | 'nutrition' | 'report'>('overview');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  
  // New Note Modal
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  // Search/Filter for Notes
  const [noteSearch, setNoteSearch] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory | 'All'>('All');

  // Viewer Modal for Media
  const [viewingMedia, setViewingMedia] = useState<Attachment | null>(null);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const report = await generateScoutingReport(player, notes);
      setAiReport(report);
    } catch (e) {
      setReportError("Error al conectar con Gemini AI. Verifica tu conexión o clave API.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSaveNote = (content: string, category: NoteCategory, tags: string[], attachments: Attachment[]) => {
      if (editingNote) {
          // Update existing
          onEditNote({
              ...editingNote,
              content, category, tags, attachments,
              isEdited: true
          });
          setEditingNote(undefined);
      } else {
          // Create new
          onAddNote(content, category, tags, attachments);
      }
      setIsNoteEditorOpen(false);
  };

  const handleDelete = () => {
      onDeletePlayer(player.id);
      setDeleteConfirmOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1120] relative">
      
      {/* Header */}
      <div className="p-4 border-b border-scout-700 bg-scout-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
         <div className="flex items-center gap-4">
            {onBack && (
               <button onClick={onBack} className="md:hidden p-2 -ml-2 text-scout-400">
                  <ArrowLeft className="w-5 h-5" />
               </button>
            )}
            <div className="relative group">
                <img src={player.imageUrl} alt={player.name} className="w-16 h-16 rounded-full object-cover border-2 border-scout-gold shadow-lg" />
                <button onClick={() => onEditPlayer(player)} className="absolute bottom-0 right-0 bg-scout-800 p-1 rounded-full border border-scout-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="w-3 h-3" />
                </button>
            </div>
            <div>
               <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                  {player.name}
                  <span className="text-xs bg-scout-gold text-scout-900 px-2 py-0.5 rounded font-bold">{player.position}</span>
               </h1>
               <div className="flex items-center gap-3 text-sm text-scout-400">
                  <span className="flex items-center gap-1"><Shirt className="w-3 h-3"/> {player.team}</span>
                  <span className="flex items-center gap-1"><Flag className="w-3 h-3"/> {player.country}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {player.age} años</span>
               </div>
            </div>
         </div>

         <div className="flex gap-2 self-end md:self-center">
            <button 
                onClick={() => exportPlayerProfileToPDF(player, notes)}
                className="p-2 bg-scout-800 hover:bg-scout-700 text-scout-400 hover:text-white rounded-lg border border-scout-700 transition-colors"
                title="Exportar PDF"
            >
                <FileDown className="w-5 h-5" />
            </button>
            <button 
                onClick={() => onEditPlayer(player)}
                className="p-2 bg-scout-800 hover:bg-scout-700 text-scout-400 hover:text-white rounded-lg border border-scout-700 transition-colors"
                title="Editar Perfil"
            >
                <Edit className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-2 bg-scout-800 hover:bg-red-500/20 text-scout-400 hover:text-red-400 rounded-lg border border-scout-700 transition-colors"
                title="Eliminar Jugador"
            >
                <Trash2 className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-scout-700 bg-scout-900/30 overflow-x-auto shrink-0">
          {[
              { id: 'overview', label: 'Resumen', icon: ActivityIcon },
              { id: 'notes', label: `Notas (${notes.length})`, icon: ClipboardList },
              { id: 'medical', label: 'Médico', icon: HeartPulse },
              { id: 'nutrition', label: 'Nutrición', icon: Apple },
              { id: 'report', label: 'Informe IA', icon: BrainCircuit },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                      flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === tab.id ? 'border-scout-gold text-scout-gold bg-scout-800/50' : 'border-transparent text-scout-400 hover:text-scout-200 hover:bg-scout-800/30'}
                  `}
              >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-scout-gold' : 'text-scout-500'}`} />
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-[#0b1120] relative">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                  
                  {/* Left Column: Stats & Attributes */}
                  <div className="lg:col-span-2 space-y-6">
                      {/* Using the new PlayerStatsDashboard component */}
                      <PlayerStatsDashboard player={player} />
                      
                      {/* Contract / General Info Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Valor de Mercado</div>
                               <div className="text-xl font-bold text-white flex items-center gap-1">
                                   <DollarSign className="w-4 h-4 text-green-400" />
                                   {player.marketValue || 'N/A'}
                               </div>
                           </div>
                           <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Contrato Hasta</div>
                               <div className="text-xl font-bold text-white flex items-center gap-1">
                                   <Briefcase className="w-4 h-4 text-purple-400" />
                                   {player.contract?.contractExpiration || 'N/A'}
                               </div>
                           </div>
                           <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                               <div className="text-[10px] text-scout-500 uppercase font-bold tracking-wider mb-1">Pie Hábil</div>
                               <div className="text-xl font-bold text-white flex items-center gap-1">
                                   <Footprints className="w-4 h-4 text-blue-400" />
                                   {player.foot}
                               </div>
                           </div>
                      </div>
                  </div>

                  {/* Right Column: Tactical & Physical Summary */}
                  <div className="space-y-6">
                      {/* Tactical Pitch Visualizer */}
                      <div className="bg-scout-800 rounded-xl border border-scout-700 overflow-hidden shadow-lg relative aspect-[3/4] lg:aspect-auto lg:h-[400px]">
                          <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
                              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 shadow-black drop-shadow-md">
                                  <MapPin className="w-3 h-3 text-scout-gold" /> Mapa Táctico
                              </h3>
                          </div>
                          <TacticalPitch position={player.position} />
                      </div>

                      {/* Physical Summary Brief */}
                      <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                          <h3 className="text-xs font-bold text-scout-400 uppercase tracking-wider mb-3 border-b border-scout-700 pb-2">Estado Físico</h3>
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-scout-300">Riesgo Lesión</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${player.physical?.injuryRisk === 'Alto' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                  {player.physical?.injuryRisk || 'N/A'}
                              </span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-sm text-scout-300">Fatiga Acumulada</span>
                              <span className="text-sm font-bold text-white">{player.physical?.fatigueLevel || 0}%</span>
                          </div>
                          <div className="w-full bg-scout-900 h-1.5 rounded-full mt-2">
                              <div className={`h-1.5 rounded-full ${player.physical?.fatigueLevel && player.physical.fatigueLevel > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${player.physical?.fatigueLevel || 0}%` }}></div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: NOTES */}
          {activeTab === 'notes' && (
              <div className="flex flex-col h-full animate-slideIn">
                   <div className="mb-4 flex justify-between items-center">
                       <h3 className="text-lg font-bold text-white hidden md:block">Observaciones de Scouting</h3>
                       <button 
                         onClick={() => { setEditingNote(undefined); setIsNoteEditorOpen(true); }}
                         className="bg-scout-accent hover:bg-emerald-400 text-scout-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all ml-auto"
                       >
                           <Plus className="w-4 h-4" /> Nueva Nota
                       </button>
                   </div>
                   
                   <div className="flex-1 min-h-0">
                       <NoteList 
                          notes={notes}
                          searchQuery={noteSearch}
                          setSearchQuery={setNoteSearch}
                          selectedCategory={noteCategory}
                          setSelectedCategory={setNoteCategory}
                          currentUser={currentUser}
                          allUsers={allUsers}
                          onEditNote={(n) => { setEditingNote(n); setIsNoteEditorOpen(true); }}
                          onDeleteNote={onDeleteNote}
                          onViewNote={(n) => {
                             if (n.attachments.length > 0) setViewingMedia(n.attachments[0]);
                          }}
                       />
                   </div>
              </div>
          )}

          {/* TAB: MEDICAL */}
          {activeTab === 'medical' && (
              <div className="animate-fadeIn max-w-4xl mx-auto">
                   <MedicalHistorySection 
                      player={player} 
                      onUpdate={onPlayerUpdate} 
                      onViewReport={(r) => { /* Optional: Open detailed view modal */ }}
                      onViewMedia={(att) => setViewingMedia(att)}
                   />
              </div>
          )}

          {/* TAB: NUTRITION */}
          {activeTab === 'nutrition' && (
              <div className="animate-fadeIn max-w-4xl mx-auto">
                  <NutritionContent 
                      player={player} 
                      onEdit={() => onEditPlayer(player, 'nutrition', true)} 
                  />
              </div>
          )}

          {/* TAB: AI REPORT */}
          {activeTab === 'report' && (
              <div className="animate-fadeIn max-w-3xl mx-auto space-y-6">
                  <div className="bg-scout-800 border border-scout-700 rounded-xl p-6 shadow-xl">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b border-scout-700 pb-6">
                          <div>
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                                  Informe Inteligente Gemini
                              </h3>
                              <p className="text-sm text-scout-400 mt-1">Genera un análisis completo basado en tus notas y estadísticas.</p>
                          </div>
                          <button 
                              onClick={handleGenerateReport}
                              disabled={isGeneratingReport}
                              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-105"
                          >
                              {isGeneratingReport ? (
                                  <>
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Analizando...
                                  </>
                              ) : (
                                  <>
                                      <Zap className="w-4 h-4" /> Generar Informe
                                  </>
                              )}
                          </button>
                      </div>
                      
                      {reportError && (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg mb-6 flex items-center gap-3">
                              <AlertCircle className="w-5 h-5" />
                              {reportError}
                          </div>
                      )}

                      {aiReport ? (
                          <div className="animate-fadeIn">
                              <div className="prose prose-invert prose-sm max-w-none bg-scout-900/50 p-6 rounded-xl border border-scout-700 mb-6">
                                  {/* Simple Markdown Rendering */}
                                  {aiReport.split('\n').map((line, i) => {
                                      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-purple-400 mb-4">{line.replace('# ', '')}</h1>;
                                      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-blue-400 mt-6 mb-3">{line.replace('## ', '')}</h2>;
                                      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-scout-300 mb-1 list-disc">{line.replace('- ', '')}</li>;
                                      if (line.startsWith('**')) return <p key={i} className="font-bold text-white mb-2">{line.replace(/\*\*/g, '')}</p>;
                                      return <p key={i} className="text-scout-300 mb-2 leading-relaxed">{line}</p>;
                                  })}
                              </div>
                              <div className="flex justify-end">
                                  <button 
                                      onClick={() => exportAIReportToPDF(player, aiReport)}
                                      className="flex items-center gap-2 px-4 py-2 bg-scout-700 hover:bg-scout-600 text-white rounded-lg font-medium transition-colors"
                                  >
                                      <Download className="w-4 h-4" /> Descargar PDF
                                  </button>
                              </div>
                          </div>
                      ) : (
                          !isGeneratingReport && (
                              <div className="text-center py-12 text-scout-500">
                                  <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                  <p>El informe aparecerá aquí una vez generado.</p>
                              </div>
                          )
                      )}
                  </div>
              </div>
          )}

      </div>

      {/* Media Viewer Modal */}
      {viewingMedia && (
          <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col animate-fadeIn">
              <div className="absolute top-4 right-4 z-10">
                  <button onClick={() => setViewingMedia(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                      <X className="w-6 h-6" />
                  </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                  {viewingMedia.type === 'video' ? (
                      <video src={viewingMedia.url} controls className="max-w-full max-h-full rounded shadow-2xl" autoPlay />
                  ) : viewingMedia.type === 'youtube' ? (
                      <div className="w-full max-w-4xl aspect-video bg-black">
                         <iframe 
                            src={`https://www.youtube.com/embed/${getYoutubeId(viewingMedia.url)}?autoplay=1`} 
                            className="w-full h-full" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                         ></iframe>
                      </div>
                  ) : (
                      <img src={viewingMedia.url} alt={viewingMedia.name} className="max-w-full max-h-full object-contain rounded shadow-2xl" />
                  )}
              </div>
              <div className="p-4 text-center text-white bg-black/50 backdrop-blur-sm">
                  <p className="font-bold">{viewingMedia.name}</p>
              </div>
          </div>
      )}

      {/* Note Editor Modal (Overlay) */}
      {isNoteEditorOpen && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl">
               <NoteEditor 
                 onSave={handleSaveNote}
                 onCancel={() => setIsNoteEditorOpen(false)}
                 initialData={editingNote}
               />
            </div>
         </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
         isOpen={deleteConfirmOpen}
         onClose={() => setDeleteConfirmOpen(false)}
         onConfirm={handleDelete}
         title="Eliminar Jugador"
         message={`¿Estás seguro de que deseas eliminar a ${player.name}? Esta acción eliminará también todas sus notas, historial médico y reportes asociados.`}
         confirmText="Eliminar Definitivamente"
         isDestructive
      />

    </div>
  );
};
