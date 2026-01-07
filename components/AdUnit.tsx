
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

    useEffect(() => {
        // Prevent pushing to adsbygoogle multiple times for the same component mount if strictly mode doubles it,
        // though Google's script usually handles this, React strict mode can be tricky.
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
    }, []);

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
