
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-scout-gold/10 text-scout-gold'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-scout-400 leading-relaxed mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-scout-700 hover:bg-scout-600 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-3 px-4 text-white rounded-xl font-bold text-sm transition-colors shadow-lg ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                  : 'bg-scout-gold hover:bg-yellow-500 text-scout-900 shadow-yellow-900/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
