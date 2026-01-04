
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Activity, 
  Calendar as CalendarIcon, 
  PenTool, 
  BarChart3, 
  LayoutDashboard,
  Timer,
  Settings,
  ChevronRight,
  ChevronLeft,
  Atom,
  Loader2,
  LogOut,
  ShieldCheck,
  WifiOff,
  ShoppingBag,
  Download,
  Trophy,
  ArrowRight,
  Crown,
  Wifi,
  Menu,
  HardDrive
} from 'lucide-react';
import { ViewType, Session, TestResult, Target, ThemeId, QuestionLog, MistakeCounts } from './types';
import { QUOTES, THEME_CONFIG } from './constants';
import { SettingsModal } from './components/SettingsModal';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { PerformanceToast } from './components/PerformanceToast';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { SmartRecommendationToast } from './components/SmartRecommendationToast';

// Firebase Imports
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, QuerySnapshot, DocumentData } from 'firebase/firestore';

// Lazy Load Components
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const FocusTimer = lazy(() => import('./components/FocusTimer').then(module => ({ default: module.FocusTimer })));
const Planner = lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const TestLog = lazy(() => import('./components/TestLog').then(module => ({ default: module.TestLog })));
const Analytics = lazy(() => import('./components/Analytics').then(module => ({ default: module.Analytics })));
const Resources = lazy(() => import('./components/Resources').then(module => ({ default: module.Resources })));


// UUID Generator
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Safe LocalStorage Parser
const safeJSONParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

// Helper for local date string YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to convert Hex to RGB for CSS variables
const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

