
import React, { useRef } from 'react';
import { X, CheckCircle2, Map, MousePointer2, Sparkles, Layers, Volume2, VolumeX, Trash2, AlertTriangle, Eye, Smartphone, Battery, BatteryCharging, Activity, Palette, Zap, SlidersHorizontal, HelpCircle, Image as ImageIcon, Upload, Lock, Crown, LayoutTemplate, LogOut, Check, Loader2, UploadCloud } from 'lucide-react';
import { Card } from './Card';
import { ThemeId } from '../types';
import { THEME_CONFIG } from '../constants';
import { BuyMeCoffee } from './BuyMeCoffee';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  graphicsEnabled: boolean;
  toggleGraphics: () => void;
  lagDetectionEnabled: boolean;
  toggleLagDetection: () => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  onStartTutorial: () => void;
  showAurora: boolean;
  toggleAurora: () => void;
  parallaxEnabled: boolean;
  toggleParallax: () => void;
  showParticles: boolean;
  toggleParticles: () => void;
  swipeAnimationEnabled: boolean;
  toggleSwipeAnimation: () => void;
  swipeStiffness: number;
  setSwipeStiffness: (val: number) => void;
  swipeDamping: number;
  setSwipeDamping: (val: number) => void;
  
  // Sound Props
  soundEnabled: boolean;
  toggleSound: () => void;
  soundPitch: number;
  setSoundPitch: (val: number) => void;
  soundVolume: number;
  setSoundVolume: (val: number) => void;

  // Custom Background
  customBackground: string | null;
  setCustomBackground: (bg: string | null) => void;
  customBackgroundEnabled: boolean;
  toggleCustomBackground: () => void;
  customBackgroundAlign: 'center' | 'top' | 'bottom';
  setCustomBackgroundAlign: (align: 'center' | 'top' | 'bottom') => void;
  isPro: boolean;
  onOpenUpgrade: () => void;
  // Account Props
  user: User | null;
  isGuest: boolean;
  onLogout: () => void;
  onForceSync: () => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  animationsEnabled, 
  toggleAnimations,
  graphicsEnabled,
  toggleGraphics,
  lagDetectionEnabled,
  toggleLagDetection,
  theme,
  setTheme,
  onStartTutorial,
  showAurora,
  toggleAurora,
  parallaxEnabled,
  toggleParallax,
  showParticles,
  toggleParticles,
  swipeAnimationEnabled,
  toggleSwipeAnimation,
  swipeStiffness,
  setSwipeStiffness,
  swipeDamping,
  setSwipeDamping,
  
  soundEnabled,
  toggleSound,
  soundPitch,
  setSoundPitch,
  soundVolume,
  setSoundVolume,

  customBackground,
  setCustomBackground,
  customBackgroundEnabled,
  toggleCustomBackground,
  customBackgroundAlign,
  setCustomBackgroundAlign,
  isPro,
  onOpenUpgrade,
  user,
  isGuest,
  onLogout,
  onForceSync,
  syncStatus,
  syncError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClearData = () => {
      if (window.confirm("Are you sure? This will wipe all local data, settings, and guest progress. This action cannot be undone.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  // Helper to force enable animations if they are off, while toggling graphics
  const setMode = (mode: 'standard' | 'lite') => {
      if (mode === 'standard') {
          if (!graphicsEnabled) toggleGraphics(); // Turn Graphics ON
          // Restore animations for standard mode if preferred
          if (!animationsEnabled) toggleAnimations();
      } else {
          if (graphicsEnabled) toggleGraphics(); // Turn Graphics OFF
          // Do not force animations ON for Lite mode - let them be optional or off for speed
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to ~2MB to be safe with localStorage)
    if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Please select an image under 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        try {
            setCustomBackground(result);
        } catch (err) {
            alert("Failed to save background. Storage might be full.");
        }
    };
    reader.readAsDataURL(file);
  };

  const syncButtonContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return <><Loader2 size={14} className="animate-spin" /> Syncing...</>;
      case 'success':
        return <><Check size={14} /> Synced!</>;
      case 'error':
        return <><AlertTriangle size={14} /> Sync Failed</>;
      default:
        return <>Force Save to Cloud</>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col [&>div.z-10]:flex [&>div.z-10]:flex-col [&>div.z-10]:h-full [&>div.z-10]:overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Settings
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto pr-2 pb-4 flex-1 min-h-0">
          
          {/* --- SECTION 1: APPEARANCE --- */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2">
                <Palette size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Appearance</span>
             </div>

             {/* Theme Section */}
             <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {Object.entries(THEME_CONFIG).map(([id, config]) => {
                  const isSelected = theme === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTheme(id as ThemeId)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all group overflow-hidden ${isSelected ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${id === 'midnight' ? 'border border-white/20' : ''}`}
                          style={{ backgroundColor: id === 'midnight' ? '#000000' : config.colors.accent }}
                        >
                          <config.icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{config.label}</p>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-indigo-500 dark:text-indigo-400 shrink-0" />}
                      </div>
                      
                      {/* Preview Gradient Background */}
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundColor: config.colors.bg }} 
                      />
                    </button>
                  )
                })}
             </div>

             {/* Custom Background (PRO) */}
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl">
                 <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                             <ImageIcon size={16} />
                         </div>
                         <span className="text-sm font-bold text-slate-900 dark:text-white">Custom Wallpaper</span>
                     </div>
                     {isPro ? (
                         <button 
                            onClick={toggleCustomBackground}
                            className={`w-10 h-5 rounded-full relative transition-colors ${customBackgroundEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                         >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${customBackgroundEnabled ? 'left-6' : 'left-1'}`} />
                         </button>
                     ) : (
                         <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[9px] font-bold uppercase tracking-wider">
                             Pro
                         </span>
                     )}
                 </div>

                 {isPro && customBackgroundEnabled ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         {customBackground ? (
                             <div className="space-y-3">
                                 <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group">
                                     <img 
                                        src={customBackground} 
                                        alt="Custom Background" 
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: customBackgroundAlign }} 
                                     />
                                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                            onClick={() => setCustomBackground(null)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-600 transition-colors"
                                         >
                                             <Trash2 size={14} /> Remove
                                         </button>
                                     </div>
                                 </div>
                                 
                                 {/* Alignment Controls */}
                                 <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400">
                                         <LayoutTemplate size={12} /> Alignment
                                     </div>
                                     <div className="flex gap-2 p-1 bg-slate-100 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/10">
                                         {(['top', 'center', 'bottom'] as const).map((align) => (
                                             <button
                                                 key={align}
                                                 onClick={() => setCustomBackgroundAlign(align)}
                                                 className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                     customBackgroundAlign === align 
                                                     ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                                                     : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                                 }`}
                                             >
                                                 {align}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                             >
                                 <Upload size={24} />
                                 <span className="text-xs font-bold uppercase tracking-wider">Upload Image</span>
                             </button>
                         )}
                         <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload}
                         />
                         <p className="text-[10px] text-slate-400 text-center">Recommended: 1920x1080 (Max 2MB)</p>
                     </div>
                 ) : isPro ? (
                     <div className="text-center py-2 opacity-50">
                         <p className="text-[10px] text-slate-500 dark:text-slate-400">
                             Enable to use a custom background image.
                         </p>
                     </div>
                 ) : (
                     <div className="text-center py-4 opacity-80">
                         <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                             Unlock Pro to set your own motivating background images.
                         </p>
                         <button 
                            onClick={onOpenUpgrade}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                         >
                             <Crown size={14} /> Unlock Feature
                         </button>
                     </div>
                 )}
             </div>

             {/* Visual Effects Preferences */}
             <div className={`space-y-3 transition-all duration-300 ${!graphicsEnabled ? 'opacity-50 grayscale pointer-events-none select-none' : ''}`}>
                 <div className="grid grid-cols-1 gap-3">
                    {/* Aurora Toggle */}
                    <button 
                      onClick={toggleAurora}
                      disabled={customBackgroundEnabled}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors ${customBackgroundEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${showAurora && !customBackgroundEnabled ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            <Sparkles size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Aurora Background</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${showAurora && !customBackgroundEnabled ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showAurora && !customBackgroundEnabled ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>

                    {/* Particles Toggle */}
                    <button 
                      onClick={toggleParticles}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${showParticles ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            <Layers size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Background Elements</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${showParticles ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showParticles ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>

                    {/* Parallax Toggle */}
                    <button 
                      onClick={toggleParallax}
                      disabled={!showParticles || customBackgroundEnabled}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 transition-colors ${(!showParticles || customBackgroundEnabled) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${parallaxEnabled && showParticles && !customBackgroundEnabled ? 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            <MousePointer2 size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Parallax Effect</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${parallaxEnabled && showParticles && !customBackgroundEnabled ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${parallaxEnabled && showParticles && !customBackgroundEnabled ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                 </div>
             </div>
          </div>

          {/* --- SECTION 2: PERFORMANCE --- */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-500/20 pb-2">
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Performance</span>
             </div>

             <div className="grid grid-cols-2 gap-3">
                {/* Standard Mode */}
                <button 
                    onClick={() => setMode('standard')}
                    className={`
                        relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 group
                        ${graphicsEnabled 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                            : 'border-slate-200 dark:border-white/5 hover:border-indigo-200 dark:hover:border-white/20'
                        }
                    `}
                >
                    {graphicsEnabled && <div className="absolute top-3 right-3 text-indigo-500"><CheckCircle2 size={16} /></div>}
                    <div className={`p-3 rounded-full mb-3 transition-colors ${graphicsEnabled ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                        <Eye size={24} />
                    </div>
                    <span className={`text-sm font-bold transition-colors ${graphicsEnabled ? 'text-indigo-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>Standard</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">High Fidelity</span>
                </button>

                {/* Lite Mode */}
                <button 
                    onClick={() => setMode('lite')}
                    className={`
                        relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 group
                        ${!graphicsEnabled 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                            : 'border-slate-200 dark:border-white/5 hover:border-emerald-200 dark:hover:border-white/20'
                        }
                    `}
                >
                    {!graphicsEnabled && <div className="absolute top-3 right-3 text-emerald-500"><CheckCircle2 size={16} /></div>}
                    <div className={`p-3 rounded-full mb-3 transition-colors ${!graphicsEnabled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                        <BatteryCharging size={24} />
                    </div>
                    <span className={`text-sm font-bold transition-colors ${!graphicsEnabled ? 'text-emerald-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>Lite Mode</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 mt-1">Battery Saver</span>
                </button>
             </div>
             
             <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Lag Alerts</span>
                </div>
                <button 
                    onClick={toggleLagDetection}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${lagDetectionEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                    <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${lagDetectionEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>
          </div>

          {/* --- SECTION 3: INTERACTION --- */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2">
                <SlidersHorizontal size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Interaction</span>
             </div>

             <div className="space-y-3">
                {/* Audio Settings */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl space-y-4">
                    <button
                        onClick={toggleSound}
                        className="w-full flex items-center justify-between p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${soundEnabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Click Sounds</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${soundEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${soundEnabled ? 'left-6' : 'left-1'}`} />
                        </div>
                    </button>

                    {soundEnabled && (
                        <div className="space-y-4 pl-1 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="h-px bg-slate-200 dark:bg-white/5 w-full" />
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Tone Pitch</span>
                                    <span className="text-xs font-mono font-bold text-indigo-500">{soundPitch}Hz</span>
                                </div>
                                <input 
                                    type="range" min="200" max="1200" step="50"
                                    value={soundPitch} onChange={(e) => setSoundPitch(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Volume</span>
                                    <span className="text-xs font-mono font-bold text-emerald-500">{Math.round(soundVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="1.0" step="0.1"
                                    value={soundVolume} onChange={(e) => setSoundVolume(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Animation Settings */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl space-y-4">
                    <button
                        onClick={toggleSwipeAnimation}
                        className="w-full flex items-center justify-between p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Swipe Transitions</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${swipeAnimationEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${swipeAnimationEnabled ? 'left-6' : 'left-1'}`} />
                        </div>
                    </button>
                    {animationsEnabled && swipeAnimationEnabled && (
                        <div className="space-y-4 pl-1 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="h-px bg-slate-200 dark:bg-white/5 w-full" />
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Speed</span>
                                    <span className="text-xs font-mono font-bold text-indigo-500">{swipeStiffness}</span>
                                </div>
                                <input 
                                    type="range" min="50" max="8000" step="50"
                                    value={swipeStiffness} onChange={(e) => setSwipeStiffness(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>
          
          {/* --- SECTION 4: CLOUD SYNC --- */}
          {user && !isGuest && (
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2">
                  <UploadCloud size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Cloud Sync</span>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">If you suspect data isn't syncing correctly, you can manually push all your current app data to the cloud.</p>
                  <button
                    onClick={onForceSync}
                    disabled={syncStatus === 'syncing' || syncStatus === 'success'}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-70
                      ${syncStatus === 'success' ? 'bg-emerald-600 text-white' : 
                       syncStatus === 'error' ? 'bg-rose-600 text-white' : 
                       'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                      }
                    `}
                  >
                    {syncButtonContent()}
                  </button>
                  <AnimatePresence>
                    {syncError && syncStatus === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-500 dark:text-rose-400"
                        >
                            <p className="font-bold mb-1">Action Required:</p>
                            <p>{syncError}</p>
                        </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </div>
          )}

          {/* --- SECTION 5: SUPPORT & GUIDE --- */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 border-b border-amber-100 dark:border-amber-500/20 pb-2">
                <HelpCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Support</span>
             </div>

             <div className="grid grid-cols-1 gap-3">
                 <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Tutorial</h3>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1">Replay the welcome tour.</p>
                    </div>
                    <button 
                        onClick={() => { onStartTutorial(); onClose(); }}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                        style={{
                            backgroundColor: 'var(--theme-accent)',
                            color: 'var(--theme-on-accent)'
                        }}
                    >
                        <Map size={14} /> Start
                    </button>
                 </div>

                 {/* Buy Me Coffee */}
                 <div className="pt-2">
                    <BuyMeCoffee />
                 </div>
             </div>
          </div>

          {/* --- SECTION 6: DANGER ZONE --- */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
             <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Danger Zone</span>
             </div>

             {/* Logout Button */}
             {(user || isGuest) && (
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl">
                    <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">End Session</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase font-bold tracking-wider">
                            Sign out of your account
                        </p>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                        <LogOut size={14} /> Log Out
                    </button>
                </div>
            )}

             <button 
               onClick={handleClearData}
               className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors group"
             >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 group-hover:bg-rose-200 dark:group-hover:bg-rose-500/30 transition-colors">
                        <Trash2 size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Clear All Data</p>
                      <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 uppercase font-bold tracking-wider">
                        Reset app & local storage
                      </p>
                    </div>
                </div>
             </button>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 text-center shrink-0">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">Trackly v1.4.0</p>
        </div>
      </Card>
    </div>
  );
};
