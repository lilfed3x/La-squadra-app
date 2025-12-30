
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, User, BackupFrequency } from '../types';
import { X, Save, Layout, Type, Image as ImageIcon, Upload, Trash2, AlertTriangle, Users, Plus, Edit2, Shield, Search, CheckCircle, XCircle, Cloud, Loader2, CalendarClock } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AuthService } from '../services/authService';
import { googleDriveService } from '../services/googleDriveService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  currentUser: User;
}

type Tab = 'app' | 'users' | 'backups';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave, currentUser }) => {
  const [activeTab, setActiveTab] = useState<Tab>('app');
  const [formData, setFormData] = useState<AppSettings>(currentSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Management State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  
  // User Form Data
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState<'admin' | 'scout'>('scout');
  const [userFormOrg, setUserFormOrg] = useState('');
  const [userFormApproved, setUserFormApproved] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      setFormData(currentSettings);
      setActiveTab('app');
      // Load users
      if (isAdmin) {
          setUsersList(dataService.getUsers());
      }
    }
  }, [isOpen, currentSettings, isAdmin]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleClearDatabase = () => {
    if (window.confirm('¿Estás SEGURO? Esta acción eliminará TODOS los jugadores de la base de datos de forma permanente. No se puede deshacer.')) {
        dataService.clearPlayers();
        alert('Base de datos de jugadores eliminada correctamente.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) {
        alert("La imagen es demasiado grande. Máx 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData(prev => ({ ...prev, appLogoUrl: ev.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- GOOGLE DRIVE & BACKUP LOGIC ---
  const handleGoogleConnect = async () => {
     if (formData.googleDriveConnected) {
         googleDriveService.signOut();
         setFormData(prev => ({ ...prev, googleDriveConnected: false }));
     } else {
         const success = await googleDriveService.signIn();
         if (success) {
             setFormData(prev => ({ ...prev, googleDriveConnected: true }));
         }
     }
  };

  const handleManualBackup = async () => {
      setIsBackingUp(true);
      setBackupStatus("Iniciando respaldo...");
      try {
          const res = await googleDriveService.createBackup();
          if (res.success) {
              setBackupStatus("¡Respaldo completado!");
              setFormData(prev => ({ ...prev, lastBackupDate: new Date().toISOString() }));
              // Need to persist this specific update immediately to avoid UI drift
              dataService.saveSettings({ ...formData, lastBackupDate: new Date().toISOString() });
          } else {
              setBackupStatus("Error: " + res.message);
          }
      } catch (e) {
          setBackupStatus("Error inesperado.");
      } finally {
          setIsBackingUp(false);
      }
  };

  // --- USER MANAGEMENT LOGIC ---
  const refreshUsers = () => {
      setUsersList(dataService.getUsers());
  };

  const openAddUser = () => {
      setEditingUser(null);
      setUserFormName('');
      setUserFormEmail('');
      setUserFormPassword('');
      setUserFormRole('scout');
      setUserFormOrg('');
      setUserFormApproved(true); // Admin created users default to approved
      setUserFormError(null);
      setIsUserFormOpen(true);
  };

  const openEditUser = (user: User) => {
      setEditingUser(user);
      setUserFormName(user.name);
      setUserFormEmail(user.email);
      setUserFormPassword(''); // Empty means no change
      setUserFormRole(user.role);
      setUserFormOrg(user.organization || '');
      setUserFormApproved(user.approved !== false); // Default true if undefined
      setUserFormError(null);
      setIsUserFormOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
      if (userId === currentUser.id) {
          alert("No puedes eliminar tu propia cuenta desde aquí.");
          return;
      }
      if (window.confirm("¿Estás seguro de eliminar este usuario? Perderá acceso inmediato a la plataforma.")) {
          dataService.deleteUser(userId);
          refreshUsers();
      }
  };

  const handleToggleApproval = async (user: User) => {
      if (user.id === currentUser.id) return;
      
      const newStatus = !user.approved;
      try {
          await AuthService.adminUpdateUser(user.id, { approved: newStatus });
          refreshUsers();
      } catch (e) {
          console.error(e);
      }
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setUserFormError(null);

      try {
          if (editingUser) {
              // Update
              const updates: any = {
                  name: userFormName,
                  email: userFormEmail,
                  role: userFormRole,
                  organization: userFormOrg,
                  approved: userFormApproved
              };
              if (userFormPassword.trim()) {
                  updates.newPassword = userFormPassword;
              }

              const res = await AuthService.adminUpdateUser(editingUser.id, updates);
              if (!res.success) throw new Error(res.error);
          } else {
              // Create
              if (!userFormPassword) {
                  setUserFormError("La contraseña es obligatoria para nuevos usuarios.");
                  return;
              }
              const res = await AuthService.adminCreateUser(userFormName, userFormEmail, userFormPassword, userFormRole, userFormOrg);
              if (!res.success) throw new Error(res.error);
          }
          
          setIsUserFormOpen(false);
          refreshUsers();
      } catch (err: any) {
          setUserFormError(err.message || "Ocurrió un error.");
      }
  };

  const filteredUsers = usersList.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-scout-800 rounded-2xl border border-scout-700 w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-scout-700 bg-scout-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-scout-100 flex items-center gap-2">
            <Layout className="w-5 h-5 text-scout-gold" />
            Configuración y Administración
          </h2>
          <button onClick={onClose} className="text-scout-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {isAdmin && (
             <div className="flex border-b border-scout-700 bg-scout-900/30 shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab('app')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'app' ? 'border-scout-gold text-scout-gold bg-scout-800' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
                >
                    <Layout className="w-4 h-4" /> App
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'users' ? 'border-scout-gold text-scout-gold bg-scout-800' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
                >
                    <Users className="w-4 h-4" /> Gestión de Usuarios
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('backups')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'backups' ? 'border-scout-gold text-scout-gold bg-scout-800' : 'border-transparent text-scout-400 hover:text-scout-200'}`}
                >
                    <Cloud className="w-4 h-4" /> Copias de Seguridad
                </button>
             </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            
            {/* TAB: APP CONFIGURATION */}
            {activeTab === 'app' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* App Branding */}
                    {isAdmin && (
                        <div className="space-y-4">
                        <h3 className="text-xs uppercase font-bold text-scout-500 tracking-wider border-b border-scout-700 pb-2 mb-3">Personalización (Admin)</h3>
                        
                        <div>
                            <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-2">
                            <Type className="w-4 h-4" /> Nombre de la Aplicación
                            </label>
                            <input 
                            type="text" 
                            required
                            value={formData.appName} 
                            onChange={e => setFormData({...formData, appName: e.target.value})} 
                            className="w-full bg-scout-900 border border-scout-700 rounded-lg p-3 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors"
                            placeholder="Ej. LA SQUADRA"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-scout-400 mb-1.5 uppercase font-bold tracking-wider flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Logo de la Aplicación
                            </label>
                            
                            <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={formData.appLogoUrl} 
                                onChange={e => setFormData({...formData, appLogoUrl: e.target.value})} 
                                className="flex-1 bg-scout-900 border border-scout-700 rounded-lg p-3 text-sm text-scout-100 focus:border-scout-gold outline-none transition-colors truncate"
                                placeholder="URL de imagen o subir archivo..."
                            />
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-scout-700 hover:bg-scout-600 text-scout-200 px-4 rounded-lg border border-scout-600 transition-colors flex items-center justify-center"
                                title="Subir desde ordenador"
                            >
                                <Upload className="w-5 h-5" />
                            </button>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-scout-900/50 p-4 rounded-xl border border-scout-700/50 flex items-center justify-center gap-4">
                            <div className="text-xs text-scout-500 uppercase font-bold">Vista Previa:</div>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-scout-900 to-black rounded-xl flex items-center justify-center shadow-lg border border-scout-gold/30 mb-2 overflow-hidden bg-cover bg-center">
                                {formData.appLogoUrl ? (
                                    <img src={formData.appLogoUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                                        <path d="M4 21h16" />
                                        <path d="M5 21V10a7 7 0 0 1 14 0v11" />
                                        <path d="M5 10l7-5 7 5" />
                                        <path d="M8 21V12a4 4 0 0 1 8 0v9" />
                                        <path d="M12 2v3" />
                                    </svg>
                                )}
                                </div>
                                <span className="text-xs font-black tracking-widest text-white uppercase">{formData.appName}</span>
                            </div>
                        </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    <div className="space-y-4 pt-2 border-t border-scout-700 mt-4">
                        <h3 className="text-xs uppercase font-bold text-red-500 tracking-wider flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Zona de Peligro
                        </h3>
                        
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-red-300">Eliminar Base de Datos</div>
                                <div className="text-[10px] text-red-400/80">Borra todos los jugadores. Irreversible.</div>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleClearDatabase}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" /> Eliminar Todo
                            </button>
                        </div>
                    </div>

                    {/* App Config Save Button */}
                    <div className="flex justify-end pt-4 border-t border-scout-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-scout-400 hover:text-white mr-2">Cancelar</button>
                        <button 
                        type="submit" 
                        className="px-6 py-2 bg-scout-gold hover:bg-yellow-500 text-scout-900 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all"
                        >
                        <Save className="w-4 h-4" />
                        Guardar Configuración
                        </button>
                    </div>
                </form>
            )}

            {/* TAB: BACKUPS (GOOGLE DRIVE) */}
            {activeTab === 'backups' && (
                <div className="space-y-6">
                    <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 flex flex-col items-center justify-center text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${formData.googleDriveConnected ? 'bg-green-500/20 text-green-500' : 'bg-scout-800 text-scout-400'}`}>
                           <Cloud className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">
                            {formData.googleDriveConnected ? 'Conectado a Google Drive' : 'Copia de Seguridad en la Nube'}
                        </h3>
                        <p className="text-sm text-scout-400 max-w-sm mb-6">
                            {formData.googleDriveConnected 
                                ? 'Tu cuenta está vinculada. Puedes realizar copias de seguridad de toda la base de datos.' 
                                : 'Conecta tu cuenta de Google para habilitar el guardado automático de bases de datos en tu Drive personal.'}
                        </p>
                        
                        <button 
                            type="button"
                            onClick={handleGoogleConnect}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${formData.googleDriveConnected ? 'bg-scout-700 hover:bg-red-500/80 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'}`}
                        >
                            {formData.googleDriveConnected ? 'Desconectar Cuenta' : 'Conectar con Google'}
                        </button>
                    </div>

                    {formData.googleDriveConnected && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-xs uppercase font-bold text-scout-500 tracking-wider border-b border-scout-700 pb-2">Configuración de Respaldo</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-scout-800 p-4 rounded-xl border border-scout-700">
                                    <label className="block text-xs text-scout-400 mb-2 uppercase font-bold tracking-wider flex items-center gap-2">
                                        <CalendarClock className="w-3 h-3" /> Frecuencia Automática
                                    </label>
                                    <select 
                                        value={formData.backupFrequency || 'never'} 
                                        onChange={(e) => setFormData({...formData, backupFrequency: e.target.value as BackupFrequency})}
                                        className="w-full bg-scout-900 border border-scout-700 rounded-lg p-2 text-sm text-scout-100 outline-none focus:border-scout-gold"
                                    >
                                        <option value="never">Manual (Nunca)</option>
                                        <option value="daily">Diario</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensual</option>
                                    </select>
                                    <p className="text-[10px] text-scout-500 mt-2">Los respaldos automáticos se realizan al abrir la aplicación si ha pasado el tiempo configurado.</p>
                                </div>

                                <div className="bg-scout-800 p-4 rounded-xl border border-scout-700 flex flex-col justify-between">
                                    <div>
                                        <div className="text-xs text-scout-400 uppercase font-bold tracking-wider mb-1">Último Respaldo</div>
                                        <div className="text-sm font-mono text-white">
                                            {formData.lastBackupDate ? new Date(formData.lastBackupDate).toLocaleString() : 'Nunca'}
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleManualBackup}
                                        disabled={isBackingUp}
                                        className="mt-3 w-full py-2 bg-scout-accent hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-scout-900 font-bold rounded-lg text-xs flex items-center justify-center gap-2"
                                    >
                                        {isBackingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        {isBackingUp ? 'Subiendo...' : 'Respaldar Ahora'}
                                    </button>
                                </div>
                            </div>
                            
                            {backupStatus && (
                                <div className={`p-3 rounded-lg text-xs font-medium border ${backupStatus.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                                    {backupStatus}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Botón de Guardar específico para esta pestaña si se cambia la frecuencia */}
                     <div className="flex justify-end pt-4 border-t border-scout-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-scout-400 hover:text-white mr-2">Cerrar</button>
                        <button 
                        type="submit" 
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-scout-gold hover:bg-yellow-500 text-scout-900 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all"
                        >
                        <Save className="w-4 h-4" />
                        Guardar Configuración
                        </button>
                    </div>
                </div>
            )}

            {/* TAB: USERS MANAGEMENT */}
            {activeTab === 'users' && (
                <div className="space-y-4 h-full flex flex-col">
                    {/* User List Header */}
                    {!isUserFormOpen ? (
                        <>
                           <div className="flex justify-between items-center gap-4">
                               <div className="relative flex-1">
                                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-scout-500"/>
                                   <input 
                                     type="text" 
                                     placeholder="Buscar usuario..." 
                                     value={userSearch}
                                     onChange={e => setUserSearch(e.target.value)}
                                     className="w-full bg-scout-900 border border-scout-700 rounded-lg py-2 pl-9 pr-4 text-sm text-scout-100 focus:border-scout-gold outline-none"
                                   />
                               </div>
                               <button 
                                 onClick={openAddUser}
                                 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"
                               >
                                   <Plus className="w-4 h-4" /> Nuevo Usuario
                               </button>
                           </div>

                           <div className="flex-1 overflow-y-auto custom-scrollbar border border-scout-700 rounded-xl bg-scout-900/30">
                               <table className="w-full text-left text-sm text-scout-200">
                                   <thead className="bg-scout-800 text-scout-400 uppercase text-xs font-bold">
                                       <tr>
                                           <th className="px-4 py-3">Usuario</th>
                                           <th className="px-4 py-3">Rol / Estado</th>
                                           <th className="px-4 py-3">Org</th>
                                           <th className="px-4 py-3 text-right">Acciones</th>
                                       </tr>
                                   </thead>
                                   <tbody className="divide-y divide-scout-800">
                                       {filteredUsers.map(user => (
                                           <tr key={user.id} className="hover:bg-scout-800/50 transition-colors">
                                               <td className="px-4 py-3">
                                                   <div className="flex items-center gap-3">
                                                       <img src={user.avatar} alt="" className="w-8 h-8 rounded-full bg-scout-700 object-cover" />
                                                       <div>
                                                           <div className="font-bold text-white">{user.name}</div>
                                                           <div className="text-xs text-scout-500">{user.email}</div>
                                                       </div>
                                                   </div>
                                               </td>
                                               <td className="px-4 py-3">
                                                   <div className="flex items-center gap-2">
                                                       <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                           {user.role}
                                                       </span>
                                                       {user.approved === false ? (
                                                           <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400 flex items-center gap-1 animate-pulse">
                                                               <AlertTriangle className="w-3 h-3" /> Pendiente
                                                           </span>
                                                       ) : (
                                                           <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-500/20 text-green-400 flex items-center gap-1">
                                                               <CheckCircle className="w-3 h-3" /> Aprobado
                                                           </span>
                                                       )}
                                                   </div>
                                               </td>
                                               <td className="px-4 py-3 text-scout-400">{user.organization || '-'}</td>
                                               <td className="px-4 py-3 text-right">
                                                   <div className="flex justify-end gap-2">
                                                       {user.id !== currentUser.id && user.approved === false && (
                                                           <button 
                                                             type="button"
                                                             onClick={() => handleToggleApproval(user)}
                                                             className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded transition-colors shadow-lg shadow-green-500/20 flex items-center gap-1"
                                                             title="Aprobar Acceso"
                                                           >
                                                               <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                                                           </button>
                                                       )}
                                                       {user.id !== currentUser.id && user.approved !== false && (
                                                            <button 
                                                             type="button"
                                                             onClick={() => handleToggleApproval(user)}
                                                             className="p-1.5 hover:bg-yellow-500/20 text-scout-400 hover:text-yellow-400 rounded transition-colors"
                                                             title="Revocar Acceso"
                                                           >
                                                               <XCircle className="w-4 h-4" />
                                                           </button>
                                                       )}
                                                       <button 
                                                         type="button"
                                                         onClick={() => openEditUser(user)}
                                                         className="p-1.5 hover:bg-scout-700 text-scout-400 hover:text-white rounded transition-colors"
                                                         title="Editar / Cambiar Clave"
                                                       >
                                                           <Edit2 className="w-4 h-4" />
                                                       </button>
                                                       {user.id !== currentUser.id && (
                                                           <button 
                                                             type="button"
                                                             onClick={() => handleDeleteUser(user.id)}
                                                             className="p-1.5 hover:bg-red-500/20 text-scout-400 hover:text-red-400 rounded transition-colors"
                                                             title="Dar de Baja"
                                                           >
                                                               <Trash2 className="w-4 h-4" />
                                                           </button>
                                                       )}
                                                   </div>
                                               </td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                               {filteredUsers.length === 0 && (
                                   <div className="p-8 text-center text-scout-500 text-sm">No se encontraron usuarios.</div>
                               )}
                           </div>
                        </>
                    ) : (
                        <div className="bg-scout-900/50 p-6 rounded-xl border border-scout-700 animate-fadeIn">
                             <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                                 {editingUser ? 'Modificar Usuario' : 'Alta de Nuevo Usuario'}
                                 <span className="text-xs font-normal text-scout-400">* Campos obligatorios</span>
                             </h3>
                             
                             {userFormError && (
                                 <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-300 text-sm mb-4 flex items-center gap-2">
                                     <AlertTriangle className="w-4 h-4" /> {userFormError}
                                 </div>
                             )}

                             <form onSubmit={handleUserFormSubmit} className="space-y-4">
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-xs text-scout-400 mb-1">Nombre Completo</label>
                                         <input required type="text" value={userFormName} onChange={e => setUserFormName(e.target.value)} className="w-full bg-scout-800 border border-scout-700 rounded p-2 text-sm text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-xs text-scout-400 mb-1">Organización / Club</label>
                                         <input type="text" value={userFormOrg} onChange={e => setUserFormOrg(e.target.value)} className="w-full bg-scout-800 border border-scout-700 rounded p-2 text-sm text-white" />
                                     </div>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-xs text-scout-400 mb-1">Correo Electrónico</label>
                                     <input required type="email" value={userFormEmail} onChange={e => setUserFormEmail(e.target.value)} className="w-full bg-scout-800 border border-scout-700 rounded p-2 text-sm text-white" />
                                 </div>

                                 <div className="bg-scout-800/50 p-4 rounded-lg border border-scout-700/50">
                                     <label className="block text-xs text-scout-400 mb-1 flex items-center gap-2">
                                         <Shield className="w-3 h-3" /> Contraseña
                                     </label>
                                     <input 
                                       type="text" 
                                       value={userFormPassword} 
                                       onChange={e => setUserFormPassword(e.target.value)} 
                                       className="w-full bg-scout-900 border border-scout-700 rounded p-2 text-sm text-white font-mono"
                                       placeholder={editingUser ? "Dejar vacío para no cambiar" : "Escribe contraseña inicial"}
                                     />
                                     <p className="text-[10px] text-scout-500 mt-1">
                                         {editingUser ? 'Solo rellena si deseas cambiar la contraseña del usuario.' : 'Asigna una contraseña temporal.'}
                                     </p>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-xs text-scout-400 mb-1">Rol de Sistema</label>
                                         <div className="flex flex-col gap-2">
                                             <label className="flex items-center gap-2 cursor-pointer">
                                                 <input type="radio" name="role" value="scout" checked={userFormRole === 'scout'} onChange={() => setUserFormRole('scout')} className="text-scout-gold focus:ring-scout-gold bg-scout-900 border-scout-700" />
                                                 <span className="text-sm text-white">Scout</span>
                                             </label>
                                             <label className="flex items-center gap-2 cursor-pointer">
                                                 <input type="radio" name="role" value="admin" checked={userFormRole === 'admin'} onChange={() => setUserFormRole('admin')} className="text-purple-500 focus:ring-purple-500 bg-scout-900 border-scout-700" />
                                                 <span className="text-sm text-white">Administrador</span>
                                             </label>
                                         </div>
                                     </div>
                                     <div>
                                         <label className="block text-xs text-scout-400 mb-1">Estado de Acceso</label>
                                         <div className="flex flex-col gap-2">
                                             <label className="flex items-center gap-2 cursor-pointer">
                                                 <input type="checkbox" checked={userFormApproved} onChange={(e) => setUserFormApproved(e.target.checked)} className="rounded border-scout-700 bg-scout-900 text-green-500 focus:ring-green-500" />
                                                 <span className={`text-sm ${userFormApproved ? 'text-green-400' : 'text-yellow-400'}`}>
                                                     {userFormApproved ? 'Aprobado (Acceso Permitido)' : 'Pendiente (Acceso Denegado)'}
                                                 </span>
                                             </label>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="flex justify-end gap-3 pt-2">
                                     <button type="button" onClick={() => setIsUserFormOpen(false)} className="px-4 py-2 text-sm text-scout-400 hover:text-white">Cancelar</button>
                                     <button type="submit" className="px-6 py-2 bg-scout-gold hover:bg-yellow-500 text-scout-900 font-bold rounded-lg text-sm shadow-lg">
                                         {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                     </button>
                                 </div>
                             </form>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
