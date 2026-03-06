
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Friend, FriendRequest, PresenceState, Session } from '../types';
import { db, rtdb } from '../firebase';
import { collection, getDoc, doc, onSnapshot, setDoc, writeBatch, runTransaction, query, orderBy, limit } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { ArrowRight, Loader2, Search, Users, Check, X, Mail, UserPlus, Clock, CalendarDays, Flame, BookOpen, Brain, Coffee, Sparkles, Trophy, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { AnimatePresence, motion } from 'framer-motion';

import { UserIdCard } from './UserIdCard';
import { RankBadge } from './RankBadge';
import { getRankDetails, getCurrentISOWeek, getXPProgress, getLevelFromXP } from '../utils/leveling';

interface StudyBuddyProps {
  user: User | null;
  userProfile: UserProfile | null;
  onAddTestXp?: () => void;
  onMinusTestXp?: () => void;
  onOpenRankSystem?: () => void;
}

const StudyBuddySetup = ({ user, userProfile }: { user: User, userProfile: UserProfile | null }) => {
  const [username, setUsername] = useState(userProfile?.displayName?.split(' ')[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 15) {
      setError('Username must be 3-15 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Use only letters, numbers, and underscores.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const usernameLower = trimmedUsername.toLowerCase();
      const usernameRef = doc(db, 'studyBuddyUsernames', usernameLower);
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const usernameDoc = await transaction.get(usernameRef);
        if (usernameDoc.exists()) {
          throw new Error('Username is already taken.');
        }

        let friendCode = '';
        let isUnique = false;
        for (let i = 0; i < 10; i++) { // Try 10 times to find a unique code
          const discriminator = Math.floor(1000 + Math.random() * 9000);
          const potentialCode = `${trimmedUsername}#${discriminator}`;
          const friendCodeRef = doc(db, 'friendCodes', potentialCode);
          const friendCodeDoc = await transaction.get(friendCodeRef);
          if (!friendCodeDoc.exists()) {
            friendCode = potentialCode;
            isUnique = true;
            transaction.set(friendCodeRef, {
              uid: user.uid,
              displayName: trimmedUsername,
              photoURL: userProfile?.photoURL || null
            });
            break;
          }
        }

        if (!isUnique) {
          throw new Error('Could not generate a unique friend code. Please try a different username.');
        }

        transaction.set(usernameRef, { uid: user.uid });
        transaction.update(userRef, {
          studyBuddyUsername: trimmedUsername,
          friendCode: friendCode
        });
      });

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20 inline-block">
          <Sparkles size={40} className="text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-theme-text mb-2">Create Your Profile</h2>
        <p className="text-theme-text-secondary mb-8 max-w-sm mx-auto text-sm">
          Choose a unique username to generate your friend code and start connecting with others.
        </p>
        <form onSubmit={handleCreateProfile} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl text-center font-bold text-lg text-theme-text"
          />
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-theme-accent text-theme-text-on-accent rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50">
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Create Profile & Get Code <ArrowRight size={16} /></>}
          </button>
        </form>
      </Card>
    </div>
  );
};

