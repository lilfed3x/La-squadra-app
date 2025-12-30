
import React from 'react';

interface TacticalPitchProps {
  position: string;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({ position }) => {
  // Determine position coordinates based on role (Spanish codes)
  // Coordinates are in % (0-100 relative to SVG viewBox 100x140)
  // X: 0 (Left) -> 100 (Right)
  // Y: 0 (Top/Attack) -> 140 (Bottom/Defense)
  
  let x = 50;
  let y = 70; // Default center
  
  // Normalizar para comparación flexible
  const pos = position.toLowerCase().trim();
  const hasCode = (code: string) => pos === code || pos.startsWith(`${code} `) || pos.startsWith(`${code}-`);

  // Map 0-100 percentage logic to 0-140 height roughly
  // We used percentage logic previously where 0=Top, 100=Bottom. 
  // SVG Height is 140. So Y_svg = Y_percent * 1.4 roughly.

  // Goalkeeper (Bottom)
  if (hasCode("ar") || pos.includes("arquero") || pos.includes("portero")) { x = 50; y = 126; } // ~90%

  // Defenders (Bottom half)
  else if (hasCode("dcd") || (pos.includes("central") && pos.includes("derech"))) { x = 65; y = 105; } // ~75%
  else if (hasCode("dci") || (pos.includes("central") && pos.includes("izquierd"))) { x = 35; y = 105; }
  else if (hasCode("ld") || (pos.includes("lateral") && pos.includes("derech"))) { x = 85; y = 98; } // ~70%
  else if (hasCode("li") || (pos.includes("lateral") && pos.includes("izquierd"))) { x = 15; y = 98; }
  else if (pos.includes("defensa central") || pos.includes("central") || pos.includes("defensor")) { x = 50; y = 105; }

  // Midfielders (Center)
  else if (hasCode("mcd") || (pos.includes("mediocentro") && pos.includes("defensivo"))) { x = 50; y = 84; } // ~60%
  else if (hasCode("mo") || pos.includes("ofensivo") || pos.includes("mediapunta") || pos.includes("enganche")) { x = 50; y = 49; } // ~35%
  else if (hasCode("mc") || pos.includes("mediocentro") || pos.includes("volante")) { x = 50; y = 70; } // 50%

  // Forwards (Top)
  else if (hasCode("ed") || (pos.includes("extremo") && pos.includes("derech"))) { x = 85; y = 35; } // ~25%
  else if (hasCode("ei") || (pos.includes("extremo") && pos.includes("izquierd"))) { x = 15; y = 35; }
  else if (hasCode("sd") || pos.includes("segundo delantero")) { x = 50; y = 35; }
  else if (hasCode("cd") || pos.includes("centrodelantero") || pos.includes("delantero") || pos.includes("ariete") || pos.includes("punta")) { x = 50; y = 21; } // ~15%
  
  // Fallbacks
  else if (pos.includes("extremo") || pos.includes("banda")) {
      if (pos.includes("izquierd")) { x = 15; y = 35; }
      else { x = 85; y = 35; }
  }

  // Label text shortening
  const labelText = position.split(' - ')[0].replace('Mediocentro', 'MC').replace('Defensa', 'DEF').substring(0, 8);

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
        <svg 
            viewBox="0 0 100 140" 
            className="h-full w-auto max-w-full drop-shadow-2xl"
            style={{ maxHeight: '100%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
            preserveAspectRatio="xMidYMid meet"
        >
            {/* Pitch Grass & Pattern */}
            <defs>
                <linearGradient id="grassGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#065f46" /> {/* Emerald 800 */}
                    <stop offset="100%" stopColor="#047857" /> {/* Emerald 700 */}
                </linearGradient>
                <pattern id="lawnStripe" width="100" height="20" patternUnits="userSpaceOnUse">
                    <rect width="100" height="10" fill="rgba(255,255,255,0.03)" />
                </pattern>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width="100" height="140" fill="url(#grassGradient)" rx="4" ry="4" />
            <rect x="0" y="0" width="100" height="140" fill="url(#lawnStripe)" rx="4" ry="4" />

            {/* Pitch Lines Group */}
            <g stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none">
                {/* Outer Boundary */}
                <rect x="5" y="5" width="90" height="130" />
                
                {/* Halfway Line */}
                <line x1="5" y1="70" x2="95" y2="70" opacity="0.8" />
                
                {/* Center Circle */}
                <circle cx="50" cy="70" r="10" />
                <circle cx="50" cy="70" r="1" fill="white" />

                {/* --- Top Area (Attack) --- */}
                {/* Penalty Area */}
                <rect x="22" y="5" width="56" height="18" />
                {/* Goal Area */}
                <rect x="36" y="5" width="28" height="6" />
                {/* Penalty Arc */}
                <path d="M 36 23 Q 50 29 64 23" />
                {/* Penalty Spot */}
                <circle cx="50" cy="16" r="0.6" fill="white" />

                {/* --- Bottom Area (Defense) --- */}
                {/* Penalty Area */}
                <rect x="22" y="117" width="56" height="18" />
                {/* Goal Area */}
                <rect x="36" y="129" width="28" height="6" />
                {/* Penalty Arc */}
                <path d="M 36 117 Q 50 111 64 117" />
                {/* Penalty Spot */}
                <circle cx="50" cy="124" r="0.6" fill="white" />
                
                {/* Corner Arcs */}
                <path d="M 5 8 Q 8 8 8 5" />
                <path d="M 95 8 Q 92 8 92 5" />
                <path d="M 5 132 Q 8 132 8 135" />
                <path d="M 95 132 Q 92 132 92 135" />
            </g>

            {/* Player Marker Animation */}
            <g filter="url(#glow)">
                <circle cx={x} cy={y} r="3.5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx={x} cy={y} r="6" fill="#fbbf24" opacity="0.4">
                    <animate attributeName="r" values="3.5;7;3.5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
            </g>
            
            {/* Position Label Tag */}
            <g transform={`translate(${x}, ${y + 9})`}>
                <rect x="-14" y="-4" width="28" height="8" rx="2" fill="#0f172a" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <text x="0" y="1.5" fontSize="4" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
                    {labelText}
                </text>
            </g>
        </svg>
    </div>
  );
};
