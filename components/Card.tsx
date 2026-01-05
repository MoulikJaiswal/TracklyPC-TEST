
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = React.memo(({ children, className = '', delay = 0, onClick }) => (
  <div 
    onClick={onClick}
    className={`
      relative
      backdrop-blur-lg md:backdrop-blur-xl 
      border
      rounded-[1.75rem] p-5 md:p-6 shadow-xl dark:shadow-2xl 
      transform-gpu
      ${onClick ? 'cursor-pointer active:scale-95' : ''}
      ${className}
    `}
    style={{ 
      animation: `fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s backwards`,
      transform: 'translate3d(0,0,0)', // Force GPU layer
      contain: 'layout style', // Browser optimization hint
      // PERFORMANCE KEY: Only animate cheap properties. Never animate blur/filter.
      transitionProperty: 'transform, opacity, background-color, border-color, box-shadow',
      transitionDuration: '300ms',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: onClick ? 'transform' : 'auto',
      backgroundColor: 'rgba(var(--theme-card-rgb), 0.6)',
      borderColor: 'rgba(var(--theme-text-main), 0.1)'
    }}
  >
    {/* Hover State Layer - Simulates hover effect without repainting the blur */}
    <div className="absolute inset-0 rounded-[1.75rem] bg-white/0 hover:bg-white/20 dark:hover:bg-slate-900/10 transition-colors duration-300 pointer-events-none" />
    
    <div className="relative z-10">
      {children}
    </div>
  </div>
));

export const FloatingCard: React.FC<CardProps> = React.memo(({ children, className = '', delay = 0 }) => (
  <div 
    className={`
      backdrop-blur-lg md:backdrop-blur-2xl 
      border
      rounded-[1.75rem] p-5 md:p-6 shadow-xl
      transform-gpu will-change-transform
      ${className}
    `}
    style={{ 
      animation: `float 6s ease-in-out infinite ${delay}s, fadeIn 1s ease-out ${delay}s backwards`,
      transform: 'translate3d(0,0,0)',
      contain: 'layout style',
      transitionProperty: 'transform, opacity',
      transitionDuration: '300ms',
      backgroundColor: 'rgba(var(--theme-card-rgb), 0.7)',
      borderColor: 'rgba(var(--theme-text-main), 0.1)'
    }}
  >
    {children}
  </div>
));
