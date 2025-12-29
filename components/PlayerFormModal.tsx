import React, { useState, useEffect, useRef } from 'react';
import { Player, PlayerStats, ContractDetails, PhysicalProfile, NutritionalReport, BodyCompositionEntry } from '../types';
import { X, Save, User, Briefcase, Activity, Apple, Plus, Trash2, Upload, AlertCircle } from 'lucide-react';
import { getRandomAvatar } from '../services/mockData';

export type ModalTab = 'general' | 'contract' | 'physical' | 'nutrition';

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Partial<Player>) => void;
  initialData?: Player | null;
  initialTab?: ModalTab;
  restrictToTab?: boolean; // If true, hides tab navigation
}

const STAT_LABELS: Record<string, string> = {
  pace: 'Ritmo',
  shooting: 'Tiro',
  passing: 'Pase',
  dribbling: 'Regate',
  defending: 'Defensa',
  physical: 'Físico'
};

const DEFAULT_STATS: PlayerStats = {
  pace: 70,
  shooting: 70,
  passing: 70,
  dribbling: 70,
  defending: 50,
  physical: 70,
};

const DEFAULT_CONTRACT: ContractDetails = {
  clubName: '',
  contractExpiration: '',
  agencyName: '',
  agencyContact: '',
  agencyContractExpiration: '',
  isLoan: false,
  loanOriginClub: '',
  marketValue: '€0M'
};

const DEFAULT_PHYSICAL: PhysicalProfile = {
  fatigueLevel: 0,
  injuryRisk: 'Bajo',
  recoveryStatus: '100% Apto',
  lastInjury: '',
  fitnessNotes: ''
};

const DEFAULT_NUTRITION: NutritionalReport = {
  lastCheckup: '',
  weightStatus: 'Óptimo',
  hydrationLevel: 90,
  dailyCalories: 3000,
  macros: { protein: 0, carbs: 0, fats: 0 },
  bodyCompositionHistory: [],
  dietaryRestrictions: [],
  supplements: []
};

