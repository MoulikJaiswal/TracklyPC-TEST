import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  LayoutDashboard, CalendarIcon, Timer, Trophy, Hammer, Users, BarChart3, Settings, ChevronRight, ChevronLeft, Loader2, ListChecks, X
} from 'lucide-react';
import { ViewType, Target } from './types';
import { QUOTES } from './constants';
import { SettingsModal } from './components/SettingsModal';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useSmartRecommendations, Recommendation } from './hooks/useSmartRecommendations';
import { SmartRecommendationToast } from './components/SmartRecommendationToast';
import { AnimatedBackground } from './components/AnimatedBackground';
import { PerformanceToast } from './components/PerformanceToast';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { getProStatus } from './components/proController';
import { StreamTransition } from './components/StreamTransition';
import { TracklyLogo as TracklyLogoComponent } from './components/TracklyLogo';
import { WelcomePage } from './components/WelcomePage';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useLocalStorage } from './hooks/useLocalStorage';

// Context Providers & Hooks
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { StreamProvider, useStream } from './contexts/StreamContext';
import { TimerProvider, useTimer } from './contexts/TimerContext';

// Lazy Load Components
const Dashboard = lazy(() => import('./components/Dashboard'));
const FocusTimer = lazy(() => import('./components/FocusTimer'));
const Planner = lazy(() => import('./components/Planner'));
const Analytics = lazy(() => import('./components/Analytics'));
const TestLog = lazy(() => import('./components/TestLog'));
const VirtualLibrary = lazy(() => import('./components/VirtualLibrary'));
const StudyBuddy = lazy(() => import('./components/StudyBuddy'));


const MotionDiv = motion.div as any;

const getLocalDate = (d = new Date()) => d.toISOString().split('T')[0];
const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);

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
];

const Sidebar = React.memo(({ view, setView, onOpenSettings, isCollapsed, toggleCollapsed, userName }: any) => {
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

const BottomNavBar = React.memo(({ view, setView }: { view: ViewType, setView: (v: ViewType) => void }) => (
    <footer className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-theme-border bg-theme-card/80 backdrop-blur-xl">
      <nav className="flex justify-around items-center h-16 px-2 safe-area-bottom">
        {TABS.map(tab => {
          const isActive = view === tab.id;
          return (
            <button key={tab.id} onClick={() => setView(tab.id as ViewType)} className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl transition-all duration-300 relative ${isActive ? 'text-theme-accent' : 'text-theme-text-secondary hover:text-theme-text'}`}>
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-theme-accent/10' : ''}`}><tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} /></div>
              <span className="text-[9px] font-bold tracking-wide">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </footer>
));

const slideVariants = { enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0, position: 'absolute' as 'absolute' }), center: { zIndex: 1, x: 0, opacity: 1, position: 'relative' as 'relative' }, exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 30 : -30, opacity: 0, position: 'absolute' as 'absolute' }) };
const fadeVariants = { enter: { opacity: 0 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0 } };

