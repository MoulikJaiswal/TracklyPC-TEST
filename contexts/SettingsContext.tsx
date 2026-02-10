import React, { createContext, useContext, useMemo, ReactNode, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ThemeId, ActivityThresholds } from '../types';
import { THEME_CONFIG } from '../constants';

const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

interface SettingsContextType {
  animationsEnabled: boolean;
  setAnimationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  graphicsEnabled: boolean;
  setGraphicsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  lagDetectionEnabled: boolean;
  setLagDetectionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  theme: ThemeId;
  setTheme: React.Dispatch<React.SetStateAction<ThemeId>>;
  showAurora: boolean;
  setShowAurora: React.Dispatch<React.SetStateAction<boolean>>;
  parallaxEnabled: boolean;
  setParallaxEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  showParticles: boolean;
  setShowParticles: React.Dispatch<React.SetStateAction<boolean>>;
  swipeAnimationEnabled: boolean;
  setSwipeAnimationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  swipeStiffness: number;
  setSwipeStiffness: React.Dispatch<React.SetStateAction<number>>;
  swipeDamping: number;
  setSwipeDamping: React.Dispatch<React.SetStateAction<number>>;
  soundEnabled: boolean;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  soundPitch: number;
  setSoundPitch: React.Dispatch<React.SetStateAction<number>>;
  soundVolume: number;
  setSoundVolume: React.Dispatch<React.SetStateAction<number>>;
  customBackground: string | null;
  setCustomBackground: React.Dispatch<React.SetStateAction<string | null>>;
  customBackgroundEnabled: boolean;
  setCustomBackgroundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  customBackgroundAlign: 'center' | 'top' | 'bottom';
  setCustomBackgroundAlign: React.Dispatch<React.SetStateAction<'center' | 'top' | 'bottom'>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  activityThresholds: ActivityThresholds;
  setActivityThresholds: React.Dispatch<React.SetStateAction<ActivityThresholds>>;
  themeConfig: typeof THEME_CONFIG[ThemeId];
  dynamicStyles: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [animationsEnabled, setAnimationsEnabled] = useLocalStorage('trackly_animations', true);
  const [graphicsEnabled, setGraphicsEnabled] = useLocalStorage('trackly_graphics', true); 
  const [lagDetectionEnabled, setLagDetectionEnabled] = useLocalStorage('trackly_lag_detection', true); 
  const [theme, setTheme] = useLocalStorage<ThemeId>('trackly_theme', 'default-dark');
  const [showAurora, setShowAurora] = useLocalStorage('trackly_aurora', true);
  const [parallaxEnabled, setParallaxEnabled] = useLocalStorage('trackly_parallax', true);
  const [showParticles, setShowParticles] = useLocalStorage('trackly_particles', true);
  const [swipeAnimationEnabled, setSwipeAnimationEnabled] = useLocalStorage('trackly_swipe', true);
  const [swipeStiffness, setSwipeStiffness] = useLocalStorage('trackly_swipe_stiffness', 6000); 
  const [swipeDamping, setSwipeDamping] = useLocalStorage('trackly_swipe_damping', 300);    
  const [soundEnabled, setSoundEnabled] = useLocalStorage('trackly_sound', true);
  const [soundPitch, setSoundPitch] = useLocalStorage('trackly_sound_pitch', 600);
  const [soundVolume, setSoundVolume] = useLocalStorage('trackly_sound_volume', 0.5);
  const [customBackground, setCustomBackground] = useLocalStorage<string | null>('trackly_custom_bg', null);
  const [customBackgroundEnabled, setCustomBackgroundEnabled] = useLocalStorage('trackly_custom_bg_enabled', false);
  const [customBackgroundAlign, setCustomBackgroundAlign] = useLocalStorage<'center' | 'top' | 'bottom'>('trackly_custom_bg_align', 'center');
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('trackly_sidebar_collapsed', false);
  const [activityThresholds, setActivityThresholds] = useLocalStorage<ActivityThresholds>('trackly_activity_thresholds', {
    level2: 120, level3: 240, level4: 360,
  });

  const themeConfig = THEME_CONFIG[theme];

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeConfig.mode);
  }, [themeConfig.mode]);

  const dynamicStyles = useMemo(() => `
      :root {
        --theme-bg: ${themeConfig.colors.bg};
        --theme-card: ${themeConfig.colors.card};
        --theme-card-rgb: ${hexToRgb(themeConfig.colors.card)};
        --theme-accent: ${themeConfig.colors.accent};
        --theme-accent-rgb: ${hexToRgb(themeConfig.colors.accent)};
        --theme-accent-glow: ${themeConfig.colors.accentGlow};
        --theme-text-main: ${themeConfig.colors.text};
        --theme-text-secondary: ${themeConfig.colors.textSecondary};
        --theme-text-on-accent: ${themeConfig.colors.textOnAccent};
        --theme-border: ${themeConfig.colors.border};
        --theme-bg-tertiary: ${themeConfig.colors.bgTertiary};
        --theme-gradient-from: ${themeConfig.colors.gradient.from};
        --theme-gradient-to: ${themeConfig.colors.gradient.to};
      }
  `, [themeConfig]);

  const value = {
    animationsEnabled, setAnimationsEnabled,
    graphicsEnabled, setGraphicsEnabled,
    lagDetectionEnabled, setLagDetectionEnabled,
    theme, setTheme,
    showAurora, setShowAurora,
    parallaxEnabled, setParallaxEnabled,
    showParticles, setShowParticles,
    swipeAnimationEnabled, setSwipeAnimationEnabled,
    swipeStiffness, setSwipeStiffness,
    swipeDamping, setSwipeDamping,
    soundEnabled, setSoundEnabled,
    soundPitch, setSoundPitch,
    soundVolume, setSoundVolume,
    customBackground, setCustomBackground,
    customBackgroundEnabled, setCustomBackgroundEnabled,
    customBackgroundAlign, setCustomBackgroundAlign,
    sidebarCollapsed, setSidebarCollapsed,
    activityThresholds, setActivityThresholds,
    themeConfig, dynamicStyles,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
