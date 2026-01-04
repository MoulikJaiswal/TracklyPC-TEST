
import React, { useState } from 'react';
import { motion } from 'https://esm.sh/framer-motion@10.16.4?external=react,react-dom';
import { X, Check, Crown, TrendingUp, Grid, CreditCard, ArrowLeft, Loader2, Lock, Zap, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Card } from './Card';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
      onClose();
      setTimeout(() => {
          setStep('info');
          setCardNumber('');
          setExpiry('');
          setCvc('');
      }, 300);
  };

  const handleSimulatePayment = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      
      // Simulate network delay
      setTimeout(() => {
          setIsLoading(false);
          onUpgrade();
          setStep('success');
      }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2rem] blur-xl opacity-50" />
        
        <Card className="relative bg-slate-900 border border-amber-500/30 overflow-hidden flex flex-col items-center text-center p-8 min-h-[580px]">
            {step !== 'success' && (
                <button 
                    onClick={handleClose}
                    className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                    <X size={18} />
                </button>
            )}

            {step === 'info' && (
                <div className="w-full h-full flex flex-col items-center animate-in slide-in-from-left-8 duration-300">
                    <motion.div 
                        initial={{ scale: 0, rotate: -180, x: -50, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, x: 0, opacity: 1 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.1 
                        }}
                        className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20"
                    >
                        <Crown size={32} className="text-white" fill="currentColor" />
                    </motion.div>

                    <h2 className="text-3xl font-display font-bold text-white mb-2">Trackly Pro</h2>
                    <p className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-8">Unlock Your Potential</p>

                    <div className="text-5xl font-display font-bold text-white mb-1">
                        ₹50<span className="text-lg text-slate-400 font-sans font-medium">/mo</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-8">Cancel anytime. No hidden fees.</p>

                    <div className="w-full space-y-3 mb-8 text-left">
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <TrendingUp size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Unlimited Test Logs</p>
                                <p className="text-[10px] text-blue-200/60">Track every single mock test performance.</p>
                            </div>
                            <Check size={16} className="ml-auto text-blue-400" />
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <Grid size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Topic Heatmap</p>
                                <p className="text-[10px] text-blue-200/60">Visualise syllabus mastery with a color-coded grid.</p>
                            </div>
                            <Check size={16} className="ml-auto text-blue-400" />
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <Zap size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Unlimited +1 Logging</p>
                                <p className="text-[10px] text-blue-200/60">Log questions instantly during focus sessions.</p>
                            </div>
                            <Check size={16} className="ml-auto text-blue-400" />
                        </div>
                    </div>

                    <div className="mt-auto w-full">
                        <button 
                            onClick={() => setStep('payment')}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            Get Started Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            {step === 'payment' && (
                <div className="w-full h-full flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
                    <button 
                        onClick={() => setStep('info')}
                        className="self-start flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-6 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>

                    <form onSubmit={handleSimulatePayment} className="w-full space-y-4">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 mb-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                                <CreditCard size={100} className="text-white" />
                            </div>
                            <div className="relative z-10 text-left">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Amount</p>
                                <p className="text-3xl font-display font-bold text-white">₹50.00</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="0000 0000 0000 0000"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:border-amber-500 transition-colors font-mono"
                                    maxLength={19}
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    type="text" 
                                    placeholder="MM/YY"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 text-white placeholder:text-slate-600 outline-none focus:border-amber-500 transition-colors font-mono text-center"
                                    maxLength={5}
                                    value={expiry}
                                    onChange={(e) => setExpiry(e.target.value)}
                                    required
                                />
                                <input 
                                    type="text" 
                                    placeholder="CVC"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 text-white placeholder:text-slate-600 outline-none focus:border-amber-500 transition-colors font-mono text-center"
                                    maxLength={3}
                                    value={cvc}
                                    onChange={(e) => setCvc(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit"
                                disabled={isLoading || cardNumber.length < 16 || expiry.length < 4 || cvc.length < 3}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                                {isLoading ? 'Processing...' : 'Pay Securely'}
                            </button>
                            <p className="text-[9px] text-slate-500 mt-3 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                                <Lock size={10} /> 256-bit SSL Encrypted
                            </p>
                        </div>
                    </form>
                </div>
            )}

            {step === 'success' && (
                <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30 animate-in bounce-in duration-500">
                        <Check size={40} className="text-white" strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome to Pro!</h2>
                    <p className="text-slate-400 text-sm mb-8 max-w-xs">Your account has been successfully upgraded. Enjoy unlimited access.</p>
                    <button 
                        onClick={handleClose}
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                    >
                        Return to App
                    </button>
                </div>
            )}
        </Card>
      </div>
    </div>
  );
};
