import React from 'react';
import { motion } from 'framer-motion';
import { getRankDetails } from '../utils/leveling';

interface RankBadgeProps {
    level: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showLevelNumber?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ level, size = 'md', className = '', showLevelNumber = false }) => {
    const details = getRankDetails(level);
    const sizeClasses = {
        sm: 'w-8 h-8 p-1',
        md: 'w-12 h-12 p-1.5',
        lg: 'w-20 h-20 p-2',
        xl: 'w-28 h-28 p-3'
    };

    // Define specific animations based on the major tier
    let animationProps: any = {};

    // Platinum, Diamond, and Legend ALL share a base "premium levitation" effect
    // We remove the crude scaling and filters for a much cleaner, heavier feel.
    if (level > 30) {
        animationProps = {
            animate: { y: [0, level > 40 ? -4 : -2, 0] }, // Slightly higher float for Diamond+
            transition: { duration: level > 40 ? 4 : 6, repeat: Infinity, ease: "easeInOut" }
        };
    }
    // Gold and below receive no animationProps.
    // Gold and below receive no animationProps.

    // Calculate dynamic aura based on level (max capping around level 60 for visual sanity)
    const auraOpacity = Math.min(0.9, 0.4 + (level * 0.01)); // Minimum 40%, increasing with level
    const auraScale = Math.min(2.0, 1.1 + (level * 0.02)); // Minimum scale 1.1x, increasing to 2.0x

    return (
        <div className={`relative flex items-center justify-center ${className} ${sizeClasses[size]}`}>
            {/* 1. Backdrop Glow (Overall Aura) */}
            <div
                className={`absolute inset-0 rounded-full ${details.bg} blur-xl`}
                style={{ opacity: auraOpacity, transform: `scale(${auraScale})` }}
            />

            <motion.div className="relative w-full h-full flex items-center justify-center" {...animationProps}>

                {/* 2. Wings Layer (SVG behind the shield) */}
                <div className="absolute inset-[-30%] drop-shadow-md opacity-90 z-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        {/* Left Wing (3 distinct feathers) */}
                        <g className={`${details.color.split(' ')[0]} drop-shadow-sm`} fill="currentColor" fillOpacity="0.8">
                            <path d="M 45 40 Q 20 20 10 25 Q 25 45 40 50 Z" />
                            <path d="M 40 55 Q 15 35 15 45 Q 25 55 38 60 Z" />
                            <path d="M 38 68 Q 20 55 25 65 Q 30 70 42 75 Z" />
                        </g>
                        {/* Right Wing */}
                        <g className={`${details.color.split(' ')[0]} drop-shadow-sm`} transform="translate(100,0) scale(-1, 1)" fill="currentColor" fillOpacity="0.8">
                            <path d="M 45 40 Q 20 20 10 25 Q 25 45 40 50 Z" />
                            <path d="M 40 55 Q 15 35 15 45 Q 25 55 38 60 Z" />
                            <path d="M 38 68 Q 20 55 25 65 Q 30 70 42 75 Z" />
                        </g>
                    </svg>
                </div>

                {/* 3. Outer Bold Shield Border (White/Silver base) */}
                <div className={`absolute inset-[12%] rounded drop-shadow-lg z-10 bg-gradient-to-br from-white via-gray-200 to-gray-400`} style={{
                    clipPath: 'polygon(50% 0%, 100% 20%, 95% 70%, 50% 100%, 5% 70%, 0% 20%)'
                }}>
                </div>

                {/* 4. Inner Shield Background (Dark) */}
                <div className={`absolute inset-[18%] bg-gradient-to-br from-slate-900 to-black z-10`} style={{
                    clipPath: 'polygon(50% 5%, 95% 22%, 90% 70%, 50% 95%, 10% 70%, 5% 22%)'
                }}>
                </div>

                {/* 5. Clean Geometric Gemstone */}
                {/* 5. Clean Geometric Gemstone with premium inner shine */}
                <div className={`absolute inset-[24%] z-20 overflow-hidden`} style={{
                    clipPath: 'polygon(50% 10%, 95% 40%, 80% 85%, 50% 100%, 20% 85%, 5% 40%)',
                }}>
                    {/* Gem Base Color */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${details.bg.replace('from-', 'from-white/20 via-').replace('to-', 'to-black/40')} ${details.color.split(' ')[0].replace('text-', 'bg-')} opacity-80`} />

                    {/* Left Light Facet */}
                    <div className="absolute top-[10%] left-0 w-[50%] h-[90%] bg-white/30" style={{ clipPath: 'polygon(10% 33%, 100% 33%, 100% 100%, 40% 83%)' }} />

                    {/* Top Diamond Facet */}
                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[40%] h-[30%] bg-white/60" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />

                    {/* Premium Animated Shine Sweep (Diamond and Legend only) */}
                    {level > 40 && (
                        <motion.div
                            className="absolute top-0 w-[150%] h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-30deg]"
                            initial={{ left: '-150%' }}
                            animate={{ left: ['-150%', '150%'] }}
                            transition={{
                                duration: level > 50 ? 1.5 : 2,
                                repeat: Infinity,
                                ease: "linear",
                                repeatDelay: level > 50 ? 2 : 4
                            }}
                        />
                    )}
                </div>

                {/* 6. Top Center Floating Diamond Sparkle (Animated for Diamond+) */}
                <motion.div
                    className={`absolute top-[-8%] left-1/2 -translate-x-1/2 w-[15%] h-[25%] z-30 flex items-center justify-center ${details.color.split(' ')[0]}`}
                    // Diamond and Legend get a gentle independent sparkle rotation/pulse
                    animate={level > 40 ? { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] } : {}}
                    transition={level > 40 ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                >
                    <div className="absolute inset-0 bg-current rotate-45 scale-x-50 scale-y-100" />
                    <div className="absolute inset-0 bg-current rotate-45 scale-x-100 scale-y-50" />
                    <div className="absolute w-[60%] h-[60%] bg-white rotate-45 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                </motion.div>

                {/* 7. SubTier indicator (Anchored to bottom) */}
                {details.subTier && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] sm:text-xs font-black tracking-widest px-2 sm:px-3 py-0.5 rounded shadow-[0_4px_10px_rgba(0,0,0,0.8)] border border-white/30 z-40 text-white font-mono overflow-hidden group">
                        <div className={`absolute inset-0 bg-gradient-to-r ${details.bg} opacity-50`} />
                        <span className="relative z-10">{details.subTier}</span>
                    </div>
                )}

                {/* Optional Level Number Bubble */}
                {showLevelNumber && (
                    <div className="absolute -top-2 -right-2 bg-black/80 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-[0_0_10px_rgba(0,0,0,0.8)] z-40 border-2 border-white/20">
                        {level}
                    </div>
                )}
            </motion.div>
        </div>
    );
};
