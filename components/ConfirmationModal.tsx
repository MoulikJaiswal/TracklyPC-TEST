
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#11131e] border border-slate-200 dark:border-white/10 shadow-2xl p-6 transform-gpu"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 flex items-center justify-center bg-rose-500 rounded-full mb-4">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={onClose}
                  className="py-3 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold uppercase text-xs tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-xs tracking-wider shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
