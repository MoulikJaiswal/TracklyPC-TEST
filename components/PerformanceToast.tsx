
import React from 'react';
import { motion, AnimatePresence } from 'https://esm.sh/framer-motion@10.16.4?external=react,react-dom';
import { Zap, X, BatteryCharging } from 'lucide-react';

interface PerformanceToastProps {
  isVisible: boolean;
  onSwitch: () => void;
  onDismiss: () => void;
}

export const PerformanceToast: React.FC<PerformanceToastProps> = ({ isVisible, onSwitch, onDismiss }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: -100, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -100, opacity: 0, x: '-50%' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-6 left-1/2 z-[200] w-[90%] max-w-sm"
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-indigo-200 dark:border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
            
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                     <BatteryCharging size={20} />
                  </div>
                  <div>
                     <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Device feeling slow?</h4>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        We detected some frame drops. You can disable this alert in Settings.
                     </p>
                  </div>
               </div>
               <button 
                 onClick={onDismiss} 
                 className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
               >
                 <X size={16} />
               </button>
            </div>

            <div className="flex gap-3">
               <button 
                 onClick={onDismiss}
                 className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
               >
                 I'm fine
               </button>
               <button 
                 onClick={onSwitch}
                 className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                 style={{
                     backgroundColor: 'var(--theme-accent)',
                     color: 'var(--theme-on-accent)'
                 }}
               >
                 <Zap size={12} fill="currentColor" /> Lite Mode
               </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
