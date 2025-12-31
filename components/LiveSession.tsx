
import React, { useState, useEffect, useRef } from 'react';
import { Player, Note, NoteCategory, User, Comment } from '../types';
import { dataService } from '../services/dataService';
import { Zap, Send, MessageSquare, Heart, Clock, User as UserIcon, AlertCircle, ChevronDown, Check, TrendingUp, Users } from 'lucide-react';
import { nanoid } from 'nanoid';

interface LiveSessionProps {
  players: Player[];
  user: User;
}

export const LiveSession: React.FC<LiveSessionProps> = ({ players, user }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [currentNote, setCurrentNote] = useState('');
  const [liveNotes, setLiveNotes] = useState<Note[]>([]);
  const [activeComments, setActiveComments] = useState<string | null>(null); // Note ID
  const [commentText, setCommentText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLiveNotes(dataService.getNotes().sort((a, b) => b.timestamp - a.timestamp));
    const unsubscribe = dataService.subscribe(() => {
      setLiveNotes(dataService.getNotes().sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => unsubscribe();
  }, []);

  const handleQuickNote = (cat: NoteCategory, content?: string) => {
    if (!selectedPlayerId) return;
    const note: Note = {
      id: nanoid(),
      playerId: selectedPlayerId,
      scoutId: user.id,
      content: content || `Observación de ${cat} en tiempo real.`,
      category: cat,
      tags: ['Live', cat],
      attachments: [],
      timestamp: Date.now(),
      comments: [],
      likes: []
    };
    dataService.addNote(note);
    if (!content) setCurrentNote('');
  };

  const postNote = () => {
    if (!currentNote.trim() || !selectedPlayerId) return;
    handleQuickNote(NoteCategory.GENERAL, currentNote);
    setCurrentNote('');
  };

  const handleLike = (note: Note) => {
    const likes = note.likes || [];
    const newLikes = likes.includes(user.id) ? likes.filter(id => id !== user.id) : [...likes, user.id];
    dataService.updateNote({ ...note, likes: newLikes });
  };

  const postComment = (note: Note) => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: nanoid(),
      scoutId: user.id,
      scoutName: user.name,
      scoutAvatar: user.avatar,
      content: commentText,
      timestamp: Date.now()
    };
    dataService.updateNote({ ...note, comments: [...(note.comments || []), newComment] });
    setCommentText('');
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Desconocido';

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#0b1120] overflow-hidden">
      
      {/* CONTROL PANEL */}
      <div className="w-full md:w-80 bg-scout-900 border-b md:border-b-0 md:border-r border-scout-800 flex flex-col shrink-0 p-4">
        <h3 className="text-sm font-bold text-scout-gold mb-4 flex items-center gap-2">
           <Zap className="w-4 h-4" /> PANEL DE SCOUTING
        </h3>

        {/* Player Selector */}
        <div className="mb-6">
           <label className="text-[10px] text-scout-500 uppercase font-black mb-1.5 block">Jugador en Seguimiento</label>
           <select 
             value={selectedPlayerId} 
             onChange={(e) => setSelectedPlayerId(e.target.value)}
             className="w-full bg-scout-800 border border-scout-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 outline-none transition-all"
           >
             <option value="">Selecciona Jugador...</option>
             {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.team})</option>)}
           </select>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
           <button 
             onClick={() => handleQuickNote(NoteCategory.STRENGTH)}
             disabled={!selectedPlayerId}
             className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition-all disabled:opacity-20 flex flex-col items-center gap-2"
           >
              <TrendingUp className="w-4 h-4" /> FORTALEZA
           </button>
           <button 
             onClick={() => handleQuickNote(NoteCategory.WEAKNESS)}
             disabled={!selectedPlayerId}
             className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all disabled:opacity-20 flex flex-col items-center gap-2"
           >
              <AlertCircle className="w-4 h-4" /> DEBILIDAD
           </button>
           <button 
             onClick={() => handleQuickNote(NoteCategory.TACTICAL)}
             disabled={!selectedPlayerId}
             className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-bold transition-all disabled:opacity-20 flex flex-col items-center gap-2"
           >
              <Zap className="w-4 h-4" /> TÁCTICO
           </button>
           <button 
             onClick={() => handleQuickNote(NoteCategory.TECHNICAL)}
             disabled={!selectedPlayerId}
             className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-bold transition-all disabled:opacity-20 flex flex-col items-center gap-2"
           >
              <Users className="w-4 h-4" /> TÉCNICO
           </button>
        </div>

        {/* Note Input */}
        <div className="mt-auto">
           <textarea 
             value={currentNote}
             onChange={(e) => setCurrentNote(e.target.value)}
             placeholder="Escribe observación detallada..."
             className="w-full h-32 bg-scout-800 border border-scout-700 rounded-xl p-3 text-sm text-white resize-none focus:border-emerald-500 outline-none transition-all placeholder:text-scout-600"
           />
           <button 
             onClick={postNote}
             disabled={!currentNote.trim() || !selectedPlayerId}
             className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-scout-900 font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
           >
              <Send className="w-4 h-4" /> ENVIAR NOTA
           </button>
        </div>
      </div>

      {/* LIVE FEED */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-scout-800 bg-scout-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Feed de Sesión en Vivo</span>
            </div>
            <div className="text-[10px] text-scout-500 font-mono">USUARIOS ACTIVOS: {dataService.getUsers().length}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
           {liveNotes.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-30">
                   <Zap className="w-12 h-12 mb-4" />
                   <p className="text-sm">Inicia una observación para ver el feed</p>
               </div>
           ) : (
               liveNotes.map((note) => (
                   <div key={note.id} className="bg-scout-800 border border-scout-700 rounded-2xl p-4 animate-slideIn transition-all hover:border-scout-600">
                       <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-3">
                               <img src={dataService.getUsers().find(u => u.id === note.scoutId)?.avatar || `https://ui-avatars.com/api/?name=${note.scoutId}`} className="w-8 h-8 rounded-full border border-scout-700" alt="" />
                               <div>
                                   <div className="text-xs font-bold text-white">{dataService.getUsers().find(u => u.id === note.scoutId)?.name || 'Scout'}</div>
                                   <div className="text-[10px] text-emerald-400 font-bold uppercase">{note.category} • {getPlayerName(note.playerId)}</div>
                               </div>
                           </div>
                           <div className="text-[10px] text-scout-500 flex items-center gap-1 font-mono">
                               <Clock className="w-3 h-3" /> {new Date(note.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                           </div>
                       </div>

                       <p className="text-scout-100 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{note.content}</p>

                       {/* Interaction Bar */}
                       <div className="flex items-center gap-4 pt-3 border-t border-scout-700">
                           <button 
                             onClick={() => handleLike(note)}
                             className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${note.likes?.includes(user.id) ? 'text-emerald-400' : 'text-scout-500 hover:text-white'}`}
                           >
                               <Heart className={`w-4 h-4 ${note.likes?.includes(user.id) ? 'fill-current' : ''}`} />
                               {note.likes?.length || 0}
                           </button>
                           <button 
                             onClick={() => setActiveComments(activeComments === note.id ? null : note.id)}
                             className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${activeComments === note.id ? 'text-scout-gold' : 'text-scout-500 hover:text-white'}`}
                           >
                               <MessageSquare className="w-4 h-4" />
                               {note.comments?.length || 0} Feedback
                           </button>
                       </div>

                       {/* Comments Section */}
                       {activeComments === note.id && (
                           <div className="mt-4 pt-4 border-t border-scout-700 space-y-3 animate-fadeIn">
                               {note.comments?.map(comment => (
                                   <div key={comment.id} className="flex gap-3 text-xs bg-scout-900/50 p-3 rounded-xl border border-scout-700/50">
                                       <img src={comment.scoutAvatar || `https://ui-avatars.com/api/?name=${comment.scoutName}`} className="w-6 h-6 rounded-full shrink-0" alt="" />
                                       <div className="flex-1">
                                           <div className="flex justify-between items-center mb-1">
                                               <span className="font-bold text-white">{comment.scoutName}</span>
                                               <span className="text-[9px] text-scout-600">{new Date(comment.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                           </div>
                                           <p className="text-scout-300">{comment.content}</p>
                                       </div>
                                   </div>
                               ))}
                               <div className="flex gap-2 items-center">
                                   <input 
                                     type="text" 
                                     value={commentText}
                                     onChange={(e) => setCommentText(e.target.value)}
                                     placeholder="Escribe feedback..."
                                     className="flex-1 bg-scout-900 border border-scout-700 rounded-lg p-2 text-xs text-white outline-none focus:border-scout-gold"
                                   />
                                   <button 
                                     onClick={() => postComment(note)}
                                     className="bg-scout-gold text-scout-900 p-2 rounded-lg hover:bg-yellow-500 transition-all"
                                   >
                                       <Check className="w-4 h-4" />
                                   </button>
                               </div>
                           </div>
                       )}
                   </div>
               ))
           )}
        </div>
      </div>
    </div>
  );
};
