
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Atom, Dna, GraduationCap } from 'lucide-react';
import { StreamType } from '../types';

interface StreamTransitionProps {
  isTransitioning: boolean;
  stream: StreamType;
}

const shutterVariants = {
  initial: { height: '0vh' },
  animate: { 
    height: '50vh',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  },
  exit: { 
    height: '0vh',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 } 
  }
};

const textVariants = {
  initial: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
  animate: { 
    opacity: 1, 
    scale: 1,
    filter: 'blur(0px)',
    transition: { delay: 0.3, duration: 0.4 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    filter: 'blur(10px)',
    transition: { duration: 0.2 } 
  }
};

export const StreamTransition: React.FC<StreamTransitionProps> = ({ isTransitioning, stream }) => {
  const isJEE = stream === 'JEE';
  const isNEET = stream === 'NEET';
  const isGeneral = stream === 'General';

  const color = isJEE ? 'text-indigo-500' : isNEET ? 'text-emerald-500' : 'text-violet-500';
  const glowColor = isJEE ? 'bg-indigo-500' : isNEET ? 'bg-emerald-500' : 'bg-violet-500';
  const borderColor = isJEE ? 'border-indigo-500/30' : isNEET ? 'border-emerald-500/30' : 'border-violet-500/30';
  const shadowColor = isJEE ? 'shadow-indigo-500/20' : isNEET ? 'shadow-emerald-500/20' : 'shadow-violet-500/20';

  return (
    <AnimatePresence>
      {isTransitioning && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-between">
          
          {/* Top Shutter */}
          <motion.div
            variants={shutterVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full bg-[#020617] relative z-20 flex items-end justify-center overflow-hidden"
          >
             <div className="absolute inset-0 bg-noise opacity-20" />
             <div className={`w-full h-[1px] ${glowColor} shadow-[0_0_30px_2px_currentColor] opacity-60`} />
          </motion.div>

          {/* Center Content Container */}
          <div className="fixed inset-0 z-30 flex items-center justify-center">
             <motion.div
                variants={textVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center justify-center p-8"
             >
                {/* Icon Card */}
                <div className={`relative mb-8 p-8 rounded-[2rem] bg-[#0B0F19] border ${borderColor} shadow-2xl ${shadowColor}`}>
                    {/* Inner Ambient Glow */}
                    <div className={`absolute inset-0 rounded-[2rem] ${glowColor} opacity-10 blur-2xl`} />
                    
                    {/* Icon */}
                    <div className={`relative z-10 ${color} transform scale-125`}>
                        {isJEE && <Atom size={80} strokeWidth={1.5} className="animate-[spin_10s_linear_infinite]" />}
                        {isNEET && <Dna size={80} strokeWidth={1.5} className="animate-pulse" />}
                        {isGeneral && <GraduationCap size={80} strokeWidth={1.5} className="animate-bounce" />}
                    </div>

                    {/* JEE Orbital Effect */}
                    {isJEE && (
                        <div className="absolute inset-0 -m-4 border border-indigo-500/10 rounded-full animate-[spin_8s_linear_infinite] border-dashed" />
                    )}
                </div>

                <div className="text-center space-y-3">
                    <h2 className="text-5xl font-display font-bold text-white tracking-tight drop-shadow-xl">
                        {isJEE ? 'Engineering' : isNEET ? 'Medical' : 'General Study'}
                    </h2>
                    <div className="flex items-center justify-center gap-4">
                        <div className={`h-[1px] w-12 ${glowColor} opacity-50`} />
                        <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400">
                            {isJEE ? 'IIT JEE' : isNEET ? 'NEET UG' : 'Custom Path'}
                        </p>
                        <div className={`h-[1px] w-12 ${glowColor} opacity-50`} />
                    </div>
                </div>
             </motion.div>
          </div>

          {/* Bottom Shutter */}
          <motion.div
            variants={shutterVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full bg-[#020617] relative z-20 flex items-start justify-center overflow-hidden"
          >
             <div className="absolute inset-0 bg-noise opacity-20" />
             <div className={`w-full h-[1px] ${glowColor} shadow-[0_0_30px_2px_currentColor] opacity-60`} />
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};
