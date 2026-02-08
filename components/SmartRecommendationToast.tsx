
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, ArrowRight, Target } from 'lucide-react';
import { Recommendation } from '../hooks/useSmartRecommendations';

const MotionDiv = motion.div as any;

interface SmartRecommendationToastProps {
  isVisible: boolean;
  data: Recommendation | null;
  onDismiss: () => void;
  onPractice: () => void;
}

export const SmartRecommendationToast: React.FC<SmartRecommendationToastProps> = ({ isVisible, data, onDismiss, onPractice }) => {
  if (!data) return null;

  const isLowAccuracy = data.accuracy !== -1;

  return (
    <AnimatePresence>
      {isVisible && (
        <MotionDiv 
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[150] w-[90%] md:w-auto max-w-sm"
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-amber-200 dark:border-amber-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-start relative z-10">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shadow-sm relative">
                     <Lightbulb size={20} className="absolute inset-0 m-auto opacity-20 blur-[2px]" />
                     <Lightbulb size={20} className="relative z-10" />
                  </div>
                  <div>
                     <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Smart Recommendation</h4>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Based on your performance patterns
                     </p>
                  </div>
               </div>
               <button 
                 onClick={onDismiss} 
                 className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition-colors"
               >
                 <X size={16} />
               </button>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5 relative z-10">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {isLowAccuracy ? (
                        <>Your accuracy in <span className="font-bold text-indigo-500 dark:text-indigo-400">{data.topic}</span> ({data.subject}) is only <span className="font-mono font-bold text-rose-500">{Math.round(data.accuracy * 100)}%</span>.</>
                    ) : (
                        <>You haven't practiced <span className="font-bold text-indigo-500 dark:text-indigo-400">{data.topic}</span> ({data.subject}) yet. Time to start?</>
                    )}
                </p>
            </div>

            <button 
                 onClick={onPractice}
                 className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
                 style={{
                     backgroundColor: 'var(--theme-accent)',
                     color: 'var(--theme-on-accent)'
                 }}
               >
                 <Target size={14} /> Practice Now <ArrowRight size={14} />
            </button>

          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};
