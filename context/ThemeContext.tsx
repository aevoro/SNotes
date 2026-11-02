import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceSolid: string;
  card: string;
  cardSolid: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSubtle: string;
  pillBg: string;
  tabBarBg: string;
  danger: string;
  dangerSubtle: string;
  success: string;
  warning: string;
  separator: string;
}

const THEME_STORAGE_KEY = '@snotes_theme_mode';

const cupertinoDark: ThemeColors = {
  mode: 'dark',
  bg: '#000000',
  surface: 'rgba(28, 28, 30, 0.85)',
  surfaceSolid: '#1c1c1e',
  card: 'rgba(38, 38, 42, 0.75)',
  cardSolid: '#242426',
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  textPrimary: '#ffffff',
  textSecondary: '#8e8e93',
  textMuted: '#636366',
  accent: '#0a84ff',
  accentSubtle: 'rgba(10, 132, 255, 0.16)',
  pillBg: 'rgba(10, 132, 255, 0.22)',
  tabBarBg: 'rgba(18, 18, 20, 0.82)',
  danger: '#ff453a',
  dangerSubtle: 'rgba(255, 69, 58, 0.18)',
  success: '#30d158',
  warning: '#ffd60a',
  separator: 'rgba(84, 84, 88, 0.4)',
};

const cupertinoLight: ThemeColors = {
  mode: 'light',
  bg: '#f2f2f7',
  surface: 'rgba(255, 255, 255, 0.90)',
  surfaceSolid: '#ffffff',
  card: 'rgba(255, 255, 255, 0.85)',
  cardSolid: '#ffffff',
  border: 'rgba(0, 0, 0, 0.08)',
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  textPrimary: '#000000',
  textSecondary: '#8e8e93',
  textMuted: '#aeaeb2',
  accent: '#007aff',
  accentSubtle: 'rgba(0, 122, 255, 0.12)',
  pillBg: 'rgba(0, 122, 255, 0.15)',
  tabBarBg: 'rgba(249, 249, 251, 0.86)',
  danger: '#ff3b30',
  dangerSubtle: 'rgba(255, 59, 48, 0.12)',
  success: '#34c759',
  warning: '#ff9500',
  separator: 'rgba(60, 60, 67, 0.18)',
};

interface ThemeContextType {
  theme: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  isScheduleEditable: boolean;
  toggleScheduleEditable: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: cupertinoDark,
  toggleTheme: () => {},
  setMode: () => {},
  isScheduleEditable: false,
  toggleScheduleEditable: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isScheduleEditable, setIsScheduleEditable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
          setModeState(saved);
        }
      } catch {
        // Fallback to default dark
      }
    })();
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
  };

  const toggleScheduleEditable = () => {
    setIsScheduleEditable((prev) => !prev);
  };

  const theme = useMemo(() => (mode === 'dark' ? cupertinoDark : cupertinoLight), [mode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setMode,
        isScheduleEditable,
        toggleScheduleEditable,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
