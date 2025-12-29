import React from 'react';
import { Player } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { TrendingUp, Activity, Crosshair } from 'lucide-react';

interface PlayerStatsDashboardProps {
  player: Player;
}

export const PlayerStatsDashboard: React.FC<PlayerStatsDashboardProps> = ({ player }) => {
  // Mocking historical data based on current stats to simulate season progression
  const seasonData = [
    { match: 'J1', rating: player.scoutRating - 5, xG: 0.2, xA: 0.1 },
    { match: 'J2', rating: player.scoutRating - 2, xG: 0.4, xA: 0.3 },
    { match: 'J3', rating: player.scoutRating + 1, xG: 0.8, xA: 0.0 },
    { match: 'J4', rating: player.scoutRating - 1, xG: 0.1, xA: 0.5 },
    { match: 'J5', rating: player.scoutRating + 2, xG: 0.9, xA: 0.2 },
    { match: 'J6', rating: player.scoutRating + 4, xG: 1.2, xA: 0.4 },
  ];

  const attributeComparison = [
    { name: 'Técnico', value: (player.stats.dribbling + player.stats.passing + player.stats.shooting) / 3 },
    { name: 'Físico', value: (player.stats.pace + player.stats.physical) / 2 },
    { name: 'Defensivo', value: player.stats.defending },
    { name: 'Mental', value: player.scoutRating }, // Using OVR as proxy for mental
  ];

  // Mock Shot Map Data
  const shotMapData = [
    { x: 85, y: 50, z: 80, isGoal: true },
    { x: 75, y: 40, z: 40, isGoal: false },
    { x: 90, y: 55, z: 95, isGoal: true },
    { x: 70, y: 60, z: 30, isGoal: false },
    { x: 88, y: 45, z: 85, isGoal: true },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Season Trend */}
        <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-scout-accent" />
            <h3 className="text-sm font-bold text-scout-100 uppercase tracking-wider">Trayectoria de Forma (Últimos 6 Partidos)</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seasonData}>
                <defs>
                  <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="match" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[60, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRating)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attribute Breakdown */}
        <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-scout-100 uppercase tracking-wider">Análisis por Categoría</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attributeComparison} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={70} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Advanced Metrics / Shot Map Simulation */}
      <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 shadow-sm">
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-scout-100 uppercase tracking-wider">Análisis de Zona de Impacto (xG vs Real)</h3>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Gol</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Fallo</span>
            </div>
         </div>
         <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Posición X" unit="m" stroke="#94a3b8" domain={[0, 100]} />
                <YAxis type="number" dataKey="y" name="Posición Y" unit="m" stroke="#94a3b8" domain={[0, 100]} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Calidad xG" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Scatter name="Tiros" data={shotMapData} fill="#8884d8">
                  {shotMapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isGoal ? '#10b981' : '#64748b'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};