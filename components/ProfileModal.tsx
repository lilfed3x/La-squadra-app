import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { X, Save, User as UserIcon, Camera, Briefcase, Calendar, FileText, Lock, Shield, Mail, AlertTriangle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (updates: Partial<User> & { newPassword?: string }) => void;
}

type Tab = 'general' | 'security';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, onSave }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [formData, setFormData] = useState<Partial<User>>({});
  const [email, setEmail] = useState('');
  
  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setActiveTab('general'); // Reset tab
      setSecurityError(null);
      setNewPassword('');
      setConfirmPassword('');
      
      // Initialize form
      setFormData({
        name: currentUser.name,
        avatar: currentUser.avatar || '',
        organization: currentUser.organization || '',
        age: currentUser.age || undefined,
        bio: currentUser.bio || ''
      });
      setEmail(currentUser.email);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);

    const updates: Partial<User> & { newPassword?: string } = { ...formData };

    // Handle Security Updates
    if (activeTab === 'security' || (email !== currentUser.email || newPassword)) {
       
       // Email validation
       if (!email.trim()) {
         setSecurityError('El correo electrónico es obligatorio.');
         return;
       }
       updates.email = email;

       // Password validation
       if (newPassword) {
         if (newPassword.length < 8) {
           setSecurityError('La nueva contraseña debe tener al menos 8 caracteres.');
           return;
         }
         if (newPassword !== confirmPassword) {
           setSecurityError('Las contraseñas no coinciden.');
           return;
         }
         updates.newPassword = newPassword;
       }
    }

    onSave(updates);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 1024 * 1024) {
        alert("La imagen es demasiado grande. Por favor usa una imagen menor a 1MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData(prev => ({ ...prev, avatar: ev.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-scout-800 rounded-2xl border border-scout-700 w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="p-4 border-b border-scout-700 bg-scout-900/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-scout-100 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-scout-gold" />
            Perfil del Scout
          </h2>
          <button onClick={onClose} className="text-scout-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-scout-700 bg-scout-900/30">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'general' ? 'border-scout-gold text-scout-gold bg-scout-800' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
          >
            <UserIcon className="w-4 h-4" /> General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'security' ? 'border-scout-gold text-scout-gold bg-scout-800' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
          >
            <Shield className="w-4 h-4" /> Seguridad
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          {activeTab === 'general' && (
            <div className="animate-fadeIn">
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-scout-600 group-hover:border-scout-gold transition-colors">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-scout-700 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-scout-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <p className="text-[10px] text-scout-500 mt-2">Haz clic para cambiar imagen</p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider">Nombre Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-scout-900 border border-scout-700 rounded-lg p-2.5 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Team / Organization */}
                  <div>
                      <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> Equipo / Org
                      </label>
                      <input 
                        type="text" 
                        value={formData.organization || ''} 
                        onChange={e => setFormData({...formData, organization: e.target.value})} 
                        className="w-full bg-scout-900 border border-scout-700 rounded-lg p-2.5 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors"
                        placeholder="Ej. FC Scout Club"
                      />
                  </div>
                  
                  {/* Age */}
                  <div>
                      <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Edad
                      </label>
                      <input 
                        type="number" 
                        value={formData.age || ''} 
                        onChange={e => setFormData({...formData, age: Number(e.target.value)})} 
                        className="w-full bg-scout-900 border border-scout-700 rounded-lg p-2.5 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors"
                        placeholder="Años"
                      />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Biografía / Descripción
                  </label>
                  <textarea 
                      value={formData.bio || ''}
                      onChange={e => setFormData({...formData, bio: e.target.value})}
                      className="w-full bg-scout-900 border border-scout-700 rounded-lg p-2.5 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors resize-none h-24"
                      placeholder="Breve descripción de tu experiencia y enfoque..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-fadeIn space-y-6">
              
              {securityError && (
                 <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">{securityError}</p>
                 </div>
              )}

              <div className="bg-scout-900/50 p-4 rounded-xl border border-scout-700 space-y-4">
                 <h3 className="text-sm font-bold text-scout-200 uppercase tracking-wider border-b border-scout-700 pb-2 mb-2">Credenciales de Acceso</h3>
                 
                 {/* Email */}
                 <div>
                    <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-1">
                       <Mail className="w-3 h-3" /> Correo Electrónico
                    </label>
                    <input 
                       type="email" 
                       required
                       value={email}
                       onChange={e => setEmail(e.target.value)}
                       className="w-full bg-scout-800 border border-scout-700 rounded-lg p-2.5 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors"
                    />
                    <p className="text-[10px] text-scout-500 mt-1">Usarás este correo para iniciar sesión la próxima vez.</p>
                 </div>

                 {/* Password Fields */}
                 <div className="pt-2">
                    <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-1">
                       <Lock className="w-3 h-3" /> Nueva Contraseña
                    </label>
                    <input 
                       type="password" 
                       value={newPassword}
                       onChange={e => setNewPassword(e.target.value)}
                       placeholder="Dejar vacío para mantener la actual"
                       className="w-full bg-scout-800 border border-scout-700 rounded-lg p-2.5 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors"
                       autoComplete="new-password"
                    />
                 </div>

                 {newPassword && (
                    <div className="animate-fadeIn">
                       <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider">
                          Confirmar Nueva Contraseña
                       </label>
                       <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className={`w-full bg-scout-800 border rounded-lg p-2.5 text-sm text-scout-100 outline-none transition-colors ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-scout-700 focus:border-scout-gold'}`}
                          autoComplete="new-password"
                       />
                       {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-[10px] text-red-400 mt-1">Las contraseñas no coinciden</p>
                       )}
                    </div>
                 )}
              </div>
            </div>
          )}

          {/* Footer Info & Actions */}
          <div className="pt-2 border-t border-scout-700/50 mt-4">
             {activeTab === 'general' && (
                <div className="flex justify-between items-center text-xs text-scout-500 mb-4">
                    <span>Rol: <span className="text-scout-300 capitalize">{currentUser.role}</span></span>
                </div>
             )}
          </div>

          <div className="flex justify-end pt-2">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-scout-400 hover:text-white mr-2">Cancelar</button>
             <button 
               type="submit" 
               className="px-6 py-2 bg-scout-gold hover:bg-yellow-500 text-scout-900 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all"
             >
               <Save className="w-4 h-4" />
               Guardar Cambios
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};