const TracklyLogo = React.memo(({ collapsed = false, id }: { collapsed?: boolean, id?: string }) => {
  return (
    <div id={id} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} select-none transition-all duration-300 transform-gpu will-change-transform`}>
      <div className="relative w-8 h-8 flex-shrink-0 text-slate-900 dark:text-white">
          <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
             <path d="M10 22.5C10 15.5964 15.5964 10 22.5 10H77.5C84.4036 10 90 15.5964 90 22.5C90 29.4036 84.4036 35 77.5 35H22.5C15.5964 35 10 29.4036 10 22.5Z" />
             <path d="M37.5 42H62.5V77.5C62.5 84.4036 56.9036 90 50 90C43.0964 90 37.5 84.4036 37.5 77.5V42Z" />
          </svg>
      </div>
      <span className={`text-xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight transition-all duration-300 origin-left whitespace-nowrap overflow-hidden ${collapsed ? 'w-0 opacity-0 scale-0' : 'w-auto opacity-100 scale-100'}`}>
        Trackly
      </span>
    </div>
  );
});

const AnimatedBackground = React.memo(({ 
    themeId,
    showAurora,
    parallaxEnabled,
    showParticles,
    graphicsEnabled,
    animationsEnabled,
    customBackground,
    customBackgroundAlign = 'center'
}: { 
    themeId: ThemeId,
    showAurora: boolean,
    parallaxEnabled: boolean,
    showParticles: boolean,
    graphicsEnabled: boolean,
    animationsEnabled: boolean,
    customBackground: string | null,
    customBackgroundAlign?: 'center' | 'top' | 'bottom'
}) => {
  const config = THEME_CONFIG[themeId];
  
  if (!graphicsEnabled) {
      return (
        <div 
            className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300"
            style={{ 
                backgroundColor: config.colors.bg,
                ...(customBackground ? { backgroundImage: `url(${customBackground})`, backgroundSize: 'cover', backgroundPosition: customBackgroundAlign } : {})
            }}
        >
            {!customBackground && (
                <div className="absolute inset-0 opacity-20" style={{ 
                    background: `radial-gradient(circle at 50% 0%, ${config.colors.accent}40, transparent 70%)` 
                }} />
            )}
            {customBackground && <div className="absolute inset-0 bg-black/30" />}
        </div>
      );
  }

  const shouldAnimate = animationsEnabled && showParticles;

  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!parallaxEnabled || !animationsEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
        if (requestRef.current) return;
        requestRef.current = requestAnimationFrame(() => {
            if (containerRef.current) {
                const { innerWidth: w, innerHeight: h } = window;
                const xOffset = (w / 2 - e.clientX);
                const yOffset = (h / 2 - e.clientY);
                containerRef.current.style.setProperty('--off-x', `${xOffset}`);
                containerRef.current.style.setProperty('--off-y', `${yOffset}`);
            }
            requestRef.current = undefined;
        });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [parallaxEnabled, animationsEnabled]);
  
  const items = useMemo(() => {
    if (!shouldAnimate) return [];
    
    if (themeId === 'midnight') {
        const midnightItems: any[] = [];
        for(let i=0; i<15; i++) { 
            const size = Math.random() * 0.15 + 0.05; 
            const depth = Math.random() * 3 + 1; 
            const isBright = Math.random() > 0.8;
            midnightItems.push({
                id: `star-${i}`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                size: size,
                shape: 'star-point',
                opacity: Math.random() * 0.5 + 0.1,
                parallaxFactor: depth * 0.005, 
                animationDelay: Math.random() * 5,
                animationDuration: Math.random() * 3 + 3,
                isBright
            });
        }
        midnightItems.push({
            id: 'shooting-star-1',
            top: '20%',
            left: '10%',
            size: 1, 
            shape: 'shooting-star',
            parallaxFactor: 0.02
        });
        return midnightItems;
    }

    if (themeId === 'forest') {
        return [
            { id: 1, top: '-10%', left: '-10%', size: 45, shape: 'leaf', depth: 1, rotation: 135, opacity: 0.03 },
            { id: 2, top: '50%', left: '90%', size: 35, shape: 'leaf', depth: 1, rotation: 45, opacity: 0.03 },
            { id: 3, top: '85%', left: '5%', size: 25, shape: 'leaf', depth: 2, rotation: -25, opacity: 0.05 },
        ].map(item => ({
            ...item,
            parallaxFactor: item.depth * 0.005, 
            duration: 0, 
            delay: 0
        }));
    }

    return [
        { id: 1, top: '8%', left: '5%', size: 16, shape: 'ring', depth: 1, opacity: 0.03, rotation: 0 },
        { id: 2, top: '75%', left: '85%', size: 20, shape: 'squircle', depth: 1, opacity: 0.03, rotation: 15 },
        { id: 3, top: '5%', left: '55%', size: 8, shape: 'circle', depth: 1, opacity: 0.02, rotation: 0 },
        { id: 5, top: '30%', left: '90%', size: 4, shape: 'triangle', depth: 2, opacity: 0.06, rotation: 160 },
        { id: 6, top: '45%', left: '5%', size: 5, shape: 'grid', depth: 2, opacity: 0.06, rotation: 10 },
        { id: 9, top: '20%', left: '35%', size: 3, shape: 'circle', depth: 2, opacity: 0.05, rotation: 0 },
    ].map(item => ({
        ...item,
        parallaxFactor: item.depth * 0.08, 
        duration: 40 + (item.id * 2),
        delay: -(item.id * 5)
    }));
  }, [themeId, shouldAnimate]); 

  return (
    <div 
        ref={containerRef}
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transition-colors duration-700 transform-gpu" 
        style={{ 
            backgroundColor: config.colors.bg,
            contain: 'strict',
            '--off-x': 0,
            '--off-y': 0
        } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.03] z-[5] pointer-events-none mix-blend-overlay transform-gpu"></div>
      {customBackground && (
          <div 
            className="absolute inset-0 z-[0] bg-cover bg-no-repeat transition-opacity duration-700"
            style={{ 
                backgroundImage: `url(${customBackground})`, 
                backgroundPosition: customBackgroundAlign,
                opacity: 1 
            }}
          />
      )}
      {customBackground && <div className="absolute inset-0 z-[0] bg-black/40 dark:bg-black/60" />}
      
      {!customBackground && themeId === 'midnight' && (
        <>
            <div 
                className="absolute inset-0 z-[1] transform-gpu" 
                style={{ 
                    background: `linear-gradient(to bottom, #000000 0%, #050505 60%, #0f172a 100%)`
                }} 
            />
            <div 
                className="absolute bottom-[-10%] left-[-10%] right-[-10%] h-[40%] z-[1] opacity-30 transform-gpu"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    opacity: 0.2
                }}
            />
        </>
      )}

      {!customBackground && themeId === 'forest' && (
        <div 
            className="absolute inset-0 z-[1] opacity-60 transform-gpu" 
            style={{ 
                background: `radial-gradient(circle at 50% 120%, #3f6212 0%, transparent 60%), radial-gradient(circle at 50% -20%, #1a2e22 0%, transparent 60%)`
            }} 
        />
      )}

      {!customBackground && themeId === 'obsidian' && (
        <div 
            className="absolute inset-0 z-[1] transform-gpu" 
            style={{ 
                background: `
                    radial-gradient(circle at 50% -10%, #0f172a 0%, #020617 45%, #000000 100%),
                    radial-gradient(circle at 85% 25%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
                    radial-gradient(circle at 15% 75%, rgba(8, 145, 178, 0.05) 0%, transparent 45%)
                `
            }} 
        />
      )}

      {showAurora && !['forest', 'obsidian', 'midnight'].includes(themeId) && !customBackground && (
        <div className="absolute inset-0 z-[1] opacity-50 dark:opacity-20 transform-gpu">
            <div 
               className="absolute top-[-40%] left-[-10%] w-[70vw] h-[70vw] mix-blend-screen dark:mix-blend-screen will-change-transform"
               style={{ 
                   transform: `translate3d(calc(var(--off-x) * 0.05 * 1px), calc(var(--off-y) * 0.05 * 1px), 0)`,
                   filter: 'blur(40px)'
               }} 
            >
                <div 
                    className="w-full h-full rounded-full animate-aurora-1"
                    style={{ background: `radial-gradient(circle, ${config.colors.accent} 0%, transparent 70%)` }}
                />
            </div>
            
            <div 
               className="absolute bottom-[-45%] right-[-10%] w-[60vw] h-[60vw] mix-blend-screen dark:mix-blend-screen will-change-transform"
               style={{ 
                   transform: `translate3d(calc(var(--off-x) * 0.08 * 1px), calc(var(--off-y) * 0.08 * 1px), 0)`,
                   filter: 'blur(40px)'
               }} 
            >
                 <div 
                    className="w-full h-full rounded-full animate-aurora-2"
                    style={{ background: `radial-gradient(circle, ${config.colors.accentGlow} 0%, transparent 70%)` }}
                />
            </div>
        </div>
      )}

      {shouldAnimate && (
        <div className="absolute inset-0 z-[3] overflow-hidden transform-gpu">
            {items.map((item) => (
                <div 
                    key={item.id}
                    className={`absolute ${typeof item.id === 'number' && item.id % 2 === 0 ? 'hidden md:block' : ''} will-change-transform`}
                    style={{
                        top: item.top,
                        left: item.left,
                        transform: parallaxEnabled 
                            ? `translate3d(calc(var(--off-x) * ${item.parallaxFactor} * 1px), calc(var(--off-y) * ${item.parallaxFactor} * 1px), 0)`
                            : 'translate3d(0,0,0)',
                        backfaceVisibility: 'hidden'
                    }}
                >
                    <div 
                        className={`flex items-center justify-center ${
                        themeId === 'obsidian' ? 'animate-obsidian-float' : 
                        !['forest', 'midnight'].includes(themeId) ? 'animate-float-gentle' : ''
                        }`}
                        style={{
                            width: (item as any).width || `${item.size}rem`,
                            height: (item as any).height || `${item.size}rem`,
                            animationDuration: `${item.duration}s`,
                            animationDelay: `${item.delay}s`,
                            color: (item as any).color || config.colors.accent, 
                            opacity: item.opacity,
                            transform: `rotate(${item.rotation || 0}deg)`,
                            filter: 'none',
                            willChange: 'transform'
                        }}
                    >
                        {item.shape === 'leaf' && (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                <path d="M12 2C12 2 20 8 20 16C20 20.4 16.4 24 12 24C7.6 24 4 20.4 4 16C4 8 12 2 12 2Z" fill="currentColor" />
                            </svg>
                        )}
                        {item.shape === 'star-point' && <div className="w-full h-full rounded-full bg-white" />}
                        {item.shape === 'shooting-star' && <div className="w-[100px] h-[2px] bg-gradient-to-r from-transparent via-indigo-200 to-transparent rotate-[-35deg] opacity-20" />}
                        {item.shape === 'circle' && <div className="w-full h-full rounded-full bg-current" style={{ opacity: themeId === 'midnight' ? 1 : 0.4 }} />}
                        {item.shape === 'ring' && <div className="w-full h-full rounded-full border-[3px] border-current opacity-50" />}
                        {item.shape === 'squircle' && <div className="w-full h-full rounded-[2rem] border-[3px] border-current opacity-40" />}
                        {item.shape === 'triangle' && <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full opacity-40"><path d="M12 2L2 22h20L12 2z" /></svg>}
                        {item.shape === 'grid' && (
                            <div className="w-full h-full grid grid-cols-3 gap-2 opacity-40 p-1">
                                {[...Array(9)].map((_, k) => <div key={k} className="bg-current rounded-full w-full h-full" />)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      <div 
        className="absolute inset-0 z-[4] pointer-events-none transition-colors duration-500 transform-gpu"
        style={{
            background: config.mode === 'dark' 
                ? 'radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, 0.4) 100%)' 
                : 'radial-gradient(circle at center, transparent 40%, rgba(255,255,255,0.4) 100%)'
        }}
      />
    </div>
  );
});

const TABS = [
  { id: 'daily', label: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Plan', icon: CalendarIcon },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'tests', label: 'Tests', icon: PenTool },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
];

const TOUR_STEPS: TutorialStep[] = [
  { view: 'daily', targetId: 'trackly-logo', title: 'Welcome to Trackly', description: 'Your command center for academic excellence. This guided tour will show you how to maximize your study efficiency.', icon: LayoutDashboard },
  { view: 'daily', targetId: 'dashboard-subjects', title: 'Track Subjects', description: 'These pods are your daily drivers. Click on Physics, Chemistry, or Maths to log your sessions and track syllabus progress.', icon: Atom },
  { view: 'planner', targetId: 'planner-container', title: 'Strategic Planning', description: 'Use the Planner to schedule tasks for the week or month ahead. Switch views to see your entire month at a glance.', icon: CalendarIcon },
  { view: 'focus', targetId: 'timer-container', title: 'Deep Focus Timer', description: 'Select a specific task from your planner to work on. Enable Brown Noise for isolation and track your flow state.', icon: Timer },
  { view: 'tests', targetId: 'test-log-container', title: 'Test Analysis', description: 'Log your mock test scores here. Record not just your marks, but your temperament and specific mistake patterns.', icon: PenTool },
  { view: 'analytics', targetId: 'analytics-container', title: 'Smart Analytics', description: 'Visualize your syllabus mastery with the new Topic Heatmap. See exactly which chapters are green (mastered) or red (needs work).', icon: BarChart3 },
  { view: 'daily', targetId: 'settings-btn', title: 'Themes & Controls', description: 'Customize your workspace. Switch themes, toggle Parallax Effects and Background Elements, or enable High Performance mode.', icon: Settings }
];

const Sidebar = React.memo(({ 
    view, 
    setView, 
    onOpenSettings, 
    isCollapsed, 
    toggleCollapsed,
    user,
    isGuest,
    onLogin,
    onLogout,
    isInstalled,
    onInstall,
    userName,
    isPro,
    onOpenUpgrade
}: { 
    view: ViewType, 
    setView: (v: ViewType) => void, 
    onOpenSettings: () => void,
    isCollapsed: boolean,
    toggleCollapsed: () => void,
    user: User | null,
    isGuest: boolean,
    onLogin: () => void,
    onLogout: () => void,
    isInstalled: boolean,
    onInstall: () => void,
    userName: string | null,
    isPro: boolean,
    onOpenUpgrade: () => void
}) => {
  return (
    <aside 
        className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-slate-200 dark:border-white/5 backdrop-blur-xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isCollapsed ? 'w-20 items-center' : 'w-64'} overflow-visible transform-gpu will-change-transform`}
        style={{ backgroundColor: 'rgba(var(--theme-card-rgb), 0.5)' }}
    >
      <div className={`h-20 flex items-center relative shrink-0 ${isCollapsed ? 'justify-center px-0 w-full' : 'justify-between px-6'}`}>
        <TracklyLogo collapsed={isCollapsed} id="trackly-logo" />
        <button 
           onClick={toggleCollapsed}
           className={`absolute top-1/2 -translate-y-1/2 -right-3 z-50 w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-md hover:scale-110 active:scale-95`}
           title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
           {isCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2 w-full">
        {TABS.map(tab => {
          const isActive = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as ViewType)}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-300 group relative
                ${isActive 
                  ? 'bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }
                ${isCollapsed ? 'justify-center gap-0' : 'gap-4'}
              `}
              title={isCollapsed ? tab.label : ''}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 flex-shrink-0 relative z-10 will-change-transform
                  ${isActive 
                     ? 'bg-white dark:bg-white/10 shadow-indigo-500/20 shadow-lg' 
                     : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/10 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                  }
              `}>
                <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              
              <span className={`text-sm font-bold tracking-wide transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>
                  {tab.label}
              </span>
              
              {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
            </button>
          )
        })}
      </nav>

      {/* Pro Badge */}
      <div className={`px-4 mb-2 ${isCollapsed ? 'hidden' : 'block'}`}>
          {!isPro ? (
              <button 
                onClick={onOpenUpgrade}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl group transition-all hover:scale-[1.02]"
              >
                  <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white shadow-lg shadow-amber-500/30">
                      <Crown size={14} fill="currentColor" />
                  </div>
                  <div className="text-left">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Upgrade to Pro</p>
                      <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-bold uppercase tracking-wider">Unleash Power</p>
                  </div>
              </button>
          ) : (
              <div className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="p-1.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg text-white shadow-lg shadow-emerald-500/30">
                      <Crown size={14} fill="currentColor" />
                  </div>
                  <div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Pro Active</p>
                      <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase tracking-wider">Power User</p>
                  </div>
              </div>
          )}
      </div>

      {/* Auth Status Section */}
      <div className={`px-4 py-2 ${isCollapsed ? 'hidden' : 'block'}`}>
          {user ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <ShieldCheck size={16} className="text-emerald-500" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Sync Active</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{userName || 'User'}</p>
                </div>
                <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <LogOut size={14} />
                </button>
            </div>
          ) : isGuest ? (
            <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <WifiOff size={16} className="text-slate-500" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Offline Mode</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{userName || 'Guest'}</p>
                </div>
                <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <LogOut size={14} />
                </button>
            </div>
          ) : (
            <button 
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
                Sign In to Save
            </button>
          )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-white/5 w-full space-y-2">
        {/* Install Button (Visible if not installed) */}
        {!isInstalled && (
            <button 
              onClick={onInstall}
              className={`w-full flex items-center px-3 py-3 rounded-xl text-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all group ${isCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
            >
               <div className="p-2 rounded-xl flex-shrink-0">
                 <Download size={20} />
               </div>
               <span className={`text-sm font-bold transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>Install App</span>
            </button>
        )}

        <button 
          id="settings-btn"
          onClick={onOpenSettings}
          className={`w-full flex items-center px-3 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all group ${isCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
          title={isCollapsed ? "Settings" : ''}
        >
          <div className="p-2 rounded-xl transition-all duration-300 flex-shrink-0 relative z-10 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/10 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] will-change-transform">
             <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          </div>
          <span className={`text-sm font-bold transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>Settings</span>
        </button>
      </div>
    </aside>
  );
});

// Optimized slide variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
    position: 'absolute' as 'absolute'
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    position: 'relative' as 'relative'
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 30 : -30, 
    opacity: 0,
    position: 'absolute' as 'absolute'
  }),
};

const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0 },
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('daily');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [goals, setGoals] = useState({ Physics: 30, Chemistry: 30, Maths: 30 });
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [guestNameInput, setGuestNameInput] = useState('');

  // Pro State
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [graphicsEnabled, setGraphicsEnabled] = useState(true);
  const [lagDetectionEnabled, setLagDetectionEnabled] = useState(true);
  const [theme, setTheme] = useState<ThemeId>('default-dark');
  const [showAurora, setShowAurora] = useState(true);
  
  const [parallaxEnabled, setParallaxEnabled] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [swipeAnimationEnabled, setSwipeAnimationEnabled] = useState(true);
  
  const [swipeStiffness, setSwipeStiffness] = useState(6000); 
  const [swipeDamping, setSwipeDamping] = useState(300);    

  // Audio Settings (UI)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundPitch, setSoundPitch] = useState(600);
  const [soundVolume, setSoundVolume] = useState(0.5);
  // Audio Settings (Ambient)
  const [activeSound, setActiveSound] = useState<'off' | 'rain' | 'forest' | 'lofi' | 'cafe'>('off');
  
  // Custom Background
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [customBackgroundEnabled, setCustomBackgroundEnabled] = useState(false);
  const [customBackgroundAlign, setCustomBackgroundAlign] = useState<'center' | 'top' | 'bottom'>('center');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);
  const [direction, setDirection] = useState(0);
  const minSwipeDistance = 50;
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNetworkToast, setShowNetworkToast] = useState(false);

  const [showTestReminder, setShowTestReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  
  const [recommendation, setRecommendation] = useState<{subject: string, topic: string, accuracy: number} | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const clickAudioCtxRef = useRef<AudioContext | null>(null);

  // --- PERSISTENT TIMER STATE ---
  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timerDurations, setTimerDurations] = useState({ focus: 25, short: 5, long: 15 });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<QuestionLog[]>([]);
  const [lastLogTime, setLastLogTime] = useState<number>(Date.now()); 
  const [todayStats, setTodayStats] = useState({ Physics: 0, Chemistry: 0, Maths: 0 });

  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number>(0);
  const brownNoiseCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const { isLagging, dismiss: dismissLag } = usePerformanceMonitor(graphicsEnabled && lagDetectionEnabled);

  const changeView = useCallback((newView: ViewType) => {
     if (view === newView) return;
     const currentIdx = TABS.findIndex(t => t.id === view);
     const newIdx = TABS.findIndex(t => t.id === newView);
     setDirection(newIdx > currentIdx ? 1 : -1);
     setView(newView);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const activateLiteMode = useCallback(() => {
      setGraphicsEnabled(false);
      setAnimationsEnabled(false);
      dismissLag();
  }, [dismissLag]);

  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
          setShowNetworkToast(true);
          setTimeout(() => setShowNetworkToast(false), 3000);
      };
      const handleOffline = () => {
          setIsOnline(false);
          setShowNetworkToast(true);
          setTimeout(() => setShowNetworkToast(false), 3000);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  useEffect(() => {
      const today = getLocalDate();
      const saved = localStorage.getItem(`zenith_stats_${today}`);
      if (saved) setTodayStats(JSON.parse(saved));
  }, []);

  useEffect(() => {
      const today = getLocalDate();
      localStorage.setItem(`zenith_stats_${today}`, JSON.stringify(todayStats));
  }, [todayStats]);

  useEffect(() => {
      if (sessions.length < 5) return; 

      const analyze = () => {
          const subjectTopics = { Physics: new Set<string>(), Chemistry: new Set<string>(), Maths: new Set<string>() };
          const topicStats: Record<string, { subject: string, correct: number, attempted: number }> = {};

          sessions.forEach(s => {
              if (!s.topic) return;
              const subj = s.subject as keyof typeof subjectTopics;
              if (subjectTopics[subj]) {
                  subjectTopics[subj].add(s.topic);
                  
                  const key = `${s.subject}|${s.topic}`;
                  if (!topicStats[key]) topicStats[key] = { subject: s.subject, correct: 0, attempted: 0 };
                  topicStats[key].correct += (s.correct || 0);
                  topicStats[key].attempted += (s.attempted || 0);
              }
          });

          const pCount = subjectTopics.Physics.size;
          const cCount = subjectTopics.Chemistry.size;
          const mCount = subjectTopics.Maths.size;

          if (pCount >= 2 && cCount >= 2 && mCount >= 2) {
              let weakest = null;
              let minAcc = 100; 

              Object.entries(topicStats).forEach(([key, stats]) => {
                  if (stats.attempted < 5) return; 
                  const acc = (stats.correct / stats.attempted) * 100;
                  if (acc < minAcc) {
                      minAcc = acc;
                      weakest = {
                          topic: key.split('|')[1],
                          subject: stats.subject,
                          accuracy: acc
                      };
                  }
              });

              if (weakest) {
                  const lastRec = localStorage.getItem('trackly_last_rec_hash');
                  const currentHash = `${weakest.subject}-${weakest.topic}-${Math.round(weakest.accuracy)}`;
                  if (lastRec !== currentHash) {
                      setRecommendation(weakest);
                      setShowRecommendation(true);
                  }
              }
          }
      };
      
      const timer = setTimeout(analyze, 1500);
      return () => clearTimeout(timer);

  }, [sessions]);

  const handleDismissRecommendation = () => {
      setShowRecommendation(false);
      if (recommendation) {
          const hash = `${recommendation.subject}-${recommendation.topic}-${Math.round(recommendation.accuracy)}`;
          localStorage.setItem('trackly_last_rec_hash', hash);
      }
  };

  const handlePracticeRecommendation = () => {
      handleDismissRecommendation();
      changeView('focus');
  };

  useEffect(() => {
      if (isTimerActive) {
          timerRef.current = setInterval(() => {
              const now = Date.now();
              const diff = Math.ceil((endTimeRef.current - now) / 1000);
              if (diff <= 0) {
                  setTimeLeft(0);
                  setIsTimerActive(false);
                  clearInterval(timerRef.current);
                  if (activeSound !== 'off') setActiveSound('off'); 
              } else {
                  setTimeLeft(diff);
              }
          }, 1000);
      }
      return () => clearInterval(timerRef.current);
  }, [isTimerActive, activeSound]);

  useEffect(() => {
      if (sourceNodeRef.current) {
          try { sourceNodeRef.current.stop(); } catch(e){}
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
      }

      if (activeSound !== 'off') {
          if (!brownNoiseCtxRef.current) {
              brownNoiseCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = brownNoiseCtxRef.current;
          if (ctx?.state === 'suspended') ctx.resume();
          
          const bufferSize = ctx!.sampleRate * 2;
          const buffer = ctx!.createBuffer(1, bufferSize, ctx!.sampleRate);
          const data = buffer.getChannelData(0);

          if (activeSound === 'cafe' || activeSound === 'lofi') {
             let lastOut = 0;
             for (let i = 0; i < bufferSize; i++) {
                 const white = Math.random() * 2 - 1;
                 data[i] = (lastOut + (0.02 * white)) / 1.02;
                 lastOut = data[i];
                 data[i] *= 3.5;
                 if (activeSound === 'lofi' && Math.random() > 0.9995) {
                    data[i] += (Math.random() * 0.8); 
                 }
             }
          } else {
             let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
             for (let i = 0; i < bufferSize; i++) {
                 const white = Math.random() * 2 - 1;
                 b0 = 0.99886 * b0 + white * 0.0555179;
                 b1 = 0.99332 * b1 + white * 0.0750759;
                 b2 = 0.96900 * b2 + white * 0.1538520;
                 b3 = 0.86650 * b3 + white * 0.3104856;
                 b4 = 0.55000 * b4 + white * 0.5329522;
                 b5 = -0.7616 * b5 - white * 0.0168980;
                 data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                 data[i] *= 0.11;
                 b6 = white * 0.115926;
             }
          }

          const source = ctx!.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const gain = ctx!.createGain();
          
          if (activeSound === 'forest') {
               gain.gain.value = 0.08;
               const filter = ctx!.createBiquadFilter();
               filter.type = 'highpass';
               filter.frequency.value = 600;
               source.connect(filter);
               filter.connect(gain);
          } else if (activeSound === 'rain') {
               gain.gain.value = 0.12;
               const filter = ctx!.createBiquadFilter();
               filter.type = 'lowpass';
               filter.frequency.value = 800;
               source.connect(filter);
               filter.connect(gain);
          } else if (activeSound === 'lofi') {
               gain.gain.value = 0.15;
               const filter = ctx!.createBiquadFilter();
               filter.type = 'lowpass';
               filter.frequency.value = 2000;
               source.connect(filter);
               filter.connect(gain);
          } else { 
               gain.gain.value = 0.1;
               source.connect(gain);
          }

          gain.connect(ctx!.destination);
          source.start();
          
          sourceNodeRef.current = source;
          gainNodeRef.current = gain;
      }
  }, [activeSound]);

  const handleTimerToggle = useCallback(() => {
      if (!isTimerActive) {
          setIsTimerActive(true);
          endTimeRef.current = Date.now() + timeLeft * 1000;
          setLastLogTime(Date.now()); 
      } else {
          setIsTimerActive(false);
          clearInterval(timerRef.current);
      }
  }, [isTimerActive, timeLeft]);

  const handleTimerReset = useCallback(() => {
      setIsTimerActive(false);
      setTimeLeft(timerDurations[timerMode] * 60);
      setSessionLogs([]); 
      if (activeSound !== 'off') setActiveSound('off');
  }, [timerMode, timerDurations, activeSound]);

  const handleModeSwitch = useCallback((mode: 'focus'|'short'|'long') => {
      setTimerMode(mode);
      setIsTimerActive(false);
      setTimeLeft(timerDurations[mode] * 60);
  }, [timerDurations]);

  const handleDurationUpdate = useCallback((newDuration: number, modeKey: 'focus'|'short'|'long') => {
      setTimerDurations(prev => ({ ...prev, [modeKey]: newDuration }));
      if (timerMode === modeKey && !isTimerActive) {
          setTimeLeft(newDuration * 60);
      }
  }, [timerMode, isTimerActive]);

  const handleAddLog = useCallback((log: QuestionLog, subject: string) => {
      setSessionLogs(prev => [log, ...prev]);
      setTodayStats(prev => ({ ...prev, [subject]: (prev as any)[subject] + 1 }));
      setLastLogTime(Date.now());
  }, []);

  // 3. Database Operations (Universal: Works for Local Storage)
  const handleSaveSession = useCallback(async (newSession: Omit<Session, 'id' | 'timestamp'>) => {
    const id = generateUUID();
    const timestamp = Date.now();
    const session: Session = { ...newSession, id, timestamp };

    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'sessions', id), session);
    } else if (isGuest) {
        const currentSessions = safeJSONParse('trackly_guest_sessions', []);
        const updated = [session, ...currentSessions];
        setSessions(updated);
        localStorage.setItem('trackly_guest_sessions', JSON.stringify(updated));
    }
  }, [user, isGuest, sessions]);

  const handleCompleteSession = useCallback(() => {
      if (sessionLogs.length === 0) return;

      const subjectGroups: Record<string, QuestionLog[]> = {};
      sessionLogs.forEach(log => {
          if (!subjectGroups[log.subject]) subjectGroups[log.subject] = [];
          subjectGroups[log.subject].push(log);
      });

      Object.entries(subjectGroups).forEach(([subject, logs]) => {
          const attempted = logs.length;
          const correct = logs.filter(l => l.result === 'correct').length;
          const mistakes: MistakeCounts = {};
          
          logs.forEach(l => {
              if (l.result !== 'correct') {
                  mistakes[l.result] = (mistakes[l.result] || 0) + 1;
              }
          });

          handleSaveSession({
              subject,
              topic: 'Focus Session', 
              attempted,
              correct,
              mistakes
          });
      });

      setSessionLogs([]);
      handleTimerReset();
  }, [sessionLogs, handleSaveSession, handleTimerReset]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const changeHandler = (e: any) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', changeHandler);
    return () => mediaQuery.removeEventListener('change', changeHandler);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
      if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
              setDeferredPrompt(null);
          }
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS) {
             alert("To install Trackly:\n\n1. Tap the Share button below\n2. Scroll down and tap 'Add to Home Screen'");
        } else {
             alert("To install Trackly:\n\nLook for the Install icon (⊕) in your browser's address bar, or tap the menu (⋮) and select 'Install App'.");
        }
      }
  };

  // Auth Handlers (Kept but button removed from UI)
  const handleLogin = useCallback(async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        console.error("Login error:", error);
        if (error.code === 'auth/unauthorized-domain') {
            alert("Domain not authorized for Firebase Auth. \n\nPlease use 'Continue Offline' (Guest Mode) if you are running a preview or local build.");
        }
    }
  }, []);

  const handleGuestLogin = useCallback(() => {
      if (!guestNameInput.trim()) return;
      localStorage.setItem('trackly_guest_name', guestNameInput.trim());
      setIsGuest(true);
      setUserName(guestNameInput.trim());
      localStorage.setItem('trackly_is_guest', 'true');
  }, [guestNameInput]);

  const handleLogout = useCallback(async () => {
      if (user) {
          await signOut(auth);
      }
      setIsGuest(false);
      localStorage.removeItem('trackly_is_guest');
      localStorage.removeItem('trackly_guest_name');
      setUserName(null);
      setSessions([]);
      setTests([]);
      setTargets([]);
  }, [user]);

  const handleUpgrade = useCallback(() => {
      setIsPro(true);
      localStorage.setItem('trackly_pro_status', 'true');
  }, []);

  useEffect(() => {
    const handleClick = () => {
       if (!soundEnabled) return;

       if (!clickAudioCtxRef.current) {
          clickAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
       }
       const ctx = clickAudioCtxRef.current;
       if (ctx.state === 'suspended') ctx.resume();

       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       
       osc.connect(gain);
       gain.connect(ctx.destination);

       osc.type = 'sine';
       osc.frequency.setValueAtTime(soundPitch, ctx.currentTime);

       gain.gain.setValueAtTime(0, ctx.currentTime);
       gain.gain.linearRampToValueAtTime(soundVolume * 0.5, ctx.currentTime + 0.005); 
       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08); 

       osc.start(ctx.currentTime);
       osc.stop(ctx.currentTime + 0.08);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [soundEnabled, soundPitch, soundVolume]);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          setIsGuest(false);
          setUserName(currentUser.displayName || 'User');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check for existing guest session
  useEffect(() => {
      const storedGuest = localStorage.getItem('trackly_is_guest');
      if (storedGuest === 'true' && !user) {
          setIsGuest(true);
          setUserName(localStorage.getItem('trackly_guest_name') || 'Guest');
      }
  }, [user]);

  // 2. Data Syncing (Firestore OR LocalStorage)
  useEffect(() => {
    if (user) {
        const sessionsQ = query(collection(db, 'users', user.uid, 'sessions'), orderBy('timestamp', 'desc'));
        const unsubSessions = onSnapshot(sessionsQ, (snapshot: QuerySnapshot<DocumentData>) => {
            setSessions(snapshot.docs.map(d => d.data() as Session));
        });

        const testsQ = query(collection(db, 'users', user.uid, 'tests'), orderBy('timestamp', 'desc'));
        const unsubTests = onSnapshot(testsQ, (snapshot: QuerySnapshot<DocumentData>) => {
            setTests(snapshot.docs.map(d => d.data() as TestResult));
        });

        const targetsQ = query(collection(db, 'users', user.uid, 'targets'), orderBy('timestamp', 'desc'));
        const unsubTargets = onSnapshot(targetsQ, (snapshot: QuerySnapshot<DocumentData>) => {
            setTargets(snapshot.docs.map(d => d.data() as Target));
        });

        return () => {
            unsubSessions();
            unsubTests();
            unsubTargets();
        }
    } else if (isGuest) {
        setSessions(safeJSONParse('trackly_guest_sessions', []));
        setTests(safeJSONParse('trackly_guest_tests', []));
        setTargets(safeJSONParse('trackly_guest_targets', []));
        setGoals(safeJSONParse('trackly_guest_goals', { Physics: 30, Chemistry: 30, Maths: 30 }));
    } else {
        setSessions([]); 
        setTests([]);
        setTargets([]);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if(isGuest) {
        localStorage.setItem('trackly_guest_goals', JSON.stringify(goals));
    }
  }, [goals, isGuest]);

  const handleDeleteSession = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'sessions', id));
    } else if (isGuest) {
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        localStorage.setItem('trackly_guest_sessions', JSON.stringify(updated));
    }
  }, [user, isGuest, sessions]);

  const handleSaveTest = useCallback(async (newTest: Omit<TestResult, 'id' | 'timestamp'>) => {
    const id = generateUUID();
    const timestamp = Date.now();
    const test: TestResult = { ...newTest, id, timestamp };

    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'tests', id), test);
    } else if (isGuest) {
        const updated = [test, ...tests];
        setTests(updated);
        localStorage.setItem('trackly_guest_tests', JSON.stringify(updated));
    }
  }, [user, isGuest, tests]);

  const handleDeleteTest = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'tests', id));
    } else if (isGuest) {
        const updated = tests.filter(t => t.id !== id);
        setTests(updated);
        localStorage.setItem('trackly_guest_tests', JSON.stringify(updated));
    }
  }, [user, isGuest, tests]);

  const handleSaveTarget = useCallback(async (target: Target) => {
    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'targets', target.id), target);
    } else if (isGuest) {
        const updated = [...targets, target];
        setTargets(updated);
        localStorage.setItem('trackly_guest_targets', JSON.stringify(updated));
    }
  }, [user, isGuest, targets]);

  const handleUpdateTarget = useCallback(async (id: string, completed: boolean) => {
    const target = targets.find(t => t.id === id);
    if (target && target.type === 'test' && completed && !target.completed) {
        const messages = [
            "Test completed! Don't forget to analyze it.",
            "Test completed! Log your marks and prepare for the next one.",
            "Finish line crossed. Now, let's look at the data.",
            "Great effort! Record your score to unlock insights.",
            "One step closer to your goal. Log this test now."
        ];
        setReminderMessage(messages[Math.floor(Math.random() * messages.length)]);
        setShowTestReminder(true);
        setTimeout(() => setShowTestReminder(false), 8000);
    }

    if (user) {
        if (target) {
            await setDoc(doc(db, 'users', user.uid, 'targets', id), { ...target, completed });
        }
    } else if (isGuest) {
        const updated = targets.map(t => t.id === id ? { ...t, completed } : t);
        setTargets(updated);
        localStorage.setItem('trackly_guest_targets', JSON.stringify(updated));
    }
  }, [user, isGuest, targets]);

  const handleDeleteTarget = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'targets', id));
    } else if (isGuest) {
        const updated = targets.filter(t => t.id !== id);
        setTargets(updated);
        localStorage.setItem('trackly_guest_targets', JSON.stringify(updated));
    }
  }, [user, isGuest, targets]);

  // Load Settings from LocalStorage
  useEffect(() => {
    setAnimationsEnabled(safeJSONParse('zenith_animations', true));
    setGraphicsEnabled(safeJSONParse('zenith_graphics', true));
    setLagDetectionEnabled(safeJSONParse('zenith_lag_detection', true)); 
    const savedTheme = localStorage.getItem('zenith_theme_id');
    if (savedTheme && THEME_CONFIG[savedTheme as ThemeId]) setTheme(savedTheme as ThemeId);
    setSidebarCollapsed(safeJSONParse('zenith_sidebar_collapsed', false));
    setShowAurora(safeJSONParse('zenith_aurora', true));
    setParallaxEnabled(safeJSONParse('zenith_parallax', true));
    setShowParticles(safeJSONParse('zenith_particles', true));
    setSwipeAnimationEnabled(safeJSONParse('zenith_swipe_animation', true));
    
    setSwipeStiffness(Number(safeJSONParse('zenith_swipe_stiffness', 6000)) || 6000);
    setSwipeDamping(Number(safeJSONParse('zenith_swipe_damping', 300)) || 300);    
    
    setIsPro(safeJSONParse('trackly_pro_status', false));
    
    setSoundEnabled(safeJSONParse('zenith_sound_enabled', true));
    setSoundPitch(Number(safeJSONParse('zenith_sound_pitch', 600)));
    setSoundVolume(Number(safeJSONParse('zenith_sound_volume', 0.5)));
    setTimerDurations(safeJSONParse('zenith_timer_durations', { focus: 25, short: 5, long: 15 }));

    const savedSound = localStorage.getItem('zenith_active_sound');
    if (savedSound) {
       setActiveSound(savedSound as any);
    }

    const savedBg = localStorage.getItem('zenith_custom_bg');
    if (savedBg) setCustomBackground(savedBg);
    
    setCustomBackgroundEnabled(safeJSONParse('zenith_custom_bg_enabled', false));

    const savedBgAlign = localStorage.getItem('zenith_custom_bg_align');
    if (savedBgAlign) setCustomBackgroundAlign(savedBgAlign as any);
  }, []);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('zenith_animations', JSON.stringify(animationsEnabled));
    document.body.classList.toggle('reduce-motion', !animationsEnabled);
  }, [animationsEnabled]);

  useEffect(() => {
    localStorage.setItem('zenith_graphics', JSON.stringify(graphicsEnabled));
    document.body.classList.toggle('low-graphics', !graphicsEnabled);
  }, [graphicsEnabled]);

  useEffect(() => { localStorage.setItem('zenith_lag_detection', JSON.stringify(lagDetectionEnabled)); }, [lagDetectionEnabled]); 

  useEffect(() => { localStorage.setItem('zenith_theme_id', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('zenith_aurora', JSON.stringify(showAurora)); }, [showAurora]);
  useEffect(() => { localStorage.setItem('zenith_parallax', JSON.stringify(parallaxEnabled)); }, [parallaxEnabled]);
  useEffect(() => { localStorage.setItem('zenith_particles', JSON.stringify(showParticles)); }, [showParticles]);
  useEffect(() => { localStorage.setItem('zenith_swipe_animation', JSON.stringify(swipeAnimationEnabled)); }, [swipeAnimationEnabled]);
  useEffect(() => { localStorage.setItem('zenith_swipe_stiffness', String(swipeStiffness)); }, [swipeStiffness]);
  useEffect(() => { localStorage.setItem('zenith_swipe_damping', String(swipeDamping)); }, [swipeDamping]);
  useEffect(() => { localStorage.setItem('zenith_sound_enabled', JSON.stringify(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('zenith_sound_pitch', String(soundPitch)); }, [soundPitch]);
  useEffect(() => { localStorage.setItem('zenith_sound_volume', String(soundVolume)); }, [soundVolume]);
  useEffect(() => { localStorage.setItem('zenith_sidebar_collapsed', JSON.stringify(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem('zenith_timer_durations', JSON.stringify(timerDurations)); }, [timerDurations]);
  useEffect(() => { localStorage.setItem('zenith_active_sound', activeSound); }, [activeSound]);
  
  useEffect(() => {
      if (customBackground) {
          try {
              localStorage.setItem('zenith_custom_bg', customBackground);
          } catch(e) {
              console.error("Failed to save background image", e);
          }
      } else {
          localStorage.removeItem('zenith_custom_bg');
      }
  }, [customBackground]);

  useEffect(() => {
      localStorage.setItem('zenith_custom_bg_enabled', JSON.stringify(customBackgroundEnabled));
  }, [customBackgroundEnabled]);

  useEffect(() => {
      localStorage.setItem('zenith_custom_bg_align', customBackgroundAlign);
  }, [customBackgroundAlign]);

  const toggleCustomBackground = useCallback(() => {
      setCustomBackgroundEnabled(prev => {
          const next = !prev;
          if (next) {
              setShowAurora(false);
              setParallaxEnabled(false);
          }
          return next;
      });
  }, []);


  const toggleSidebar = useCallback(() => {
      setSidebarCollapsed(prev => !prev);
  }, []);

  const startTutorial = () => {
    setIsTutorialActive(true);
    setTutorialStep(0);
    setView('daily'); 
  };

  const nextTutorialStep = () => {
    const nextStep = tutorialStep + 1;
    if (nextStep >= TOUR_STEPS.length) {
      setIsTutorialActive(false);
      setTutorialStep(0);
      setView('daily');
    } else {
      setTutorialStep(nextStep);
      if (TOUR_STEPS[nextStep].view) {
        setView(TOUR_STEPS[nextStep].view as ViewType);
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); 
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const xDistance = touchStart.x - touchEnd.x;
    const yDistance = touchStart.y - touchEnd.y;
    if (Math.abs(yDistance) > Math.abs(xDistance)) return;

    const isLeftSwipe = xDistance > minSwipeDistance;
    const isRightSwipe = xDistance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = TABS.findIndex(t => t.id === view);
      if (isLeftSwipe && currentIndex < TABS.length - 1) changeView(TABS[currentIndex + 1].id as ViewType);
      if (isRightSwipe && currentIndex > 0) changeView(TABS[currentIndex - 1].id as ViewType);
    }
    setTouchStart(null);
    setTouchEnd(null);
  }

  const themeConfig = THEME_CONFIG[theme];
  const effectiveShowAurora = graphicsEnabled && showAurora;
  const effectiveParallax = animationsEnabled && parallaxEnabled;
  const effectiveShowParticles = graphicsEnabled && showParticles;
  const effectiveSwipe = swipeAnimationEnabled; 

  const dynamicStyles = useMemo(() => {
    const rgbBg = hexToRgb(themeConfig.colors.bg);
    const rgbCard = hexToRgb(themeConfig.colors.card);
    const rgbAccent = hexToRgb(themeConfig.colors.accent);
    
    const lightAccentThemes: ThemeId[] = ['midnight', 'forest', 'void', 'obsidian', 'earth', 'morning'];
    const onAccentColor = lightAccentThemes.includes(theme) ? '#020617' : '#ffffff';

    return `
        :root {
          --theme-accent: ${themeConfig.colors.accent};
          --theme-accent-rgb: ${rgbAccent};
          --theme-accent-glow: ${themeConfig.colors.accentGlow};
          --theme-card-bg: ${themeConfig.colors.card};
          --theme-card-rgb: ${rgbCard};
          --theme-bg-rgb: ${rgbBg};
          --theme-text-main: ${themeConfig.colors.text};
          --theme-text-sub: ${themeConfig.mode === 'dark' ? 'rgba(255,255,255,0.5)' : '#334155'};
          --theme-on-accent: ${onAccentColor};
        }
        .text-indigo-50, .text-indigo-100, .text-indigo-200, .text-indigo-300, .text-indigo-400, .text-indigo-500, .text-indigo-600, .text-indigo-700, .text-indigo-800, .text-indigo-900 {
            color: var(--theme-accent) !important;
        }
        .bg-indigo-400, .bg-indigo-500, .bg-indigo-600, .bg-indigo-700 {
            background-color: var(--theme-accent) !important;
        }
        .border-indigo-100, .border-indigo-200, .border-indigo-300, .border-indigo-400, .border-indigo-500, .border-indigo-600 {
            border-color: var(--theme-accent) !important;
        }
        .ring-indigo-500 {
            --tw-ring-color: var(--theme-accent) !important;
        }
        .shadow-indigo-500\\/30 {
            --tw-shadow-color: rgba(var(--theme-accent-rgb), 0.3) !important;
        }
        .shadow-indigo-500\\/20 {
            --tw-shadow-color: rgba(var(--theme-accent-rgb), 0.2) !important;
        }
  `}, [themeConfig, theme]);

  if (isAuthLoading) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${themeConfig.mode === 'dark' ? 'bg-[#020617]' : 'bg-slate-50'}`}>
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Syncing Data...</span>
            </div>
        </div>
    );
  }

  // Not Logged In View
  if (!user && !isGuest) {
    return (
        <div className={`min-h-screen font-sans flex flex-col relative overflow-hidden transition-colors duration-500 ${themeConfig.mode === 'dark' ? 'dark text-slate-100' : 'text-slate-900'}`}>
             <style>{dynamicStyles}</style>
             <AnimatedBackground 
                themeId={theme} 
                showAurora={effectiveShowAurora}
                parallaxEnabled={effectiveParallax}
                showParticles={effectiveShowParticles}
                graphicsEnabled={graphicsEnabled}
                animationsEnabled={animationsEnabled}
                customBackground={customBackgroundEnabled ? customBackground : null}
                customBackgroundAlign={customBackgroundAlign}
             />
             <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-6">
                <TracklyLogo id="login-logo" />
                <div className="mt-8 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-200 dark:border-white/10 text-center max-w-sm w-full shadow-2xl cv-auto">
                    <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Welcome</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        Your private, high-performance study tracker. 
                        <br/><span className="text-[10px] uppercase font-bold opacity-70">Enter your name to begin.</span>
                    </p>
                    
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter your name..."
                            value={guestNameInput}
                            onChange={(e) => setGuestNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGuestLogin()}
                            className="w-full p-4 bg-white/10 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-white/10 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                        />
                        <button 
                            onClick={handleGuestLogin}
                            disabled={!guestNameInput.trim()}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Start Tracking</span>
                            <ArrowRightIcon />
                        </button>
                    </div>

                </div>
             </div>
        </div>
    );
  }

  return (
    <div 
        className={`min-h-screen font-sans overflow-x-hidden relative flex flex-col transition-colors duration-500 ${themeConfig.mode === 'dark' ? 'dark text-slate-100' : 'text-slate-900'}`}
    >
      <style>{dynamicStyles}</style>

      {/* Lag Monitor Toast */}
      <PerformanceToast 
        isVisible={isLagging} 
        onSwitch={activateLiteMode}
        onDismiss={dismissLag} 
      />

      {/* Smart Recommendation Toast */}
      <SmartRecommendationToast
        isVisible={showRecommendation}
        data={recommendation}
        onDismiss={handleDismissRecommendation}
        onPractice={handlePracticeRecommendation}
      />

      {/* Network Status Toast */}
      <AnimatePresence>
        {showNetworkToast && (
          <motion.div
            initial={{ y: -50, opacity: 0, x: '-50%' }}
            animate={{ y: 20, opacity: 1, x: '-50%' }}
            exit={{ y: -50, opacity: 0, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[200] px-4 py-2 rounded-full shadow-lg border backdrop-blur-md flex items-center gap-2"
            style={{
              backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              borderColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
            }}
          >
             {isOnline ? (
               <>
                 <Wifi size={14} className="text-emerald-500" />
                 <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Back Online</span>
               </>
             ) : (
               <>
                 <WifiOff size={14} className="text-rose-500" />
                 <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">No Internet Connection</span>
               </>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatedBackground 
        themeId={theme} 
        showAurora={effectiveShowAurora}
        parallaxEnabled={effectiveParallax}
        showParticles={effectiveShowParticles}
        graphicsEnabled={graphicsEnabled}
        animationsEnabled={animationsEnabled}
        customBackground={customBackgroundEnabled ? customBackground : null}
        customBackgroundAlign={customBackgroundAlign}
      />
      
      <Sidebar 
          view={view} 
          setView={changeView} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
          isCollapsed={sidebarCollapsed}
          toggleCollapsed={toggleSidebar}
          user={user}
          isGuest={isGuest}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isInstalled={isInstalled}
          onInstall={handleInstallClick}
          userName={userName}
          isPro={isPro}
          onOpenUpgrade={() => setShowProModal(true)}
      />

      {/* Mobile Header - Fixed */}
      <div className="md:hidden fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-6 py-4 flex justify-between items-center transition-colors duration-500">
        <TracklyLogo id="trackly-logo-mobile" />
        <div className="flex items-center gap-3">
            {!isPro && (
                <button 
                    onClick={() => setShowProModal(true)}
                    className="p-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm shadow-amber-500/10 active:scale-95"
                >
                    <Crown size={20} fill="currentColor" />
                </button>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <Settings size={24} className="text-slate-600 dark:text-slate-300" />
            </button>
        </div>
      </div>

      <main 
          className={`relative z-10 flex-grow p-4 md:p-10 pt-24 md:pt-10 pb-24 md:pb-10 w-full md:w-auto transition-all duration-500 ease-in-out overflow-x-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
      >
        <div className="max-w-7xl mx-auto w-full relative">
           <AnimatePresence initial={false} mode='wait' custom={direction}>
             <motion.div
                key={view}
                custom={direction}
                variants={effectiveSwipe ? slideVariants : fadeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={effectiveSwipe ? (
                  animationsEnabled ? {
                    x: { type: "spring", stiffness: swipeStiffness, damping: swipeDamping, mass: 0.8 },
                    opacity: { duration: 0.15 }
                  } : {
                    x: { type: "tween", ease: "circOut", duration: 0.2 },
                    opacity: { duration: 0.2 }
                  }
                ) : { duration: animationsEnabled ? 0.2 : 0 }}
                className="w-full will-change-transform"
             >
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-widest">Loading View...</span>
                    </div>
                }>
                  {view === 'daily' && (
                      <Dashboard 
                          sessions={sessions}
                          targets={targets}
                          quote={QUOTES[quoteIdx]}
                          onDelete={handleDeleteSession}
                          goals={goals}
                          setGoals={setGoals}
                          onSaveSession={handleSaveSession}
                          userName={userName}
                      />
                  )}
                  {view === 'planner' && (
                      <Planner 
                          targets={targets}
                          onAdd={handleSaveTarget}
                          onToggle={handleUpdateTarget}
                          onDelete={handleDeleteTarget}
                      />
                  )}
                  {view === 'focus' && (
                      <div className="min-h-[80vh] flex flex-col justify-center">
                        <FocusTimer 
                            targets={targets} 
                            mode={timerMode}
                            timeLeft={timeLeft}
                            isActive={isTimerActive}
                            durations={timerDurations}
                            activeSound={activeSound}
                            onSetSound={setActiveSound}
                            sessionLogs={sessionLogs}
                            lastLogTime={lastLogTime}
                            onToggleTimer={handleTimerToggle}
                            onResetTimer={handleTimerReset}
                            onSwitchMode={handleModeSwitch}
                            onToggleSound={() => {/* Deprecated */}}
                            onUpdateDurations={handleDurationUpdate}
                            onAddLog={handleAddLog}
                            onCompleteSession={handleCompleteSession}
                            isPro={isPro}
                            sessionCount={sessions.length}
                            onOpenUpgrade={() => setShowProModal(true)}
                        />
                      </div>
                  )}
                  {view === 'tests' && (
                      <TestLog 
                          tests={tests}
                          targets={targets} 
                          onSave={handleSaveTest}
                          onDelete={handleDeleteTest}
                          isPro={isPro}
                          onOpenUpgrade={() => setShowProModal(true)}
                      />
                  )}
                  {view === 'analytics' && (
                      <Analytics 
                        sessions={sessions} 
                        tests={tests} 
                        isPro={isPro} 
                        onOpenUpgrade={() => setShowProModal(true)}
                      />
                  )}
                  {view === 'resources' && (
                      <Resources />
                  )}
                </Suspense>
             </motion.div>
           </AnimatePresence>
        </div>
      </main>

      {/* Test Log Reminder Toast */}
      <AnimatePresence>
        {showTestReminder && (
            <motion.div 
                initial={{ x: "-50%", y: 100, opacity: 0 }}
                animate={{ x: "-50%", y: 0, opacity: 1 }}
                exit={{ x: "-50%", y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-24 md:bottom-10 left-1/2 z-[100] w-[90%] max-w-sm"
            >
                <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Test Completed!</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">{reminderMessage}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            changeView('tests');
                            setShowTestReminder(false);
                        }}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                    >
                        Log Now <ArrowRight size={12} />
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal 
        isOpen={showProModal} 
        onClose={() => setShowProModal(false)}
        onUpgrade={handleUpgrade}
      />

      {/* Nav and Modals ... */}
      <nav 
        className="fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 px-6 py-3 md:hidden transition-colors duration-500 shadow-[0_-5px_10px_rgba(0,0,0,0.03)] dark:shadow-none"
        style={{ 
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            backgroundColor: themeConfig.mode === 'dark' ? themeConfig.colors.bg + 'ee' : 'rgba(255,255,255,0.95)'
        }}
      >
          <div className="flex justify-around items-center">
            {TABS.map(tab => {
              const isActive = view === tab.id;
              return (
                <button
                    key={tab.id}
                    onClick={() => changeView(tab.id as ViewType)}
                    className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-transparent'}`}>
                        <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-all" />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
                </button>
            )})}
          </div>
      </nav>

      {isTutorialActive && (
        <TutorialOverlay 
          steps={TOUR_STEPS}
          currentStep={tutorialStep}
          onNext={nextTutorialStep}
          onClose={() => setIsTutorialActive(false)}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        animationsEnabled={animationsEnabled}
        toggleAnimations={() => setAnimationsEnabled(!animationsEnabled)}
        graphicsEnabled={graphicsEnabled}
        toggleGraphics={() => setGraphicsEnabled(!graphicsEnabled)}
        lagDetectionEnabled={lagDetectionEnabled}
        toggleLagDetection={() => setLagDetectionEnabled(!lagDetectionEnabled)}
        theme={theme}
        setTheme={setTheme}
        onStartTutorial={startTutorial}
        showAurora={showAurora}
        toggleAurora={() => setShowAurora(!showAurora)}
        parallaxEnabled={parallaxEnabled}
        toggleParallax={() => setParallaxEnabled(!parallaxEnabled)}
        showParticles={showParticles}
        toggleParticles={() => setShowParticles(!showParticles)}
        swipeAnimationEnabled={swipeAnimationEnabled}
        toggleSwipeAnimation={() => setSwipeAnimationEnabled(!swipeAnimationEnabled)}
        swipeStiffness={swipeStiffness}
        setSwipeStiffness={setSwipeStiffness}
        swipeDamping={swipeDamping}
        setSwipeDamping={setSwipeDamping}
        
        soundEnabled={soundEnabled}
        toggleSound={() => setSoundEnabled(!soundEnabled)}
        soundPitch={soundPitch}
        setSoundPitch={setSoundPitch}
        soundVolume={soundVolume}
        setSoundVolume={setSoundVolume}

        customBackground={customBackground}
        setCustomBackground={setCustomBackground}
        customBackgroundEnabled={customBackgroundEnabled}
        toggleCustomBackground={toggleCustomBackground}
        customBackgroundAlign={customBackgroundAlign}
        setCustomBackgroundAlign={setCustomBackgroundAlign}
        isPro={isPro}
        onOpenUpgrade={() => setShowProModal(true)}
      />
    </div>
  );
};

// Simple Arrow Icon for Login Button
const ArrowRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export default App;
