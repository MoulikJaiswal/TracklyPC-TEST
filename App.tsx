import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
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
  Clock,
  Book,
  Menu,
  Hammer,
  Rocket,
  Brain,
  ListChecks,
  Check,
  Trash2,
  X
} from 'lucide-react';
import { ViewType, Session, TestResult, Target, ThemeId, QuestionLog, MistakeCounts, Note, Folder, StreamType, SyllabusData } from './types';
import { QUOTES, THEME_CONFIG, JEE_SYLLABUS, NEET_SYLLABUS, STREAM_SUBJECTS, ALL_SYLLABUS } from './constants';
import { SettingsModal } from './components/SettingsModal';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { PerformanceToast } from './components/PerformanceToast';
import { SmartRecommendationToast } from './components/SmartRecommendationToast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleIcon } from './components/GoogleIcon';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { Card } from './components/Card';
import { BuyMeCoffee } from './components/BuyMeCoffee';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { getProStatus } from './components/proController';
import { StreamTransition } from './components/StreamTransition';
import { TracklyLogo } from './components/TracklyLogo';
import { WelcomePage } from './components/WelcomePage';

// Firebase Imports
import { auth, db, googleProvider, dbReadyPromise, logAnalyticsEvent } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, writeBatch, getDoc } from 'firebase/firestore';

// Lazy Load Components
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const FocusTimer = lazy(() => import('./components/FocusTimer').then(module => ({ default: module.FocusTimer })));
const Planner = lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const TestLog = lazy(() => import('./components/TestLog').then(module => ({ default: module.TestLog })));
const Analytics = lazy(() => import('./components/Analytics').then(module => ({ default: module.Analytics })));
const VirtualLibrary = lazy(() => import('./components/VirtualLibrary').then(module => ({ default: module.VirtualLibrary })));

const MotionDiv = motion.div as any;

// Firestore Sanitizer
const sanitizeForFirestore = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }

  if (data !== null && typeof data === 'object' && data.constructor === Object) {
    const sanitized: { [key: string]: any } = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    });
    return sanitized;
  }

  return data;
};

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
const getLocalDate = (d = new Date()) => {
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
                        {item.shape === 'star-point' && <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]" />}
                        {item.shape === 'shooting-star' && (
                            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent to-white/80 rounded-full" />
                        )}
                        {item.shape === 'leaf' && <div className="w-full h-full bg-current rounded-tr-[100%] rounded-bl-[100%]" />}
                        {item.shape === 'ring' && <div className="w-full h-full border-2 border-current rounded-full" />}
                        {item.shape === 'squircle' && <div className="w-full h-full border-2 border-current rounded-[30%]" />}
                        {item.shape === 'circle' && <div className="w-full h-full bg-current rounded-full opacity-50" />}
                        {item.shape === 'triangle' && <div className="w-0 h-0 border-l-[50%] border-r-[50%] border-b-[100%] border-l-transparent border-r-transparent border-b-current" />}
                        {item.shape === 'grid' && <div className="w-full h-full border border-current opacity-20" />}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
});