interface FriendCardProps {
  friend: Friend;
  presence: PresenceState | null;
  fetchedXp?: number;
  onClick: (friend: Friend, liveProfile: UserProfile | null) => void;
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, presence, fetchedXp, onClick }) => {
  const displayName = friend.displayName;
  const photoURL = friend.photoURL;

  const getStatus = () => {
    if (!presence || !presence.isOnline) {
      return { text: 'Offline', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: <div className="w-2 h-2 rounded-full bg-slate-500" /> };
    }
    switch (presence.state) {
      case 'focus':
        return { text: `Focus: ${presence.subject || '...'}`, color: 'text-indigo-500 bg-indigo-500/10', icon: <Brain size={12} className="animate-pulse" /> };
      case 'break':
        return { text: 'On Break', color: 'text-emerald-500 bg-emerald-500/10', icon: <Coffee size={12} /> };
      default:
        return { text: 'Online', color: 'text-blue-500 bg-blue-500/10', icon: <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> };
    }
  };

  const status = getStatus();
  // Read level entirely from RTDB presence
  const activeXp = fetchedXp !== undefined ? fetchedXp : presence?.xp;
  const level = activeXp != null
    ? getLevelFromXP(activeXp)
    : (presence?.level || 1);
  const details = getRankDetails(level);

  // Determine tier index for premium styling
  const tierIndex = level > 50 ? 5 : Math.floor((level - 1) / 10); // 0=Bronze,1=Silver,2=Gold,3=Platinum,4=Diamond,5=Legend
  const isPlatinum = tierIndex === 3;
  const isDiamond = tierIndex === 4;
  const isLegend = tierIndex >= 5;
  const isPremium = isPlatinum || isDiamond || isLegend;

  // Tier-specific card styles
  const cardStyle = isLegend
    ? 'border-fuchsia-500/60 shadow-[0_0_20px_rgba(217,70,239,0.35)] bg-gradient-to-br from-fuchsia-950/60 via-purple-950/40 to-indigo-950/40 hover:shadow-[0_0_35px_rgba(217,70,239,0.6)] hover:border-fuchsia-400'
    : isDiamond
      ? 'border-cyan-500/50 shadow-[0_0_16px_rgba(34,211,238,0.25)] bg-gradient-to-br from-cyan-950/50 via-blue-950/40 to-slate-950/40 hover:shadow-[0_0_28px_rgba(34,211,238,0.5)] hover:border-cyan-400'
      : isPlatinum
        ? 'border-emerald-500/45 shadow-[0_0_14px_rgba(52,211,153,0.2)] bg-gradient-to-br from-emerald-950/50 via-teal-950/40 to-slate-950/40 hover:shadow-[0_0_24px_rgba(52,211,153,0.45)] hover:border-emerald-400'
        : 'border-theme-border/50 hover:border-theme-accent hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(var(--theme-accent-rgb),0.15)]';

  return (
    <Card
      className={`p-3 sm:p-4 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] group relative overflow-hidden cursor-pointer border ${cardStyle}`}
      onClick={() => onClick(friend, null)}
    >
      {/* Animated effects for premium tiers — always visible */}
      {isPremium && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">

          {/* Shared: soft ambient corner glow */}
          <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[60px] opacity-15
            ${isLegend ? 'bg-fuchsia-500' : isDiamond ? 'bg-cyan-400' : 'bg-emerald-400'}`}
          />

          {/* ===== PLATINUM: Nature's Veins ===== */}
          {isPlatinum && (
            <>
              <style>{`
                @keyframes vine-main {
                  0%        { stroke-dashoffset: 300; opacity: 0; }
                  8%        { opacity: 0.9; }
                  42%       { stroke-dashoffset: 0; opacity: 0.85; }
                  62%       { stroke-dashoffset: 0; opacity: 0.65; }
                  93%       { opacity: 0; }
                  100%      { stroke-dashoffset: 300; opacity: 0; }
                }
                @keyframes vine-branch {
                  0%        { stroke-dashoffset: 150; opacity: 0; }
                  10%       { opacity: 0.7; }
                  45%       { stroke-dashoffset: 0; opacity: 0.65; }
                  65%       { stroke-dashoffset: 0; opacity: 0.45; }
                  93%       { opacity: 0; }
                  100%      { stroke-dashoffset: 150; opacity: 0; }
                }
                @keyframes plat-orb-pulse {
                  0%,100% { opacity: 0.14; }
                  50%     { opacity: 0.26; }
                }
                .vtl-m  { animation: vine-main   7s ease-in-out infinite 0s; }
                .vtl-b1 { animation: vine-branch 7s ease-in-out infinite 0.35s; }
                .vtl-b2 { animation: vine-branch 7s ease-in-out infinite 0.65s; }
                .vtr-m  { animation: vine-main   7s ease-in-out infinite 2.3s; }
                .vtr-b1 { animation: vine-branch 7s ease-in-out infinite 2.65s; }
                .vtr-b2 { animation: vine-branch 7s ease-in-out infinite 2.95s; }
                .vbl-m  { animation: vine-main   8s ease-in-out infinite 4s; }
                .vbl-b1 { animation: vine-branch 8s ease-in-out infinite 4.4s; }
                .vbr-m  { animation: vine-main   8s ease-in-out infinite 1.2s; }
                .vbr-b1 { animation: vine-branch 8s ease-in-out infinite 1.6s; }
                .vc-m   { animation: vine-main   10s ease-in-out infinite 3.5s; }
                .plat-orb { animation: plat-orb-pulse 6s ease-in-out infinite; }
              `}</style>

              {/* Single SVG covering the entire card — no wrapper div = no box boundary */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
                viewBox="0 0 300 60"
                preserveAspectRatio="none"
                overflow="visible"
              >
                <defs>
                  <filter id="vine-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="vine-glow-strong" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="vine-orb-blur" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="18" />
                  </filter>
                </defs>

                {/* Ambient emerald glow orb — baked into SVG, no extra div */}
                <ellipse cx="30" cy="15" rx="80" ry="30"
                  fill="#34d399" filter="url(#vine-orb-blur)"
                  className="plat-orb" />

                {/* ── TOP-LEFT CLUSTER ── */}
                <path d="M 0,0 C 18,8 32,18 52,27"
                  fill="none" stroke="#34d399" strokeWidth="0.9"
                  strokeDasharray="300" filter="url(#vine-glow-strong)" className="vtl-m" />
                <path d="M 24,13 C 34,7 48,9 62,5"
                  fill="none" stroke="#6ee7b7" strokeWidth="0.6"
                  strokeDasharray="150" filter="url(#vine-glow)" className="vtl-b1" />
                <path d="M 38,22 C 35,34 24,44 20,58"
                  fill="none" stroke="#2dd4bf" strokeWidth="0.55"
                  strokeDasharray="150" filter="url(#vine-glow)" className="vtl-b2" />

                {/* ── TOP-RIGHT CLUSTER ── */}
                <path d="M 300,0 C 282,8 268,18 248,27"
                  fill="none" stroke="#34d399" strokeWidth="0.9"
                  strokeDasharray="300" filter="url(#vine-glow-strong)" className="vtr-m" />
                <path d="M 276,13 C 266,7 252,9 238,5"
                  fill="none" stroke="#6ee7b7" strokeWidth="0.6"
                  strokeDasharray="150" filter="url(#vine-glow)" className="vtr-b1" />
                <path d="M 262,22 C 265,34 276,44 280,58"
                  fill="none" stroke="#a7f3d0" strokeWidth="0.55"
                  strokeDasharray="150" filter="url(#vine-glow)" className="vtr-b2" />

                {/* ── BOTTOM-LEFT CLUSTER ── */}
                <path d="M 0,60 C 18,52 32,42 52,33"
                  fill="none" stroke="#2dd4bf" strokeWidth="0.85"
                  strokeDasharray="300" filter="url(#vine-glow-strong)" className="vbl-m" />
                <path d="M 26,47 C 36,53 50,51 62,58"
                  fill="none" stroke="#6ee7b7" strokeWidth="0.55"
                  strokeDasharray="150" filter="url(#vine-glow)" className="vbl-b1" />

                {/* ── BOTTOM-RIGHT CLUSTER ── */}
                <path d="M 300,60 C 282,52 268,42 248,33"
                  fill="none" stroke="#2dd4bf" strokeWidth="0.85"
                  strokeDasharray="300" filter="url(#vine-glow-strong)" className="vbr-m" />
                <path d="M 274,47 C 264,53 250,51 238,58"
                  fill="none" stroke="#a7f3d0" strokeWidth="0.55"
                  strokeDasharray="150" filter="url(#vine-glow)" className="vbr-b1" />

                {/* ── CENTRE TENDRIL ── */}
                <path d="M 150,0 C 148,12 155,24 150,36"
                  fill="none" stroke="#34d399" strokeWidth="0.45"
                  strokeDasharray="300" filter="url(#vine-glow)" className="vc-m" />
              </svg>
            </>
          )}

          {/* ===== DIAMOND: Deep Space / Stardust ===== */}
          {isDiamond && (
            <>
              <style>{`
                /* Horizontal drift for star layers */
                @keyframes stardust-drift-fast {
                  0%   { transform: translateX(110%); }
                  100% { transform: translateX(-110%); }
                }
                @keyframes stardust-drift-med {
                  0%   { transform: translateX(110%); }
                  100% { transform: translateX(-110%); }
                }
                @keyframes stardust-drift-slow {
                  0%   { transform: translateX(100%); }
                  100% { transform: translateX(-100%); }
                }
                /* Twinkle effect */
                @keyframes star-twinkle {
                  0%, 100% { opacity: 0.3; transform: scale(0.8); }
                  50%      { opacity: 1; transform: scale(1.2); }
                }
                /* CSS Gradient Aurora Breath */
                @keyframes dia-aurora-breath-css {
                  0%, 100% { opacity: 0.15; transform: scale(1); }
                  50%      { opacity: 0.25; transform: scale(1.15); }
                }
                
                .drift-fast { animation: stardust-drift-fast 15s linear infinite; }
                .drift-med  { animation: stardust-drift-med 25s linear infinite; }
                .drift-slow { animation: stardust-drift-slow 40s linear infinite; }
                
                .twinkle-1 { animation: star-twinkle 3s ease-in-out infinite; }
                .twinkle-2 { animation: star-twinkle 4s ease-in-out infinite 1.5s; }
                .twinkle-3 { animation: star-twinkle 5s ease-in-out infinite 0.8s; }
                
                .dia-aurora-css { animation: dia-aurora-breath-css 8s ease-in-out infinite; pointer-events: none; }
              `}</style>

              {/* Soft ambient nebulas — pure CSS gradients to avoid SVG compositing bugs and harsh lines */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] mix-blend-screen">
                <div className="dia-aurora-css absolute -top-10 -left-10 w-64 h-32 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-400 via-cyan-500/10 to-transparent blur-xl" />
                <div className="dia-aurora-css absolute top-0 right-0 w-64 h-32 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500 via-blue-600/10 to-transparent blur-xl" style={{ animationDelay: '4s' }} />
              </div>

              {/* Stardust SVG */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
                viewBox="0 0 300 60"
                preserveAspectRatio="none"
                overflow="visible"
              >
                <defs>
                  <filter id="dia-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* SLOW LAYER (Background, tiny stars) */}
                <g className="drift-slow">
                  <circle cx="20" cy="15" r="0.4" fill="#67e8f9" className="twinkle-1" style={{ transformOrigin: '20px 15px' }} />
                  <circle cx="80" cy="45" r="0.5" fill="#93c5fd" className="twinkle-2" style={{ transformOrigin: '80px 45px' }} />
                  <circle cx="150" cy="10" r="0.4" fill="#a5f3fc" className="twinkle-3" style={{ transformOrigin: '150px 10px' }} />
                  <circle cx="210" cy="50" r="0.6" fill="#60a5fa" className="twinkle-1" style={{ transformOrigin: '210px 50px' }} />
                  <circle cx="280" cy="25" r="0.4" fill="#bae6fd" className="twinkle-2" style={{ transformOrigin: '280px 25px' }} />
                </g>

                {/* MEDIUM LAYER (Midground, slightly larger stars) */}
                <g className="drift-med">
                  <circle cx="40" cy="35" r="0.8" fill="#22d3ee" className="twinkle-3" filter="url(#dia-glow)" style={{ transformOrigin: '40px 35px' }} />
                  <circle cx="120" cy="15" r="0.7" fill="#38bdf8" className="twinkle-1" filter="url(#dia-glow)" style={{ transformOrigin: '120px 15px' }} />
                  <circle cx="190" cy="40" r="0.8" fill="#7dd3fc" className="twinkle-2" filter="url(#dia-glow)" style={{ transformOrigin: '190px 40px' }} />
                  <circle cx="260" cy="12" r="0.6" fill="#2dd4bf" className="twinkle-3" filter="url(#dia-glow)" style={{ transformOrigin: '260px 12px' }} />
                </g>

                {/* FAST LAYER (Foreground, distinct bright stars + light sparks) */}
                <g className="drift-fast">
                  <path d="M 50,20 L 51,18 L 52,20 L 51,22 Z" fill="#cffafe" className="twinkle-1" filter="url(#dia-glow)" style={{ transformOrigin: '51px 20px' }} />
                  <path d="M 160,35 L 161.5,32 L 163,35 L 161.5,38 Z" fill="#e0f2fe" className="twinkle-2" filter="url(#dia-glow)" style={{ transformOrigin: '161.5px 35px' }} />
                  <path d="M 230,25 L 231,23 L 232,25 L 231,27 Z" fill="#99f6e4" className="twinkle-3" filter="url(#dia-glow)" style={{ transformOrigin: '231px 25px' }} />
                  <circle cx="90" cy="10" r="1.2" fill="#22d3ee" className="twinkle-2" filter="url(#dia-glow)" style={{ transformOrigin: '90px 10px' }} />
                  <circle cx="280" cy="45" r="1.1" fill="#38bdf8" className="twinkle-1" filter="url(#dia-glow)" style={{ transformOrigin: '280px 45px' }} />
                </g>
              </svg>
            </>
          )}

          {/* ===== LEGEND: Lightning Strikes — Always On ===== */}
          {isLegend && (
            <svg className="absolute inset-0 w-full h-full mix-blend-screen" viewBox="0 0 100 100" preserveAspectRatio="none">
              <style>
                {`
                  @keyframes lightning-flicker {
                    0%, 86%, 100% { opacity: 0; }
                    2%  { opacity: 0.9; stroke-width: 1; filter: drop-shadow(0 0 6px currentColor); }
                    4%  { opacity: 0.15; }
                    6%  { opacity: 0.85; stroke-width: 1.1; }
                    8%  { opacity: 0.1; }
                    10% { opacity: 1;   stroke-width: 1.3; filter: drop-shadow(0 0 10px currentColor); }
                    14% { opacity: 0; }
                  }
                  .lightning-1 { animation: lightning-flicker 3.5s infinite; }
                  .lightning-2 { animation: lightning-flicker 4.5s infinite 1s; }
                  .lightning-3 { animation: lightning-flicker 5s   infinite 2.8s; }
                `}
              </style>
              <path d="M15,0 L5,35 L12,42 L0,100" fill="none" stroke="#d946ef" strokeWidth="0.6" filter="drop-shadow(0 0 5px #d946ef)" className="lightning-1" />
              <path d="M85,0 L95,30 L88,38 L100,100" fill="none" stroke="#c084fc" strokeWidth="0.7" filter="drop-shadow(0 0 6px #c084fc)" className="lightning-2" />
              <path d="M45,-5 L35,50 L42,55 L25,110" fill="none" stroke="#e879f9" strokeWidth="0.5" filter="drop-shadow(0 0 4px #e879f9)" className="lightning-3" />
            </svg>
          )}
        </div>
      )}

      {/* Default hover overlay for non-premium */}
      {!isPremium && (
        <div className="absolute inset-0 bg-gradient-to-br from-theme-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}

      {/* Inner Container */}
      <div className="flex flex-row items-center justify-between gap-4 w-full relative z-10 flex-nowrap">

        {/* Left side: Avatar, Status */}
        <div className="flex flex-row items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="relative shrink-0">
            <img src={photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`} alt={displayName}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm
                ${isLegend ? 'border-2 border-fuchsia-400/70 shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                  : isDiamond ? 'border-2 border-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.35)]'
                    : isPlatinum ? 'border-2 border-emerald-400/60 shadow-[0_0_7px_rgba(52,211,153,0.3)]'
                      : 'border border-theme-border'}`}
            />
            {/* Online pulse ring for premium tiers */}
            {isPremium && presence?.isOnline && (
              <div className={`absolute inset-0 rounded-full animate-ping opacity-20
                ${isLegend ? 'border-2 border-fuchsia-400' : isDiamond ? 'border-2 border-cyan-400' : 'border-2 border-emerald-400'}`}
              />
            )}
          </div>

          <div className="min-w-0 flex flex-col gap-0.5 sm:gap-1 text-left">
            <p className={`font-black truncate text-sm sm:text-base
              ${isLegend ? 'text-fuchsia-100' : isDiamond ? 'text-cyan-100' : isPlatinum ? 'text-emerald-100' : 'text-theme-text'}`}>
              {displayName}
            </p>
            <div className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md w-fit ${status.color}`}>
              {status.icon}
              <span className="truncate uppercase tracking-wider">{status.text}</span>
            </div>
          </div>
        </div>

        {/* Right side: Rank Text and Badge */}
        <div className="shrink-0 flex items-center justify-end gap-3 sm:gap-4 pl-2">
          <div className="flex flex-col text-right opacity-90 truncate items-end">
            <span className={`text-[11px] sm:text-[13px] font-black uppercase tracking-widest leading-none ${details.color} drop-shadow-sm truncate`}>{details.tier}</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest mt-1 truncate">
              {details.subTier ? `Tier ${details.subTier}` : `Level ${level}`}
            </span>
          </div>
          <RankBadge level={level} size="md" showLevelNumber={false}
            className={`scale-75 sm:scale-100 drop-shadow-sm transition-all
              ${isPremium ? 'opacity-100 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_currentColor]' : 'opacity-90 group-hover:opacity-100 group-hover:scale-110'}`}
          />
        </div>

      </div>
    </Card>
  );
};




