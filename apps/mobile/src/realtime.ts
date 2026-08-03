import * as SecureStore from 'expo-secure-store';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './config';

const SOCKET_ORIGIN = API_URL.replace(/\/api\/v\d+\/?$/, '');

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

/**
 * Lazily connects (or reuses) a single socket.io connection to the chat
 * gateway. Call this once per screen that needs live updates; the
 * connection is shared across the app so joining/leaving conversation rooms
 * doesn't tear down the underlying socket.
 */
export async function getRealtimeSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (connecting) return connecting;
  connecting = (async () => {
    const token = await SecureStore.getItemAsync('sanjari.accessToken');
    const instance = io(`${SOCKET_ORIGIN}/communications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true
    });
    socket = instance;
    return instance;
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

export async function joinConversationRoom(conversationId: string): Promise<void> {
  const client = await getRealtimeSocket();
  client.emit('conversation.join', { conversationId });
}

export async function leaveConversationRoom(conversationId: string): Promise<void> {
  const client = await getRealtimeSocket();
  client.emit('conversation.leave', { conversationId });
}

export async function emitTyping(conversationId: string, active: boolean): Promise<void> {
  const client = await getRealtimeSocket();
  client.emit('conversation.typing', { conversationId, active });
}

export async function emitPresence(state: 'online' | 'away' | 'offline'): Promise<void> {
  const client = await getRealtimeSocket();
  client.emit('presence.update', { state });
}
