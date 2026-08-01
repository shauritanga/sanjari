import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';
type Conversation = {
  id: string;
  matchId: string;
  lastMessage: { body: string | null; createdAt: string } | null;
};
export default function MessagesScreen() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void api
      .get<Conversation[]>('/conversations')
      .then((result) => setItems(result.data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load messages.'),
      );
  }, []);
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.length === 0 ? (
          <Text style={styles.copy}>Your conversations will appear here after a mutual match.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.text}>
                <Text style={styles.name}>Your match</Text>
                <Text style={styles.preview}>
                  {item.lastMessage?.body ?? 'Start a conversation'}
                </Text>
              </View>
              <AppButton
                label="Open"
                onPress={() =>
                  router.push({ pathname: '/conversation/[id]', params: { id: item.id } })
                }
              />
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { gap: theme.spacing.md },
  title: { color: theme.colors.deepPlum, fontSize: 32, fontWeight: '700' },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  text: { flex: 1, gap: theme.spacing.xs },
  name: { color: theme.colors.deepPlum, fontWeight: '700' },
  preview: { color: theme.colors.secondaryText },
  copy: { color: theme.colors.secondaryText },
  error: { color: theme.colors.error },
});
