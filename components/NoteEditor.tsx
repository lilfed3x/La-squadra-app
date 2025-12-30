
import React, { useState, useRef, useEffect } from 'react';
import { Attachment, NoteCategory } from '../types';
import { Plus, Sparkles, Tag, X, Paperclip, Image as ImageIcon, Film, Loader2, Save, AlertCircle, Youtube, Link as LinkIcon, Check } from 'lucide-react';
import { suggestNoteTags } from '../services/geminiService';
import { nanoid } from 'nanoid';

interface NoteEditorProps {
  onSave: (content: string, category: NoteCategory, tags: string[], attachments: Attachment[]) => void;
  onCancel: () => void;
  initialData?: {
    content: string;
    category: NoteCategory;
    tags: string[];
    attachments: Attachment[];
  };
}

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const NoteEditor: React.FC<NoteEditorProps> = ({ onSave, onCancel, initialData }) => {
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState<NoteCategory>(initialData?.category || NoteCategory.GENERAL);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube Link State
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    if (initialData) {
      setContent(initialData.content);
      setCategory(initialData.category);
      setTags(initialData.tags);
      setAttachments(initialData.attachments);
    }
  }, [initialData]);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAiSuggest = async () => {
    if (!content.trim()) return;
    setIsSuggesting(true);
    try {
      const suggestedTags = await suggestNoteTags(content);
      const newTags = Array.from(new Set([...tags, ...suggestedTags]));
      setTags(newTags);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Extended list of allowed MIME types
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      
      const isImage = allowedImageTypes.includes(file.type);
      const isVideo = allowedVideoTypes.includes(file.type);

      // 1. Validate File Type
      if (!isImage && !isVideo) {
        setUploadError(`Formato no soportado (${file.type}). Use JPG, PNG, GIF, WEBP para imágenes o MP4, MOV, AVI para video.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // 2. Validate Size (Limit to 5MB for localStorage safety)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        setUploadError('El archivo es demasiado grande. El límite es de 5MB para sincronización instantánea.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newAttachment: Attachment = {
            id: nanoid(),
            type: isVideo ? 'video' : 'image', // Use validated type flag
            url: ev.target.result as string,
            name: file.name
          };
          setAttachments(prev => [...prev, newAttachment]);
        }
      };

      reader.onerror = () => {
        setUploadError('Error al leer el archivo. Por favor inténtalo de nuevo.');
      };
      
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = () => {
    const videoId = getYoutubeId(linkUrl);
    
    if (videoId) {
      const newAttachment: Attachment = {
        id: nanoid(),
        type: 'youtube',
        url: linkUrl,
        name: `Video YouTube`
      };
      setAttachments(prev => [...prev, newAttachment]);
      setLinkUrl('');
      setShowLinkInput(false);
      setUploadError(null);
    } else {
      setUploadError('Enlace no válido. Por favor ingresa una URL válida de YouTube.');
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSave(content, category, tags, attachments);
    }
  };

  // Render thumbnail for youtube
  const renderAttachmentPreview = (att: Attachment) => {
     if (att.type === 'image') {
       return <img src={att.url} alt={att.name} className="w-full h-full object-cover" />;
     } else if (att.type === 'youtube') {
       const vidId = getYoutubeId(att.url);
       const thumbUrl = vidId ? `https://img.youtube.com/vi/${vidId}/0.jpg` : '';
       return (
         <div className="w-full h-full relative group">
           <img src={thumbUrl} alt="Youtube" className="w-full h-full object-cover opacity-80" />
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                <Youtube className="w-4 h-4 text-white fill-current" />
             </div>
           </div>
         </div>
       );
     } else {
       return (
          <div className="w-full h-full flex items-center justify-center text-scout-400 bg-scout-900">
            <Film className="w-8 h-8" />
          </div>
       );
     }
  };

  return (
    <div className="bg-scout-800 rounded-xl p-4 border border-scout-600 animate-fadeIn shadow-2xl">
      <h3 className="text-sm font-semibold text-scout-200 mb-3 flex items-center justify-between">
        <span>{initialData ? 'Editar Observación' : 'Nueva Observación'}</span>
        <span className="text-xs font-normal text-scout-500">Borrador</span>
      </h3>
      
      <form onSubmit={handleSubmit}>
        
        {/* Error Message Area */}
        {uploadError && (
          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError(null)} className="ml-auto hover:text-red-300"><X className="w-3 h-3"/></button>
          </div>
        )}

        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe tu observación aquí... Menciona tendencias del jugador, ideas tácticas o notas de carácter."
            className="w-full bg-scout-900 text-scout-100 p-3 rounded-lg border border-scout-700 focus:border-scout-accent focus:ring-1 focus:ring-scout-accent outline-none min-h-[120px] text-sm resize-none"
            autoFocus
          />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-2 bg-scout-900/50 rounded-lg border border-scout-700/50">
            {attachments.map(att => (
              <div key={att.id} className="relative group w-20 h-20 rounded-md overflow-hidden bg-scout-800 border border-scout-700">
                {renderAttachmentPreview(att)}
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white p-0.5 truncate px-1">
                  {att.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Controls Row */}
        <div className="flex flex-col gap-4 mb-4">
          
          {/* Categories */}
          <div>
            <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(NoteCategory).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                    ${category === cat 
                      ? 'bg-scout-accent text-scout-900 shadow-md shadow-scout-accent/20' 
                      : 'bg-scout-700 text-scout-400 hover:bg-scout-600 hover:text-scout-200'}
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags & Attachments Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center justify-between">
                <span>Etiquetas</span>
                 <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={isSuggesting || !content.trim()}
                  className="flex items-center gap-1 text-xs text-scout-accent hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className={`w-3 h-3 ${isSuggesting ? 'animate-spin' : ''}`} />
                  {isSuggesting ? 'Analizando...' : 'Auto-Etiquetar'}
                </button>
              </label>
              
              <div className="flex flex-wrap gap-2 mb-2 min-h-[26px]">
                {tags.map(tag => (
                  <span key={tag} className="bg-scout-700 text-scout-200 text-xs px-2 py-1 rounded flex items-center gap-1 border border-scout-600 animate-fadeIn">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-scout-danger">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="relative inline-flex items-center flex-1 min-w-[120px]">
                  <Tag className="w-3.5 h-3.5 text-scout-500 absolute left-2" />
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Añadir etiqueta..."
                    className="w-full bg-transparent text-scout-200 pl-7 pr-2 py-1 rounded border border-transparent hover:border-scout-700 focus:border-scout-500 outline-none text-xs transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto items-end">
              
              {showLinkInput ? (
                <div className="flex items-center gap-1 animate-scaleIn bg-scout-900 border border-scout-700 rounded-lg p-1 w-full sm:w-auto">
                   <input 
                    type="text" 
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Pegar enlace YouTube..."
                    className="bg-transparent text-xs text-white px-2 py-1 outline-none w-40"
                    autoFocus
                   />
                   <button 
                    type="button" 
                    onClick={handleAddLink}
                    className="p-1.5 bg-scout-accent text-scout-900 rounded hover:bg-emerald-400"
                   >
                     <Check className="w-3 h-3" />
                   </button>
                   <button 
                    type="button" 
                    onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
                    className="p-1.5 text-scout-400 hover:text-white"
                   >
                     <X className="w-3 h-3" />
                   </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(true)}
                    className="px-3 py-2 bg-scout-700 hover:bg-red-600 text-scout-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border border-scout-600 w-full sm:w-auto justify-center"
                    title="Añadir enlace de YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-scout-700 hover:bg-scout-600 text-scout-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border border-scout-600 w-full sm:w-auto justify-center"
                  >
                    <Paperclip className="w-4 h-4" />
                    Adjuntar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-scout-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-scout-400 hover:text-scout-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!content.trim()}
            className="px-6 py-2 bg-scout-accent hover:bg-emerald-400 text-scout-900 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-scout-accent/10"
          >
            {initialData ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {initialData ? 'Actualizar Nota' : 'Guardar Nota'}
          </button>
        </div>
      </form>
    </div>
  );
};
