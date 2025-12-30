
import React from 'react';
import { Player } from '../types';
import { Check } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  isActive, 
  onClick, 
  isSelectionMode = false, 
  isSelected = false, 
  onToggleSelect 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 border relative overflow-hidden
        ${isActive 
          ? 'bg-scout-700 border-scout-accent shadow-lg shadow-scout-900/50' 
          : isSelected 
            ? 'bg-scout-800/80 border-scout-gold/50' 
            : 'bg-scout-800 border-transparent hover:bg-scout-700 hover:border-scout-600'
        }
      `}
    >
      {/* Selection Overlay/Checkbox */}
      {isSelectionMode && (
        <div 
          onClick={onToggleSelect}
          className="absolute inset-0 z-10 flex items-center bg-black/20 hover:bg-black/10 transition-colors pl-3"
        >
           <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-scout-gold border-scout-gold' : 'bg-scout-900/50 border-scout-500'}`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-scout-900 stroke-[3]" />}
           </div>
        </div>
      )}

      <img 
        src={player.imageUrl} 
        alt={player.name} 
        className={`w-12 h-12 rounded-full object-cover border-2 transition-all ${isSelected ? 'border-scout-gold grayscale-0' : 'border-scout-600'} ${isSelectionMode && !isSelected ? 'grayscale opacity-60' : ''}`}
      />
      
      <div className={`ml-3 overflow-hidden ${isSelectionMode ? 'pl-6' : ''} transition-all`}>
        <h3 className={`font-semibold truncate transition-colors ${isSelected ? 'text-scout-gold' : 'text-scout-100'}`}>{player.name}</h3>
        <p className="text-xs text-scout-400 flex items-center gap-2">
          <span className="bg-scout-900 px-1.5 py-0.5 rounded text-scout-300 font-mono">{player.position}</span>
          <span>{player.team}</span>
        </p>
      </div>
      
      <div className="ml-auto text-right">
        <div className={`text-sm font-bold ${player.scoutRating >= 90 ? 'text-scout-accent' : player.scoutRating >= 80 ? 'text-scout-warning' : 'text-scout-400'}`}>
          {player.scoutRating}
        </div>
        <div className="text-[10px] text-scout-500 uppercase">GRAL</div>
      </div>
    </div>
  );
};
