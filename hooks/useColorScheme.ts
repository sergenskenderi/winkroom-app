import { useColorSchemeFromTheme } from '@/contexts/ThemeContext';

export function useColorScheme(): 'light' | 'dark' | null {
  return useColorSchemeFromTheme();
}
