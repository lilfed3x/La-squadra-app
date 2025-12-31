
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
        flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 border relative overflow-hidden group
        ${isActive 
          ? 'bg-scout-700 border-scout-gold shadow-md' 
          : isSelected 
            ? 'bg-scout-800/80 border-scout-gold/50' 
            : 'bg-scout-800/30 border-transparent hover:bg-scout-800 hover:border-scout-700'
        }
      `}
    >
      {/* Selection Checkbox Overlay */}
      {isSelectionMode && (
        <div className="mr-3 flex items-center justify-center">
           <div 
             onClick={onToggleSelect}
             className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-scout-gold border-scout-gold' : 'bg-scout-900 border-scout-500 hover:border-scout-400'}`}
           >
              {isSelected && <Check className="w-3.5 h-3.5 text-scout-900 stroke-[3]" />}
           </div>
        </div>
      )}

      <img 
        src={player.imageUrl} 
        alt={player.name} 
        className={`w-10 h-10 rounded-full object-cover border transition-all ${isSelected ? 'border-scout-gold grayscale-0' : 'border-scout-700 group-hover:border-scout-500'} ${isSelectionMode && !isSelected ? 'grayscale opacity-70' : ''}`}
      />
      
      <div className="ml-3 flex-1 overflow-hidden min-w-0">
        <h3 className={`text-sm font-semibold truncate transition-colors leading-tight ${isSelected ? 'text-scout-gold' : 'text-scout-200 group-hover:text-white'}`}>{player.name}</h3>
        <p className="text-[10px] text-scout-500 flex items-center gap-1 mt-0.5 truncate">
          <span className="bg-scout-900 px-1 py-px rounded text-scout-400 font-mono tracking-tighter border border-scout-800">{player.position.split(' - ')[0]}</span>
          {player.scoutRating} Gral
        </p>
      </div>
      
      <div className="ml-2 text-right flex flex-col items-end">
        <div className={`text-xs font-bold ${player.scoutRating >= 85 ? 'text-scout-accent' : player.scoutRating >= 75 ? 'text-scout-gold' : 'text-scout-400'}`}>
          {player.scoutRating}
        </div>
      </div>
    </div>
  );
};
