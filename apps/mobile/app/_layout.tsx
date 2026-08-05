import '../src/i18n';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="profile/share/[token]" />
          <Stack.Screen name="profile/block" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile/report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="conversation/[id]" />
          <Stack.Screen name="match-celebration" options={{ presentation: 'modal' }} />
          <Stack.Screen name="safety" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="lock" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
