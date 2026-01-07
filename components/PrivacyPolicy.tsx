
import React from 'react';
import { ArrowLeft, Shield, Lock, Globe, Cookie } from 'lucide-react';
import { Card } from './Card';

export const PrivacyPolicy = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
                <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="text-emerald-500" size={24} /> Privacy Policy
            </h2>
        </div>

        <Card className="p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10">
            <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl mb-6">
                    <p className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">Transparency First</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        We value your trust. This policy outlines how we handle your data and the third-party services we use to keep this app free.
                    </p>
                </div>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                        <Lock size={18} className="text-slate-400" /> 1. Data Collection & Storage
                    </h3>
                    <p>
                        Trackly primarily stores your study data (sessions, test scores, tasks) locally on your device using <code>localStorage</code>. 
                        If you choose to sign in with Google, your data is securely synced to our cloud database (Firebase) to allow access across multiple devices.
                    </p>
                    <p className="mt-2">
                        We do <strong>not</strong> sell, trade, or rent your personal identification information to others.
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                        <Globe size={18} className="text-slate-400" /> 2. Advertising
                    </h3>
                    <p>
                        To support the development and maintenance of Trackly, we use third-party advertising companies to serve ads when you visit our application.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>
                            <strong>Google AdSense:</strong> We use Google AdSense to display ads. Google uses cookies to serve ads based on your prior visits to our website or other websites.
                        </li>
                        <li>
                            <strong>Advertising Cookies:</strong> Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our sites and/or other sites on the Internet.
                        </li>
                        <li>
                            <strong>Opt-Out:</strong> You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="text-indigo-500 underline hover:text-indigo-400">Google Ad Settings</a>. Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="http://www.aboutads.info/choices/" target="_blank" rel="noreferrer" className="text-indigo-500 underline hover:text-indigo-400">www.aboutads.info</a>.
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                        <Cookie size={18} className="text-slate-400" /> 3. Cookies
                    </h3>
                    <p>
                        We use cookies to maintain your session (if logged in) and to remember your preferences (like theme and settings). 
                        Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website.
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                        4. Your Consent
                    </h3>
                    <p>
                        By using our application, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.
                    </p>
                </section>

                <div className="pt-6 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                    <p>Last Updated: {new Date().toLocaleDateString()}</p>
                    <p className="mt-1">Contact: support@trackly.app</p>
                </div>
            </div>
        </Card>
    </div>
  );
};
