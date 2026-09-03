import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig, DEFAULT_CONFIG, InitialScreenType, LessonTimeSlot } from '../src/types/config';

interface ConfigContextValue {
  config: AppConfig;
  isLoading: boolean;
  updateConfig: (partial: Partial<AppConfig>) => Promise<void>;
  updateInitialScreen: (screen: InitialScreenType) => Promise<void>;
  updateTimeSlots: (slots: LessonTimeSlot[]) => Promise<void>;
  updateDefaultDuration: (duration: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const STORAGE_KEY = '@snotes_app_config';

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
        }
      } catch (err) {
        console.error('Ошибка загрузки настроек:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateConfig = async (partial: Partial<AppConfig>) => {
    return new Promise<void>((resolve) => {
      setConfig((prev) => {
        const next = { ...prev, ...partial };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          .catch((err) => console.error('Ошибка сохранения настроек:', err))
          .finally(() => resolve());
        return next;
      });
    });
  };

  const updateInitialScreen = async (screen: InitialScreenType) => {
    await updateConfig({ initialScreen: screen });
  };

  const updateTimeSlots = async (slots: LessonTimeSlot[]) => {
    await updateConfig({ timeSlots: slots });
  };

  const updateDefaultDuration = async (duration: number) => {
    await updateConfig({ defaultDurationMinutes: duration });
  };

  const resetToDefaults = async () => {
    await updateConfig(DEFAULT_CONFIG);
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        isLoading,
        updateConfig,
        updateInitialScreen,
        updateTimeSlots,
        updateDefaultDuration,
        resetToDefaults,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextValue => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within a ConfigProvider');
  return ctx;
};
