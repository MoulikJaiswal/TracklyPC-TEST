import React from 'react';

export const TracklyLogo = React.memo(({ collapsed = false, id, className }: { collapsed?: boolean, id?: string, className?: string }) => {
  return (
    <div id={id} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} select-none transition-all duration-300 transform-gpu will-change-transform ${className}`}>
      <div className="relative w-8 h-8 flex-shrink-0 text-slate-900 dark:text-white">
          <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
             <path d="M10 22.5C10 15.5964 15.5964 10 22.5 10H77.5C84.4036 10 90 15.5964 90 22.5C90 29.4036 84.4036 35 77.5 35H22.5C15.5964 35 10 29.4036 10 22.5Z" />
             <path d="M37.5 42H62.5V77.5C62.5 84.4036 56.9036 90 50 90C43.0964 90 37.5 84.4036 37.5 77.5V42Z" />
          </svg>
      </div>
      <span className={`text-xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight transition-all duration-300 origin-left whitespace-nowrap overflow-hidden ${collapsed ? 'w-0 opacity-0 scale-0' : 'w-auto opacity-100 scale-100'}`}>
        Trackly
      </span>
    </div>
  );
});
