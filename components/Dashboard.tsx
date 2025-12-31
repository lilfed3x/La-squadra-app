
import React from 'react';
import { Player } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardProps {
  players: Player[];
}

export const Dashboard: React.FC<DashboardProps> = ({ players }) => {
  // --- Data Calculations ---
  
  // Squad Value (Sum of marketValue string parsing)
  const totalValue = players.reduce((sum, p) => {
    // Safety check for missing marketValue
    const rawValue = p.marketValue ? String(p.marketValue) : '0';
    // Remove currency symbol and 'M' suffix, keep numbers and dots
    const cleanValue = rawValue.replace(/[^0-9.]/g, ''); 
    const val = parseFloat(cleanValue);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Average Age
  const avgAge = players.length > 0 
    ? (players.reduce((sum, p) => sum + (p.age || 0), 0) / players.length).toFixed(1) 
    : "0";

  // Top Scorer Mock (Just picking highest rating for demo as 'Scorer' isn't in stat model)
  // Ensure we handle potential missing scoutRating
  const sortedPlayers = [...players].sort((a, b) => (b.scoutRating || 0) - (a.scoutRating || 0));
  const topRated = sortedPlayers.length > 0 ? sortedPlayers[0] : null;

  // Position Distribution
  const positions = players.reduce((acc, p) => {
    const pos = p.position || 'Unknown';
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const positionData = Object.keys(positions).map(pos => ({ name: pos, value: positions[pos] }));
  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];

  // Top Contributors (Mocking goals data for visual match)
  const contributorsData = players.slice(0, 5).map(p => ({
    name: p.name && p.name.split(' ').length > 1 ? p.name.split(' ')[1] : (p.name || 'Unknown'), // Last name
    fullName: p.name || 'Unknown',
    goals: Math.floor((p.scoutRating || 0) / 3) // Mock goals based on rating
  })).sort((a,b) => b.goals - a.goals);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar space-y-6 pb-20 md:pb-6">
      <h1 className="text-xl md:text-2xl font-bold text-white mb-6">Panel de Análisis del Equipo</h1>

      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 md:h-96 text-scout-500 border border-dashed border-scout-700 rounded-xl bg-scout-800/30 p-6 text-center">
            <p className="text-lg font-medium text-scout-300">No hay datos de jugadores disponibles</p>
            <p className="text-sm mt-2">Ve a la sección Base de Datos para añadir jugadores.</p>
        </div>
      ) : (
        <>
          {/* Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg">
              <p className="text-scout-400 text-xs font-medium uppercase tracking-wider mb-1">Valor Total de Plantilla</p>
              <div className="text-3xl font-bold text-white mb-2">€{totalValue}M</div>
              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                 <span>↗ 12% vs mes anterior</span>
              </div>
            </div>

            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg">
              <p className="text-scout-400 text-xs font-medium uppercase tracking-wider mb-1">Tamaño de Plantilla</p>
              <div className="text-3xl font-bold text-white mb-2">{players.length}</div>
              <p className="text-xs text-scout-500">Jugadores Activos</p>
            </div>

            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg">
              <p className="text-scout-400 text-xs font-medium uppercase tracking-wider mb-1">Edad Media</p>
              <div className="text-3xl font-bold text-white mb-2">{avgAge}</div>
              <p className="text-xs text-scout-500">Años</p>
            </div>

            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg">
              <p className="text-scout-400 text-xs font-medium uppercase tracking-wider mb-1">Mejor Valorado</p>
              <div className="text-xl font-bold text-white mb-1 truncate">{topRated ? topRated.name : '-'}</div>
              <p className="text-xs text-blue-400 font-medium">{topRated ? topRated.scoutRating : 0} OVR</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Squad Position Distribution */}
            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg flex flex-col">
              <h3 className="text-sm font-bold text-white mb-4">Distribución de Posiciones</h3>
              {/* FIX: Fixed height container instead of flex-1 to prevent width(-1) error */}
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={positionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {positionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs text-scout-300 ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Goal Contributors */}
            <div className="bg-scout-800 p-5 rounded-xl border border-scout-700 shadow-lg flex flex-col">
              <h3 className="text-sm font-bold text-white mb-4">Jugadores Clave (Estadísticas Proyectadas)</h3>
              {/* FIX: Fixed height container instead of flex-1 */}
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={contributorsData}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip 
                      cursor={{fill: '#334155', opacity: 0.2}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                      labelStyle={{ color: '#f8fafc' }}
                      formatter={(value: number) => [`${value} Goles`, '']}
                    />
                    <Bar dataKey="goals" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