const POSITIONS = [
  "AR - Arquero",
  "DCD - Defensor Central Derecho",
  "DCI - Defensor Central Izquierdo",
  "LD - Lateral Derecho",
  "LI - Lateral Izquierdo",
  "MCD - Mediocentro Defensivo",
  "MC - Mediocentro",
  "MO - Mediocampista Ofensivo",
  "SD - Segundo Delantero",
  "CD - Centrodelantero",
  "ED - Extremo Derecho",
  "EI - Extremo Izquierdo"
];

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  initialTab = 'general',
  restrictToTab = false
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [formData, setFormData] = useState<Partial<Player>>({
    name: '',
    team: '',
    position: '',
    age: 20,
    height: '',
    foot: 'Derecha',
    imageUrl: '',
    scoutRating: 75,
    stats: DEFAULT_STATS,
    contract: DEFAULT_CONTRACT,
    physical: DEFAULT_PHYSICAL,
    nutrition: DEFAULT_NUTRITION
  });

  // Helpers for array inputs
  const [supplementsStr, setSupplementsStr] = useState('');
  const [restrictionsStr, setRestrictionsStr] = useState('');
  
  // Helper for new history entry
  const [newHistoryEntry, setNewHistoryEntry] = useState<Partial<BodyCompositionEntry>>({
    date: new Date().toISOString().split('T')[0],
    weight: 0,
    bodyFatPercentage: 0
  });

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab); // Reset to requested tab on open
        setImageError(null);
    }
    if (initialData) {
      setFormData({
        ...initialData,
        contract: initialData.contract || DEFAULT_CONTRACT,
        physical: initialData.physical || DEFAULT_PHYSICAL,
        nutrition: initialData.nutrition || DEFAULT_NUTRITION
      });
      setSupplementsStr(initialData.nutrition?.supplements.join(', ') || '');
      setRestrictionsStr(initialData.nutrition?.dietaryRestrictions.join(', ') || '');
    } else {
      setFormData({
        name: '',
        team: '',
        position: '',
        age: 20,
        height: '',
        foot: 'Derecha',
        imageUrl: getRandomAvatar(), // Set Random Image for New Player
        scoutRating: 75,
        stats: DEFAULT_STATS,
        contract: DEFAULT_CONTRACT,
        physical: DEFAULT_PHYSICAL,
        nutrition: DEFAULT_NUTRITION
      });
      setSupplementsStr('');
      setRestrictionsStr('');
    }
  }, [initialData, isOpen, initialTab]);

  if (!isOpen) return null;

  const handleStatChange = (stat: keyof PlayerStats, value: number) => {
    setFormData(prev => {
      const newStats = { ...prev.stats!, [stat]: value };
      const statValues = Object.values(newStats) as number[];
      const average = statValues.reduce((sum, val) => sum + val, 0) / statValues.length;
      return { ...prev, stats: newStats, scoutRating: Math.round(average) };
    });
  };

  const handleContractChange = (field: keyof ContractDetails, value: any) => {
    setFormData(prev => ({
      ...prev,
      contract: { ...prev.contract!, [field]: value }
    }));
  };

  const handlePhysicalChange = (field: keyof PhysicalProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      physical: { ...prev.physical!, [field]: value }
    }));
  };

  const handleNutritionChange = (field: keyof NutritionalReport, value: any) => {
    setFormData(prev => ({
      ...prev,
      nutrition: { ...prev.nutrition!, [field]: value }
    }));
  };
  
  const handleMacroChange = (macro: 'protein' | 'carbs' | 'fats', value: number) => {
    setFormData(prev => ({
      ...prev,
      nutrition: {
        ...prev.nutrition!,
        macros: {
          ...prev.nutrition!.macros,
          [macro]: value
        }
      }
    }));
  };

  const addHistoryEntry = () => {
    if (newHistoryEntry.date && newHistoryEntry.weight && newHistoryEntry.bodyFatPercentage) {
       const entry: BodyCompositionEntry = {
          date: newHistoryEntry.date,
          weight: Number(newHistoryEntry.weight),
          bodyFatPercentage: Number(newHistoryEntry.bodyFatPercentage)
       };
       const currentHistory = formData.nutrition?.bodyCompositionHistory || [];
       // Add and sort by date
       const newHistory = [...currentHistory, entry].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
       
       setFormData(prev => ({
          ...prev,
          nutrition: {
             ...prev.nutrition!,
             bodyCompositionHistory: newHistory
          }
       }));
       setNewHistoryEntry({ date: new Date().toISOString().split('T')[0], weight: 0, bodyFatPercentage: 0 });
    }
  };

  const removeHistoryEntry = (index: number) => {
      const currentHistory = formData.nutrition?.bodyCompositionHistory || [];
      const newHistory = currentHistory.filter((_, i) => i !== index);
      setFormData(prev => ({
          ...prev,
          nutrition: {
             ...prev.nutrition!,
             bodyCompositionHistory: newHistory
          }
       }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit size to approx 2MB for storage performance
      if (file.size > 2 * 1024 * 1024) {
        setImageError("La imagen es demasiado grande (Máx 2MB). Intenta con una más pequeña.");
        return;
      }

      if (!file.type.startsWith('image/')) {
        setImageError("Solo se permiten archivos de imagen (JPG, PNG, WEBP).");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      nutrition: {
        ...formData.nutrition!,
        supplements: supplementsStr.split(',').map(s => s.trim()).filter(Boolean),
        dietaryRestrictions: restrictionsStr.split(',').map(s => s.trim()).filter(Boolean)
      }
    };
    onSave(finalData);
    onClose();
  };

  const TabButton = ({ id, label, icon: Icon }: { id: ModalTab, label: string, icon: any }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === id 
          ? 'border-scout-accent text-scout-accent bg-scout-800' 
          : 'border-transparent text-scout-400 hover:text-scout-200 hover:text-scout-200 hover:bg-scout-800/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const getModalTitle = () => {
      if (restrictToTab) {
          if (activeTab === 'contract') return 'Editar Estado Contractual';
          if (activeTab === 'physical') return 'Actualizar Informe Físico';
          if (activeTab === 'nutrition') return 'Actualizar Informe Nutricional';
          return 'Editar Perfil';
      }
      return initialData ? 'Editar Perfil Completo' : 'Añadir Nuevo Objetivo';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-scout-800 rounded-2xl border border-scout-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleIn">
        
        {/* Header */}
        <div className="border-b border-scout-700 bg-scout-900/50 flex flex-col shrink-0">
          <div className="p-4 flex justify-between items-center">
             <h2 className="text-lg font-bold text-scout-100 flex items-center gap-2">
                 {restrictToTab && activeTab === 'nutrition' && <Apple className="w-5 h-5 text-green-400"/>}
                 {restrictToTab && activeTab === 'physical' && <Activity className="w-5 h-5 text-blue-400"/>}
                 {restrictToTab && activeTab === 'contract' && <Briefcase className="w-5 h-5 text-purple-400"/>}
                 {getModalTitle()}
             </h2>
             <button onClick={onClose} className="text-scout-400 hover:text-scout-100 transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>
          {!restrictToTab && (
            <div className="flex overflow-x-auto">
                <TabButton id="general" label="General" icon={User} />
                <TabButton id="contract" label="Contrato" icon={Briefcase} />
                <TabButton id="physical" label="Físico" icon={Activity} />
                <TabButton id="nutrition" label="Nutrición" icon={Apple} />
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0b1120]/50">
          
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-scout-500 tracking-wider mb-2">Detalles Básicos</h3>
                <div>
                  <label className="block text-xs text-scout-400 mb-1">Nombre Completo</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100 focus:border-scout-accent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-scout-400 mb-1">Equipo Actual</label>
                    <input required type="text" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100 focus:border-scout-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-scout-400 mb-1">Posición</label>
                    <select required value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100 focus:border-scout-accent outline-none">
                      <option value="" disabled>Seleccionar</option>
                      {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                   <div>
                      <label className="block text-xs text-scout-400 mb-1">Edad</label>
                      <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                   </div>
                   <div>
                      <label className="block text-xs text-scout-400 mb-1">Altura</label>
                      <input type="text" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                   </div>
                   <div>
                      <label className="block text-xs text-scout-400 mb-1">Pie</label>
                      <select value={formData.foot} onChange={e => setFormData({...formData, foot: e.target.value as any})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100">
                        <option>Derecha</option>
                        <option>Izquierda</option>
                        <option>Ambos</option>
                      </select>
                   </div>
                </div>
                
                {/* Image Upload Section */}
                <div>
                   <label className="block text-xs text-scout-400 mb-1">URL de Imagen o Carga Local</label>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={formData.imageUrl} 
                        onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                        placeholder="URL de imagen..." 
                        className="flex-1 bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100 truncate" 
                      />
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-scout-700 hover:bg-scout-600 border border-scout-600 text-scout-200 px-3 rounded flex items-center justify-center transition-colors"
                        title="Subir imagen local"
                      >
                         <Upload className="w-4 h-4" />
                      </button>
                   </div>
                   {imageError && (
                      <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                         <AlertCircle className="w-3 h-3 shrink-0" />
                         <span>{imageError}</span>
                      </div>
                   )}
                   <p className="text-[10px] text-scout-500 mt-1">La imagen se sincronizará automáticamente con la base de datos general.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs uppercase font-bold text-scout-500 tracking-wider">Métricas de Rendimiento</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-scout-400">Valoración</label>
                    <input type="number" readOnly value={formData.scoutRating} className="w-16 bg-scout-900 border border-scout-accent rounded p-1 text-center font-bold text-scout-accent outline-none" />
                  </div>
                </div>
                <div className="space-y-3 bg-scout-900/50 p-4 rounded-lg border border-scout-700">
                  {Object.entries(formData.stats || {}).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                         <label className="text-xs capitalize text-scout-300">{STAT_LABELS[key] || key}</label>
                         <span className="text-xs font-mono text-scout-400">{value}</span>
                      </div>
                      <input type="range" min="1" max="99" value={value} onChange={(e) => handleStatChange(key as keyof PlayerStats, Number(e.target.value))} className="w-full h-1.5 bg-scout-700 rounded-lg appearance-none cursor-pointer accent-scout-accent" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTRACT */}
          {activeTab === 'contract' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
               <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-2 border-b border-purple-500/20 pb-2">Estado con el Club</h3>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Club Propietario</label>
                     <input type="text" value={formData.contract?.clubName} onChange={e => handleContractChange('clubName', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Vencimiento de Contrato</label>
                     <input type="date" value={formData.contract?.contractExpiration} onChange={e => handleContractChange('contractExpiration', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Valor de Mercado Actual</label>
                     <input type="text" value={formData.marketValue} onChange={e => setFormData({...formData, marketValue: e.target.value})} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" placeholder="€00M" />
                  </div>
                  
                  <div className="bg-scout-900/50 p-4 rounded-lg border border-scout-700 mt-4">
                     <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input type="checkbox" checked={formData.contract?.isLoan} onChange={e => handleContractChange('isLoan', e.target.checked)} className="rounded border-scout-600 bg-scout-800 text-scout-accent focus:ring-scout-accent" />
                        <span className="text-sm font-medium text-white">Jugador Cedido (Préstamo)</span>
                     </label>
                     {formData.contract?.isLoan && (
                        <div className="animate-fadeIn">
                           <label className="block text-xs text-scout-400 mb-1">Club de Origen (Dueño del Pase)</label>
                           <input type="text" value={formData.contract?.loanOriginClub || ''} onChange={e => handleContractChange('loanOriginClub', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" placeholder="Ej. Manchester City" />
                        </div>
                     )}
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-2 border-b border-purple-500/20 pb-2">Representación (Agencia)</h3>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Nombre de la Agencia</label>
                     <input type="text" value={formData.contract?.agencyName} onChange={e => handleContractChange('agencyName', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Contacto Principal</label>
                     <input type="text" value={formData.contract?.agencyContact} onChange={e => handleContractChange('agencyContact', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Vencimiento de Contrato Agencia</label>
                     <input type="date" value={formData.contract?.agencyContractExpiration} onChange={e => handleContractChange('agencyContractExpiration', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                  </div>
               </div>
            </div>
          )}

          {/* TAB: PHYSICAL */}
          {activeTab === 'physical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
               <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-blue-400 tracking-wider mb-2 border-b border-blue-500/20 pb-2">Estado Físico General</h3>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Nivel de Fatiga ({formData.physical?.fatigueLevel}%)</label>
                     <input type="range" min="0" max="100" value={formData.physical?.fatigueLevel} onChange={e => handlePhysicalChange('fatigueLevel', Number(e.target.value))} className="w-full h-1.5 bg-scout-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Riesgo de Lesión</label>
                     <select value={formData.physical?.injuryRisk} onChange={e => handlePhysicalChange('injuryRisk', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100">
                        <option value="Bajo">Bajo (Color Verde)</option>
                        <option value="Medio">Medio (Color Amarillo)</option>
                        <option value="Alto">Alto (Color Rojo)</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Estado de Recuperación</label>
                     <input type="text" value={formData.physical?.recoveryStatus} onChange={e => handlePhysicalChange('recoveryStatus', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Última Lesión Registrada</label>
                     <input type="text" value={formData.physical?.lastInjury} onChange={e => handlePhysicalChange('lastInjury', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" placeholder="Ej. Distensión isquiotibiales (Oct 2023)" />
                  </div>
               </div>
               <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-blue-400 tracking-wider mb-2 border-b border-blue-500/20 pb-2">Informe Promedio</h3>
                  <div className="h-full">
                     <label className="block text-xs text-scout-400 mb-1">Notas del Preparador Físico</label>
                     <textarea value={formData.physical?.fitnessNotes} onChange={e => handlePhysicalChange('fitnessNotes', e.target.value)} className="w-full h-40 bg-scout-900 border border-scout-700 rounded p-3 text-sm text-scout-100 resize-none focus:border-blue-500 outline-none" placeholder="Informe detallado del estado físico promedio..." />
                  </div>
               </div>
            </div>
          )}

          {/* TAB: NUTRITION */}
          {activeTab === 'nutrition' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
               <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-green-400 tracking-wider mb-2 border-b border-green-500/20 pb-2">Métricas Nutricionales</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-scout-400 mb-1">Último Chequeo</label>
                        <input type="date" value={formData.nutrition?.lastCheckup} onChange={e => handleNutritionChange('lastCheckup', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                     </div>
                     <div>
                        <label className="block text-xs text-scout-400 mb-1">Consumo Calórico (kcal)</label>
                        <input type="number" value={formData.nutrition?.dailyCalories} onChange={e => handleNutritionChange('dailyCalories', Number(e.target.value))} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100" />
                     </div>
                  </div>
                  
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Estado de Peso (Etiqueta de Color)</label>
                     <select value={formData.nutrition?.weightStatus} onChange={e => handleNutritionChange('weightStatus', e.target.value)} className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100">
                        <option value="Óptimo">Óptimo (Verde)</option>
                        <option value="Bajo">Bajo Peso (Amarillo)</option>
                        <option value="Sobrepeso">Sobrepeso (Rojo)</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs text-scout-400 mb-1">Nivel Hidratación ({formData.nutrition?.hydrationLevel}%)</label>
                     <input type="range" min="0" max="100" value={formData.nutrition?.hydrationLevel} onChange={e => handleNutritionChange('hydrationLevel', Number(e.target.value))} className="w-full h-1.5 bg-scout-700 rounded-lg appearance-none cursor-pointer accent-blue-400" />
                  </div>
                  
                  {/* Macros Inputs */}
                  <div className="bg-scout-900/50 p-4 rounded-lg border border-scout-700 mt-2">
                     <label className="block text-xs text-scout-400 mb-2 uppercase font-bold tracking-wider">Objetivos Macronutrientes (g)</label>
                     <div className="grid grid-cols-3 gap-2">
                        <div>
                           <label className="text-[10px] text-blue-400 block mb-1">Proteínas</label>
                           <input type="number" value={formData.nutrition?.macros?.protein} onChange={e => handleMacroChange('protein', Number(e.target.value))} className="w-full bg-scout-800 border border-scout-700 rounded p-1 text-sm text-center text-white" />
                        </div>
                        <div>
                           <label className="text-[10px] text-green-400 block mb-1">Carbos</label>
                           <input type="number" value={formData.nutrition?.macros?.carbs} onChange={e => handleMacroChange('carbs', Number(e.target.value))} className="w-full bg-scout-800 border border-scout-700 rounded p-1 text-sm text-center text-white" />
                        </div>
                        <div>
                           <label className="text-[10px] text-orange-400 block mb-1">Grasas</label>
                           <input type="number" value={formData.nutrition?.macros?.fats} onChange={e => handleMacroChange('fats', Number(e.target.value))} className="w-full bg-scout-800 border border-scout-700 rounded p-1 text-sm text-center text-white" />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  {/* Historical Data Editor */}
                  <div className="bg-scout-900/50 p-4 rounded-lg border border-scout-700">
                     <h3 className="text-xs uppercase font-bold text-green-400 tracking-wider mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3"/> Historial de Mediciones (Gráficos)
                     </h3>
                     
                     <div className="grid grid-cols-3 gap-2 mb-2">
                        <input type="date" value={newHistoryEntry.date} onChange={e => setNewHistoryEntry({...newHistoryEntry, date: e.target.value})} className="bg-scout-800 border border-scout-600 rounded p-1 text-xs text-white" />
                        <input type="number" placeholder="Peso" value={newHistoryEntry.weight || ''} onChange={e => setNewHistoryEntry({...newHistoryEntry, weight: Number(e.target.value)})} className="bg-scout-800 border border-scout-600 rounded p-1 text-xs text-white" />
                        <div className="flex gap-1">
                           <input type="number" placeholder="Grasa %" value={newHistoryEntry.bodyFatPercentage || ''} onChange={e => setNewHistoryEntry({...newHistoryEntry, bodyFatPercentage: Number(e.target.value)})} className="bg-scout-800 border border-scout-600 rounded p-1 text-xs text-white w-full" />
                           <button type="button" onClick={addHistoryEntry} className="bg-scout-accent hover:bg-emerald-400 text-scout-900 rounded p-1 flex items-center justify-center aspect-square"><Plus className="w-4 h-4" /></button>
                        </div>
                     </div>

                     <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                        {formData.nutrition?.bodyCompositionHistory?.map((entry, idx) => (
                           <div key={idx} className="flex justify-between items-center text-xs bg-scout-800/50 p-1.5 rounded border border-scout-700/50">
                              <span className="text-scout-400">{entry.date}</span>
                              <span className="text-white">{entry.weight}kg</span>
                              <span className="text-white">{entry.bodyFatPercentage}%</span>
                              <button type="button" onClick={() => removeHistoryEntry(idx)} className="text-scout-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div>
                        <label className="block text-xs text-scout-400 mb-1">Suplementos</label>
                        <textarea value={supplementsStr} onChange={e => setSupplementsStr(e.target.value)} className="w-full h-16 bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100 resize-none" placeholder="Proteína, Creatina..." />
                     </div>
                     <div>
                        <label className="block text-xs text-scout-400 mb-1">Restricciones</label>
                        <textarea value={restrictionsStr} onChange={e => setRestrictionsStr(e.target.value)} className="w-full h-16 bg-scout-900 border border-scout-700 rounded p-2 text-sm text-scout-100 resize-none" placeholder="Sin Gluten..." />
                     </div>
                  </div>
               </div>
             </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-scout-700 bg-scout-900/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-scout-400 hover:text-scout-200">Cancelar</button>
          <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-scout-accent hover:bg-emerald-400 text-scout-900 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};