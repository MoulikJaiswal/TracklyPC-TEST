import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Card } from './Card';
import { Flame, Trophy, Check, Copy, Info } from 'lucide-react';
import { getXPProgress, getRankDetails } from '../utils/leveling';
import { RankInfoModal } from './RankInfoModal';
interface UserIdCardProps {
    profile: UserProfile;
    onAddTestXp?: () => void;
    onMinusTestXp?: () => void;
    onCopyCode?: () => void;
    isCopied?: boolean;
    onOpenRankSystem?: () => void;
}

export const UserIdCard: React.FC<UserIdCardProps> = ({ profile, onAddTestXp, onMinusTestXp, onCopyCode, isCopied, onOpenRankSystem }) => {
    const [isRankInfoOpen, setIsRankInfoOpen] = useState(false);
    const xp = profile.xp || 0;
    const level = profile.level || 1;
    const { progressPercent, nextLevelXp } = getXPProgress(xp);
    const details = getRankDetails(level);

    return (
        <Card className="relative overflow-hidden group bg-[#111111] dark:bg-[#111111] border border-white/5 transition-all duration-300">
            {/* Ambient Background Glow behind the card text */}
            <div className="absolute inset-0 bg-gradient-to-br from-theme-accent/5 to-transparent pointer-events-none" />

            <div className="p-4 sm:p-5">
                {/* Top Section: Avatar, Name/Rank, Streak Grid, Dev Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                    {/* Far Left: Avatar */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-theme-accent rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                        <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random`} alt="Avatar" className="w-14 h-14 rounded-full border border-theme-border relative z-10 object-cover" />
                    </div>

                    {/* Middle Left: Name and Rank Tier */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-white truncate pr-2 tracking-wide">
                                {profile.studyBuddyUsername || profile.displayName}
                            </h3>
                            {(onAddTestXp || onMinusTestXp) && (
                                <div className="flex gap-1.5 shrink-0 opacity-10 hover:opacity-100 transition-opacity">
                                    {onMinusTestXp && (
                                        <button onClick={onMinusTestXp} className="px-1.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded text-[9px] font-bold tracking-widest uppercase" title="Minus 500 XP (Dev)">
                                            - XP
                                        </button>
                                    )}
                                    {onAddTestXp && (
                                        <button onClick={onAddTestXp} className="px-1.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded text-[9px] font-bold tracking-widest uppercase" title="Add 500 XP (Dev)">
                                            + XP
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className={`text-xs font-black uppercase tracking-widest ${details.color} mt-0.5`}>{details.tier} {details.subTier}</p>
                    </div>

                    {/* Far Right: Streak Stats */}
                    <div className="w-full sm:w-auto grid grid-cols-2 gap-2 shrink-0">
                        <div className="flex flex-col bg-black/40 p-2.5 rounded-lg border border-white/5 min-w-[100px]">
                            <span className="text-[9px] uppercase font-bold text-theme-text-secondary flex items-center gap-1.5 mb-0.5"><Flame size={10} className="text-orange-500" /> Current Streak</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{profile.currentStreak || 0} Days</span>
                                {(profile.currentStreak || 0) > 1 && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                        {Math.min(3.0, 1.0 + (((profile.currentStreak || 0) - 1) * 0.5)).toFixed(1)}x XP
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col bg-black/40 p-2.5 rounded-lg border border-white/5 min-w-[100px]">
                            <span className="text-[9px] uppercase font-bold text-theme-text-secondary flex items-center gap-1.5 mb-0.5"><Trophy size={10} className="text-yellow-500" /> Max Streak</span>
                            <span className="font-bold text-white text-sm">{profile.maxStreak || 0} Days</span>
                        </div>
                    </div>
                </div>

                {/* Level & XP Progress Bar */}
                <div className="mt-5">
                    <div className="flex justify-between items-end mb-3">
                        <div className="flex items-center gap-2.5 bg-black/40 pr-4 pl-1.5 py-1.5 rounded-full border border-white/5 shadow-sm">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-black/50 border ${details.border} relative`}>
                                <div className={`absolute inset-0 rounded-full ${details.bg} opacity-20 blur-sm`} />
                                <span className={`relative z-10 text-xs font-black ${details.color}`}>{level}</span>
                            </div>
                            <div className="flex flex-col justify-center pt-0.5">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white leading-tight">Weekly Rank</span>
                                    <button
                                        onClick={() => setIsRankInfoOpen(true)}
                                        className="text-white/40 hover:text-white transition-colors flex items-center justify-center rounded-full"
                                        title="View Rank Tiers"
                                    >
                                        <Info size={10} />
                                    </button>
                                    {onOpenRankSystem && (
                                        <button
                                            onClick={onOpenRankSystem}
                                            className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center justify-center rounded-full ml-1"
                                            title="What is the Ranked System?"
                                        >
                                            <Info size={12} />
                                        </button>
                                    )}
                                </div>
                                <span className="text-[8px] text-theme-text-secondary opacity-60 font-medium leading-tight">Resets Sunday Night</span>
                            </div>
                        </div>
                        <div className="text-right flex items-baseline gap-1">
                            <span className="text-sm font-mono font-bold text-white tracking-tight">{xp} XP</span>
                            <span className="text-[10px] font-mono text-theme-text-secondary font-medium"> / {nextLevelXp} XP</span>
                        </div>
                    </div>

                    <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-theme-accent to-indigo-400 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-right text-theme-text-secondary mt-1.5 font-bold uppercase tracking-widest opacity-60">{(nextLevelXp - xp)} XP to level up</p>
                </div>
            </div>

            {/* Friend Code Section - Attached neatly to bottom */}
            {profile.friendCode && onCopyCode && (
                <div className="w-full bg-black/40 border-t border-white/5 p-3 px-5 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5">Your Friend Code</p>
                        <p className="font-mono font-bold text-white text-sm tracking-wide">{profile.friendCode}</p>
                    </div>
                    <button
                        onClick={onCopyCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent/20 hover:bg-theme-accent text-theme-accent hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? 'Copied' : 'Copy Code'}
                    </button>
                </div>
            )}

            <RankInfoModal
                isOpen={isRankInfoOpen}
                onClose={() => setIsRankInfoOpen(false)}
            />
        </Card>
    );
};
