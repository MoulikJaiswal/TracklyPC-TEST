

import React, { useState, useEffect, useMemo } from 'react';
import { THEME_CONFIG } from '../constants';
import { ThemeId } from '../types';

interface AnimatedBackgroundProps {
  themeId: ThemeId;
  showAurora: boolean;
  parallaxEnabled: boolean;
  customBackground: string | null;
  customBackgroundAlign?: 'center' | 'top' | 'bottom';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = React.memo(({
  themeId,
  showAurora,
  parallaxEnabled,
  customBackground,
  customBackgroundAlign = 'center'
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!parallaxEnabled) {
      setMousePosition({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (clientY / innerHeight - 0.5) * 2; // -1 to 1
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [parallaxEnabled]);

  const config = useMemo(() => THEME_CONFIG[themeId] || THEME_CONFIG['default-dark'], [themeId]);
  const parallaxStrength = 8; // Reduced from 15

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: config.colors.bg,
    transition: 'background-color 0.5s ease',
    willChange: 'transform',
  };

  const parallaxWrapperStyle: React.CSSProperties = {
    transform: `translate(${mousePosition.x * parallaxStrength}px, ${mousePosition.y * parallaxStrength}px) scale(1.05)`,
    transition: 'transform 0.5s ease-out', // Slowed from 0.2s
    willChange: 'transform',
  };

  if (customBackground) {
    backgroundStyle.backgroundImage = `url(${customBackground})`;
    backgroundStyle.backgroundSize = 'cover';
    backgroundStyle.backgroundPosition = customBackgroundAlign;
  }

  const auroraColor = config.colors.accent;

  const gradientStyle: React.CSSProperties = {
    position: 'absolute',
    inset: '-20%',
    backgroundImage: `radial-gradient(circle at center, var(--theme-gradient-from) 0%, var(--theme-gradient-to) 50%)`,
    // Reduced movement range from [0, 100] to [25, 75]
    backgroundPosition: `${(mousePosition.x * 25) + 50}% ${(mousePosition.y * 25) + 50}%`,
    backgroundSize: '200% 200%',
    transition: 'background-position 0.8s ease-out', // Slowed from 0.4s
    willChange: 'background-position',
  };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300" style={{ backgroundColor: config.colors.bg }}>
      <div className="fixed -inset-8" style={parallaxWrapperStyle}>
        <div className="absolute inset-0 transition-colors duration-500" style={backgroundStyle} />
        {customBackground && <div className="absolute inset-0 bg-black/50" />}

        {showAurora && !customBackground && (
          <>
            <div
              className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-5 blur-3xl animate-aurora-1"
              style={{ backgroundColor: auroraColor }}
            />
            <div
              className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5 blur-3xl animate-aurora-2"
              style={{ backgroundColor: auroraColor, animationDelay: '5s' }}
            />
          </>
        )}

        {/* New Parallax Gradient */}
        {!customBackground && (
          <div style={gradientStyle} />
        )}
      </div>
      {!customBackground && <div className="absolute inset-0 bg-noise opacity-[0.02]" />}
    </div>
  );
});