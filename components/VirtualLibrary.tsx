

import React from 'react';
import { Rocket, Users } from 'lucide-react';
import { User } from 'firebase/auth';
import { Target } from '../types';

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
  targets: Target[];
  onCompleteTask: (id: string, completed: boolean) => void;
}

const VirtualLibrary: React.FC<VirtualLibraryProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6 animate-in fade-in duration-500">
        <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20 relative overflow-hidden">
            <div className="absolute -inset-2 bg-indigo-500/10 rounded-full animate-ping" />
            <Rocket size={48} className="text-indigo-500 relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Coming Soon!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
            The <span className="font-bold text-indigo-500 dark:text-indigo-400">Focus Lounge</span> is currently under construction. Soon, you'll be able to join live study sessions with friends and aspirants from around the world.
        </p>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <Users size={14} />
            <span>Stay Tuned for Updates</span>
        </div>
    </div>
  );
};

export default VirtualLibrary;