const StudyBuddy: React.FC<StudyBuddyProps> = ({ user, userProfile, onAddTestXp, onMinusTestXp, onOpenRankSystem }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'leaderboard' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [presences, setPresences] = useState<Record<string, PresenceState>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Add Friend State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<UserProfile | null | 'loading' | 'not_found' | 'self' | 'already_friend' | 'request_sent'>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const [isCopied, setIsCopied] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{ friend: Friend, profile: UserProfile | null } | null>(null);

  const [fetchedRanks, setFetchedRanks] = useState<Record<string, number>>({});
  const [isRefreshingRanks, setIsRefreshingRanks] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const handleRefreshRanks = async () => {
    if (cooldownRemaining > 0) return;

    setIsRefreshingRanks(true);
    try {
      const fetches = friends.map(async (friend) => {
        const docRef = doc(db, 'users', friend.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          return { uid: friend.uid, xp: data.xp || 0 };
        }
        return { uid: friend.uid, xp: 0 };
      });

      const results = await Promise.all(fetches);
      const newRanks: Record<string, number> = {};
      results.forEach(r => {
        newRanks[r.uid] = r.xp;
      });
      setFetchedRanks(prev => ({ ...prev, ...newRanks }));
      setCooldownRemaining(120); // 2 minutes
    } catch (error) {
      console.error("Failed to refresh ranks:", error);
    } finally {
      setIsRefreshingRanks(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const friendsUnsub = onSnapshot(collection(db, `users/${user.uid}/friends`),
      (snapshot) => {
        const friendList = snapshot.docs.map(doc => doc.data() as Friend);
        setFriends(friendList);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching friends:", error);
        setIsLoading(false);
      }
    );

    const requestsUnsub = onSnapshot(collection(db, `users/${user.uid}/friendRequests`), (snapshot) => {
      const requestList = snapshot.docs.map(doc => doc.data() as FriendRequest);
      setRequests(requestList);
    });

    return () => {
      friendsUnsub();
      requestsUnsub();
    };
  }, [user]);

  // Sync profile to friendCode for searchability (Self-healing)
  useEffect(() => {
    if (user && userProfile?.friendCode) {
      const syncProfile = async () => {
        try {
          const codeRef = doc(db, 'friendCodes', userProfile.friendCode!);
          await setDoc(codeRef, {
            uid: user.uid,
            displayName: userProfile.studyBuddyUsername || userProfile.displayName || 'Anonymous',
            photoURL: userProfile.photoURL || null
          }, { merge: true });
        } catch (e) {
          console.error("Error syncing profile to friend code:", e);
        }
      };
      syncProfile();
    }
  }, [user, userProfile]);

  // Subscribe to friend presences
  useEffect(() => {
    if (friends.length === 0) {
      setPresences({});
      return;
    }

    const unsubscribers = friends.map(friend => {
      const presenceRef = ref(rtdb, `status/${friend.uid}`);
      return onValue(presenceRef, (snapshot) => {
        if (snapshot.exists()) {
          setPresences(prev => ({ ...prev, [friend.uid]: snapshot.val() as PresenceState }));
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [friends]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !userProfile?.friendCode) return;
    setSearchResult('loading');

    const code = searchQuery.trim();

    if (code === userProfile.friendCode) {
      setSearchResult('self');
      return;
    }

    try {
      const codeRef = doc(db, 'friendCodes', code);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setSearchResult('not_found');
        return;
      }

      const data = codeSnap.data();
      const targetUid = data.uid;

      if (friends.some(f => f.uid === targetUid)) {
        setSearchResult('already_friend');
        return;
      }
      if (sentRequests.includes(targetUid)) {
        setSearchResult('request_sent');
        return;
      }

      const resultProfile: UserProfile = {
        uid: targetUid,
        displayName: data.displayName || 'User',
        photoURL: data.photoURL || null,
        friendCode: code,
        studyBuddyUsername: data.displayName || 'User'
      };
      setSearchResult(resultProfile);

    } catch (error) {
      console.error("Search error:", error);
      setSearchResult('not_found');
    }
  };

  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!user || !userProfile?.friendCode) return;
    const requestRef = doc(db, `users/${targetUser.uid}/friendRequests`, user.uid);

    await setDoc(requestRef, {
      uid: user.uid,
      displayName: userProfile.studyBuddyUsername || userProfile.displayName,
      photoURL: userProfile.photoURL,
      friendCode: userProfile.friendCode,
      timestamp: Date.now(),
    });
    setSentRequests(prev => [...prev, targetUser.uid]);
    setSearchResult('request_sent');
  };

  const handleRequest = async (requestor: FriendRequest, action: 'accept' | 'decline') => {
    if (!user || !userProfile?.friendCode) return;

    const batch = writeBatch(db);
    const myRequestRef = doc(db, `users/${user.uid}/friendRequests`, requestor.uid);
    batch.delete(myRequestRef);

    if (action === 'accept') {
      const myFriendRef = doc(db, `users/${user.uid}/friends`, requestor.uid);
      const theirFriendRef = doc(db, `users/${requestor.uid}/friends`, user.uid);

      batch.set(myFriendRef, {
        uid: requestor.uid,
        displayName: requestor.displayName,
        photoURL: requestor.photoURL,
        friendCode: requestor.friendCode,
      });

      batch.set(theirFriendRef, {
        uid: user.uid,
        displayName: userProfile?.studyBuddyUsername || userProfile?.displayName,
        photoURL: userProfile?.photoURL,
        friendCode: userProfile?.friendCode,
      });
    }

    await batch.commit();
  };

  const handleCopyCode = () => {
    if (!userProfile?.friendCode) return;
    navigator.clipboard.writeText(userProfile.friendCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6 animate-in fade-in duration-500">
        <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20">
          <Users size={48} className="text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-theme-text mb-2">Study with Friends</h2>
        <p className="text-theme-text-secondary mb-8 max-w-sm">
          Sign in with Google to add friends, see their live study status, and stay motivated together.
        </p>
      </div>
    );
  }

  if (!userProfile?.studyBuddyUsername || !userProfile?.friendCode) {
    return <StudyBuddySetup user={user} userProfile={userProfile} />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
          <Users className="text-indigo-400" /> Study Buddy
        </h2>
        <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">
          Connect and stay motivated
        </p>
      </div>

      <UserIdCard
        profile={userProfile}
        onAddTestXp={onAddTestXp}
        onMinusTestXp={onMinusTestXp}
        onCopyCode={handleCopyCode}
        isCopied={isCopied}
        onOpenRankSystem={onOpenRankSystem}
      />

      <div className="flex bg-theme-bg-tertiary p-1 rounded-xl border border-theme-border">
        <button onClick={() => setActiveTab('friends')} className={`relative flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-text-secondary hover:text-theme-text'}`}>Friends</button>
        <button onClick={() => setActiveTab('requests')} className={`relative flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-text-secondary hover:text-theme-text'}`}>
          Requests {requests.length > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white text-[9px] sm:text-[10px] rounded-full flex items-center justify-center shadow-lg">{requests.length}</span>}
        </button>
        <button onClick={() => setActiveTab('add')} className={`relative flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'add' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-text-secondary hover:text-theme-text'}`}>Add</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {friends.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search friends by name..."
                      value={friendSearchQuery}
                      onChange={(e) => setFriendSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm focus:outline-none focus:border-theme-accent text-theme-text placeholder-theme-text-secondary"
                    />
                  </div>
                  <button
                    onClick={handleRefreshRanks}
                    disabled={isRefreshingRanks || cooldownRemaining > 0}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-theme-text-secondary hover:text-theme-text hover:border-theme-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh Ranks (2 min cooldown)"
                  >
                    <RefreshCw size={18} className={isRefreshingRanks ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline text-sm font-bold uppercase tracking-wider">
                      {isRefreshingRanks ? 'Refreshing...' : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Refresh Ranks'}
                    </span>
                  </button>
                </div>
              )}
              {isLoading ? <div className="text-center py-10"><Loader2 className="animate-spin text-theme-accent mx-auto" /></div> :
                friends.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friends.filter(f => f.displayName.toLowerCase().includes(friendSearchQuery.toLowerCase())).map(friend => (
                      <FriendCard
                        key={friend.uid}
                        friend={friend}
                        presence={presences[friend.uid] || null}
                        fetchedXp={fetchedRanks[friend.uid]}
                        onClick={(f, p) => setSelectedFriend({ friend: f, profile: p })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 opacity-50 border-2 border-dashed border-theme-border rounded-2xl">
                    <Users size={40} className="mx-auto mb-4" />
                    <p className="text-sm font-bold">Your friends list is empty.</p>
                    <p className="text-xs mt-1">Add friends to see their live study status!</p>
                  </div>
                )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.length > 0 ? (
                requests.map(req => (
                  <Card key={req.uid} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={req.photoURL || `https://ui-avatars.com/api/?name=${req.displayName}&background=random`} alt={req.displayName} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-bold text-theme-text">{req.displayName}</p>
                        <p className="text-xs font-mono text-theme-text-secondary">{req.friendCode}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req, 'accept')} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => handleRequest(req, 'decline')} className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><X size={16} /></button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-16 opacity-50 border-2 border-dashed border-theme-border rounded-2xl">
                  <Mail size={40} className="mx-auto mb-4" />
                  <p className="text-sm font-bold">No pending friend requests.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'add' && (
            <div className="space-y-4">
              <Card className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Enter Friend Code (e.g., User#1234)" className="flex-1 p-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm text-theme-text" />
                  <button type="submit" className="p-3 bg-theme-accent text-theme-text-on-accent rounded-xl"><Search size={20} /></button>
                </form>
              </Card>

              {searchResult && (
                <Card className="p-4">
                  {searchResult === 'loading' && <Loader2 className="animate-spin text-theme-accent mx-auto" />}
                  {searchResult === 'not_found' && <p className="text-center text-sm text-theme-text-secondary">User not found. Please check the code.</p>}
                  {searchResult === 'self' && <p className="text-center text-sm text-theme-text-secondary">You can't add yourself as a friend!</p>}
                  {searchResult === 'already_friend' && <p className="text-center text-sm text-theme-text-secondary">You are already friends with this user.</p>}
                  {searchResult === 'request_sent' && <p className="text-center text-sm text-emerald-500 flex items-center justify-center gap-2"><Check size={16} /> Friend request sent!</p>}

                  {typeof searchResult === 'object' && searchResult !== null && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img src={searchResult.photoURL || `https://ui-avatars.com/api/?name=${searchResult.displayName}&background=random`} alt={searchResult.displayName} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-bold text-theme-text">{searchResult.displayName}</p>
                          <p className="text-xs font-mono text-theme-text-secondary">{searchResult.friendCode}</p>
                        </div>
                      </div>
                      <button onClick={() => handleSendRequest(searchResult)} className="flex items-center gap-2 px-3 py-2 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider">
                        <UserPlus size={16} /> Add
                      </button>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedFriend && (
          <FriendStatsModal
            friend={selectedFriend.friend}
            profile={selectedFriend.profile}
            presence={presences[selectedFriend.friend.uid] || null}
            onClose={() => setSelectedFriend(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const FriendStatsModal = ({ friend, profile: initialProfile, presence, onClose }: { friend: Friend, profile: UserProfile | null, presence: PresenceState | null, onClose: () => void }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('weekly');
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [friendSessions, setFriendSessions] = useState<Session[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!initialProfile);

  // Fetch full profile if we only have the basic friend data or it's missing deep stats
  useEffect(() => {
    let unsubscribeSessions: (() => void) | null = null;

    const fetchProfileAndSessions = async () => {
      setIsLoadingProfile(true);
      try {
        if (friend.uid) {
          // Subscribe to sessions to get the true focus time and subject splits
          // We limit to the last 50 for performance to only load the recent subject breakdown.
          // Total focus times are now pulled directly from the RTDB presence to save reads!
          const sessionsQuery = query(
            collection(db, 'users', friend.uid, 'sessions'),
            orderBy('timestamp', 'desc'),
            limit(50) // <-- THE CRITICAL FIX: Limit to 50 reads
          );
          unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
            setFriendSessions(snapshot.docs.map(d => d.data() as Session));
          }
          );

          // Fetch the deep profile if missing
          if (!initialProfile || initialProfile.xp === undefined) {
            const profileRef = doc(db, 'users', friend.uid);
            const snap = await getDoc(profileRef);
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
          } else {
            setProfile(initialProfile);
          }
        }
      } catch (e) {
        console.error("Failed to fetch friend profile/sessions:", e);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileAndSessions();
    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
    }
  }, [initialProfile, friend.uid]);

  const displayName = profile?.studyBuddyUsername || friend.displayName;
  const photoURL = profile?.photoURL || friend.photoURL;

  const formatTimeFull = (seconds?: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatHoursOnly = (seconds?: number) => {
    if (!seconds) return '0 hrs';
    const h = Math.floor(seconds / 3600);
    return `${h} hrs`;
  };

  const getStatusFull = () => {
    if (!presence || !presence.isOnline) return { text: 'Currently Offline', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: <div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> };
    switch (presence.state) {
      case 'focus': return { text: `Focusing on ${presence.subject || '...'}`, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: <Brain size={16} className="animate-pulse" /> };
      case 'break': return { text: 'Taking a Break', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <Coffee size={16} /> };
      default: return { text: 'Online (Idle)', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /> };
    }
  };

  const status = getStatusFull();

  const currentWeek = getCurrentISOWeek();
  const weeklyXp = profile?.currentXpWeek === currentWeek
    ? Math.max(0, (profile?.xp || 0) - (profile?.lastWeekXp || 0))
    : (profile?.currentXpWeek ? 0 : (profile?.xp || 0)); // Fallback if they haven't logged in a while or legacy

  const { progressPercent, nextLevelXp } = getXPProgress(profile?.xp || 0);

  // Accurate Total Focus are now pulled directly from RTDB Presence! (Zero Reads)
  // We use the limited 50 session history *only* to calculate the subject split.
  const computedSplits = useMemo(() => {
    const dSplit: Record<string, number> = {};
    const wSplit: Record<string, number> = {};

    const now = new Date();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

    friendSessions.forEach(session => {
      const sub = session.subject || 'Other';
      if (sub.toLowerCase().includes('break')) return;
      if (profile?.stream && session.stream && session.stream !== profile.stream) return;

      const dur = session.duration || 0;
      const ts = session.timestamp;

      if (ts >= weekStartMs && ts < weekEndMs) wSplit[sub] = (wSplit[sub] || 0) + dur;
      if (ts >= todayStart) dSplit[sub] = (dSplit[sub] || 0) + dur;
    });

    return { dSplit, wSplit };
  }, [friendSessions, profile?.stream]);

  // Calculate active split based on selected timeframe
  const activeSplit: Record<string, number> = timeframe === 'daily' ? computedSplits.dSplit
    : computedSplits.wSplit;

  // The Top Cards will simply display the sum of whatever timeframe split is active.
  // This guarantees that the top totals perfectly match the breakdown below!
  const dSplitSum = Object.values(computedSplits.dSplit).reduce((a, b) => a + b, 0);
  const wSplitSum = Object.values(computedSplits.wSplit).reduce((a, b) => a + b, 0);

  const calculatedDailyTime = dSplitSum;
  const calculatedWeeklyTime = wSplitSum;

  const totalSubjectSeconds = Object.values(activeSplit).reduce((a: number, b: number) => a + b, 0);

  // Premium color palette for subjects
  const subjectColors = [
    'bg-indigo-500 shadow-indigo-500/50', 'bg-rose-500 shadow-rose-500/50',
    'bg-emerald-500 shadow-emerald-500/50', 'bg-amber-500 shadow-amber-500/50',
    'bg-cyan-500 shadow-cyan-500/50', 'bg-purple-500 shadow-purple-500/50'
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">

      {/* Background Glow Orb behind modal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-theme-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md overflow-hidden flex flex-col relative border border-white/10 dark:border-white/5 bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)]">

        {/* Cover Photo / Header Gradient */}
        <div className="h-36 bg-gradient-to-br from-theme-accent/30 via-theme-accent/10 to-transparent w-full absolute top-0 left-0 -z-10" />
        <div className="absolute top-0 left-0 w-full h-36 bg-white/20 dark:bg-black/20 backdrop-blur-sm -z-10" />
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent absolute top-36 left-0 -z-10" />

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors z-20"><X size={18} /></button>

        <div className="p-6 pt-12 flex flex-col items-center">
          {/* Avatar Profile Picture */}
          <div className="relative mb-3 group pt-4 w-full flex justify-center">
            <div className="absolute inset-x-0 bottom-0 top-10 bg-theme-accent/20 rounded-full blur-3xl scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

            <div className="relative">
              <img src={photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`} alt={displayName} className="w-28 h-28 rounded-full object-cover shadow-2xl border-[4px] border-white dark:border-[#1a1c23] relative z-20 transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute -bottom-4 -right-6 z-30">
                <RankBadge level={getLevelFromXP(profile?.xp || 0)} size="lg" showLevelNumber={true} />
              </div>
            </div>
          </div>

          {/* Name and ID */}
          <h3 className="text-2xl font-black text-theme-text tracking-tight mb-1 drop-shadow-sm">{displayName}</h3>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 mb-6">
            <Sparkles size={12} className="text-theme-accent/70" />
            <p className="text-[11px] font-mono font-medium text-theme-text-secondary">{friend.friendCode}</p>
          </div>

          {/* Current Status Badge */}
          <div className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border backdrop-blur-md ${status.bg} ${status.border} ${status.color} mb-8 shadow-sm`}>
            {status.icon}
            <span className="font-bold text-[13px] tracking-wide uppercase">{status.text}</span>
          </div>

          {/* Main Stats Grid - Glassmorphism floating cards */}
          <div className="w-full grid grid-cols-2 gap-3 mb-8">
            <div
              onClick={() => setTimeframe('daily')}
              className={`backdrop-blur-md p-4 rounded-3xl border flex flex-col items-center justify-center text-center group transition-all duration-300 cursor-pointer ${timeframe === 'daily' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/30'}`}>
              <Clock size={22} className={`mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-transform ${timeframe === 'daily' ? 'text-emerald-400 scale-110' : 'text-emerald-500 group-hover:scale-110'}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5 opacity-80">Today</p>
              <p className="text-lg font-black text-theme-text tracking-tight">{formatTimeFull(calculatedDailyTime)}</p>
            </div>
            <div
              onClick={() => setTimeframe('weekly')}
              className={`backdrop-blur-md p-4 rounded-3xl border flex flex-col items-center justify-center text-center group transition-all duration-300 cursor-pointer ${timeframe === 'weekly' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/30'}`}>
              <CalendarDays size={22} className={`mb-2 drop-shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-transform ${timeframe === 'weekly' ? 'text-indigo-400 scale-110' : 'text-indigo-500 group-hover:scale-110'}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5 opacity-80">This Week</p>
              <p className="text-lg font-black text-theme-text tracking-tight">{formatHoursOnly(calculatedWeeklyTime)}</p>
            </div>
          </div>

          {/* New Stats Bar: Streaks and Weekly XP */}
          <div className="w-full grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
                <Flame size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5">Current Streak</span>
                <span className="text-lg font-black text-theme-text leading-none">{profile?.currentStreak || 0}</span>
              </div>
            </div>
            <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
                <Trophy size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5">Max Streak</span>
                <span className="text-lg font-black text-theme-text leading-none">{profile?.maxStreak || 0}</span>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 mb-8">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary">Level Progress</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-theme-text">{profile?.xp || 0}</span>
                <span className="text-[10px] font-medium text-theme-text-secondary">/ {nextLevelXp} XP</span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden relative shadow-inner mb-2">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-theme-accent to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-theme-text-secondary font-medium">Gained <span className="text-theme-text font-bold text-xs">{weeklyXp} XP</span> this week</p>
              <p className="text-[10px] text-theme-text-secondary font-medium opacity-60">Resets Sunday</p>
            </div>
          </div>

          {/* Subject Split Section - Premium Look */}
          <div className="w-full space-y-4">
            <div className="flex items-center gap-2 mb-3 pl-1">
              <div className="p-1.5 bg-theme-accent/10 rounded-lg text-theme-accent">
                <BookOpen size={14} />
              </div>
              <h4 className="text-xs font-black text-theme-text uppercase tracking-widest">Subject Breakdown</h4>
            </div>

            {(isLoadingProfile) ? (
              <div className="text-center py-8 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/10 dark:border-white/10 border-dashed backdrop-blur-sm">
                <Loader2 size={24} className="animate-spin text-theme-accent mx-auto mb-2" />
                <p className="text-sm font-bold text-theme-text-secondary">Loading deep stats...</p>
              </div>
            ) : (!activeSplit || Object.keys(activeSplit).length === 0) ? (
              <div className="text-center py-8 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/10 dark:border-white/10 border-dashed backdrop-blur-sm">
                <p className="text-sm font-bold text-theme-text-secondary">No subjects tracked {timeframe === 'daily' ? 'today' : timeframe === 'weekly' ? 'this week' : 'this year'}.</p>
                <p className="text-[11px] text-theme-text-secondary/70 mt-1">Their studying stats will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4 p-5 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/10 backdrop-blur-sm shadow-inner overflow-hidden relative">
                {/* Subtle background pattern for the subject split card */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />

                {Object.entries(activeSplit)
                  .sort(([, a], [, b]) => b - a) // Sort by most time requested
                  .slice(0, 5) // Top 5 subjects
                  .map(([subject, seconds], index) => {
                    const percentage = totalSubjectSeconds > 0 ? (seconds / totalSubjectSeconds) * 100 : 0;
                    const colorClass = subjectColors[index % subjectColors.length];

                    return (
                      <div key={subject} className="relative z-10 group">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-bold text-theme-text truncate group-hover:text-theme-accent transition-colors">{subject}</span>
                          <span className="text-xs font-mono font-bold text-theme-text-secondary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">{formatTimeFull(seconds)}</span>
                        </div>
                        <div className="w-full h-3 bg-black/10 dark:bg-black/40 overflow-hidden rounded-full shadow-inner relative">
                          <div
                            className={`absolute top-0 left-0 h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      </Card>
    </div>
  );
};

export default StudyBuddy;
