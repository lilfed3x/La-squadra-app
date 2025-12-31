
import React from 'react';
import { RefreshCw, X, Zap } from 'lucide-react';

// Use dynamic-style check or standard import with error handling
// In some preview environments, virtual modules might fail to resolve
let useRegisterSW: any;
try {
  // @ts-ignore
  const pwaModule = await import('virtual:pwa-register/react');
  useRegisterSW = pwaModule.useRegisterSW;
} catch (e) {
  // Fallback for environments without PWA support
  useRegisterSW = () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  });
}

export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error: any) {
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
