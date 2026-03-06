import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Zap, RotateCcw, Shield, Trophy, Flame, Star, Sparkles, Crown } from 'lucide-react';

interface RankRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RankRulesModal: React.FC<RankRulesModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl max-h-[85vh] bg-[#111111] dark:bg-[#111111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-theme-accent/20 flex items-center justify-center text-theme-accent border border-theme-accent/30 shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.3)]">
                                    <Shield size={20} className="drop-shadow-md" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-wide">Rank System Rules</h2>
                                    <p className="text-sm font-medium text-theme-text-secondary">How to climb the leaderboard</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
                            <div className="p-4 sm:p-6 flex flex-col gap-6">

                                {/* Section 1: How to Rank Up */}
                                <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-400" /> Earning XP
                                    </h3>
                                    <p className="text-sm text-theme-text-secondary mb-4 leading-relaxed">
                                        Your Rank represents your dedication. You gain Experience Points (XP) for every minute you spend in a focused study session.
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 bg-white/5 rounded-lg p-3 border border-white/5">
                                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-black text-xs shrink-0 shadow-inner">
                                                +5
                                            </div>
                                            <div className="text-sm font-medium text-white">
                                                <span className="text-yellow-400 font-bold">Base Rate:</span> You earn <span className="font-bold">5 XP per minute</span> of focused study time.
                                                <div className="text-xs text-theme-text-secondary mt-1">Example: A 60-minute session grants you <span className="text-white font-bold">300 XP</span> (without streaks).</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Streak Multipliers */}
                                <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                        <Flame size={16} className="text-orange-500" /> Streak Multipliers
                                    </h3>
                                    <p className="text-sm text-theme-text-secondary mb-4 leading-relaxed">
                                        Consistency is rewarded. Hitting your daily study goal builds your streak, multiplying all XP earned during that session.
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                        {[
                                            { day: 1, mult: '1.0x', bonus: '5 XP/min', color: 'text-white/50', border: 'border-white/10' },
                                            { day: 2, mult: '1.5x', bonus: '7.5 XP/min', color: 'text-orange-300', border: 'border-orange-500/30' },
                                            { day: 3, mult: '2.0x', bonus: '10 XP/min', color: 'text-orange-400', border: 'border-orange-500/50' },
                                            { day: 4, mult: '2.5x', bonus: '12.5 XP/min', color: 'text-orange-500', border: 'border-orange-500/70' },
                                            { day: '5+', mult: '3.0x MAX', bonus: '15 XP/min', color: 'text-orange-500 font-black drop-shadow-[0_0_8px_rgba(249,115,22,1)]', border: 'border-orange-500 bg-orange-500/20' },
                                        ].map((s, i) => (
                                            <div key={i} className={`flex flex-col items-center justify-center p-2 rounded-lg border ${s.border} bg-white/5 ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}>
                                                <span className="text-[10px] text-theme-text-secondary uppercase font-bold mb-1">Day {s.day}</span>
                                                <span className={`text-xs sm:text-sm font-bold ${s.color}`}>{s.mult}</span>
                                                <span className="text-[9px] text-white/40 mt-1 font-mono">{s.bonus}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-xs text-theme-text-secondary bg-orange-500/5 border border-orange-500/10 p-3 rounded-lg">
                                        <strong>Example at MAX Streak:</strong> A 60-minute session grants you <span className="text-orange-400 font-bold">900 XP</span> instead of 300 XP. Keep your streak alive to rank up {'>'}3x faster!
                                    </div>
                                </div>

                                {/* Section 3: Weekly Reset */}
                                <div className="bg-black/30 rounded-xl border border-white/5 p-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 relative z-10">
                                        <RotateCcw size={16} className="text-indigo-400" /> Weekly Leaderboard Reset
                                    </h3>
                                    <div className="text-sm text-theme-text-secondary leading-relaxed relative z-10 space-y-3">
                                        <p>Your <strong>total XP and Rank Level are permanent</strong>. You will never lose your hard-earned rank or total level.</p>
                                        <p>However, the <strong className="text-indigo-300">"Weekly XP"</strong> shown on the friend leaderboard calculates who gained the most XP <i>this week</i>.</p>
                                        <p>This leaderboard <strong>resets every Sunday night at 11:59 PM (Midnight)</strong>. This ensures a fresh, equal competition every Monday morning, regardless of who has the highest lifetime rank!</p>
                                    </div>
                                </div>

                                {/* Section 4: Tier Breakdown */}
                                <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Trophy size={16} className="text-theme-accent" /> Rank Tiers
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { name: 'Bronze', levels: '1-10', icon: Target, color: 'text-orange-400', bg: 'bg-orange-900/40', hours: '~Base Rank' },
                                            { name: 'Silver', levels: '11-20', icon: Star, color: 'text-slate-300', bg: 'bg-slate-700/40', hours: '~Study Habit' },
                                            { name: 'Gold', levels: '21-30', icon: Flame, color: 'text-yellow-400', bg: 'bg-yellow-600/30', hours: '~Dedicated' },
                                            { name: 'Platinum', levels: '31-40', icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-600/30', hours: '~28 Hours' },
                                            { name: 'Diamond', levels: '41-50', icon: Crown, color: 'text-cyan-400', bg: 'bg-cyan-600/30', hours: '~42 Hours' },
                                            { name: 'Legend', levels: '51+', icon: Sparkles, color: 'text-fuchsia-400', bg: 'bg-fuchsia-600/30', hours: '~60+ Hours' }
                                        ].map((tier, i) => (
                                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 ${tier.bg}`}>
                                                <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center shrink-0 shadow-inner">
                                                    <tier.icon size={14} className={tier.color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm font-black tracking-wide ${tier.color}`}>{tier.name}</span>
                                                        <span className="text-[10px] text-theme-text-secondary font-mono">{tier.hours}</span>
                                                    </div>
                                                    <div className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-0.5">Levels {tier.levels}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
