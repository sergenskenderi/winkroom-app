import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// import { AuthProvider } from '@/contexts/AuthContext'; // Temporarily disabled
import { BackendConnectionProvider } from '@/contexts/BackendConnectionContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <I18nProvider>
      <BackendConnectionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Auth screens temporarily disabled - will be re-enabled later */}
          {/* <Stack.Screen name="auth" options={{ headerShown: false }} /> */}
          <Stack.Screen name="games" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </BackendConnectionProvider>
    </I18nProvider>
  );
}
