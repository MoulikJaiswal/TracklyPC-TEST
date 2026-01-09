
import React, { useEffect, useRef } from 'react';

// Declare adsbygoogle on window to avoid TS errors
declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdUnitProps {
    client: string; // Your Publisher ID (e.g., ca-pub-XXXXXXXXXXXXXXXX)
    slot: string;   // Your Ad Slot ID (e.g., XXXXXXXXXX)
    format?: 'auto' | 'fluid' | 'rectangle';
    responsive?: boolean;
    style?: React.CSSProperties;
    className?: string;
    label?: string; // Optional label like "Advertisement" or "Sponsored"
}

export const AdUnit: React.FC<AdUnitProps> = ({ 
    client, 
    slot, 
    format = 'auto', 
    responsive = true,
    style = { display: 'block' },
    className = '',
    label
}) => {
    const initializedRef = useRef(false);
    // Detect placeholder ID to show visual mock
    const isPlaceholder = client.includes('YOUR_PUBLISHER_ID_HERE');

    useEffect(() => {
        if (isPlaceholder) return;

        // Prevent pushing to adsbygoogle multiple times
        if (initializedRef.current) return;
        
        try {
            // Check if ad script is loaded
            if (typeof window !== 'undefined') {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                initializedRef.current = true;
            }
        } catch (e) {
            console.error("AdSense error:", e);
        }
    }, [client, isPlaceholder]);

    if (isPlaceholder) {
        return (
            <div className={`ad-wrapper my-8 flex flex-col items-center justify-center w-full overflow-hidden ${className}`}>
                {label && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-bold opacity-70">
                        {label}
                    </span>
                )}
                <div className="w-full bg-slate-100 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-white/10 min-h-[120px] flex flex-col items-center justify-center rounded-2xl overflow-hidden p-4 group transition-colors hover:border-indigo-500/20">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Ad Space</p>
                    <p className="text-[9px] text-slate-400/50 font-mono">Format: {format}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`ad-wrapper my-6 flex flex-col items-center justify-center w-full overflow-hidden ${className}`}>
            {label && (
                <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-bold opacity-70">
                    {label}
                </span>
            )}
            <div className="w-full bg-slate-100 dark:bg-black/20 min-h-[100px] flex items-center justify-center rounded-xl overflow-hidden">
                <ins className="adsbygoogle"
                     style={style}
                     data-ad-client={client}
                     data-ad-slot={slot}
                     data-ad-format={format}
                     data-full-width-responsive={responsive ? "true" : "false"}
                />
            </div>
        </div>
    );
};
