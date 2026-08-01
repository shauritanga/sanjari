import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/api';
import { theme } from '../../src/theme/theme';
type Message = {
  id: string;
  senderId: string;
  body: string | null;
  status: string;
  createdAt: string;
};
export default function ConversationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    void api
      .get<Message[]>(`/conversations/${id}/messages`)
      .then((result) => setMessages(result.data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load conversation.'),
      );
  }, [id]);
  async function send() {
    if (!body.trim()) return;
    try {
      const result = await api.post<Message>(`/conversations/${id}/messages`, {
        body: body.trim(),
      });
      if (result.data) setMessages((current) => [result.data!, ...current]);
      setBody('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send message.');
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {messages.map((message) => (
          <View key={message.id} style={styles.message}>
            <Text style={styles.messageBody}>{message.body ?? 'Message removed'}</Text>
            {message.status === 'pending_review' ? (
              <Text style={styles.warning}>This message is being reviewed.</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <AppTextInput label="Message" value={body} onChangeText={setBody} />
        <AppButton
          label="Send"
          onPress={() => {
            void send();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.warmWhite, padding: theme.spacing.lg },
  content: { gap: theme.spacing.sm },
  message: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  messageBody: { color: theme.colors.charcoal, lineHeight: 21 },
  warning: { color: theme.colors.error, fontSize: 12, marginTop: theme.spacing.xs },
  composer: { gap: theme.spacing.sm, paddingTop: theme.spacing.md },
  error: { color: theme.colors.error },
});
