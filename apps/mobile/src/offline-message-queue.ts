import * as SecureStore from 'expo-secure-store';

const queueKey = 'sanjari.pendingMessages';
type QueuedMessage = { conversationId: string; body: string; queuedAt: number };

async function read(): Promise<QueuedMessage[]> {
  const value = await SecureStore.getItemAsync(queueKey);
  if (!value) return [];
  try {
    return JSON.parse(value) as QueuedMessage[];
  } catch {
    return [];
  }
}

export async function enqueueMessage(message: Omit<QueuedMessage, 'queuedAt'>) {
  const queue = await read();
  queue.push({ ...message, queuedAt: Date.now() });
  await SecureStore.setItemAsync(queueKey, JSON.stringify(queue.slice(-50)));
}
export async function drainMessages(send: (message: QueuedMessage) => Promise<void>) {
  const queue = await read();
  const remaining: QueuedMessage[] = [];
  for (const message of queue) {
    try {
      await send(message);
    } catch {
      remaining.push(message);
    }
  }
  if (remaining.length === 0) await SecureStore.deleteItemAsync(queueKey);
  else await SecureStore.setItemAsync(queueKey, JSON.stringify(remaining));
}
