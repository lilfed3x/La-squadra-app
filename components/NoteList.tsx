
import React, { useMemo, useState } from 'react';
import { Note, NoteCategory, User, Attachment } from '../types';
import { Clock, Filter, Search, Tag, SlidersHorizontal, Image as ImageIcon, Film, Trash2, Edit2, Youtube } from 'lucide-react';

interface NoteListProps {
  notes: Note[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: NoteCategory | 'All';
  setSelectedCategory: (c: NoteCategory | 'All') => void;
  currentUser: User | null;
  allUsers: User[];
  onEditNote?: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
}

// Helper to extract YouTube ID (duplicated here to avoid prop drilling complex utils, or could be moved to shared file)
const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  currentUser,
  allUsers,
  onEditNote,
  onDeleteNote
}) => {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotes = useMemo(() => {
    let result = notes.filter((note) => {
      const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
      const matchesAuthor = filterAuthor === 'all' || note.scoutId === filterAuthor;
      
      return matchesSearch && matchesCategory && matchesAuthor;
    });

    result.sort((a, b) => {
      return sortBy === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });

    return result;
  }, [notes, searchQuery, selectedCategory, filterAuthor, sortBy]);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-419', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const getScoutDetails = (scoutId: string) => {
    const scout = allUsers.find(u => u.id === scoutId);
    if (scout) {
        return { name: scout.name, avatar: scout.avatar || '' };
    }
    return { name: 'Scout Desconocido', avatar: '' };
  };

  const getCategoryColor = (cat: NoteCategory) => {
    switch (cat) {
      case NoteCategory.STRENGTH: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case NoteCategory.WEAKNESS: return 'text-red-400 bg-red-400/10 border-red-400/20';
      case NoteCategory.TACTICAL: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case NoteCategory.TECHNICAL: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case NoteCategory.PHYSICAL: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case NoteCategory.MENTAL: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-scout-300 bg-scout-700 border-scout-600';
    }
  };

  const renderAttachment = (att: Attachment) => {
      if (att.type === 'image') {
          return <img src={att.url} alt={att.name} className="w-full h-full object-cover transform group-hover/media:scale-105 transition-transform duration-300" />;
      } 
      
      if (att.type === 'youtube') {
          const vidId = getYoutubeId(att.url);
          const thumbUrl = vidId ? `https://img.youtube.com/vi/${vidId}/0.jpg` : '';
          return (
             <div className="w-full h-full relative">
               <img src={thumbUrl} alt="Youtube" className="w-full h-full object-cover opacity-90 transform group-hover/media:scale-105 transition-transform duration-300" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                     <Youtube className="w-4 h-4 text-white fill-current" />
                  </div>
               </div>
               <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                  <p className="text-[9px] text-white truncate text-center">YouTube</p>
               </div>
             </div>
          );
      }

      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-scout-400">
            <Film className="w-8 h-8 mb-1" />
            <span className="text-[10px] uppercase font-bold">Video</span>
        </div>
      );
  };

  const handleAttachmentClick = (att: Attachment) => {
      if (att.type === 'youtube') {
          window.open(att.url, '_blank');
      } else {
          // Default behavior for images/videos (could open a modal light box in future)
          const w = window.open('about:blank');
          if (w) {
              w.document.write(`<img src="${att.url}" style="max-width:100%; height:auto;">`);
          }
      }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Search & Filter Bar */}
      <div className="bg-scout-800 rounded-xl p-3 border border-scout-700 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar notas, etiquetas o contenido..."
              className="w-full bg-scout-900 text-scout-200 pl-9 pr-4 py-2 rounded-lg border border-scout-700 focus:border-scout-500 outline-none text-sm placeholder:text-scout-600 transition-colors"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'bg-scout-700 border-scout-500 text-scout-100' : 'bg-scout-900 border-scout-700 text-scout-400 hover:text-scout-200'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-scout-700/50 animate-fadeIn">
            <div>
              <label className="text-[10px] uppercase text-scout-500 font-bold tracking-wider mb-1 block">Categoría</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as NoteCategory | 'All')}
                className="w-full bg-scout-900 text-scout-200 px-3 py-2 rounded-lg border border-scout-700 focus:border-scout-500 outline-none text-sm"
              >
                <option value="All">Todas las Categorías</option>
                {Object.values(NoteCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] uppercase text-scout-500 font-bold tracking-wider mb-1 block">Autor</label>
              <select 
                value={filterAuthor}
                onChange={(e) => setFilterAuthor(e.target.value)}
                className="w-full bg-scout-900 text-scout-200 px-3 py-2 rounded-lg border border-scout-700 focus:border-scout-500 outline-none text-sm"
              >
                <option value="all">Todos los Scouts</option>
                {allUsers.map(scout => (
                  <option key={scout.id} value={scout.id}>{scout.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase text-scout-500 font-bold tracking-wider mb-1 block">Ordenar por</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="w-full bg-scout-900 text-scout-200 px-3 py-2 rounded-lg border border-scout-700 focus:border-scout-500 outline-none text-sm"
              >
                <option value="newest">Más Recientes</option>
                <option value="oldest">Más Antiguos</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-scout-500 border border-dashed border-scout-700 rounded-xl bg-scout-800/30">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No se encontraron notas con estos criterios.</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const scout = getScoutDetails(note.scoutId);
            // Permission check: Edit/Delete only if current user is the author
            const isOwner = currentUser && note.scoutId === currentUser.id;

            return (
              <div key={note.id} className="bg-scout-800 p-4 rounded-xl border border-scout-700 hover:border-scout-600 transition-all group animate-slideIn relative">
                
                {/* Edit/Delete Actions */}
                {isOwner && (
                   <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button 
                        onClick={() => onEditNote && onEditNote(note)}
                        className="p-1.5 bg-scout-700 hover:bg-blue-500/20 text-scout-400 hover:text-blue-400 rounded-md transition-colors"
                        title="Editar Nota"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => onDeleteNote && onDeleteNote(note.id)}
                        className="p-1.5 bg-scout-700 hover:bg-red-500/20 text-scout-400 hover:text-red-400 rounded-md transition-colors"
                        title="Eliminar Nota"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                   </div>
                )}

                <div className="flex justify-between items-start mb-2 pr-16">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(note.category)}`}>
                      {note.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-scout-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(note.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-scout-100 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                  {note.content}
                </p>

                {/* Attachments Grid */}
                {note.attachments && note.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {note.attachments.map(att => (
                      <div 
                        key={att.id} 
                        onClick={() => handleAttachmentClick(att)}
                        className="relative w-24 h-24 rounded-lg overflow-hidden border border-scout-600 bg-scout-900 group/media cursor-pointer hover:border-scout-accent transition-colors"
                      >
                        {renderAttachment(att)}
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{att.type === 'youtube' ? 'Abrir' : 'Ver'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-scout-700/50 pt-3 mt-2">
                   <div className="flex flex-wrap gap-2">
                    {note.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[10px] text-scout-400 bg-scout-900/50 px-1.5 py-0.5 rounded border border-scout-700">
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-auto pl-4">
                    <div className="text-right">
                       <span className="text-[10px] text-scout-500 font-medium block leading-tight">{scout.name}</span>
                       <span className="text-[9px] text-scout-600 leading-tight">Scout</span>
                    </div>
                    {scout.avatar ? (
                      <img src={scout.avatar} alt={scout.name} className="w-6 h-6 rounded-full border border-scout-600" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-scout-600 flex items-center justify-center text-[10px] text-white">
                        {scout.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
