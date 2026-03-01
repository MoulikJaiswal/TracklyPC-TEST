
import React, { useRef, useState, useEffect } from 'react';
import { X, CheckCircle2, Palette, Zap, BookOpen, Plus, Trash2, Pencil, Check, AlertTriangle, Loader2, Upload, UploadCloud, LogOut, GraduationCap, LayoutTemplate, Image as ImageIcon, BatteryCharging, Eye, Activity, User as UserIcon, Sparkles, Lock } from 'lucide-react';
import { Card } from './Card';
import { ThemeId, StreamType, SyllabusData, ActivityThresholds, UserProfile } from '../types';
import { THEME_CONFIG } from '../constants';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from './ConfirmationModal';
import { db } from '../firebase';
import { doc, runTransaction, getDoc } from 'firebase/firestore';

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

    soundEnabled: boolean;
    toggleSound: () => void;
    soundPitch: number;
    setSoundPitch: (val: number) => void;
    soundVolume: number;
    setSoundVolume: (val: number) => void;

    customBackground: string | null;
    setCustomBackground: (bg: string | null) => void;
    customBackgroundEnabled: boolean;
    toggleCustomBackground: () => void;
    customBackgroundAlign: 'center' | 'top' | 'bottom';
    setCustomBackgroundAlign: (align: 'center' | 'top' | 'bottom') => void;

    user: User | null;
    userProfile: UserProfile | null;
    isGuest: boolean;
    onLogout: () => void;
    onForceSync: () => void;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    syncError: string | null;
    onOpenPrivacy: () => void;

    stream: StreamType;
    setStream: (stream: StreamType) => void;

    customSyllabus: SyllabusData;
    setCustomSyllabus: React.Dispatch<React.SetStateAction<SyllabusData>>;

    activityThresholds: ActivityThresholds;
    setActivityThresholds: React.Dispatch<React.SetStateAction<ActivityThresholds>>;

    showSmartRecommendations: boolean;
    toggleSmartRecommendations: () => void;
    notifFrequencyMin: number;
    setNotifFrequencyMin: (val: number) => void;
    streakGoal: number;
    setStreakGoal: (val: number) => void;
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

    user,
    userProfile,
    isGuest,
    onLogout,
    onForceSync,
    syncStatus,
    syncError,
    onOpenPrivacy,

    stream,
    setStream,
    customSyllabus,
    setCustomSyllabus,

    activityThresholds,
    setActivityThresholds,
    showSmartRecommendations,
    toggleSmartRecommendations,
    notifFrequencyMin,
    setNotifFrequencyMin,
    streakGoal,
    setStreakGoal,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // General Stream Management State
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newTopicName, setNewTopicName] = useState('');
    const [activeSubjectForEdit, setActiveSubjectForEdit] = useState<string | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

    // Rename State
    const [editingSubject, setEditingSubject] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Profile Management State
    const [editingUsername, setEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState(false);

    // Streak goal change confirmation state
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [pendingStreakGoal, setPendingStreakGoal] = useState(streakGoal);

    useEffect(() => {
        if (isOpen && userProfile?.studyBuddyUsername) {
            setNewUsername(userProfile.studyBuddyUsername);
        }
    }, [isOpen, userProfile]);

    if (!isOpen) return null;

    const handleClearData = () => {
        if (window.confirm("Are you sure? This will wipe all local data, settings, and guest progress. This action cannot be undone.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const setMode = (mode: 'standard' | 'lite') => {
        if (mode === 'standard') {
            if (!graphicsEnabled) toggleGraphics();
            if (!animationsEnabled) toggleAnimations();
        } else {
            if (graphicsEnabled) toggleGraphics();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    const handleThresholdChange = (level: keyof ActivityThresholds, value: number) => {
        // value is in hours, convert to minutes
        const minutes = value * 60;
        setActivityThresholds(prev => {
            const newThresholds = { ...prev, [level]: minutes };

            // Ensure levels are monotonic
            if (level === 'level2') {
                newThresholds.level3 = Math.max(newThresholds.level3, minutes);
                newThresholds.level4 = Math.max(newThresholds.level4, newThresholds.level3);
            }
            if (level === 'level3') {
                newThresholds.level2 = Math.min(newThresholds.level2, minutes);
                newThresholds.level4 = Math.max(newThresholds.level4, minutes);
            }
            if (level === 'level4') {
                newThresholds.level3 = Math.min(newThresholds.level3, minutes);
                newThresholds.level2 = Math.min(newThresholds.level2, newThresholds.level3);
            }
            return newThresholds;
        });
    };

    // --- Curriculum Management Handlers ---
    const handleAddSubject = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newSubjectName.trim();
        if (!trimmed) return;
        if (customSyllabus[trimmed]) {
            alert('Subject already exists');
            return;
        }
        setCustomSyllabus(prev => ({ ...prev, [trimmed]: [] }));
        setNewSubjectName('');
    };

    const handleDeleteSubjectClick = (e: React.MouseEvent, subject: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSubjectToDelete(subject);
    };

    const confirmDeleteSubject = () => {
        if (!subjectToDelete) return;

        setCustomSyllabus(prev => {
            const newState = { ...prev };
            delete newState[subjectToDelete];
            return newState;
        });

        if (activeSubjectForEdit === subjectToDelete) setActiveSubjectForEdit(null);
        if (editingSubject === subjectToDelete) setEditingSubject(null);

        setSubjectToDelete(null);
    };

    const handleStartRename = (e: React.MouseEvent, subject: string) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingSubject(subject);
        setRenameValue(subject);
    };

    const handleSaveRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!editingSubject || !renameValue.trim() || renameValue === editingSubject) {
            setEditingSubject(null);
            return;
        }

        const trimmed = renameValue.trim();
        if (customSyllabus[trimmed]) {
            alert('A subject with this name already exists.');
            return;
        }

        setCustomSyllabus(prev => {
            const topics = prev[editingSubject];
            const newState = { ...prev };
            delete newState[editingSubject]; // Remove old key
            newState[trimmed] = topics; // Add new key with preserved topics
            return newState;
        });

        if (activeSubjectForEdit === editingSubject) setActiveSubjectForEdit(trimmed);
        setEditingSubject(null);
    };

    const handleAddTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSubjectForEdit || !newTopicName.trim()) return;

        setCustomSyllabus(prev => ({
            ...prev,
            [activeSubjectForEdit]: [...(prev[activeSubjectForEdit] || []), newTopicName.trim()]
        }));
        setNewTopicName('');
    };

    const handleDeleteTopic = (subject: string, topic: string) => {
        setCustomSyllabus(prev => ({
            ...prev,
            [subject]: prev[subject].filter(t => t !== topic)
        }));
    };

    const handleUpdateUsername = async () => {
        if (!user || !userProfile || !newUsername.trim()) return;
        if (newUsername.trim() === userProfile.studyBuddyUsername) {
            setEditingUsername(false);
            return;
        }

        const trimmedUsername = newUsername.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 15) {
            setProfileError('3-15 characters required.');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            setProfileError('Letters, numbers, & underscores only.');
            return;
        }

        setIsUpdatingProfile(true);
        setProfileError('');

        try {
            const usernameLower = trimmedUsername.toLowerCase();
            const oldUsernameLower = userProfile.studyBuddyUsername?.toLowerCase();
            const usernameRef = doc(db, 'studyBuddyUsernames', usernameLower);
            const userRef = doc(db, 'users', user.uid);
            const friendCodeRef = userProfile.friendCode ? doc(db, 'friendCodes', userProfile.friendCode) : null;

            await runTransaction(db, async (transaction) => {
                const usernameDoc = await transaction.get(usernameRef);
                if (usernameDoc.exists()) {
                    throw new Error('Username is already taken.');
                }

                if (oldUsernameLower) {
                    const oldUsernameRef = doc(db, 'studyBuddyUsernames', oldUsernameLower);
                    transaction.delete(oldUsernameRef);
                }

                transaction.set(usernameRef, { uid: user.uid });
                transaction.update(userRef, { studyBuddyUsername: trimmedUsername });

                if (friendCodeRef) {
                    transaction.update(friendCodeRef, { displayName: trimmedUsername });
                }
            });

            setProfileSuccess(true);
            setEditingUsername(false);
            setTimeout(() => setProfileSuccess(false), 3000);
        } catch (err: any) {
            setProfileError(err.message || 'Update failed.');
        } finally {
            setIsUpdatingProfile(false);
        }
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
        <>
            <ConfirmationModal
                isOpen={!!subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                onConfirm={confirmDeleteSubject}
                title={`Delete ${subjectToDelete}?`}
                message="This will remove the subject and all its topics. Past session logs will be preserved but won't count towards new goals."
                confirmText="Delete"
            />

            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                <Card
                    className="w-full max-w-lg shadow-2xl overflow-clip relative max-h-[90vh] flex flex-col [&>div.z-10]:flex [&>div.z-10]:flex-col [&>div.z-10]:h-full [&>div.z-10]:overflow-hidden"
                    style={{
                        backgroundColor: 'rgba(var(--theme-card-rgb), 0.85)',
                        borderColor: 'rgba(var(--theme-accent-rgb), 0.3)',
                        backdropFilter: 'blur(24px)'
                    }}
                >
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

                    <div className="space-y-8 overflow-y-auto pr-2 pb-4 flex-1 min-h-0 custom-scrollbar">

                        {/* --- SECTION: STUDY PROFILE --- */}
                        {user && userProfile && !isGuest && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2" style={{ color: 'var(--theme-accent)', borderColor: 'rgba(var(--theme-accent-rgb), 0.2)' }}>
                                    <UserIcon size={16} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Study Profile</span>
                                </div>
                                <div className="p-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Friend Code</p>
                                            <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-200">{userProfile.friendCode || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Username</p>
                                            {editingUsername ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="text"
                                                        value={newUsername}
                                                        onChange={e => setNewUsername(e.target.value)}
                                                        className="w-28 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleUpdateUsername} disabled={isUpdatingProfile} className="p-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-50">
                                                        {isUpdatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    </button>
                                                    <button onClick={() => { setEditingUsername(false); setNewUsername(userProfile.studyBuddyUsername || ''); setProfileError(''); }} className="p-1.5 bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{userProfile.studyBuddyUsername || 'Not Set'}</p>
                                                    <button onClick={() => setEditingUsername(true)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"><Pencil size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {profileError && <p className="text-xs text-rose-500">{profileError}</p>}
                                    {profileSuccess && <p className="text-xs text-emerald-500 flex items-center gap-1"><Check size={12} /> Username updated!</p>}
                                    <p className="text-[10px] text-slate-400">Your unique ID (Friend Code) never changes, even if you update your username.</p>
                                </div>
                            </div>
                        )}

                        {/* --- SECTION: FEATURES --- */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-violet-500 dark:text-violet-400 border-b border-violet-100 dark:border-violet-500/20 pb-2">
                                <Sparkles size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Features</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Smart Recommendations</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Get suggestions based on your performance.</p>
                                </div>
                                <button
                                    onClick={toggleSmartRecommendations}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${showSmartRecommendations ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    style={showSmartRecommendations ? { backgroundColor: 'var(--theme-accent)' } : {}}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showSmartRecommendations ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Idle Notification Frequency */}
                            {('Notification' in window) && (
                                <div className="p-3 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">🔔 Idle Reminder Frequency</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Notify me after being idle for this long.</p>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                            {notifFrequencyMin} min
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        step="1"
                                        value={notifFrequencyMin}
                                        onChange={(e) => setNotifFrequencyMin(Number(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-violet-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                        <span>1 min (Test)</span>
                                        <span>10 min</span>
                                        <span>20 min</span>
                                        <span>30 min</span>
                                    </div>
                                    {Notification.permission !== 'granted' && (
                                        <p className="text-[10px] text-amber-500">⚠ Notifications not enabled. Enable them to receive reminders.</p>
                                    )}
                                </div>
                            )}
                        </div>


                        {/* --- SECTION 0: STUDY STREAM --- */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2" style={{ color: 'var(--theme-accent)', borderColor: 'rgba(var(--theme-accent-rgb), 0.2)' }}>
                                <BookOpen size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Study Stream</span>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl">
                                {(['JEE', 'NEET', 'General'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStream(s)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${stream === s ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {/* General Stream Customization */}
                            {stream === 'General' && (
                                <div className="bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2"><GraduationCap size={14} /> Curriculum</span>
                                    </div>

                                    {/* Add Subject */}
                                    <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Add Subject (e.g. History)"
                                            className="flex-1 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                            value={newSubjectName}
                                            onChange={e => setNewSubjectName(e.target.value)}
                                        />
                                        <button type="submit" className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus size={16} /></button>
                                    </form>

                                    {/* Subject List */}
                                    <div className="space-y-2">
                                        {Object.keys(customSyllabus).map(subject => (
                                            <div key={subject} className="bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 overflow-hidden">
                                                <div className="flex justify-between items-center p-3">
                                                    {editingSubject === subject ? (
                                                        <div className="flex items-center gap-2 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={renameValue}
                                                                onChange={(e) => setRenameValue(e.target.value)}
                                                                className="w-full bg-slate-100 dark:bg-black/40 px-2 py-1 rounded text-sm font-bold border border-indigo-500 outline-none text-slate-900 dark:text-white"
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(e)}
                                                                onBlur={() => handleSaveRename()}
                                                            />
                                                            <button onClick={handleSaveRename} className="p-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"><Check size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex-1 cursor-pointer font-bold text-slate-800 dark:text-slate-200 text-sm"
                                                            onClick={() => setActiveSubjectForEdit(activeSubjectForEdit === subject ? null : subject)}
                                                        >
                                                            {subject}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        {!editingSubject && (
                                                            <>
                                                                <span className="text-[10px] text-slate-400 mr-1">{customSyllabus[subject].length} topics</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleStartRename(e, subject)}
                                                                    className="text-slate-400 hover:text-indigo-500 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors z-10"
                                                                    title="Rename Subject"
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteSubjectClick(e, subject)}
                                                                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors z-10"
                                                                    title="Delete Subject"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {activeSubjectForEdit === subject && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/5 p-3"
                                                        >
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                {customSyllabus[subject].map(topic => (
                                                                    <span key={topic} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-white/10 rounded text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                                                                        {topic}
                                                                        <button onClick={() => handleDeleteTopic(subject, topic)} className="hover:text-rose-500 transition-colors"><X size={10} /></button>
                                                                    </span>
                                                                ))}
                                                                {customSyllabus[subject].length === 0 && <span className="text-[10px] text-slate-400 italic">No topics yet</span>}
                                                            </div>
                                                            <form onSubmit={handleAddTopic} className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Add Topic..."
                                                                    className="flex-1 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                                                    value={newTopicName}
                                                                    onChange={e => setNewTopicName(e.target.value)}
                                                                />
                                                                <button type="submit" className="text-xs font-bold uppercase text-indigo-500 hover:text-indigo-400 px-2">Add</button>
                                                            </form>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                        {Object.keys(customSyllabus).length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4 italic">No subjects added. Add one above.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- SECTION: ANALYTICS SETTINGS --- */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-lime-500 dark:text-lime-400 border-b border-lime-100 dark:border-lime-500/20 pb-2">
                                <Activity size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Analytics</span>
                            </div>
                            <div className="p-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl space-y-4">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">Activity Map Thresholds</label>

                                {(['level2', 'level3', 'level4'] as const).map((level, index) => (
                                    <div key={level} className="space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-500 dark:text-slate-400">Level {index + 2}</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">{activityThresholds[level] / 60}hr+</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="12"
                                            step="0.5"
                                            value={activityThresholds[level] / 60}
                                            onChange={(e) => handleThresholdChange(level, parseFloat(e.target.value))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-lime-500"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Customize the time thresholds for colors on the activity heatmap.</p>

                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-bold text-slate-900 dark:text-white">Daily Streak Goal</label>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md text-xs">{streakGoal}hr{streakGoal !== 1 ? 's' : ''}</span>
                                        <button
                                            onClick={() => { setPendingStreakGoal(streakGoal); setShowStreakModal(true); }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                            title="Change streak goal — will reset your streak"
                                        >
                                            <Lock size={13} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400">Focus this many hours per day to keep your streak alive. Click 🔒 to change.</p>
                            </div>

                            {/* Streak goal warning modal */}
                            {showStreakModal && (
                                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                                    <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 text-amber-400">
                                            <AlertTriangle size={20} />
                                            <h3 className="text-base font-bold">Change Streak Goal?</h3>
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            Changing your daily goal will <span className="text-amber-400 font-bold">reset your current streak to 0</span>.
                                            Your past study data is preserved, but the streak counter restarts.
                                        </p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Only do this if you are absolutely sure.</p>

                                        <div className="space-y-2 py-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-400 font-bold">New Goal</span>
                                                <span className="text-sm font-mono font-bold text-orange-400">{pendingStreakGoal}hr{pendingStreakGoal !== 1 ? 's' : ''} / day</span>
                                            </div>
                                            <input
                                                type="range" min={1} max={12} step={1}
                                                value={pendingStreakGoal}
                                                onChange={e => setPendingStreakGoal(parseInt(e.target.value))}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-orange-500"
                                            />
                                            <div className="flex justify-between text-[9px] text-slate-600 font-bold">
                                                <span>1h</span><span>6h</span><span>12h</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => setShowStreakModal(false)}
                                                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => { setStreakGoal(pendingStreakGoal); setShowStreakModal(false); }}
                                                disabled={pendingStreakGoal === streakGoal}
                                                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Confirm &amp; Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ... Rest of settings content ... */}
                        {/* --- SECTION 1: APPEARANCE --- */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2" style={{ color: 'var(--theme-accent)', borderColor: 'rgba(var(--theme-accent-rgb), 0.2)' }}>
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
                                            className={`relative p-3 rounded-xl border-2 text-left transition-all group overflow-hidden ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}
                                            style={isSelected ? { borderColor: 'var(--theme-accent)' } : {}}
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
                                                {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                                            </div>
                                            <div
                                                className="absolute inset-0 opacity-10 pointer-events-none"
                                                style={{ backgroundColor: config.colors.bg }}
                                            />
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Custom Background */}
                            <div className="p-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <ImageIcon size={16} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Custom Wallpaper</span>
                                    </div>
                                    <button
                                        onClick={toggleCustomBackground}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${customBackgroundEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        style={customBackgroundEnabled ? { backgroundColor: 'var(--theme-accent)' } : {}}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${customBackgroundEnabled ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {customBackgroundEnabled && (
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
                                                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${customBackgroundAlign === align
                                                                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                                                    }`}
                                                                style={customBackgroundAlign === align ? { color: 'var(--theme-accent)' } : {}}
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
                                )}
                            </div>
                        </div>

                        {/* --- SECTION 2: PERFORMANCE --- */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-500/20 pb-2">
                                <Zap size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Performance</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMode('standard')}
                                    className={`
                        relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 group
                        ${graphicsEnabled
                                            ? 'bg-indigo-50 dark:bg-indigo-500/10'
                                            : 'border-slate-200 dark:border-white/5 hover:border-indigo-200 dark:hover:border-white/20'
                                        }
                    `}
                                    style={graphicsEnabled ? { borderColor: 'var(--theme-accent)' } : {}}
                                >
                                    {graphicsEnabled && <div className="absolute top-3 right-3" style={{ color: 'var(--theme-accent)' }}><CheckCircle2 size={16} /></div>}
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${graphicsEnabled ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} style={graphicsEnabled ? { color: 'var(--theme-accent)' } : {}}>
                                        <Eye size={24} />
                                    </div>
                                    <span className={`text-sm font-bold transition-colors ${graphicsEnabled ? 'dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`} style={graphicsEnabled ? { color: 'var(--theme-accent)' } : {}}>Standard</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">High Fidelity</span>
                                </button>

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
                        </div>

                        {/* --- SECTION 4: CLOUD SYNC --- */}
                        {user && !isGuest && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 pb-2" style={{ color: 'var(--theme-accent)', borderColor: 'rgba(var(--theme-accent-rgb), 0.2)' }}>
                                    <UploadCloud size={16} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Cloud Sync</span>
                                </div>
                                <div className="p-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl space-y-3">
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
                                        style={syncStatus === 'idle' ? { backgroundColor: 'var(--theme-accent)', boxShadow: '0 10px 15px -3px rgba(var(--theme-accent-rgb), 0.2)' } : {}}
                                    >
                                        {syncButtonContent()}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- SECTION 6: DANGER ZONE --- */}
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-2 text-rose-500">
                                <AlertTriangle size={14} />
                                <span className="text-xs font-bold uppercase tracking-widest">Danger Zone</span>
                            </div>

                            {(user || isGuest) && (
                                <div className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-xl">
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
                    </div>{/* close overflow-y-auto scrollable div */}
                </Card>
            </div>
        </>
    );
};
