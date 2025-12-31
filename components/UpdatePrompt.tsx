import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Zap } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Optional: Check for updates periodically
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000); // Check every minute
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideInLeft">
      <div className="bg-scout-800 border border-scout-gold/50 shadow-2xl shadow-black/50 rounded-xl p-4 w-80 backdrop-blur-md">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-scout-gold/20 rounded-lg">
                <Zap className="w-5 h-5 text-scout-gold animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Actualización Disponible</h3>
              <p className="text-xs text-scout-400 mt-0.5">Nueva versión de La Squadra lista.</p>
            </div>
          </div>
          <button onClick={close} className="text-scout-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-2 mt-2">
           <button 
             onClick={() => updateServiceWorker(true)}
             className="flex-1 bg-scout-gold hover:bg-yellow-500 text-scout-900 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/10"
           >
             <RefreshCw className="w-3.5 h-3.5" />
             Actualizar Ahora
           </button>
        </div>
      </div>
    </div>
  );
};