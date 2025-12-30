
import React, { useState } from 'react';
import { Users, X, Briefcase, Check } from 'lucide-react';

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (teamName: string) => void;
  count: number;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({ isOpen, onClose, onConfirm, count }) => {
  const [teamName, setTeamName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim()) {
      onConfirm(teamName.trim());
      setTeamName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-4 border-b border-scout-700 bg-scout-900/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-scout-gold" />
            Gestionar {count} Jugadores
          </h3>
          <button onClick={onClose} className="text-scout-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-scout-300 mb-4">
            Ingresa el nombre del nuevo equipo o grupo para asignar a los jugadores seleccionados. 
            Escribe <strong>"Agente Libre"</strong> para dejarlos sin equipo.
          </p>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-scout-500 uppercase tracking-wider mb-2">Nuevo Destino</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-4 h-4 text-scout-500" />
              <input
                type="text"
                autoFocus
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ej. Real Madrid, Agente Libre..."
                className="w-full bg-scout-900 border border-scout-600 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-scout-gold outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-scout-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!teamName.trim()}
              className="px-6 py-2 bg-scout-gold hover:bg-yellow-500 text-scout-900 font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Actualizar Equipos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
