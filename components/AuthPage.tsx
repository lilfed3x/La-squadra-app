import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { Activity, Lock, Mail, User as UserIcon, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { User, AppSettings } from '../types';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  appSettings: AppSettings;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, appSettings }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered credentials on mount
  useEffect(() => {
    const creds = AuthService.getRememberedCredentials();
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
      setRememberMe(true);
    }
  }, []);

  const clearState = () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  };

  const switchMode = (newMode: AuthMode) => {
    clearState();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);

    try {
      const result = await AuthService.login(email, password, rememberMe);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Falló el inicio de sesión');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);

    try {
      const result = await AuthService.register(name, email, password);
      if (result.success) {
        setSuccessMsg('¡Cuenta creada con éxito! Por favor inicia sesión.');
        setTimeout(() => switchMode('login'), 2000);
      } else {
        setError(result.error || 'Falló el registro');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);

    try {
      const result = await AuthService.requestPasswordReset(email);
      setSuccessMsg(result.message);
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="bg-[#1e293b] w-full max-w-md p-8 rounded-2xl border border-[#334155] shadow-2xl relative z-10 animate-fadeIn">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-scout-900 to-black rounded-xl flex items-center justify-center shadow-lg border border-scout-gold/30 mb-4 overflow-hidden">
             {appSettings.appLogoUrl ? (
                <img src={appSettings.appLogoUrl} alt="Logo" className="w-full h-full object-cover" />
             ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                    <path d="M4 21h16" />
                    <path d="M5 21V10a7 7 0 0 1 14 0v11" />
                    <path d="M5 10l7-5 7 5" />
                    <path d="M8 21V12a4 4 0 0 1 8 0v9" />
                    <path d="M12 2v3" />
                </svg>
             )}
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-1 text-center leading-tight" style={{fontFamily: 'Inter, sans-serif'}}>
             {appSettings.appName}
          </h1>
          <p className="text-scout-gold text-sm tracking-widest uppercase font-medium">Club Management Suite</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg mb-6 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMS */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg py-2 pl-10 pr-4 focus:border-scout-gold focus:ring-1 focus:ring-scout-gold outline-none transition-all"
                  placeholder="scout@lasquadra.com"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Contraseña</label>
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-scout-gold hover:text-yellow-400 transition-colors">¿Olvidaste?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg py-2 pl-10 pr-4 focus:border-scout-gold focus:ring-1 focus:ring-scout-gold outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember Credentials Checkbox */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-[#0f172a] text-scout-gold focus:ring-scout-gold focus:ring-offset-0 focus:outline-none cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-400 cursor-pointer select-none font-medium">Recordar credenciales</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-scout-gold hover:bg-yellow-500 text-[#0f172a] font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Iniciar Sesión <ArrowRight className="w-4 h-4" /></>}
            </button>
            <div className="text-center mt-4">
              <span className="text-slate-400 text-sm">¿No tienes cuenta? </span>
              <button type="button" onClick={() => switchMode('register')} className="text-scout-gold hover:text-yellow-400 text-sm font-semibold transition-colors">Registrarse</button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg py-2 pl-10 pr-4 focus:border-scout-gold focus:ring-1 focus:ring-scout-gold outline-none transition-all"
                  placeholder="Juan Scout"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg py-2 pl-10 pr-4 focus:border-scout-gold focus:ring-1 focus:ring-scout-gold outline-none transition-all"
                  placeholder="nombre@lasquadra.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Crear Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg py-2 pl-10 pr-4 focus:border-scout-gold focus:ring-1 focus:ring-scout-gold outline-none transition-all"
                  placeholder="Mín. 8 caracteres"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-scout-gold hover:bg-yellow-500 text-[#0f172a] font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Cuenta'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => switchMode('login')} className="text-slate-400 hover:text-white text-sm transition-colors">Volver al Inicio</button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-300 text-sm">Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg py-2 pl-10 pr-4 focus:border-scout-gold focus:ring-1 focus:ring-scout-gold outline-none transition-all"
                  placeholder="scout@lasquadra.com"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Enlace'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => switchMode('login')} className="text-slate-400 hover:text-white text-sm transition-colors">Volver al Inicio</button>
            </div>
          </form>
        )}
        
        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-[#334155] text-center">
           <p className="text-[10px] text-slate-500">
             Protegido por {appSettings.appName} SecureGuard™. <br/>
             Solo personal autorizado.
           </p>
        </div>

      </div>
    </div>
  );
};