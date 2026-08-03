import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

type ApiBody<T> = { data?: T; message?: string; error?: { message?: string; code?: string } };

let refreshPromise: Promise<string | null> | null = null;

async function clearSession() {
  await SecureStore.deleteItemAsync('sanjari.accessToken');
  await SecureStore.deleteItemAsync('sanjari.refreshToken');
}

async function logout() {
  const refreshToken = await SecureStore.getItemAsync('sanjari.refreshToken');
  try {
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch {
    // Local credentials are still cleared when the server is unavailable.
  } finally {
    await clearSession();
    router.replace('/(auth)/login');
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await SecureStore.getItemAsync('sanjari.refreshToken');
    if (!refreshToken) return null;
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as ApiBody<{
        accessToken: string;
        refreshToken: string;
      }>;
      if (!body.data?.accessToken || !body.data.refreshToken) return null;
      await SecureStore.setItemAsync('sanjari.accessToken', body.data.accessToken);
      await SecureStore.setItemAsync('sanjari.refreshToken', body.data.refreshToken);
      return body.data.accessToken;
    } catch {
      return null;
    }
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<ApiBody<T>> {
  const token = await SecureStore.getItemAsync('sanjari.accessToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as ApiBody<T>;
  if (response.status === 401 && !retried && path !== '/auth/refresh') {
    const nextToken = await refreshAccessToken();
    if (nextToken) return request<T>(path, options, true);
    await clearSession();
    router.replace('/(auth)/login');
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!response.ok) throw new Error(body.message ?? body.error?.message ?? 'Request failed.');
  return body;
}

export const api = {
  request,
  logout,
  post: <T = unknown>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T = unknown>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  get: <T = unknown>(path: string) => request<T>(path),
  remove: (path: string) => request(path, { method: 'DELETE' }),
};
