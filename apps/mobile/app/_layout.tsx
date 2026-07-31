import '../src/i18n';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="conversation/[id]" />
      <Stack.Screen name="safety" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
