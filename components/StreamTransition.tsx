import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Atom, Dna } from 'lucide-react';
import { StreamType } from '../types';

interface StreamTransitionProps {
  isTransitioning: boolean;
  stream: StreamType;
}

const variants = {
  initial: {
    clipPath: 'circle(0% at 50% 50%)',
  },
  animate: {
    clipPath: 'circle(150% at 50% 50%)',
    transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] },
  },
  exit: {
    clipPath: 'circle(0% at 50% 50%)',
    transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.2 },
  },
};

export const StreamTransition: React.FC<StreamTransitionProps> = ({ isTransitioning, stream }) => {
  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          key="transition-overlay"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: stream === 'JEE' ? '#080a12' : '#0f1f15'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.2, duration: 0.4 } }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
          >
            {stream === 'JEE' ? (
              <Atom size={80} className="text-indigo-400" />
            ) : (
              <Dna size={80} className="text-emerald-400" />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