// FIX: Removed React.FC type for potentially better type inference with children
const AppContent = () => {
  const [view, setView] = useState<ViewType>('daily');
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  
  // Auth state
  const { authStatus, user, isGuest, handleLogin, handleGuestLogin, userName } = useAuth();
  
  // Data State
  const { targets, handleSaveTarget, handleUpdateTarget, handleDeleteTarget } = useData();
  
  // Stream State
  const { stream, handleChangeStream, isTransitioning, transitionStream, currentSyllabus } = useStream();
  
  // Timer State
  const { setSelectedSubject } = useTimer();

  // Settings State
  const { themeConfig, dynamicStyles, graphicsEnabled, animationsEnabled, showAurora, parallaxEnabled, customBackground, customBackgroundEnabled, customBackgroundAlign, sidebarCollapsed, setSidebarCollapsed, swipeAnimationEnabled, swipeStiffness, swipeDamping } = useSettings();
  
  // Pro Features State
  const [hasPaid, setHasPaid] = useLocalStorage('trackly_pro', false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isPro = getProStatus(hasPaid);

  // Local UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // Group Focus State
  const [currentRoom, setCurrentRoom] = useState<any | null>(null);

  // Smart Recommendations
  const { sessionsForStream } = useData();
  const recommendation = useSmartRecommendations(sessionsForStream, currentSyllabus);
  const [showRecommendationToast, setShowRecommendationToast] = useState(false);
  const [plannerPrompt, setPlannerPrompt] = useState<Recommendation | null>(null);
  
  // Performance Monitor
  const { lagDetectionEnabled, setGraphicsEnabled, setAnimationsEnabled } = useSettings();
  const { isLagging, dismiss: dismissLag } = usePerformanceMonitor(graphicsEnabled && lagDetectionEnabled);

  const isAuthLoading = authStatus !== 'loaded';
  const showWelcome = !isAuthLoading && !user && !isGuest;

  useEffect(() => {
    if (isAuthLoading || showWelcome || view !== 'daily') return;
    if (recommendation) {
        const key = `recommendationToastShown_${recommendation.subject}_${recommendation.topic}`;
        if (!sessionStorage.getItem(key)) {
            setShowRecommendationToast(true);
            sessionStorage.setItem(key, 'true');
        }
    }
  }, [recommendation, showWelcome, view, isAuthLoading]);

  const changeView = useCallback((newView: ViewType) => {
     if (view === newView) return;
     const currentIdx = TABS.findIndex(t => t.id === view);
     const newIdx = TABS.findIndex(t => t.id === newView);
     setDirection(newIdx > currentIdx ? 1 : -1);
     setView(newView);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const handlePracticeRecommendation = useCallback(() => {
    if (recommendation) {
        setSelectedSubject(recommendation.subject);
        changeView('focus');
        setShowRecommendationToast(false);
        setPlannerPrompt(recommendation);
    }
  }, [recommendation, changeView, setSelectedSubject]);

  const handleConfirmPlannerTask = useCallback(() => {
    if (!plannerPrompt) return;
    handleSaveTarget({ id: generateUUID(), date: getLocalDate(), text: `Revise ${plannerPrompt.topic}`, completed: false, timestamp: Date.now(), type: 'task' });
    setPlannerPrompt(null);
  }, [plannerPrompt, handleSaveTarget]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(p => !p), [setSidebarCollapsed]);
  const toggleSettings = useCallback(() => setIsSettingsOpen(p => !p), []);
  const toggleTutorial = useCallback(() => { setIsTutorialActive(true); setTutorialStep(0); }, []);
  const handleUpgrade = useCallback(() => { setHasPaid(true); }, [setHasPaid]);
  const activateLiteMode = useCallback(() => { setGraphicsEnabled(false); setAnimationsEnabled(false); dismissLag(); }, [dismissLag, setGraphicsEnabled, setAnimationsEnabled]);
  
  const effectiveShowAurora = graphicsEnabled && showAurora;
  const effectiveParallax = graphicsEnabled && parallaxEnabled;
  const effectiveSwipe = animationsEnabled && swipeAnimationEnabled;

  return (
    <>
      <style>{dynamicStyles}</style>
      <div className={`min-h-screen transition-colors duration-300 ${themeConfig.mode} font-sans selection:bg-theme-accent/30`}>
        <StreamTransition isTransitioning={isTransitioning} stream={transitionStream} />
        <AnimatedBackground themeId={themeConfig.label.toLowerCase().replace(' ', '-') as any} showAurora={effectiveShowAurora} parallaxEnabled={effectiveParallax} customBackground={customBackgroundEnabled ? customBackground : null} customBackgroundAlign={customBackgroundAlign} />

        {isAuthLoading ? (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-theme-bg gap-4">
                <TracklyLogoComponent />
                <Loader2 size={24} className="animate-spin text-theme-accent" />
                {authStatus === 'loading_profile' && <p className="mt-4 text-theme-text-secondary animate-in fade-in delay-500 duration-500">Loading your profile...</p>}
            </div>
        ) : showWelcome ? (
            <WelcomePage onLogin={handleLogin} onGuestLogin={handleGuestLogin} stream={stream} setStream={handleChangeStream} />
        ) : (
            <div className="relative z-10 flex h-screen overflow-hidden">
                <Sidebar view={view} setView={changeView} onOpenSettings={toggleSettings} isCollapsed={sidebarCollapsed} toggleCollapsed={toggleSidebar} userName={userName} />
                <main className={`flex-1 overflow-y-auto overflow-x-hidden relative transition-all duration-500 ${sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'}`}>
                    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen pb-28 md:pb-24">
                        <AnimatePresence mode="wait" custom={direction}>
                            {view === 'daily' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="daily" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><Dashboard quote={QUOTES[quoteIdx]} onOpenPrivacy={() => changeView('privacy')} /></MotionDiv></Suspense> )}
                            {view === 'planner' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="planner" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><Planner /></MotionDiv></Suspense> )}
                            {view === 'focus' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="focus" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><FocusTimer /></MotionDiv></Suspense> )}
                            {view === 'tests' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="tests" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><TestLog /></MotionDiv></Suspense> )}
                            {view === 'friends' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="friends" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><StudyBuddy /></MotionDiv></Suspense> )}
                            {view === 'analytics' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="analytics" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><Analytics isPro={isPro} onOpenUpgrade={() => setShowUpgradeModal(true)} /></MotionDiv></Suspense> )}
                            {view === 'group-focus' && ( <Suspense fallback={<Loader2 className="animate-spin" />}><MotionDiv key="group-focus" variants={effectiveSwipe ? slideVariants : fadeVariants} initial="enter" animate="center" exit="exit" custom={direction} transition={{ type: 'spring', stiffness: swipeStiffness, damping: swipeDamping }}><VirtualLibrary targets={targets} onCompleteTask={(id, completed) => handleUpdateTarget(id, completed)} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} /></MotionDiv></Suspense> )}
                            {view === 'privacy' && ( <MotionDiv key="privacy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><PrivacyPolicy onBack={() => changeView('daily')} /></MotionDiv> )}
                        </AnimatePresence>
                    </div>
                </main>
                <BottomNavBar view={view} setView={changeView} />
            </div>
        )}

        {!isAuthLoading && (
          <>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onStartTutorial={toggleTutorial} onOpenPrivacy={() => { setIsSettingsOpen(false); changeView('privacy'); }} />
            <ProUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} />
            <PerformanceToast isVisible={isLagging} onSwitch={activateLiteMode} onDismiss={dismissLag} />
            <SmartRecommendationToast isVisible={!showWelcome && showRecommendationToast} data={recommendation} onDismiss={() => setShowRecommendationToast(false)} onPractice={handlePracticeRecommendation} />
            <ConfirmationModal isOpen={!!plannerPrompt} onClose={() => setPlannerPrompt(null)} onConfirm={handleConfirmPlannerTask} title="Add to Planner?" message={`Would you like to add a task to today's planner to revise "${plannerPrompt?.topic}"?`} confirmText="Add Task" cancelText="No, thanks" confirmVariant="primary" icon={<ListChecks size={24} className="text-white" />} />
          </>
        )}
      </div>
    </>
  );
}

// FIX: Removed React.FC type for potentially better type inference with children
export const App = () => (
  <AuthProvider>
    <SettingsProvider>
      <StreamProvider>
        <DataProvider>
          <TimerProvider>
            <AppContent />
          </TimerProvider>
        </DataProvider>
      </StreamProvider>
    </SettingsProvider>
  </AuthProvider>
);