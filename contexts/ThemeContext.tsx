import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const STORAGE_KEY = '@winkroom_theme';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
  colorScheme: 'light' | 'dark' | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemePreferenceState(stored);
      }
    });
  }, []);

  const setThemePreference = useCallback((value: ThemePreference) => {
    setThemePreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  const colorScheme: 'light' | 'dark' | null =
    themePreference === 'system'
      ? systemScheme ?? 'light'
      : themePreference;

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useColorSchemeFromTheme(): 'light' | 'dark' | null {
  const ctx = useContext(ThemeContext);
  const system = useRNColorScheme();
  if (!ctx) return system;
  return ctx.colorScheme;
}
