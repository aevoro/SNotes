import React, { createContext, useContext, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  mode: ThemeMode;
  bg: string;
  surface: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  pillBg: string;
  tabBarBg: string;
}

const darkTheme: ThemeColors = {
  mode: 'dark',
  bg: '#0f0f11',
  surface: '#18181b',
  card: '#212124',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  accent: '#8774e1',
  pillBg: 'rgba(135, 116, 225, 0.25)',
  tabBarBg: 'rgba(28, 28, 30, 0.94)',
};

const lightTheme: ThemeColors = {
  mode: 'light',
  bg: '#f4f4f7',
  surface: '#ffffff',
  card: '#ffffff',
  border: '#e4e4e7',
  textPrimary: '#18181b',
  textSecondary: '#71717a',
  accent: '#6366f1',
  pillBg: 'rgba(99, 102, 241, 0.15)',
  tabBarBg: 'rgba(255, 255, 255, 0.94)',
};

interface ThemeContextType {
  theme: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  isScheduleEditable: boolean;
  toggleScheduleEditable: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  toggleTheme: () => {},
  setMode: () => {},
  isScheduleEditable: false,
  toggleScheduleEditable: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isScheduleEditable, setIsScheduleEditable] = useState(false);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleTheme = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleScheduleEditable = () => {
    setIsScheduleEditable((prev) => !prev);
  };

  const theme = mode === 'dark' ? darkTheme : lightTheme;

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
