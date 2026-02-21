import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X } from 'lucide-react';
import { fireStudyNotification } from '../hooks/useIdleNotification';

const STORAGE_KEY = 'trackly_notif_prompt_dismissed';

export const NotificationPermissionBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [status, setStatus] = useState<'asking' | 'granted' | 'denied' | null>(null);

    useEffect(() => {
        // Only show if notifications are supported and not yet decided
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'default') return;
        if (localStorage.getItem(STORAGE_KEY)) return;

        // Show after a short delay so it doesn't pop instantly on load
        const t = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(t);
    }, []);

    const handleEnable = async () => {
        setStatus('asking');
        try {
            const result = await Notification.requestPermission();
            if (result === 'granted') {
                setStatus('granted');
                // Fire immediately so user gets proof it works
                fireStudyNotification({ title: "🔔 Notifications enabled!", body: "Trackly will remind you when you go idle. Stay locked in." });
            } else {
                setStatus('denied');
            }
            setTimeout(() => {
                setVisible(false);
                localStorage.setItem(STORAGE_KEY, 'true');
            }, 2200);
        } catch {
            setStatus('denied');
        }
    };

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 80, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-2rem)] max-w-md"
                >
                    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)' }}>

                        {/* Top accent line */}
                        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

                        <div className="p-4 flex items-start gap-3">
                            {/* Icon */}
                            <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                {status === 'granted' ? (
                                    <Bell size={16} className="text-emerald-400" />
                                ) : status === 'denied' ? (
                                    <BellOff size={16} className="text-rose-400" />
                                ) : (
                                    <Bell size={16} className="text-indigo-400" />
                                )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                {status === 'granted' ? (
                                    <>
                                        <p className="text-sm font-bold text-emerald-400">Notifications enabled ✓</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Trackly will remind you when you drift. Stay locked in.</p>
                                    </>
                                ) : status === 'denied' ? (
                                    <>
                                        <p className="text-sm font-bold text-rose-400">Permission denied</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Enable notifications in browser settings to get study reminders.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-bold text-white">Enable study reminders? 🔔</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Trackly will nudge you after 20 min of idle — so you don't drift.</p>
                                    </>
                                )}
                            </div>

                            {/* Dismiss */}
                            {!status && (
                                <button
                                    onClick={handleDismiss}
                                    className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Action buttons */}
                        {!status && (
                            <div className="px-4 pb-4 flex gap-2">
                                <button
                                    onClick={handleEnable}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                >
                                    Enable Notifications
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Not now
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
