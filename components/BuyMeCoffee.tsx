
import React, { useState } from 'react';
import { Coffee, Heart, Sparkles, ExternalLink, Mail, Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionButton = motion.button as any;
const MotionDiv = motion.div as any;

export const BuyMeCoffee: React.FC = () => {
  const [showEmail, setShowEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText('help@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Support Options */}
      <div className="flex flex-col gap-3">
          <a 
            href="https://buymeacoffee.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl transition-all shadow-lg hover:shadow-amber-400/20 active:scale-95 group"
          >
              <div className="p-2 bg-amber-900/10 rounded-lg group-hover:scale-110 transition-transform">
                <Coffee size={24} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                 <span className="block text-sm font-bold uppercase tracking-wide">Buy me a coffee</span>
                 <span className="block text-[10px] font-bold opacity-60 uppercase tracking-widest">$3.00 • Keep the fire burning</span>
              </div>
              <ExternalLink size={16} className="opacity-50" />
          </a>

          <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl hover:border-rose-400 dark:hover:border-rose-500/50 group transition-all">
                  <Heart size={20} className="text-rose-500 group-hover:animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-500">Share App</span>
              </button>

              <div className="relative h-full" style={{ perspective: '1000px' }}>
                 <AnimatePresence mode="wait" initial={false}>
                    {!showEmail ? (
                       <MotionButton 
                          key="front"
                          onClick={() => setShowEmail(true)}
                          initial={{ rotateY: -90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          exit={{ rotateY: 90, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/50 group transition-all transform-gpu will-change-transform"
                          style={{ backfaceVisibility: 'hidden' }}
                       >
                          <Sparkles size={20} className="text-indigo-500 group-hover:rotate-12 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-500">Request Feature</span>
                       </MotionButton>
                    ) : (
                       <MotionDiv
                          key="back"
                          initial={{ rotateY: 90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          exit={{ rotateY: -90, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="w-full h-full bg-indigo-600 rounded-xl p-3 flex flex-col items-center justify-center gap-2 shadow-inner transform-gpu will-change-transform"
                          style={{ backfaceVisibility: 'hidden' }}
                       >
                           <div className="flex items-center gap-1 w-full justify-between">
                              <span className="text-[10px] font-bold text-white/90 truncate select-all">help@gmail.com</span>
                              <button onClick={(e) => { e.stopPropagation(); setShowEmail(false); }} className="p-1 hover:bg-indigo-500 rounded-full transition-colors"><X size={12} className="text-white/80"/></button>
                           </div>
                           <button 
                              onClick={handleCopy}
                              className="w-full py-1.5 bg-white text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-indigo-50 active:scale-95 transition-all"
                           >
                              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                           </button>
                       </MotionDiv>
                    )}
                 </AnimatePresence>
              </div>
          </div>
      </div>
      
      <div className="text-center pt-4 opacity-50">
         <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
            "Software is easy. Physics is hard. Coffee makes both possible."
         </p>
      </div>

    </div>
  );
};
