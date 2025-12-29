import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  onClick: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 border
        ${isActive 
          ? 'bg-scout-700 border-scout-accent shadow-lg shadow-scout-900/50' 
          : 'bg-scout-800 border-transparent hover:bg-scout-700 hover:border-scout-600'
        }
      `}
    >
      <img 
        src={player.imageUrl} 
        alt={player.name} 
        className="w-12 h-12 rounded-full object-cover border-2 border-scout-600"
      />
      <div className="ml-3 overflow-hidden">
        <h3 className="font-semibold text-scout-100 truncate">{player.name}</h3>
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