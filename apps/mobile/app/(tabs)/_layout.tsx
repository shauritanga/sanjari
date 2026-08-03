import { Tabs } from 'expo-router';
import {
  CompassIcon,
  HeartIcon,
  Home01Icon,
  Message01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../src/components/AppIcon';
import { useAppTheme } from '../../src/theme/useAppTheme';

const tabIcon = (icon: typeof Home01Icon) => ({ color, size }: { color: ColorValue; size: number }) => (
  <AppIcon icon={icon} color={String(color)} size={size} />
);

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: tabIcon(CompassIcon) }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes', tabBarIcon: tabIcon(HeartIcon) }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: tabIcon(Home01Icon) }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: tabIcon(Message01Icon) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon(UserIcon) }} />
    </Tabs>
  );
}
