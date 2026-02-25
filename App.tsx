
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  Activity,
  Calendar as CalendarIcon,
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
  X,
  Activity as ActivityIcon,
  Users
} from 'lucide-react';
import { ViewType, Session, Target, ThemeId, QuestionLog, MistakeCounts, Note, Folder, StreamType, SyllabusData, ActivityThresholds, StudyRoom, TestResult, UserProfile, PresenceState, CountdownTarget } from './types';
import { QUOTES, THEME_CONFIG, GENERAL_DEFAULT_SYLLABUS, STREAM_SUBJECTS, ALL_SYLLABUS, STATS_MAINTENANCE_MODE } from './constants';
import { SettingsModal } from './components/SettingsModal';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSmartRecommendations, Recommendation } from './hooks/useSmartRecommendations';
import { useIdleNotification } from './hooks/useIdleNotification';
import { SmartRecommendationToast } from './components/SmartRecommendationToast';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { AnimatedBackground } from './components/AnimatedBackground';
import { PerformanceToast } from './components/PerformanceToast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleIcon } from './components/GoogleIcon';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { Card } from './components/Card';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { getProStatus } from './components/proController';
import { StreamTransition } from './components/StreamTransition';
// FIX: Aliased TracklyLogo to avoid potential naming conflicts that could cause it to be misinterpreted as a string.
import { TracklyLogo as TracklyLogoComponent } from './components/TracklyLogo';
import { WelcomePage } from './components/WelcomePage';
import { ConfirmationModal } from './components/ConfirmationModal';

// Firebase Imports
import { auth, db, rtdb, googleProvider, dbReadyPromise, logAnalyticsEvent } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, writeBatch, getDoc, runTransaction } from 'firebase/firestore';
import { ref, onValue, set, update, onDisconnect, serverTimestamp } from 'firebase/database';


// Lazy Load Components
const Dashboard = lazy(() => import('./components/Dashboard'));
const FocusTimer = lazy(() => import('./components/FocusTimer'));
const Planner = lazy(() => import('./components/Planner'));
const Analytics = lazy(() => import('./components/Analytics'));
const TestLog = lazy(() => import('./components/TestLog'));
const VirtualLibrary = lazy(() => import('./components/VirtualLibrary'));
const StudyBuddy = lazy(() => import('./components/StudyBuddy'));


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

const TABS = [
  { id: 'daily', label: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Plan', icon: CalendarIcon },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'tests', label: 'Tests', icon: Trophy },
  { id: 'group-focus', label: 'Lounge', icon: Hammer },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
];

const TOUR_STEPS: TutorialStep[] = [
  { view: 'daily', targetId: 'trackly-logo', title: 'Welcome to Trackly', description: 'Trackly is an analytics engine for your exam prep.', icon: LayoutDashboard },
  // ... other steps ...
];

const Sidebar = React.memo(({ view, setView, onOpenSettings, isCollapsed, toggleCollapsed, user, isGuest, onLogin, onLogout, isInstalled, onInstall, userName, isPro, onOpenUpgrade }: any) => {
  return (
    <aside className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-theme-border backdrop-blur-xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isCollapsed ? 'w-20 items-center' : 'w-64'} overflow-visible transform-gpu will-change-transform`} style={{ backgroundColor: 'rgba(var(--theme-card-rgb), 0.5)' }}>
      <div className={`h-20 flex items-center relative shrink-0 ${isCollapsed ? 'justify-center px-0 w-full' : 'justify-between px-6'}`}>
        <TracklyLogoComponent collapsed={isCollapsed} id="trackly-logo" />
        <button onClick={toggleCollapsed} className={`absolute top-1/2 -translate-y-1/2 -right-3 z-50 w-6 h-6 flex items-center justify-center bg-theme-card border border-theme-border rounded-full text-theme-text-secondary hover:text-theme-accent hover:border-theme-accent/30 transition-all shadow-sm hover:shadow-md hover:scale-110 active:scale-95`}>
          {isCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
        </button>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-2 w-full">
        {TABS.map(tab => {
          const isActive = view === tab.id;
          return (
            <button key={tab.id} onClick={() => setView(tab.id as ViewType)} className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-300 group relative ${isActive ? 'bg-theme-accent/10 text-theme-accent' : 'text-theme-text-secondary hover:text-theme-text'} ${isCollapsed ? 'justify-center gap-0' : 'gap-4'}`} title={isCollapsed ? tab.label : ''}>
              <div className={`p-2 rounded-xl transition-all duration-300 flex-shrink-0 relative z-10 will-change-transform ${isActive ? 'bg-theme-card dark:bg-theme-text/10 shadow-indigo-500/20 shadow-lg' : 'group-hover:text-theme-accent group-hover:bg-theme-accent/10 group-hover:shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.2)]'}`}>
                <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-sm font-bold tracking-wide transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>{tab.label}</span>
              {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse"></div>}
            </button>
          )
        })}
      </nav>
      {/* ... Footer logic same as before ... */}
      <div className="p-4 border-t border-theme-border w-full space-y-2">
        <button id="settings-btn" onClick={onOpenSettings} className={`w-full flex items-center px-3 py-3 rounded-xl text-theme-text-secondary hover:text-theme-text transition-all group ${isCollapsed ? 'justify-center gap-0' : 'gap-3'}`}>
          <div className="p-2 rounded-xl transition-all duration-300 flex-shrink-0 relative z-10 group-hover:text-theme-accent group-hover:bg-theme-accent/10 group-hover:shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.2)] will-change-transform">
            <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          </div>
          <span className={`text-sm font-bold transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 translate-x-4' : 'w-auto opacity-100 translate-x-0'}`}>{userName}</span>
        </button>
      </div>
    </aside>
  );
});


const PRIMARY_TABS = [
  { id: 'daily', label: 'Home', icon: LayoutDashboard },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'planner', label: 'Plan', icon: CalendarIcon },
  { id: 'tests', label: 'Tests', icon: Trophy },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
];

const MORE_TABS = [
  { id: 'group-focus', label: 'Lounge', icon: Hammer },
  { id: 'friends', label: 'Friends', icon: Users },
];

const PAGE_TITLES: Record<string, string> = {
  daily: 'Home',
  focus: 'Focus Timer',
  planner: 'Planner',
  tests: 'Test Log',
  analytics: 'Analytics',
  'group-focus': 'Study Lounge',
  friends: 'Study Buddy',
  privacy: 'Privacy Policy',
};

const MobileHeader = React.memo(({ view, onOpenSettings }: { view: ViewType; onOpenSettings: () => void }) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b border-theme-border backdrop-blur-xl" style={{ backgroundColor: 'rgba(var(--theme-card-rgb), 0.85)' }}>
      <TracklyLogoComponent collapsed={false} id="mobile-trackly-logo" />
      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-theme-text tracking-wide">{PAGE_TITLES[view] || 'Trackly'}</span>
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-xl text-theme-text-secondary hover:text-theme-accent hover:bg-theme-accent/10 transition-all active:scale-90"
      >
        <Settings size={20} />
      </button>
    </header>
  );
});

