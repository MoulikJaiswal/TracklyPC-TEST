import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Trophy, Sparkles, X, ChevronRight, Target, Clock, ArrowRight } from 'lucide-react';

interface RankedSystemIntroModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RankedSystemIntroModal: React.FC<RankedSystemIntroModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    if (!isOpen) return null;

    const nextStep = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-[#0a0e17] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">

                {/* Header Graphic Area */}
                <div className="w-full h-32 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-fuchsia-500/20" />
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/30 rounded-full blur-[60px]" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[60px]" />

                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
                        {step === 1 && <Trophy size={32} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />}
                        {step === 2 && <Flame size={32} className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
                        {step === 3 && <Sparkles size={32} className="text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]" />}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8">
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Welcome to the Ranked System</h2>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                Your focus time is now tied directly to a competitive leveling system. Every minute you spend studying earns you XP to climb the ranks.
                            </p>

                            <div className="space-y-4 mb-2">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                        <Clock size={20} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">Time = XP</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            You earn a base rate of <strong className="text-white">5 XP per minute</strong> of active focus time. If you pause or break, you stop earning instantly.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 flex items-center justify-center shrink-0">
                                        <Target size={20} className="text-fuchsia-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">50 Levels of Progression</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Climb through Bronze, Silver, Gold, Platinum, and Diamond tiers. Each tier has 5 sub-divisions to conquer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">The Streak Multiplier</h2>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                Consistency is heavily rewarded. Show up every day and hit your daily focus goal to multiply your XP gains.
                            </p>

                            <div className="relative p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5 overflow-hidden mb-2">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />

                                <h4 className="text-sm font-bold text-orange-400 mb-4 flex items-center gap-2">
                                    <Flame size={16} /> Multiplier Scaling
                                </h4>

                                <div className="space-y-3 relative z-10">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">Day 1</span>
                                        <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">1.0x</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">Day 2</span>
                                        <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">1.5x</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">Day 3</span>
                                        <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">2.0x</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">Day 4</span>
                                        <span className="font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">2.5x</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-orange-500/20">
                                        <span className="text-orange-400 font-black">Day 5+</span>
                                        <span className="font-mono text-orange-400 font-black bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.3)]">3.0x MAX</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Become a Legend</h2>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                The ultimate goal for the elite. Surpass Level 50 to unlock the highly coveted "Legend" rank.
                            </p>

                            <div className="p-6 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 via-purple-500/10 to-indigo-500/20 border border-fuchsia-500/30 text-center mb-6 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                                <Sparkles size={48} className="text-fuchsia-400 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]" />
                                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-indigo-300 mb-2">
                                    Legend Tier
                                </h3>
                                <p className="text-xs text-fuchsia-200/70 leading-relaxed font-medium">
                                    Requires exactly 54,083 XP.<br />
                                    That's roughly 60 hours of intense focused study in a single week with a maxed-out 3x streak multiplier. Are you capable?
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Clock size={14} className="text-indigo-400" />
                                </div>
                                <p className="text-[11px] text-indigo-200 leading-tight">
                                    <strong className="block text-indigo-400">Weekly Reset</strong>
                                    All XP and Levels reset to zero at Midnight on Sunday. The grind starts over every Monday.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Footer Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 === step ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextStep}
                            className="px-6 py-2.5 bg-white text-black hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            {step === totalSteps ? 'Start Grinding' : 'Next'}
                            {step !== totalSteps && <ChevronRight size={16} strokeWidth={3} />}
                        </button>
                    </div>
                </div>

                {/* Close Button top right */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                >
                    <X size={20} />
                </button>
            </div>
        </div>,
        document.body
    );
};
