import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/HapticTab';
// import ProtectedRoute from '@/components/ProtectedRoute'; // Temporarily disabled
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    // <ProtectedRoute> // Temporarily disabled - no authentication required
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: {
            display: 'none', // Hide the tab bar
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Games',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gamecontroller.fill" color={color} />,
          }}
        />
        {/* Profile tab temporarily disabled - will be re-enabled later */}
        {/* <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        /> */}
      </Tabs>
    // </ProtectedRoute> // Temporarily disabled
  );
}
