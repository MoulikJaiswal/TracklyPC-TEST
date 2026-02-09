
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Atom, Dna, ArrowRight, User, ShieldCheck, GraduationCap, Brain, BarChart3, Timer, ListChecks, Cloud, Users } from 'lucide-react';
import { StreamType } from '../types';
import { TracklyLogo } from './TracklyLogo';
import { GoogleIcon } from './GoogleIcon';

interface WelcomePageProps {
  onLogin: () => void;
  onGuestLogin: (name: string) => void;
  stream: StreamType;
  setStream: (stream: StreamType) => void;
}

const features = [
    { icon: Brain, title: "Deep Mistake Analysis", description: "Tag every error by type to find your weakest points." },
    { icon: BarChart3, title: "Powerful Analytics", description: "Visualize progress with heatmaps and proficiency charts." },
    { icon: Timer, title: "Intelligent Focus Timer", description: "A smart Pomodoro timer integrated with your analytics." },
    { icon: ListChecks, title: "Daily & Weekly Planner", description: "Schedule tasks, revisions, and mock tests to stay organized." },
    { icon: Cloud, title: "Cross-Device Sync", description: "Securely sync your progress across all your devices." },
    { icon: Users, title: "Focus Lounge (Soon)", description: "Join live group study sessions with fellow aspirants." },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.5,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};


export const WelcomePage: React.FC<WelcomePageProps> = ({ onLogin, onGuestLogin, stream, setStream }) => {
  const [guestName, setGuestName] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      onGuestLogin(guestName);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-50 overflow-hidden">
      
      {/* Main Content Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        
        {/* Left Side: Hero Text & Features */}
        <div className="text-center lg:text-left space-y-8 order-2 lg:order-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Focus & Analytics
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-bold text-white leading-tight mb-4 tracking-tight drop-shadow-2xl">
              Master Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Preparation.</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Trackly helps you analyze mistakes, log mock tests, and stay focused with an intelligent Pomodoro timer tailored for competitive exams.
            </p>
          </motion.div>

          <motion.div 
             variants={containerVariants}
             initial="hidden"
             animate="visible"
             className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
             {features.map((feature, index) => {
                 const Icon = feature.icon;
                 return (
                     <motion.div
                         key={index}
                         variants={itemVariants}
                         className="flex items-start gap-3 p-3 bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-sm"
                     >
                         <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                             <Icon size={16} />
                         </div>
                         <div>
                             <p className="text-xs font-bold text-white">{feature.title}</p>
                             <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{feature.description}</p>
                         </div>
                     </motion.div>
                 );
             })}
          </motion.div>
        </div>

        {/* Right Side: Action Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="order-1 lg:order-2 w-full max-w-md mx-auto"
        >
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             {/* Glow Effect */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
             
             <div className="relative z-10 flex flex-col items-center">
                <TracklyLogo className="mb-8 scale-125" />

                {/* Stream Selector */}
                <div className="w-full mb-8">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">Select Your Target</p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setStream('JEE')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                                stream === 'JEE' 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Atom size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">JEE</span>
                        </button>
                        <button
                            onClick={() => setStream('NEET')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                                stream === 'NEET' 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Dna size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">NEET</span>
                        </button>
                        <button
                            onClick={() => setStream('General')}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                                stream === 'General' 
                                ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/25' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <GraduationCap size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Gen</span>
                        </button>
                    </div>
                </div>

                {/* Auth Actions */}
                {!isGuestMode ? (
                    <div className="w-full space-y-4">
                        <button 
                            onClick={onLogin}
                            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg group"
                        >
                            <GoogleIcon />
                            <span>Continue with Google</span>
                            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900/60 px-2 text-slate-500 font-bold">Or</span></div>
                        </div>

                        <button 
                            onClick={() => setIsGuestMode(true)}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <User size={16} /> Enter as Guest
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleGuestSubmit} className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Name</label>
                            <input 
                                type="text" 
                                autoFocus
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Future Topper"
                                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setIsGuestMode(false)}
                                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all"
                            >
                                Back
                            </button>
                            <button 
                                type="submit"
                                disabled={!guestName.trim()}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Start Journey <ArrowRight size={16} />
                            </button>
                        </div>
                    </form>
                )}
             </div>
          </div>
        </motion.div>
      </div>
      
      {/* Footer Text */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute bottom-6 text-center"
      >
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Optimized for Desktop & Tablet
        </p>
      </motion.div>
    </div>
  );
};
