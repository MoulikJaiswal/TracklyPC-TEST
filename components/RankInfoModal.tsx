import React from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';
import { getRankDetails } from '../utils/leveling';
import { RankBadge } from './RankBadge';

interface RankInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RANK_TIERS = [
    { level: 1, range: 'Lv 1 - 10' },
    { level: 11, range: 'Lv 11 - 20' },
    { level: 21, range: 'Lv 21 - 30' },
    { level: 31, range: 'Lv 31 - 40' },
    { level: 41, range: 'Lv 41 - 50' },
    { level: 51, range: 'Lv 51+' }
];

export const RankInfoModal: React.FC<RankInfoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center">
                <div className="relative w-full rounded-2xl overflow-hidden bg-[#111111] border border-white/10 shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-500 max-h-[85vh]">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                                <Info size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-white">Rank Tiers</h2>
                                <p className="text-xs font-bold uppercase tracking-widest text-theme-text-secondary opacity-60">Level up by earning XP</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Ranks List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {RANK_TIERS.map((tier) => {
                            const details = getRankDetails(tier.level);
                            return (
                                <div key={tier.level} className={`flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/40 hover:bg-black/60 transition-colors`}>
                                    <div className="shrink-0">
                                        <RankBadge level={tier.level} size="md" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-black tracking-wide ${details.color}`}>{details.tier}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                {tier.range}
                                            </span>
                                            {tier.level <= 50 && (
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-theme-text-secondary opacity-50">
                                                    5 Sub-tiers (I-V)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5 text-center px-4">
                        <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                            Earn XP by completing focus sessions. Maintain daily streaks to multiply your XP gains up to 3x!
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