const BottomNavBar = React.memo(({ view, setView, onOpenSettings }: { view: ViewType; setView: (v: ViewType) => void; onOpenSettings: () => void }) => {
  const [showMore, setShowMore] = useState(false);
  const isMoreActive = MORE_TABS.some(t => t.id === view);

  return (
    <>
      {/* More Drawer Backdrop */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Drawer Sheet */}
      <div className={`fixed bottom-[72px] left-0 right-0 z-50 md:hidden transition-all duration-300 ease-out ${showMore ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className="mx-3 rounded-2xl border border-theme-border overflow-hidden shadow-2xl" style={{ backgroundColor: 'rgba(var(--theme-card-rgb), 0.95)', backdropFilter: 'blur(20px)' }}>
          {/* Tabs Row */}
          <div className="flex">
            {MORE_TABS.map(tab => {
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setView(tab.id as ViewType); setShowMore(false); }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 transition-all ${isActive ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
                >
                  <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-theme-accent/15' : ''}`}>
                    <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-bold tracking-wide uppercase">{tab.label}</span>
                </button>
              );
            })}
            {/* Settings inside More drawer */}
            <button
              onClick={() => { setShowMore(false); onOpenSettings(); }}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 text-theme-text-secondary transition-all"
            >
              <div className="p-2 rounded-xl transition-all">
                <Settings size={22} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold tracking-wide uppercase">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Nav Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-theme-border" style={{ backgroundColor: 'rgba(var(--theme-card-rgb), 0.92)', backdropFilter: 'blur(20px)' }}>
        <nav className="flex justify-around items-center h-[72px] px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {PRIMARY_TABS.map(tab => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setView(tab.id as ViewType); setShowMore(false); }}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 active:scale-95 ${isActive ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-theme-accent/15 shadow-sm' : ''}`}>
                  <tab.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-bold tracking-wide transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(p => !p)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 active:scale-95 ${isMoreActive || showMore ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${isMoreActive || showMore ? 'bg-theme-accent/15 shadow-sm' : ''}`}>
              <Menu size={21} strokeWidth={isMoreActive || showMore ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold tracking-wide transition-all duration-200 ${isMoreActive || showMore ? 'opacity-100' : 'opacity-60'}`}>More</span>
          </button>
        </nav>
      </footer>
    </>
  );
});


const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0, position: 'absolute' as 'absolute' }),
  center: { zIndex: 1, x: 0, opacity: 1, position: 'relative' as 'relative' },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 30 : -30, opacity: 0, position: 'absolute' as 'absolute' }),
};
const fadeVariants = { enter: { opacity: 0 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0 } };

