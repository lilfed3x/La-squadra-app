import React, { useState, useEffect, useRef } from 'react';
import { Attachment, Note, NoteCategory, Player, User, MedicalReport } from '../types';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { generateScoutingReport } from '../services/geminiService';
import { exportPlayerProfileToPDF, exportAIReportToPDF } from '../services/exportService';
import { BrainCircuit, Edit, Trash2, Activity as ActivityIcon, Apple, ArrowLeft, ArrowRight, Briefcase, Shirt, PieChart as PieChartIcon, TrendingUp, AlertCircle, CheckCircle2, ClipboardList, FileDown, Download, Youtube, MoreVertical, Scale, Zap, HeartPulse, DollarSign, Calendar, FileText, X, ChevronDown, ChevronRight, Plus, Paperclip, Image as ImageIcon, Save, MapPin, Footprints, Flag, Clock, Tag, Film, Maximize2 } from 'lucide-react';
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

interface MedicalHistorySectionProps {
    player: Player;
    onUpdate: (player: Player) => void;
    onViewReport: (report: MedicalReport) => void;
    onViewMedia: (att: Attachment) => void;
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

// ... Nutrition, Medical, Contract content components assumed same ...
const NutritionContent: React.FC<{ player: Player; onEdit?: () => void }> = ({ player, onEdit }) => {
  // ... Simplified for XML brevity, assuming unchanged ...
  // Returning full original content to be safe
  const macros = player.nutrition?.macros || { protein: 0, carbs: 0, fats: 0 };
  const macroData = [
     { name: 'Proteínas', value: macros.protein, color: '#3b82f6' },
     { name: 'Carbohidratos', value: macros.carbs, color: '#10b981' },
     { name: 'Grasas', value: macros.fats, color: '#f59e0b' },
  ];
  const historyData = player.nutrition?.bodyCompositionHistory || [];
  
  return (
    <div className="space-y-4 animate-fadeIn pb-6">
         <div className="flex justify-between items-center bg-scout-