import React from 'react';

interface TacticalPitchProps {
  position: string;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({ position }) => {
  // Determine position coordinates based on role (Spanish codes)
  let cx = "50%";
  let cy = "50%";
  
  // Normalizar para comparación flexible
  const pos = position.toLowerCase().trim();

  // Helper for strict code checking (e.g. matches "ed" or "ed - ...")
  const hasCode = (code: string) => pos === code || pos.startsWith(`${code} `) || pos.startsWith(`${code}-`);

  // Goalkeeper
  if (hasCode("ar") || pos.includes("arquero") || pos.includes("portero")) { cx = "50%"; cy = "90%"; }

  // Defenders
  else if (hasCode("dcd") || (pos.includes("central") && pos.includes("derech"))) { cx = "65%"; cy = "75%"; }
  else if (hasCode("dci") || (pos.includes("central") && pos.includes("izquierd"))) { cx = "35%"; cy = "75%"; }
  else if (hasCode("ld") || (pos.includes("lateral") && pos.includes("derech"))) { cx = "85%"; cy = "70%"; }
  else if (hasCode("li") || (pos.includes("lateral") && pos.includes("izquierd"))) { cx = "15%"; cy = "70%"; }
  
  // Fallback for generic central/defender if exact code not matched
  else if (pos.includes("defensa central") || pos.includes("central") || pos.includes("defensor")) { cx = "50%"; cy = "75%"; }

  // Midfielders
  else if (hasCode("mcd") || (pos.includes("mediocentro") && pos.includes("defensivo"))) { cx = "50%"; cy = "60%"; }
  else if (hasCode("mo") || pos.includes("ofensivo") || pos.includes("mediapunta") || pos.includes("enganche")) { cx = "50%"; cy = "35%"; }
  else if (hasCode("mc") || pos.includes("mediocentro") || pos.includes("volante")) { cx = "50%"; cy = "50%"; }

  // Forwards
  else if (hasCode("ed") || (pos.includes("extremo") && pos.includes("derech"))) { cx = "85%"; cy = "25%"; }
  else if (hasCode("ei") || (pos.includes("extremo") && pos.includes("izquierd"))) { cx = "15%"; cy = "25%"; }
  else if (hasCode("sd") || pos.includes("segundo delantero")) { cx = "50%"; cy = "25%"; }
  else if (hasCode("cd") || pos.includes("centrodelantero") || pos.includes("delantero") || pos.includes("ariete") || pos.includes("punta")) { cx = "50%"; cy = "15%"; }

  // Generic fallbacks just in case
  else if (pos.includes("extremo") || pos.includes("banda")) {
      if (pos.includes("izquierd")) { cx = "15%"; cy = "25%"; }
      else { cx = "85%"; cy = "25%"; }
  }

  return (
    <div className="w-full h-full bg-emerald-700/80 rounded-lg relative overflow-hidden border border-emerald-600/50 flex items-center justify-center p-4">
      {/* Pitch Lines */}
      <div className="relative w-full h-full border-2 border-white/30 rounded">
         {/* Center Line */}
         <div className="absolute top-1/2 left-0 w-full h-px bg-white/30 -translate-y-1/2"></div>
         {/* Center Circle */}
         <div className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
         {/* Top Penalty Area */}
         <div className="absolute top-0 left-1/2 w-1/2 h-1/5 border-b-2 border-x-2 border-white/30 -translate-x-1/2"></div>
         {/* Bottom Penalty Area */}
         <div className="absolute bottom-0 left-1/2 w-1/2 h-1/5 border-t-2 border-x-2 border-white/30 -translate-x-1/2"></div>
      </div>

      {/* Player Marker */}
      <div 
        className="absolute w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse"
        style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)' }}
      ></div>
      
      {/* Position Label */}
      <div 
        className="absolute px-2 py-0.5 bg-black/70 text-[10px] text-white rounded whitespace-nowrap font-bold"
        style={{ left: cx, top: cy, transform: 'translate(-50%, 20px)' }}
      >
        {position.split(' - ')[0]} {/* Show code if available (e.g. MCD), else full text */}
      </div>
    </div>
  );
};