const OverdueTasksModal = ({ isOpen, tasks, onClose, onComplete, onDelete }: any) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-4 p-6 border-b">
          <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text"><ListChecks size={20} className="text-amber-500" /> Overdue Tasks</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-theme-text-secondary transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto space-y-3">
          <p className="text-xs text-theme-text-secondary pb-2">You have {tasks.length} unfinished tasks from previous days.</p>
          {tasks.map((task: Target) => (
            <div key={task.id} className="bg-theme-bg-tertiary/50 p-3 rounded-xl border border-theme-border flex items-center justify-between gap-2 group">
              <div><p className="text-sm font-medium text-theme-text">{task.text}</p><p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-secondary mt-0.5">{task.date}</p></div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onComplete(task.id)} className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"><Check size={14} /></button>
                <button onClick={() => onDelete(task.id)} className="p-2 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t"><button onClick={onClose} className="w-full py-3 bg-theme-accent hover:opacity-90 text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95">Got It</button></div>
      </Card>
    </div>, document.body
  );
};

export const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('daily');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [countdowns, setCountdowns] = useLocalStorage<CountdownTarget[]>('trackly_countdowns', []);

  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  // Stream State
  const [stream, setStream] = useLocalStorage<StreamType>('trackly_stream', 'General');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStream, setTransitionStream] = useState<StreamType>(stream);

  // Custom Syllabus State (General Stream)
  const [customSyllabus, setCustomSyllabus] = useLocalStorage<SyllabusData>('trackly_custom_syllabus', GENERAL_DEFAULT_SYLLABUS);

  // Derived Stream Data
  const currentSyllabus = useMemo(() => stream === 'General' ? customSyllabus : ALL_SYLLABUS[stream], [stream, customSyllabus]);
  const currentSubjects = useMemo(() => stream === 'General' ? Object.keys(customSyllabus) : STREAM_SUBJECTS[stream], [stream, customSyllabus]);

  const [goals, setGoals] = useLocalStorage<Record<string, number>>('trackly_goals', {});

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'loading_profile' | 'loaded'>('loading');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Pro Features State
  const [hasPaid, setHasPaid] = useLocalStorage('trackly_pro', false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isPro = getProStatus(hasPaid);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useLocalStorage('trackly_animations', true);
  const [graphicsEnabled, setGraphicsEnabled] = useLocalStorage('trackly_graphics', true);
  const [lagDetectionEnabled, setLagDetectionEnabled] = useLocalStorage('trackly_lag_detection', true);
  const [theme, setTheme] = useLocalStorage<ThemeId>('trackly_theme', 'default-dark');
  const [showAurora, setShowAurora] = useLocalStorage('trackly_aurora', true);
  const [parallaxEnabled, setParallaxEnabled] = useLocalStorage('trackly_parallax', true);
  const [showParticles, setShowParticles] = useLocalStorage('trackly_particles', true);
  const [swipeAnimationEnabled, setSwipeAnimationEnabled] = useLocalStorage('trackly_swipe', true);
  const [swipeStiffness, setSwipeStiffness] = useLocalStorage('trackly_swipe_stiffness', 6000);
  const [swipeDamping, setSwipeDamping] = useLocalStorage('trackly_swipe_damping', 300);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('trackly_sound', true);
  const [soundPitch, setSoundPitch] = useLocalStorage('trackly_sound_pitch', 1047);
  const [soundVolume, setSoundVolume] = useLocalStorage('trackly_sound_volume', 0.5);
  const [customBackground, setCustomBackground] = useLocalStorage<string | null>('trackly_custom_bg', null);
  const [customBackgroundEnabled, setCustomBackgroundEnabled] = useLocalStorage('trackly_custom_bg_enabled', false);
  const [customBackgroundAlign, setCustomBackgroundAlign] = useLocalStorage<'center' | 'top' | 'bottom'>('trackly_custom_bg_align', 'center');
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('trackly_sidebar_collapsed', false);
  const [showSmartRecommendations, setShowSmartRecommendations] = useLocalStorage('trackly_smart_recommendations', true);

  // Analytics settings
  const [activityThresholds, setActivityThresholds] = useLocalStorage<ActivityThresholds>('trackly_activity_thresholds', {
    level2: 120, // 2 hours in minutes
    level3: 240, // 4 hours in minutes
    level4: 360, // 6 hours in minutes
  });

  // Notification frequency (minutes) — synced to Firestore
  const [notifFrequencyMin, setNotifFrequencyMin] = useLocalStorage<number>('trackly_notif_frequency_min', 10);

  // Group Focus State (Lifted Up)
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);

  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const [direction, setDirection] = useState(0);
  const minSwipeDistance = 50;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timerDurations, setTimerDurations] = useLocalStorage('trackly_timer_durations', { focus: 25, short: 5, long: 15 });
  const [sessionCount, setSessionCount] = useLocalStorage<number>('trackly_sessionCount', 0);
  const [timeLeft, setTimeLeft] = useState(() => {
    const storedDurations = safeJSONParse('trackly_timer_durations', { focus: 25, short: 5, long: 15 });
    return storedDurations.focus * 60;
  });
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number>(0);

  // High-precision tracking
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  // Idle notification — fires after user-set idle delay
  useIdleNotification(timerState, notifFrequencyMin * 60 * 1000);
  const { isLagging, dismiss: dismissLag } = usePerformanceMonitor(graphicsEnabled && lagDetectionEnabled);

  // Overdue Task Reminder State
  const [overdueTasks, setOverdueTasks] = useState<Target[]>([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  // Focus Subject State (Lifted from FocusTimer)
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // DERIVED STATE
  const userName = useMemo(() => {
    if (isGuest) return localStorage.getItem('trackly_guest_name') || 'Guest';
    return userProfile?.studyBuddyUsername || userProfile?.displayName || user?.displayName || 'User';
  }, [user, userProfile, isGuest]);

  // Audio Synthesis
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (soundEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser.");
      }
    }
  }, [soundEnabled]);

  const playCompletionSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playBell = (time: number) => {
      const fundamental = soundPitch;
      const volume = 0.4 * soundVolume;
      const partials = [0.56, 1, 1.19, 1.7, 2, 2.74, 3.5, 4.3];
      const amplitudes = [0.2, 1, 0.8, 0.6, 0.7, 0.4, 0.3, 0.2];

      partials.forEach((ratio, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * ratio, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime((volume * amplitudes[index]) / (index + 1), time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 2);

        osc.start(time);
        osc.stop(time + 2.5);
      });
    };

    const now = ctx.currentTime;
    const interval = 1.8;
    const totalDuration = 22;

    for (let i = 0; i * interval < totalDuration; i++) {
      playBell(now + i * interval);
    }
  }, [soundEnabled, soundPitch, soundVolume]);

  // Initial subject selection when subjects load
  useEffect(() => {
    if (currentSubjects.length > 0 && !currentSubjects.includes(selectedSubject)) {
      setSelectedSubject(currentSubjects[0]);
    }
  }, [currentSubjects, selectedSubject]);

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

  // When stream changes, update goals to match new subjects
  useEffect(() => {
    setGoals(prevGoals => {
      const defaultGoals = currentSubjects.reduce((acc, sub) => ({ ...acc, [sub]: 30 }), {} as Record<string, number>);
      const newGoals = { ...defaultGoals };
      for (const subject of currentSubjects) {
        if (prevGoals[subject]) {
          newGoals[subject] = prevGoals[subject];
        }
      }
      return newGoals;
    });
  }, [stream, currentSubjects, setGoals]);

  // Save custom syllabus to Firestore (if logged in)
  useEffect(() => {
    if (user && isFirebaseReady) {
      const syncSyllabus = async () => {
        try {
          await setDoc(doc(db, 'users', user.uid, 'settings', 'general'), { customSyllabus }, { merge: true });
        } catch (e) {
          console.error("Failed to sync syllabus", e);
        }
      };
      syncSyllabus();
    }
  }, [customSyllabus, user, isFirebaseReady]);

  // ─── Sync all user preferences to Firestore ───────────────────────────────
  // WRITE: debounced — fires 800ms after any setting changes
  useEffect(() => {
    if (!user || !isFirebaseReady) return;
    const t = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'preferences'),
          {
            theme, animationsEnabled, graphicsEnabled, lagDetectionEnabled,
            showAurora, parallaxEnabled, showParticles,
            swipeAnimationEnabled, swipeStiffness, swipeDamping,
            soundEnabled, soundPitch, soundVolume,
            goals, timerDurations, notifFrequencyMin, stream,
            showSmartRecommendations,
          },
          { merge: true }
        );
      } catch (e) { console.error('Failed to sync preferences', e); }
    }, 800);
    return () => clearTimeout(t);
  }, [
    user, isFirebaseReady,
    theme, animationsEnabled, graphicsEnabled, lagDetectionEnabled,
    showAurora, parallaxEnabled, showParticles,
    swipeAnimationEnabled, swipeStiffness, swipeDamping,
    soundEnabled, soundPitch, soundVolume,
    goals, timerDurations, notifFrequencyMin, stream,
    showSmartRecommendations,
  ]);

  // ─── Sync countdown separately — only when a real date has been set ─────────
  useEffect(() => {
    if (!user || !isFirebaseReady || countdowns.length === 0) return;
    const t = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'preferences'),
          { countdowns },
          { merge: true }
        );
      } catch (e) { console.error('Failed to sync countdowns', e); }
    }, 800);
    return () => clearTimeout(t);
  }, [user, isFirebaseReady, countdowns]);

  // ... [Theme Config, Handlers, etc. largely unchanged] ...
  const themeConfig = THEME_CONFIG[theme];

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeConfig.mode);
  }, [themeConfig.mode]);

  const dynamicStyles = useMemo(() => `
      :root {
        --theme-bg: ${themeConfig.colors.bg};
        --theme-card: ${themeConfig.colors.card};
        --theme-card-rgb: ${hexToRgb(themeConfig.colors.card)};
        --theme-accent: ${themeConfig.colors.accent};
        --theme-accent-rgb: ${hexToRgb(themeConfig.colors.accent)};
        --theme-accent-glow: ${themeConfig.colors.accentGlow};
        --theme-text-main: ${themeConfig.colors.text};
        --theme-text-secondary: ${themeConfig.colors.textSecondary};
        --theme-text-on-accent: ${themeConfig.colors.textOnAccent};
        --theme-border: ${themeConfig.colors.border};
        --theme-bg-tertiary: ${themeConfig.colors.bgTertiary};
        --theme-gradient-from: ${themeConfig.colors.gradient.from};
        --theme-gradient-to: ${themeConfig.colors.gradient.to};
      }
  `, [themeConfig]);

  const effectiveShowAurora = graphicsEnabled && showAurora;
  const effectiveParallax = graphicsEnabled && parallaxEnabled;
  const effectiveShowParticles = graphicsEnabled && showParticles;
  const effectiveSwipe = animationsEnabled && swipeAnimationEnabled;

  const changeView = useCallback((newView: ViewType) => {
    if (view === newView) return;
    const currentIdx = TABS.findIndex(t => t.id === view);
    const newIdx = TABS.findIndex(t => t.id === newView);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // ... [Analytics Logic unchanged] ...
  const isAuthLoading = authStatus !== 'loaded';
  const showWelcome = !isAuthLoading && !user && !isGuest;

  useEffect(() => {
    // Don't run on initial auth loading or on the welcome screen
    if (isAuthLoading || showWelcome) return;

    // Wait a brief moment for data to settle after login/guest mode is established
    const timeoutId = setTimeout(() => {
      const todayStr = getLocalDate();
      // Filter for tasks with a date before today that are not completed
      const overdue = targets.filter(t => t.date < todayStr && !t.completed);

      if (overdue.length > 0) {
        setOverdueTasks(overdue);
        // Only show the modal once per browser session to avoid being annoying
        if (!sessionStorage.getItem('overdueModalShown')) {
          setShowOverdueModal(true);
          sessionStorage.setItem('overdueModalShown', 'true');
        }
      }
    }, 1500); // 1.5 second delay after data loads

    return () => clearTimeout(timeoutId);
  }, [targets, isAuthLoading, showWelcome]);

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

      batch.set(doc(db, 'users', user.uid, 'settings', 'general'), { customSyllabus });
      batch.set(doc(db, 'users', user.uid, 'settings', 'preferences'), {
        countdowns
      }, { merge: true });

      sessions.forEach(item => batch.set(doc(db, 'users', user.uid, 'sessions', item.id), sanitizeForFirestore(item)));
      targets.forEach(item => batch.set(doc(db, 'users', user.uid, 'targets', item.id), sanitizeForFirestore(item)));
      tests.forEach(item => batch.set(doc(db, 'users', user.uid, 'tests', item.id), sanitizeForFirestore(item)));
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
      setSyncError(`An unknown error occurred: ${e.message}`);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [user, sessions, targets, tests, notes, folders, customSyllabus]);

  // ... [Audio, DB Ready Effects unchanged] ...

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      setUser(currentUser);
      if (currentUser) {
        setAuthStatus('loading_profile');
        setIsGuest(false);
        const userDocRef = doc(db, 'users', currentUser.uid);

        profileUnsubscribe = onSnapshot(userDocRef,
          async (userDoc) => {
            if (userDoc.exists()) {
              setUserProfile(userDoc.data() as UserProfile);
            } else {
              // Creating a minimal profile if it doesn't exist
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Anonymous User',
                photoURL: currentUser.photoURL,
              };
              try {
                await setDoc(userDocRef, newProfile);
              } catch (e) {
                console.error("Error creating user profile:", e);
              }
            }
            setAuthStatus('loaded');
          },
          (error) => {
            console.error("Error with user profile subscription:", error);
            signOut(auth);
            setAuthStatus('loaded');
          }
        );
      } else {
        setUserProfile(null);
        setAuthStatus('loaded');
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  // Expose a ref to manually force offline status on logout
  const forceOfflineRef = useRef<(() => Promise<void>) | null>(null);
  const lastPresenceIndexPathRef = useRef<string | null>(null);

  // Real-time Presence Management
  const updatePresence = useCallback((status: Partial<PresenceState>) => {
    if (!user) return;

    // Calculate aggregated stats to send to RTDB for friends to see
    const now = new Date();
    const todayStr = getLocalDate(now);
    const currentYear = now.getFullYear();

    // Calculate start of current week (assuming Monday start)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    let dailyFocusTimeSeconds = 0;
    let weeklyFocusTimeSeconds = 0;
    let yearlyFocusTimeSeconds = 0;
    const subjectSplit: Record<string, number> = {};
    const dailySubjectSplit: Record<string, number> = {};
    const weeklySubjectSplit: Record<string, number> = {};
    const yearlySubjectSplit: Record<string, number> = {};

    if (!STATS_MAINTENANCE_MODE) {
      sessions.forEach(s => {
        if (!s.subject || !s.duration) return; // Only count actual study sessions with a duration

        const sessionDate = new Date(s.timestamp);
        const sessionDateStr = getLocalDate(sessionDate);
        const sessionYear = sessionDate.getFullYear();

        if (sessionDateStr === todayStr) {
          dailyFocusTimeSeconds += s.duration;
          dailySubjectSplit[s.subject] = (dailySubjectSplit[s.subject] || 0) + s.duration;
        }
        if (sessionDate >= startOfWeek) {
          weeklyFocusTimeSeconds += s.duration;
          weeklySubjectSplit[s.subject] = (weeklySubjectSplit[s.subject] || 0) + s.duration;
        }
        if (sessionYear === currentYear) {
          yearlyFocusTimeSeconds += s.duration;
          yearlySubjectSplit[s.subject] = (yearlySubjectSplit[s.subject] || 0) + s.duration;
        }

        subjectSplit[s.subject] = (subjectSplit[s.subject] || 0) + s.duration;
      });
    }

    const presenceRef = ref(rtdb, `/status/${user.uid}`);

    // Filter out undefined values from status since RTDB update() rejects undefined
    const cleanStatus = Object.entries(status).reduce((acc, [key, val]) => {
      if (val !== undefined) acc[key] = val;
      return acc;
    }, {} as Record<string, any>);

    const statsUpdate: Record<string, any> = {
      isOnline: true,
      lastChanged: serverTimestamp(),
      ...cleanStatus,
    };

    // --- SEGRAGATED INDEX LOGIC ---
    if (status.state !== undefined) {
      let newIndexPath = "";
      if (status.state === 'focus' && status.subject) {
        newIndexPath = `online_now/focus/${status.subject}/${user.uid}`;
      } else if (status.state === 'break') {
        newIndexPath = `online_now/break/${user.uid}`;
      } else if (status.state === 'idle') {
        newIndexPath = `online_now/idle/${user.uid}`;
      }

      if (lastPresenceIndexPathRef.current && lastPresenceIndexPathRef.current !== newIndexPath) {
        set(ref(rtdb, lastPresenceIndexPathRef.current), null).catch(() => { });
      }

      if (newIndexPath) {
        set(ref(rtdb, newIndexPath), true).catch(() => { });
        onDisconnect(ref(rtdb, newIndexPath)).remove().catch(() => { });
        lastPresenceIndexPathRef.current = newIndexPath;
      } else {
        lastPresenceIndexPathRef.current = null;
      }
    }
    // --- END SEGRAGATED INDEX LOGIC ---

    if (!STATS_MAINTENANCE_MODE) {
      Object.assign(statsUpdate, {
        dailyFocusTime: dailyFocusTimeSeconds,
        weeklyFocusTime: weeklyFocusTimeSeconds,
        yearlyFocusTime: yearlyFocusTimeSeconds,
        subjectSplit: subjectSplit,
        dailySubjectSplit: dailySubjectSplit,
        weeklySubjectSplit: weeklySubjectSplit,
        yearlySubjectSplit: yearlySubjectSplit,
      });
    }

    update(presenceRef, statsUpdate);
  }, [user, sessions]);

  useEffect(() => {
    if (!user) return;

    const userStatusRef = ref(rtdb, `/status/${user.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const con = onDisconnect(userStatusRef);
        con.update({ isOnline: false, lastChanged: serverTimestamp() });

        update(userStatusRef, {
          isOnline: true,
          lastChanged: serverTimestamp(),
        });
      }
    });

    forceOfflineRef.current = async () => {
      unsubscribe(); // Stop listening
      onDisconnect(userStatusRef).cancel(); // Cancel server disconnect hook

      // Also cancel and remove index
      if (lastPresenceIndexPathRef.current) {
        onDisconnect(ref(rtdb, lastPresenceIndexPathRef.current)).cancel();
        try {
          await set(ref(rtdb, lastPresenceIndexPathRef.current), null);
        } catch (e) { }
        lastPresenceIndexPathRef.current = null;
      }

      try {
        await update(userStatusRef, { isOnline: false, lastChanged: serverTimestamp() }); // Force offline immediately
      } catch (e) { console.error('Failed to set offline status', e); }
    };

    return () => {
      if (forceOfflineRef.current) {
        forceOfflineRef.current().catch(console.error);
        forceOfflineRef.current = null;
      }
    };
  }, [user]);

  // Sync historical Firestore session stats to RTDB on load and upon session updates
  const hasInitialSyncCompleted = useRef(false);
  useEffect(() => {
    if (user) {
      hasInitialSyncCompleted.current = true;
      updatePresence({}); // Empty payload just triggers the aggregate math and pushes to RTDB
    }
  }, [user, sessions, updatePresence]);

  useEffect(() => {
    const storedGuest = localStorage.getItem('trackly_is_guest');
    if (storedGuest === 'true' && !user) {
      setIsGuest(true);
    }
  }, [user]);

  useEffect(() => {
    dbReadyPromise.then(() => setIsFirebaseReady(true));
  }, []);

  const sessionsForStream = useMemo(() => sessions.filter(s => s.stream ? s.stream === stream : stream === 'General'), [sessions, stream]);
  const testsForStream = useMemo(() => tests.filter(t => t.stream ? t.stream === stream : stream === 'General'), [tests, stream]);

  useEffect(() => {
    if (!isFirebaseReady) return;

    let unsubSyllabus: (() => void) | undefined;
    let unsubSessions: (() => void) | undefined;
    let unsubTargets: (() => void) | undefined;
    let unsubTests: (() => void) | undefined;
    let unsubFolders: (() => void) | undefined;
    let unsubNotes: (() => void) | undefined;

    if (user) {
      // Real-time syllabus sync
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'general');
      unsubSyllabus = onSnapshot(settingsRef, (snap) => {
        // Only update from Firestore if it's not a local pending write, to prevent loops.
        if (!snap.metadata.hasPendingWrites) {
          if (snap.exists() && snap.data().customSyllabus) {
            setCustomSyllabus(snap.data().customSyllabus);
          }
        }
      });

      // Load user preferences from Firestore (one-time read on login)
      const prefsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      onSnapshot(prefsRef, (snap) => {
        if (snap.exists() && !snap.metadata.hasPendingWrites) {
          const p = snap.data();
          if (p.theme !== undefined) setTheme(p.theme);
          if (p.animationsEnabled !== undefined) setAnimationsEnabled(p.animationsEnabled);
          if (p.graphicsEnabled !== undefined) setGraphicsEnabled(p.graphicsEnabled);
          if (p.lagDetectionEnabled !== undefined) setLagDetectionEnabled(p.lagDetectionEnabled);
          if (p.showAurora !== undefined) setShowAurora(p.showAurora);
          if (p.parallaxEnabled !== undefined) setParallaxEnabled(p.parallaxEnabled);
          if (p.showParticles !== undefined) setShowParticles(p.showParticles);
          if (p.swipeAnimationEnabled !== undefined) setSwipeAnimationEnabled(p.swipeAnimationEnabled);
          if (p.swipeStiffness !== undefined) setSwipeStiffness(p.swipeStiffness);
          if (p.swipeDamping !== undefined) setSwipeDamping(p.swipeDamping);
          if (p.soundEnabled !== undefined) setSoundEnabled(p.soundEnabled);
          if (p.soundPitch !== undefined) setSoundPitch(p.soundPitch);
          if (p.soundVolume !== undefined) setSoundVolume(p.soundVolume);
          if (p.showSmartRecommendations !== undefined) setShowSmartRecommendations(p.showSmartRecommendations);
          if (p.activityThresholds !== undefined) setActivityThresholds(p.activityThresholds);
          if (p.goals !== undefined) setGoals(p.goals);
          if (p.timerDurations !== undefined) setTimerDurations(p.timerDurations);
          if (p.notifFrequencyMin !== undefined) setNotifFrequencyMin(p.notifFrequencyMin);
          if (p.stream !== undefined) setStream(p.stream);

          // Migrate old countdown format if it exists
          if (p.countdownDate && (!p.countdowns || p.countdowns.length === 0)) {
            setCountdowns([{
              id: 'legacy-countdown',
              date: p.countdownDate,
              name: p.countdownName || 'The Big Day'
            }]);
          } else if (p.countdowns !== undefined) {
            setCountdowns(p.countdowns);
          }
        }
      });

      unsubSessions = onSnapshot(query(collection(db, 'users', user.uid, 'sessions'), orderBy('timestamp', 'desc')), (snapshot) => setSessions(snapshot.docs.map(d => d.data() as Session)));
      unsubTargets = onSnapshot(query(collection(db, 'users', user.uid, 'targets'), orderBy('timestamp', 'desc')), (snapshot) => setTargets(snapshot.docs.map(d => d.data() as Target)));
      unsubTests = onSnapshot(query(collection(db, 'users', user.uid, 'tests'), orderBy('timestamp', 'desc')), (snapshot) => setTests(snapshot.docs.map(d => d.data() as TestResult)));
      unsubFolders = onSnapshot(query(collection(db, 'users', user.uid, 'folders'), orderBy('timestamp', 'desc')), (snapshot) => setFolders(snapshot.docs.map(d => d.data() as Folder)));
      unsubNotes = onSnapshot(query(collection(db, 'users', user.uid, 'notes'), orderBy('timestamp', 'desc')), (snapshot) => setNotes(snapshot.docs.map(d => d.data() as Note)));

      return () => {
        unsubSyllabus?.();
        unsubSessions?.();
        unsubTargets?.();
        unsubTests?.();
        unsubFolders?.();
        unsubNotes?.();
      }
    } else if (isGuest) {
      setSessions(safeJSONParse('trackly_guest_sessions', []));
      setTargets(safeJSONParse('trackly_guest_targets', []));
      setTests(safeJSONParse('trackly_guest_tests', []));
      setNotes(safeJSONParse('trackly_guest_notes', []));
      setFolders(safeJSONParse('trackly_guest_folders', []));
    } else {
      setSessions([]); setTargets([]); setTests([]); setNotes([]); setFolders([]);
    }
  }, [user, isGuest, isFirebaseReady]);

  // --- Smart Recommendation Logic ---
  const recommendation = useSmartRecommendations(sessionsForStream, currentSyllabus);
  const [showRecommendationToast, setShowRecommendationToast] = useState(false);
  const [plannerPrompt, setPlannerPrompt] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (isAuthLoading || showWelcome || view !== 'daily' || !showSmartRecommendations) return;
    if (recommendation) {
      const key = `recommendationToastShown_${recommendation.subject}_${recommendation.topic}`;
      if (!sessionStorage.getItem(key)) {
        setShowRecommendationToast(true);
        sessionStorage.setItem(key, 'true');
      }
    }
  }, [recommendation, showWelcome, view, isAuthLoading, showSmartRecommendations]);

  const handleSaveTarget = useCallback((target: Target) => {
    const newTargets = [target, ...targets.filter(t => t.id !== target.id)];
    setTargets(newTargets);
    if (user) setDoc(doc(db, 'users', user.uid, 'targets', target.id), sanitizeForFirestore(target)).catch(console.error);
    else if (isGuest) localStorage.setItem('trackly_guest_targets', JSON.stringify(newTargets));
  }, [user, isGuest, targets]);

  const handlePracticeRecommendation = useCallback(() => {
    if (recommendation) {
      setSelectedSubject(recommendation.subject);
      changeView('focus');
      setShowRecommendationToast(false);
      setPlannerPrompt(recommendation);
    }
  }, [recommendation, changeView]);

  const handleConfirmPlannerTask = useCallback(() => {
    if (!plannerPrompt) return;
    handleSaveTarget({ id: generateUUID(), date: getLocalDate(), text: `Revise ${plannerPrompt.topic}`, completed: false, timestamp: Date.now(), type: 'task' });
    setPlannerPrompt(null);
  }, [plannerPrompt, handleSaveTarget]);

  const handleDisableRecommendations = useCallback(() => {
    setShowSmartRecommendations(false);
    setShowRecommendationToast(false);
  }, [setShowSmartRecommendations]);

  // --- CRUD Handlers ---
  const handleSaveNote = useCallback(async (note: Note) => { /* ... */ }, [user, isGuest, notes]);
  const handleDeleteNote = useCallback(async (id: string) => { /* ... */ }, [user, isGuest, notes]);
  const handleSaveFolder = useCallback(async (folder: Folder) => { /* ... */ }, [user, isGuest, folders]);
  const handleDeleteFolder = useCallback(async (id: string) => { /* ... */ }, [user, isGuest, folders]);

  const handleSaveSession = useCallback((newSession: Omit<Session, 'id' | 'timestamp' | 'stream'>) => {
    const session: Session = { ...newSession, id: generateUUID(), timestamp: Date.now(), stream };
    setSessions(s => [session, ...s]);
    if (user) setDoc(doc(db, 'users', user.uid, 'sessions', session.id), sanitizeForFirestore(session)).catch(console.error);
    else if (isGuest) localStorage.setItem('trackly_guest_sessions', JSON.stringify([session, ...sessions]));
  }, [user, isGuest, sessions, stream]);

  const handleSaveTest = useCallback((newTest: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => {
    const test: TestResult = { ...newTest, id: generateUUID(), timestamp: Date.now(), stream };
    setTests(t => [test, ...t]);
    if (user) setDoc(doc(db, 'users', user.uid, 'tests', test.id), sanitizeForFirestore(test)).catch(console.error);
    else if (isGuest) localStorage.setItem('trackly_guest_tests', JSON.stringify([test, ...tests]));
  }, [user, isGuest, tests, stream]);

  const handleDeleteSession = useCallback((id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'sessions', id)).catch(console.error);
    } else if (isGuest) {
      localStorage.setItem('trackly_guest_sessions', JSON.stringify(newSessions));
    }
  }, [user, isGuest, sessions]);

  const handleRenameSession = useCallback((id: string, name: string) => {
    const newSessions = sessions.map(s => (s.id === id ? { ...s, name } : s));
    setSessions(newSessions);
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'sessions', id), { name }, { merge: true }).catch(console.error);
    } else if (isGuest) {
      localStorage.setItem('trackly_guest_sessions', JSON.stringify(newSessions));
    }
  }, [user, isGuest, sessions]);

  const handleDeleteTest = useCallback((id: string) => {
    const newTests = tests.filter(t => t.id !== id);
    setTests(newTests);
    if (user) deleteDoc(doc(db, 'users', user.uid, 'tests', id)).catch(console.error);
    else if (isGuest) localStorage.setItem('trackly_guest_tests', JSON.stringify(newTests));
  }, [user, isGuest, tests]);

  const handleDeleteTarget = useCallback((id: string) => {
    const newTargets = targets.filter(t => t.id !== id);
    setTargets(newTargets);
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'targets', id)).catch(console.error);
    } else if (isGuest) {
      localStorage.setItem('trackly_guest_targets', JSON.stringify(newTargets));
    }
  }, [user, isGuest, targets]);

  const handleUpdateTarget = useCallback((id: string, completed: boolean) => {
    const newTargets = targets.map(t => (t.id === id ? { ...t, completed } : t));
    setTargets(newTargets);
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'targets', id), { completed }, { merge: true }).catch(console.error);
    } else if (isGuest) {
      localStorage.setItem('trackly_guest_targets', JSON.stringify(newTargets));
    }
  }, [user, isGuest, targets]);

  // Timer logic
  const handleTimerToggle = useCallback(() => {
    if (soundEnabled && audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (timerState === 'idle' || timerState === 'paused') {
      setTimerState('running');
      startTimeRef.current = Date.now();
      endTimeRef.current = Date.now() + timeLeft * 1000;
      updatePresence({
        state: timerMode === 'focus' ? 'focus' : 'break',
        subject: timerMode === 'focus' ? selectedSubject : null,
        endTime: endTimeRef.current
      });
    } else {
      setTimerState('paused');
      clearInterval(timerRef.current);
      accumulatedTimeRef.current += Date.now() - startTimeRef.current;
      updatePresence({ state: 'idle', subject: null });
    }
  }, [timerState, timeLeft, updatePresence, selectedSubject, soundEnabled, timerMode]);

  const handleModeSwitch = useCallback((mode: 'focus' | 'short' | 'long') => {
    setTimerMode(mode);
    setTimerState('idle');
    clearInterval(timerRef.current);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = 0;
    setTimeLeft(timerDurations[mode] * 60);
    updatePresence({
      state: mode === 'focus' ? 'idle' : 'break',
      subject: null, // Always clear subject when switching modes
      endTime: Date.now() + timerDurations[mode] * 60 * 1000
    });
  }, [timerDurations, updatePresence]);

  const handleTimerReset = useCallback(() => {
    setTimerState('idle');
    clearInterval(timerRef.current);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = 0;
    setTimeLeft(timerDurations[timerMode] * 60);
    updatePresence({ state: 'idle', subject: null });
  }, [timerMode, timerDurations, updatePresence]);

  const handleCompleteSession = useCallback((isInterrupted: boolean = false) => {
    const plannedDuration = timerDurations[timerMode] * 60;

    // Calculate highly accurate elapsed time based on wall-clock timestamps
    let elapsedMs = accumulatedTimeRef.current;
    if (timerState === 'running') {
      elapsedMs += (Date.now() - startTimeRef.current);
    }
    const elapsedSeconds = Math.min(Math.floor(elapsedMs / 1000), plannedDuration);

    // If we're fully complete, use the planned duration to ensure no missing seconds
    const effectiveDuration = isInterrupted ? elapsedSeconds : plannedDuration;

    if (timerMode === 'focus' && effectiveDuration > 60) {
      handleSaveSession({
        subject: selectedSubject,
        topic: 'Focus Session',
        attempted: 0,
        correct: 0,
        mistakes: {},
        duration: effectiveDuration,
        plannedDuration
      });
    }

    if (!isInterrupted) {
      playCompletionSound();
    }

    if (isInterrupted) {
      handleTimerReset();
    } else {
      accumulatedTimeRef.current = 0; // Clear it out for the next session
      if (timerMode === 'focus') {
        const newCount = sessionCount + 1;
        setSessionCount(newCount);
        handleModeSwitch(newCount > 0 && newCount % 4 === 0 ? 'long' : 'short');
      } else {
        handleModeSwitch('focus');
      }
    }
  }, [handleSaveSession, selectedSubject, timerMode, timerDurations, handleTimerReset, handleModeSwitch, sessionCount, setSessionCount, playCompletionSound, updatePresence, timerState]);

  useEffect(() => {
    if (timerState === 'running') {
      timerRef.current = setInterval(() => {
        const plannedDurationMs = timerDurations[timerMode] * 60 * 1000;
        const currentElapsedMs = accumulatedTimeRef.current + (Date.now() - startTimeRef.current);
        const remainingMs = plannedDurationMs - currentElapsedMs;

        const diff = Math.ceil(remainingMs / 1000);

        if (diff <= 0) {
          setTimeLeft(0);
          clearInterval(timerRef.current);
          handleCompleteSession(false);
        } else {
          setTimeLeft(diff);
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerState, handleCompleteSession, timerMode, timerDurations]);

  const handleDurationUpdate = useCallback((newDuration: number, modeKey: 'focus' | 'short' | 'long') => {
    setTimerDurations(prev => ({ ...prev, [modeKey]: newDuration }));
    if (timerMode === modeKey && timerState === 'idle') { setTimeLeft(newDuration * 60); }
  }, [timerMode, timerState]);

  // Auth logic
  const migrateGuestDataToFirebase = useCallback(async (uid: string) => {
    // ... migration logic
  }, [customSyllabus]);

  const handleLogin = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // User state is handled by onAuthStateChanged observer
    } catch (error) {
      console.error("Login failed:", error);
    }
  }, []);

  const handleGuestLogin = useCallback((name: string) => {
    if (!name.trim()) return;
    localStorage.setItem('trackly_guest_name', name.trim());
    setIsGuest(true);
    localStorage.setItem('trackly_is_guest', 'true');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      if (user) {
        // Stop presence listeners and force offline status in RTDB before signing out
        if (forceOfflineRef.current) {
          forceOfflineRef.current().catch(console.error);
          forceOfflineRef.current = null;
        }
        await signOut(auth);
      }

      // Close Settings Modal if open
      setIsSettingsOpen(false);

      // Clear Local State
      setIsGuest(false);
      setUser(null);
      setUserProfile(null);

      // Clear Guest Markers
      localStorage.removeItem('trackly_is_guest');
      localStorage.removeItem('trackly_guest_name');

      // Reset View
      setView('daily');

    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [user]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(p => !p), [setSidebarCollapsed]);
  const toggleSettings = useCallback(() => setIsSettingsOpen(p => !p), []);
  const toggleTutorial = useCallback(() => { setIsTutorialActive(true); setTutorialStep(0); }, []);
  const handleUpgrade = useCallback(() => { setHasPaid(true); }, [setHasPaid]);
  const activateLiteMode = useCallback(() => { setGraphicsEnabled(false); setAnimationsEnabled(false); dismissLag(); }, [dismissLag, setGraphicsEnabled, setAnimationsEnabled]);

  return (
    <>
      <style>{dynamicStyles}</style>
      <MotionConfig reducedMotion={animationsEnabled ? "user" : "always"}>
        <div className={`min-h-screen transition-colors duration-300 ${themeConfig.mode} font-sans selection:bg-theme-accent/30 text-theme-text ${!animationsEnabled ? 'reduce-motion' : ''} ${!graphicsEnabled ? 'low-graphics' : ''}`}>
          <StreamTransition isTransitioning={isTransitioning} stream={transitionStream} />
          <AnimatedBackground themeId={theme} showAurora={effectiveShowAurora} parallaxEnabled={effectiveParallax} customBackground={customBackgroundEnabled ? customBackground : null} customBackgroundAlign={customBackgroundAlign} />

          {isAuthLoading ? (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-theme-bg gap-4">
              <TracklyLogoComponent />
              <Loader2 size={24} className="animate-spin text-theme-accent" />
              {authStatus === 'loading_profile' && (
                <p className="mt-4 text-theme-text-secondary animate-in fade-in delay-500 duration-500">Loading your profile...</p>
              )}
            </div>
          ) : showWelcome ? (
            <WelcomePage onLogin={handleLogin} onGuestLogin={handleGuestLogin} stream={stream} setStream={handleChangeStream} />
          ) : (
            <div className="relative z-10 flex h-screen overflow-hidden">
              <Sidebar view={view} setView={changeView} onOpenSettings={toggleSettings} isCollapsed={sidebarCollapsed} toggleCollapsed={toggleSidebar} user={user} isGuest={isGuest} onLogin={handleLogin} onLogout={handleLogout} isInstalled={isInstalled} onInstall={() => { }} userName={userName} isPro={isPro} onOpenUpgrade={() => setShowUpgradeModal(true)} />
              <MobileHeader view={view} onOpenSettings={toggleSettings} />
              <main className={`flex-1 overflow-y-auto overflow-x-hidden relative transition-all duration-500 ${sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'}`}>
                <div className="pt-14 md:pt-0 px-4 md:px-8 pb-20 md:pb-8 max-w-7xl mx-auto min-h-screen">

                  <AnimatePresence mode="wait" custom={direction}>
                    <MotionDiv
                      key={view}
                      variants={effectiveSwipe ? slideVariants : fadeVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      custom={direction}
                      transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}
                      className="w-full relative"
                    >
                      <ErrorBoundary>
                        <Suspense fallback={
                          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                            <Loader2 className="animate-spin text-theme-accent" size={32} />
                            <p className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary animate-pulse">Loading View...</p>
                          </div>
                        }>
                          {view === 'daily' && <Dashboard sessions={sessionsForStream} targets={targets} quote={QUOTES[quoteIdx]} onDelete={handleDeleteSession} onRenameSession={handleRenameSession} goals={goals} setGoals={setGoals} onSaveSession={handleSaveSession} userName={userName} onOpenPrivacy={() => changeView('privacy')} subjects={currentSubjects} syllabus={currentSyllabus} countdowns={countdowns} onUpdateCountdowns={setCountdowns} />}
                          {view === 'planner' && <Planner targets={targets} onAdd={handleSaveTarget} onToggle={handleUpdateTarget} onDelete={handleDeleteTarget} />}
                          {view === 'focus' && <FocusTimer timerState={timerState} sessions={sessionsForStream} onToggleTimer={handleTimerToggle} mode={timerMode} timeLeft={timeLeft} durations={timerDurations} onResetTimer={handleTimerReset} onCompleteSession={handleCompleteSession} onSwitchMode={handleModeSwitch} onUpdateDurations={handleDurationUpdate} syllabus={currentSyllabus} sessionCount={sessionCount} selectedSubject={selectedSubject} onSelectSubject={setSelectedSubject} activityThresholds={activityThresholds} onOpenSettings={toggleSettings} onStatusChange={updatePresence} username={userName} />}
                          {view === 'tests' && <TestLog tests={testsForStream} onSave={handleSaveTest} onDelete={handleDeleteTest} syllabus={currentSyllabus} stream={stream} />}
                          {view === 'friends' && <StudyBuddy user={user} userProfile={userProfile} />}
                          {view === 'analytics' && <Analytics sessions={sessionsForStream} isPro={isPro} onOpenUpgrade={() => setShowUpgradeModal(true)} stream={stream} syllabus={currentSyllabus} />}
                          {view === 'group-focus' && <VirtualLibrary user={user} userName={userName} onLogin={handleLogin} isPro={isPro} targets={targets} onCompleteTask={handleUpdateTarget} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />}
                          {view === 'privacy' && <PrivacyPolicy onBack={() => changeView('daily')} />}
                        </Suspense>
                      </ErrorBoundary>
                    </MotionDiv>
                  </AnimatePresence>
                </div>
              </main>
              <BottomNavBar view={view} setView={changeView} onOpenSettings={toggleSettings} />
            </div>
          )}

          {!isAuthLoading && (
            <>
              <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} animationsEnabled={animationsEnabled} toggleAnimations={() => setAnimationsEnabled(p => !p)} graphicsEnabled={graphicsEnabled} toggleGraphics={() => setGraphicsEnabled(p => !p)} lagDetectionEnabled={lagDetectionEnabled} toggleLagDetection={() => setLagDetectionEnabled(p => !p)} theme={theme} setTheme={setTheme} onStartTutorial={toggleTutorial} showAurora={showAurora} toggleAurora={() => setShowAurora(p => !p)} parallaxEnabled={parallaxEnabled} toggleParallax={() => setParallaxEnabled(p => !p)} showParticles={showParticles} toggleParticles={() => setShowParticles(p => !p)} swipeAnimationEnabled={swipeAnimationEnabled} toggleSwipeAnimation={() => setSwipeAnimationEnabled(p => !p)} swipeStiffness={swipeStiffness} setSwipeStiffness={setSwipeStiffness} swipeDamping={swipeDamping} setSwipeDamping={setSwipeDamping} soundEnabled={soundEnabled} toggleSound={() => setSoundEnabled(p => !p)} soundPitch={soundPitch} setSoundPitch={setSoundPitch} soundVolume={soundVolume} setSoundVolume={setSoundVolume} customBackground={customBackground} setCustomBackground={setCustomBackground} customBackgroundEnabled={customBackgroundEnabled} toggleCustomBackground={() => setCustomBackgroundEnabled(p => !p)} customBackgroundAlign={customBackgroundAlign} setCustomBackgroundAlign={setCustomBackgroundAlign} user={user} userProfile={userProfile} isGuest={isGuest} onLogout={handleLogout} onForceSync={handleForceSync} syncStatus={syncStatus} syncError={syncError} onOpenPrivacy={() => { setIsSettingsOpen(false); changeView('privacy'); }} stream={stream} setStream={handleChangeStream} customSyllabus={customSyllabus} setCustomSyllabus={setCustomSyllabus} activityThresholds={activityThresholds} setActivityThresholds={setActivityThresholds} showSmartRecommendations={showSmartRecommendations} toggleSmartRecommendations={() => setShowSmartRecommendations(p => !p)} notifFrequencyMin={notifFrequencyMin} setNotifFrequencyMin={setNotifFrequencyMin} />
              <ProUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} />
              <OverdueTasksModal isOpen={showOverdueModal} tasks={overdueTasks} onClose={() => setShowOverdueModal(false)} onComplete={(id: string) => handleUpdateTarget(id, true)} onDelete={handleDeleteTarget} />
              <PerformanceToast isVisible={isLagging} onSwitch={activateLiteMode} onDismiss={dismissLag} />
              <SmartRecommendationToast isVisible={!showWelcome && showSmartRecommendations && showRecommendationToast} data={recommendation} onDismiss={() => setShowRecommendationToast(false)} onPractice={handlePracticeRecommendation} onDisable={handleDisableRecommendations} />
              <ConfirmationModal isOpen={!!plannerPrompt} onClose={() => setPlannerPrompt(null)} onConfirm={handleConfirmPlannerTask} title="Add to Planner?" message={`Would you like to add a task to today's planner to revise "${plannerPrompt?.topic}"?`} confirmText="Add Task" cancelText="No, thanks" confirmVariant="primary" icon={<ListChecks size={24} className="text-white" />} />
              {/* Notification permission banner — slides up once if permission not yet decided */}
              {!showWelcome && !isAuthLoading && <NotificationPermissionBanner />}
            </>
          )}
        </div>
      </MotionConfig>
    </>
  );
};