const TABS = [
  { id: 'daily', label: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Plan', icon: CalendarIcon },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'group-focus', label: 'Focus Lounge', icon: Hammer },
  { id: 'tests', label: 'Tests', icon: PenTool },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
];

const TOUR_STEPS: TutorialStep[] = [
  { 
    view: 'daily', 
    targetId: 'trackly-logo', 
    title: 'Welcome to Trackly', 
    description: 'Trackly is an analytics engine for your exam prep. This brief tour will show you how to track accuracy, not just hours.', 
    icon: LayoutDashboard 
  },
  { 
    view: 'daily', 
    targetId: 'dashboard-subjects', 
    title: 'Subject Command', 
    description: 'Tap any subject card to manually log an offline session, view chapter history, or check your mistake patterns.', 
    icon: Atom 
  },
  { 
    view: 'planner', 
    targetId: 'planner-container', 
    title: 'Strategic Planner', 
    description: 'Plan ahead. Toggle the "Scheduled Test" button on any task to create a countdown timer on your dashboard.', 
    icon: CalendarIcon 
  },
  { 
    view: 'focus', 
    targetId: 'timer-container', 
    title: 'Active Recall Timer', 
    description: 'The heart of Trackly. Select a goal, and use the "+1 Solved" button to log questions and tag errors immediately.', 
    icon: Timer 
  },
  { 
    view: 'tests', 
    targetId: 'test-log-container', 
    title: 'Test Gallery', 
    description: 'Log mock tests here. You can attach your question paper (PDF) and upload a custom cover image to create a visual archive.', 
    icon: PenTool 
  },
  { 
    view: 'analytics', 
    targetId: 'analytics-container', 
    title: 'Mastery Heatmap', 
    description: 'Identify your weak chapters instantly. The Heatmap uses color coding (Red to Green) to show your accuracy trends.', 
    icon: BarChart3 
  },
  { 
    view: 'daily', 
    targetId: 'settings-btn', 
    title: 'Your Space', 
    description: 'Customize your experience. Enable "Lite Mode" for better battery life or switch to the "Midnight" theme for late-night study.', 
    icon: Settings 
  }
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

const OverdueTasksModal = ({
  isOpen,
  tasks,
  onClose,
  onComplete,
  onDelete
}: {
  isOpen: boolean;
  tasks: Target[];
  onClose: () => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <Card
        className="w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        style={{ 
          backgroundColor: 'rgba(var(--theme-card-rgb), 0.95)',
          borderColor: 'rgba(var(--theme-accent-rgb), 0.3)'
        }}
      >
        <div className="flex justify-between items-center mb-4 p-6 border-b" style={{ borderColor: 'rgba(var(--theme-text-main), 0.1)' }}>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--theme-text-main)' }}>
            <ListChecks size={20} className="text-amber-500" /> Overdue Tasks
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">You have {tasks.length} unfinished tasks from previous days.</p>
          {tasks.map(task => (
            <div key={task.id} className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 group">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{task.text}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{task.date}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onComplete(task.id)}
                  className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/20"
                  title="Mark as Done"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-2 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/20"
                  title="Delete Task"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t" style={{ borderColor: 'rgba(var(--theme-text-main), 0.1)' }}>
            <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
                Got It
            </button>
        </div>
      </Card>
    </div>,
    document.body
  );
};


export const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('daily');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  // Stream State
  const [stream, setStream] = useState<StreamType>(() => safeJSONParse('trackly_stream', 'JEE'));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStream, setTransitionStream] = useState<StreamType>(stream);

  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const savedStream: StreamType = safeJSONParse('trackly_stream', 'JEE');
    const savedGoals = safeJSONParse('trackly_goals', {});
    const defaultGoals = STREAM_SUBJECTS[savedStream].reduce((acc, sub) => ({ ...acc, [sub]: 30 }), {});
    return { ...defaultGoals, ...savedGoals };
  });

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Pro Features State
  const [hasPaid, setHasPaid] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem('trackly_pro') === 'true');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isPro = getProStatus(hasPaid);

  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundPitch, setSoundPitch] = useState(600);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [customBackgroundEnabled, setCustomBackgroundEnabled] = useState(false);
  const [customBackgroundAlign, setCustomBackgroundAlign] = useState<'center' | 'top' | 'bottom'>('center');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const touchEndRef = useRef<{ x: number, y: number } | null>(null);
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
  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timerDurations, setTimerDurations] = useState({ focus: 25, short: 5, long: 15 });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  // NEW TIMER STATE
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [sessionLogs, setSessionLogs] = useState<QuestionLog[]>([]);
  const [lastLogTime, setLastLogTime] = useState<number>(Date.now()); 
  const [todayStats, setTodayStats] = useState({ Physics: 0, Chemistry: 0, Maths: 0 });
  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number>(0);
  const { isLagging, dismiss: dismissLag } = usePerformanceMonitor(graphicsEnabled && lagDetectionEnabled);
  
  // Overdue Task Reminder State
  const [overdueTasks, setOverdueTasks] = useState<Target[]>([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  // Focus Subject State (Lifted from FocusTimer)
  const [selectedSubject, setSelectedSubject] = useState<string>(STREAM_SUBJECTS[stream][0]);

  // Derived Stream Data
  const currentSyllabus = useMemo(() => ALL_SYLLABUS[stream], [stream]);
  const currentSubjects = useMemo(() => STREAM_SUBJECTS[stream], [stream]);
  
  const handleChangeStream = (newStream: StreamType) => {
    if (stream === newStream) return;

    setTransitionStream(newStream);
    setIsTransitioning(true);

    setTimeout(() => {
        setStream(newStream);
    }, 400);

    setTimeout(() => {
        setIsTransitioning(false);
    }, 1000);
  };

  // Save stream to localStorage
  useEffect(() => {
    localStorage.setItem('trackly_stream', JSON.stringify(stream));
    // When stream changes, update goals and selected subject
    setGoals(prevGoals => {
        const defaultGoals = currentSubjects.reduce((acc, sub) => ({ ...acc, [sub]: 30 }), {});
        const newGoals = { ...defaultGoals };
        for (const subject of currentSubjects) {
            if (prevGoals[subject]) {
                newGoals[subject] = prevGoals[subject];
            }
        }
        return newGoals;
    });
    setSelectedSubject(currentSubjects[0]);
  }, [stream, currentSubjects]);

  // Save goals to localStorage
  useEffect(() => {
    if (user || isGuest) { // Only save if user has loaded
        localStorage.setItem('trackly_goals', JSON.stringify(goals));
    }
  }, [goals, user, isGuest]);

  // --- Theme Computed Values ---
  const themeConfig = THEME_CONFIG[theme];
  
  const dynamicStyles = useMemo(() => `
      :root {
        --theme-bg: ${themeConfig.colors.bg};
        --theme-card: ${themeConfig.colors.card};
        --theme-card-rgb: ${hexToRgb(themeConfig.colors.card)};
        --theme-accent: ${themeConfig.colors.accent};
        --theme-accent-rgb: ${hexToRgb(themeConfig.colors.accent)};
        --theme-accent-glow: ${themeConfig.colors.accentGlow};
        --theme-text-main: ${themeConfig.colors.text};
      }
  `, [themeConfig]);

  const effectiveShowAurora = graphicsEnabled && showAurora;
  const effectiveParallax = graphicsEnabled && parallaxEnabled;
  const effectiveShowParticles = graphicsEnabled && showParticles;
  const effectiveSwipe = animationsEnabled && swipeAnimationEnabled;

  const handleUpdateTarget = useCallback(async (id: string, completed: boolean) => {
    if (user) {
        setTargets(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
        const targetRef = doc(db, 'users', user.uid, 'targets', id);
        await setDoc(targetRef, { completed }, { merge: true });
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setTargets(prev => {
            const updated = prev.map(t => t.id === id ? { ...t, completed } : t);
            localStorage.setItem('trackly_guest_targets', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const changeView = useCallback((newView: ViewType) => {
     if (view === newView) return;
     const currentIdx = TABS.findIndex(t => t.id === view);
     const newIdx = TABS.findIndex(t => t.id === newView);
     setDirection(newIdx > currentIdx ? 1 : -1);
     setView(newView);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // Clock Ticker
  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  // Analytics Screen View Tracking
  useEffect(() => {
    logAnalyticsEvent('screen_view', {
      firebase_screen: view,
      firebase_screen_class: 'App'
    });
  }, [view]);

  // Overdue Task Reminder Logic
  useEffect(() => {
    const hasShownReminder = sessionStorage.getItem('trackly_overdue_reminder_shown');
    if (targets.length > 0 && !hasShownReminder) {
      const today = getLocalDate();
      const overdue = targets.filter(t => t.date < today && !t.completed)
                             .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (overdue.length > 0) {
        setOverdueTasks(overdue);
        // Show after a small delay to let the app settle
        const timer = setTimeout(() => {
          setShowOverdueModal(true);
          sessionStorage.setItem('trackly_overdue_reminder_shown', 'true');
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [targets]);

  const handleUpgrade = useCallback(() => {
      setHasPaid(true);
      localStorage.setItem('trackly_pro', 'true');
      setShowUpgradeModal(false);
  }, []);

  const activateLiteMode = useCallback(() => {
      setGraphicsEnabled(false);
      setAnimationsEnabled(false);
      dismissLag();
  }, [dismissLag]);

  // Network Status Monitor
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

  // Recommendation Logic
  useEffect(() => {
      if (sessions.length < 5) return; 

      const analyze = () => {
          const subjectTopics: Record<string, Set<string>> = currentSubjects.reduce((acc, sub) => ({...acc, [sub]: new Set() }), {});
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
          
          const allSubjectsHaveSufficientData = currentSubjects.every(sub => subjectTopics[sub] && subjectTopics[sub].size >= 2);

          if (allSubjectsHaveSufficientData) {
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

  }, [sessions, currentSubjects]);

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

  const playTimerEndSound = useCallback(() => {
      if (!soundEnabled) return;
      try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1.5);
          
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
          
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.5);
          
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(440, ctx.currentTime); 
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 2);

      } catch (e) { console.error("Audio play failed", e); }
  }, [soundEnabled]);

  const handleSaveSession = useCallback(async (newSession: Omit<Session, 'id' | 'timestamp'>) => {
    const id = generateUUID();
    const timestamp = Date.now();
    const session: Session = { ...newSession, id, timestamp };
    const isGuestSession = localStorage.getItem('trackly_is_guest') === 'true';

    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'sessions', id), sanitizeForFirestore(session));
    } else if (isGuestSession) {
        setSessions(prev => {
            const updated = [session, ...prev];
            localStorage.setItem('trackly_guest_sessions', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleCompleteSession = useCallback((elapsedTime?: number) => {
      // Logic: If user logged questions (sessionLogs > 0), use that data.
      // If user didn't log questions but time elapsed > 1 minute, create a "time-only" session.
      
      if (sessionLogs.length === 0) {
          // Check if time-only session applies
          const effectiveDuration = elapsedTime || 0;
          if (effectiveDuration > 60) { // Minimum 1 minute
             handleSaveSession({
                 subject: selectedSubject,
                 topic: 'Focus Session', 
                 attempted: 0,
                 correct: 0,
                 mistakes: {},
                 duration: effectiveDuration
             });
          }
          handleTimerReset();
          return;
      }

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

          // Calculate duration for this subject based on logs
          // Note: This sums individual question times. 
          const totalDuration = logs.reduce((acc, log) => acc + (log.duration || 0), 0);

          handleSaveSession({
              subject,
              topic: 'Focus Session', 
              attempted,
              correct,
              mistakes,
              duration: totalDuration
          });
      });

      setSessionLogs([]);
      handleTimerReset();
  }, [sessionLogs, handleSaveSession, selectedSubject, timerMode, timeLeft, timerDurations]);

  // Persistent Timer Logic
  useEffect(() => {
      if (timerState === 'running') {
          timerRef.current = setInterval(() => {
              const now = Date.now();
              const diff = Math.ceil((endTimeRef.current - now) / 1000);
              if (diff <= 0) {
                  const fullDuration = timerDurations[timerMode] * 60;
                  setTimeLeft(0);
                  setTimerState('idle'); // Automatically stop when time is up
                  clearInterval(timerRef.current);
                  playTimerEndSound();
                  
                  // Auto-save session on timer completion
                  handleCompleteSession(fullDuration);
              } else {
                  setTimeLeft(diff);
              }
          }, 1000);
      }
      return () => clearInterval(timerRef.current);
  }, [timerState, playTimerEndSound, timerDurations, timerMode, handleCompleteSession]);

  const handleTimerToggle = useCallback(() => {
      if (timerState === 'idle' || timerState === 'paused') {
          setTimerState('running');
          endTimeRef.current = Date.now() + timeLeft * 1000;
          setLastLogTime(Date.now()); 
      } else {
          setTimerState('paused');
          clearInterval(timerRef.current);
      }
  }, [timerState, timeLeft]);

  const handleTimerReset = useCallback(() => {
      setTimerState('idle');
      setTimeLeft(timerDurations[timerMode] * 60);
      setSessionLogs([]); 
  }, [timerMode, timerDurations]);

  const handleModeSwitch = useCallback((mode: 'focus'|'short'|'long') => {
      setTimerMode(mode);
      setTimerState('idle');
      setTimeLeft(timerDurations[mode] * 60);
  }, [timerDurations]);

  const handleDurationUpdate = useCallback((newDuration: number, modeKey: 'focus'|'short'|'long') => {
      setTimerDurations(prev => ({ ...prev, [modeKey]: newDuration }));
      // Only update time left if we are currently idle and in that mode
      if (timerMode === modeKey && timerState === 'idle') {
          setTimeLeft(newDuration * 60);
      }
  }, [timerMode, timerState]);

  const handleAddLog = useCallback((log: QuestionLog, subject: string) => {
      setSessionLogs(prev => [log, ...prev]);
      setTodayStats(prev => ({ ...prev, [subject]: (prev as any)[subject] + 1 }));
      setLastLogTime(Date.now());
  }, []);

  // Check Installation Status
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const changeHandler = (e: any) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', changeHandler);
    return () => mediaQuery.removeEventListener('change', changeHandler);
  }, []);

  // Capture Install Prompt
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

  const migrateGuestDataToFirebase = useCallback(async (uid: string) => {
    console.log("Migrating guest data to user account:", uid);
    const batch = writeBatch(db);

    const guestSessions: Session[] = safeJSONParse('trackly_guest_sessions', []);
    if(guestSessions.length > 0) guestSessions.forEach(item => {
        const docRef = doc(db, 'users', uid, 'sessions', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
    });

    const guestTests: TestResult[] = safeJSONParse('trackly_guest_tests', []);
    if(guestTests.length > 0) guestTests.forEach(item => {
        const docRef = doc(db, 'users', uid, 'tests', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
    });

    const guestTargets: Target[] = safeJSONParse('trackly_guest_targets', []);
    if(guestTargets.length > 0) guestTargets.forEach(item => {
        const docRef = doc(db, 'users', uid, 'targets', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
    });

    const guestNotes: Note[] = safeJSONParse('trackly_guest_notes', []);
    if(guestNotes.length > 0) guestNotes.forEach(item => {
        const docRef = doc(db, 'users', uid, 'notes', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
    });
    
    const guestFolders: Folder[] = safeJSONParse('trackly_guest_folders', []);
    if(guestFolders.length > 0) guestFolders.forEach(item => {
        const docRef = doc(db, 'users', uid, 'folders', item.id);
        batch.set(docRef, sanitizeForFirestore(item));
    });

    try {
        await batch.commit();
        console.log("Guest data migration complete.");
    } catch (e) {
        console.error("Error migrating guest data:", e);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    try {
        const isCurrentlyGuest = localStorage.getItem('trackly_is_guest') === 'true';
        const guestDataExists = [
            'trackly_guest_sessions',
            'trackly_guest_tests',
            'trackly_guest_targets',
            'trackly_guest_notes',
            'trackly_guest_folders'
        ].some(key => localStorage.getItem(key) && localStorage.getItem(key) !== '[]');

        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        if (user && isCurrentlyGuest && guestDataExists) {
            setIsMigrating(true);
            await migrateGuestDataToFirebase(user.uid);
            
            localStorage.removeItem('trackly_is_guest');
            localStorage.removeItem('trackly_guest_name');
            localStorage.removeItem('trackly_guest_sessions');
            localStorage.removeItem('trackly_guest_tests');
            localStorage.removeItem('trackly_guest_targets');
            localStorage.removeItem('trackly_guest_notes');
            localStorage.removeItem('trackly_guest_folders');
            localStorage.removeItem('trackly_guest_goals');
            
            setIsMigrating(false);
        }
    } catch (error: any) {
        console.error("Google Sign-In error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("Could not sign in with Google. Please try again or continue as a guest.");
        }
        setIsMigrating(false);
    }
  }, [migrateGuestDataToFirebase]);

  // Updated to accept name argument
  const handleGuestLogin = useCallback((name?: string) => {
      const nameToUse = name || guestNameInput;
      if (!nameToUse.trim()) return;
      localStorage.setItem('trackly_guest_name', nameToUse.trim());
      setIsGuest(true);
      localStorage.setItem('trackly_is_guest', 'true');
      setUserName(nameToUse.trim());
  }, [guestNameInput]);

  const handleLogout = useCallback(async () => {
    if (user) {
        await signOut(auth);
    } else if (isGuest) {
        setIsGuest(false);
        localStorage.removeItem('trackly_is_guest');
        localStorage.removeItem('trackly_guest_name');
        setUserName(null); // Clear username on logout
    }
  }, [user, isGuest]);

  // ... (Sync, audio, DB ready effects omitted for brevity, they are unchanged)

  const handleForceSync = useCallback(async () => {
    if (!user) {
      console.error("Cannot force sync: no user logged in.");
      setSyncStatus('error');
      setSyncError("You must be logged in to sync.");
      setTimeout(() => setSyncStatus('idle'), 4000);
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sync operation timed out after 15 seconds.')), 15000)
    );

    try {
      const batch = writeBatch(db);
      
      sessions.forEach(item => batch.set(doc(db, 'users', user.uid, 'sessions', item.id), sanitizeForFirestore(item)));
      tests.forEach(item => batch.set(doc(db, 'users', user.uid, 'tests', item.id), sanitizeForFirestore(item)));
      targets.forEach(item => batch.set(doc(db, 'users', user.uid, 'targets', item.id), sanitizeForFirestore(item)));
      notes.forEach(item => batch.set(doc(db, 'users', user.uid, 'notes', item.id), sanitizeForFirestore(item)));
      folders.forEach(item => batch.set(doc(db, 'users', user.uid, 'folders', item.id), sanitizeForFirestore(item)));

      await Promise.race([
        batch.commit(),
        timeoutPromise
      ]);
      
      setSyncStatus('success');
      setSyncError(null);
    } catch (e: any) {
      console.error("Force sync failed:", e);
      setSyncStatus('error');
      if (e.code === 'permission-denied') {
          setSyncError("Permission Denied. Please check your Firestore security rules. They should allow logged-in users to write to their own documents (e.g., 'allow write: if request.auth.uid == userId;').");
      } else {
          setSyncError(`An unknown error occurred: ${e.message}. Check the console for details.`);
      }
    } finally {
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [user, sessions, tests, targets, notes, folders]);

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

  useEffect(() => {
    dbReadyPromise.then(() => {
      setIsFirebaseReady(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          setIsGuest(false);
          setUserName(currentUser.displayName || 'User');
      } else {
          setUserName(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
      const storedGuest = localStorage.getItem('trackly_is_guest');
      if (storedGuest === 'true' && !user) {
          setIsGuest(true);
          setUserName(localStorage.getItem('trackly_guest_name') || 'Guest');
      }
  }, [user]);

  useEffect(() => {
    if (!isFirebaseReady) return; 

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

        const foldersQ = query(collection(db, 'users', user.uid, 'folders'), orderBy('timestamp', 'desc'));
        const unsubFolders = onSnapshot(foldersQ, (snapshot: QuerySnapshot<DocumentData>) => {
            setFolders(snapshot.docs.map(d => d.data() as Folder));
        });

        const notesQ = query(collection(db, 'users', user.uid, 'notes'), orderBy('timestamp', 'desc'));
        const unsubNotes = onSnapshot(notesQ, (snapshot: QuerySnapshot<DocumentData>) => {
            setNotes(snapshot.docs.map(d => d.data() as Note));
        });

        return () => {
            unsubSessions();
            unsubTests();
            unsubTargets();
            unsubFolders();
            unsubNotes();
        }
    } else if (isGuest) {
        const guestStream: StreamType = safeJSONParse('trackly_stream', 'JEE');
        const defaultGoals = STREAM_SUBJECTS[guestStream].reduce((acc, sub) => ({...acc, [sub]: 30}), {});
        
        setSessions(safeJSONParse('trackly_guest_sessions', []));
        setTests(safeJSONParse('trackly_guest_tests', []));
        setTargets(safeJSONParse('trackly_guest_targets', []));
        setNotes(safeJSONParse('trackly_guest_notes', []));
        setFolders(safeJSONParse('trackly_guest_folders', []));
        setGoals(safeJSONParse('trackly_guest_goals', defaultGoals));
    } else {
        setSessions([]); 
        setTests([]);
        setTargets([]);
        setNotes([]);
        setFolders([]);
    }
  }, [user, isGuest, isFirebaseReady]);

  // ... (CRUD Handlers omitted for brevity, logic is unchanged) ...
  const handleSaveNote = useCallback(async (note: Note) => {
    const isGuestSession = localStorage.getItem('trackly_is_guest') === 'true';
    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'notes', note.id), sanitizeForFirestore(note));
    } else if (isGuestSession) {
        setNotes(prev => {
            const existingIndex = prev.findIndex(n => n.id === note.id);
            const updated = existingIndex >= 0 ? [...prev] : [note, ...prev];
            if (existingIndex >= 0) updated[existingIndex] = note;
            localStorage.setItem('trackly_guest_notes', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setNotes(prev => {
            const updated = prev.filter(n => n.id !== id);
            localStorage.setItem('trackly_guest_notes', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleSaveFolder = useCallback(async (folder: Folder) => {
    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'folders', folder.id), sanitizeForFirestore(folder));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setFolders(prev => {
            const existingIndex = prev.findIndex(f => f.id === folder.id);
            const updated = existingIndex >= 0 ? [...prev] : [folder, ...prev];
            if (existingIndex >= 0) updated[existingIndex] = folder;
            localStorage.setItem('trackly_guest_folders', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'folders', id));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setFolders(prev => {
            const updated = prev.filter(f => f.id !== id);
            localStorage.setItem('trackly_guest_folders', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleDeleteSession = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'sessions', id));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('trackly_guest_sessions', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleSaveTest = useCallback(async (newTest: Omit<TestResult, 'id' | 'timestamp'>) => {
    const id = generateUUID();
    const timestamp = Date.now();
    const test: TestResult = { ...newTest, id, timestamp };

    if (user) {
        setTests(prevTests => [test, ...prevTests].sort((a, b) => b.timestamp - a.timestamp));
        await setDoc(doc(db, 'users', user.uid, 'tests', id), sanitizeForFirestore(test));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setTests(prev => {
            const updated = [test, ...prev].sort((a, b) => b.timestamp - a.timestamp);
            localStorage.setItem('trackly_guest_tests', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleDeleteTest = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'tests', id));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setTests(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem('trackly_guest_tests', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleSaveTarget = useCallback(async (target: Target) => {
    if (user) {
        await setDoc(doc(db, 'users', user.uid, 'targets', target.id), sanitizeForFirestore(target));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setTargets(prev => {
            const existingIndex = prev.findIndex(t => t.id === target.id);
            const updated = existingIndex >= 0 ? [...prev] : [target, ...prev];
            if (existingIndex >= 0) updated[existingIndex] = target;
            localStorage.setItem('trackly_guest_targets', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const handleDeleteTarget = useCallback(async (id: string) => {
    if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'targets', id));
    } else if (localStorage.getItem('trackly_is_guest') === 'true') {
        setTargets(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem('trackly_guest_targets', JSON.stringify(updated));
            return updated;
        });
    }
  }, [user]);

  const toggleCollapsed = useCallback(() => setSidebarCollapsed(prev => !prev), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen(prev => !prev), []);
  const toggleTutorial = useCallback(() => { setIsTutorialActive(true); setTutorialStep(0); }, []);

  // Swipe Logic
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current || !swipeAnimationEnabled) return;
      const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const dx = touchStartRef.current.x - touchEnd.x;
      const dy = touchStartRef.current.y - touchEnd.y;

      // Ignore vertical scrolls
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (Math.abs(dx) > minSwipeDistance) {
          const currentIdx = TABS.findIndex(t => t.id === view);
          if (dx > 0 && currentIdx < TABS.length - 1) { // Swipe Left -> Next Tab
              changeView(TABS[currentIdx + 1].id as ViewType);
          } else if (dx < 0 && currentIdx > 0) { // Swipe Right -> Prev Tab
              changeView(TABS[currentIdx - 1].id as ViewType);
          }
      }
      touchStartRef.current = null;
  };

  // --- WELCOME PAGE CHECK ---
  const showWelcome = !isAuthLoading && !user && !isGuest;

  return (
    <>
      <style>{dynamicStyles}</style>
      <div className={`min-h-screen transition-colors duration-300 ${themeConfig.mode} font-sans selection:bg-indigo-500/30`}>
        <StreamTransition isTransitioning={isTransitioning} stream={transitionStream} />
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

        {showWelcome ? (
            <WelcomePage 
                onLogin={handleLogin}
                onGuestLogin={handleGuestLogin}
                stream={stream}
                setStream={handleChangeStream}
            />
        ) : (
            <div className="relative z-10 flex h-screen overflow-hidden">
                <Sidebar 
                    view={view} 
                    setView={changeView} 
                    onOpenSettings={toggleSettings}
                    isCollapsed={sidebarCollapsed}
                    toggleCollapsed={toggleCollapsed}
                    user={user}
                    isGuest={isGuest}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    isInstalled={isInstalled}
                    onInstall={handleInstallClick}
                    userName={userName}
                    isPro={isPro}
                    onOpenUpgrade={() => setShowUpgradeModal(true)}
                />

                <main 
                    className={`flex-1 overflow-y-auto overflow-x-hidden relative transition-all duration-500 ${sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'}`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen pb-24">
                        <AnimatePresence mode="wait" custom={direction}>
                            {view === 'daily' && (
                                <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
                                    <MotionDiv
                                        key="daily"
                                        custom={direction}
                                        variants={effectiveSwipe ? slideVariants : fadeVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                                    >
                                        <Dashboard 
                                            sessions={sessions} 
                                            targets={targets} 
                                            quote={QUOTES[quoteIdx]} 
                                            onDelete={handleDeleteSession} 
                                            goals={goals} 
                                            setGoals={setGoals} 
                                            onSaveSession={handleSaveSession}
                                            userName={userName}
                                            onOpenPrivacy={() => changeView('privacy')}
                                            subjects={currentSubjects}
                                            syllabus={currentSyllabus}
                                        />
                                    </MotionDiv>
                                </Suspense>
                            )}
                            {view === 'planner' && (
                                <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
                                    <MotionDiv
                                        key="planner"
                                        custom={direction}
                                        variants={effectiveSwipe ? slideVariants : fadeVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                                    >
                                        <Planner 
                                            targets={targets} 
                                            onAdd={handleSaveTarget} 
                                            onToggle={handleUpdateTarget} 
                                            onDelete={handleDeleteTarget} 
                                        />
                                    </MotionDiv>
                                </Suspense>
                            )}
                            {view === 'focus' && (
                                <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
                                    <MotionDiv
                                        key="focus"
                                        custom={direction}
                                        variants={effectiveSwipe ? slideVariants : fadeVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                                    >
                                        <FocusTimer 
                                            timerState={timerState}
                                            sessions={sessions}
                                            onToggleTimer={handleTimerToggle}
                                            mode={timerMode}
                                            timeLeft={timeLeft}
                                            durations={timerDurations}
                                            onResetTimer={handleTimerReset}
                                            onCompleteSession={() => handleCompleteSession(timerDurations[timerMode] * 60)}
                                            lastLogTime={lastLogTime}
                                            sessionLogs={sessionLogs}
                                            onAddLog={handleAddLog}
                                            onSwitchMode={handleModeSwitch}
                                            onUpdateDurations={handleDurationUpdate}
                                            userName={userName || 'Guest'}
                                            syllabus={currentSyllabus}
                                            sessionCount={sessions.length}
                                            targets={targets}
                                        />
                                    </MotionDiv>
                                </Suspense>
                            )}
                            {view === 'group-focus' && (
                                <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
                                    <MotionDiv
                                        key="group-focus"
                                        custom={direction}
                                        variants={effectiveSwipe ? slideVariants : fadeVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                                    >
                                        <VirtualLibrary 
                                            user={user}
                                            userName={userName}
                                            onLogin={handleLogin}
                                            isPro={isPro}
                                            targets={targets}
                                            onCompleteTask={handleUpdateTarget}
                                        />
                                    </MotionDiv>
                                </Suspense>
                            )}
                            {view === 'tests' && (
                                <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
                                    <MotionDiv
                                        key="tests"
                                        custom={direction}
                                        variants={effectiveSwipe ? slideVariants : fadeVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                                    >
                                        <TestLog 
                                            tests={tests}
                                            targets={targets}
                                            onSave={handleSaveTest}
                                            onDelete={handleDeleteTest}
                                            isPro={isPro}
                                            onOpenUpgrade={() => setShowUpgradeModal(true)}
                                            subjects={currentSubjects}
                                            syllabus={currentSyllabus}
                                        />
                                    </MotionDiv>
                                </Suspense>
                            )}
                            {view === 'analytics' && (
                                <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
                                    <MotionDiv
                                        key="analytics"
                                        custom={direction}
                                        variants={effectiveSwipe ? slideVariants : fadeVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                                    >
                                        <Analytics 
                                            sessions={sessions}
                                            tests={tests}
                                            isPro={isPro}
                                            onOpenUpgrade={() => setShowUpgradeModal(true)}
                                            stream={stream}
                                            syllabus={currentSyllabus}
                                        />
                                    </MotionDiv>
                                </Suspense>
                            )}
                            {view === 'privacy' && (
                                <MotionDiv
                                    key="privacy"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <PrivacyPolicy onBack={() => changeView('daily')} />
                                </MotionDiv>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
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
            onStartTutorial={toggleTutorial}
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
            toggleCustomBackground={() => setCustomBackgroundEnabled(!customBackgroundEnabled)}
            customBackgroundAlign={customBackgroundAlign}
            setCustomBackgroundAlign={setCustomBackgroundAlign}
            user={user}
            isGuest={isGuest}
            onLogout={handleLogout}
            onForceSync={handleForceSync}
            syncStatus={syncStatus}
            syncError={syncError}
            onOpenPrivacy={() => { setIsSettingsOpen(false); changeView('privacy'); }}
            stream={stream}
            setStream={handleChangeStream}
        />

        {isTutorialActive && (
            <TutorialOverlay 
                steps={TOUR_STEPS} 
                currentStep={tutorialStep} 
                onNext={() => {
                    if (tutorialStep < TOUR_STEPS.length - 1) setTutorialStep(s => s + 1);
                    else setIsTutorialActive(false);
                }} 
                onClose={() => setIsTutorialActive(false)} 
            />
        )}

        <ProUpgradeModal 
            isOpen={showUpgradeModal} 
            onClose={() => setShowUpgradeModal(false)} 
            onUpgrade={handleUpgrade} 
        />

        <OverdueTasksModal
            isOpen={showOverdueModal}
            tasks={overdueTasks}
            onClose={() => setShowOverdueModal(false)}
            onComplete={(id) => handleUpdateTarget(id, true)}
            onDelete={handleDeleteTarget}
        />

        <PerformanceToast 
            isVisible={isLagging} 
            onSwitch={activateLiteMode} 
            onDismiss={dismissLag} 
        />

        <SmartRecommendationToast
            isVisible={showRecommendation}
            data={recommendation}
            onDismiss={handleDismissRecommendation}
            onPractice={handlePracticeRecommendation}
        />
        
        {showNetworkToast && (
             <div className={`fixed top-4 right-4 z-[200] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl transition-all duration-500 ${isOnline ? 'bg-emerald-500 text-white translate-y-0' : 'bg-rose-500 text-white translate-y-0'}`}>
                 {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                 {isOnline ? 'Online' : 'Offline'}
             </div>
        )}
      </div>
    </>
  );
};
