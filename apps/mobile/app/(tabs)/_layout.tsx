import { Tabs } from 'expo-router';
import {
  CompassIcon,
  HeartIcon,
  Home01Icon,
  Message01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import type { ColorValue } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { theme } from '../../src/theme/theme';

const tabIcon = (icon: typeof Home01Icon) => ({ color, size }: { color: ColorValue; size: number }) => (
  <AppIcon icon={icon} color={String(color)} size={size} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.coral,
        tabBarInactiveTintColor: theme.colors.secondaryText,
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
