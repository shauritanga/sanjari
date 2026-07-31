import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://localhost:4000/api/v1';
type ApiBody<T> = { data?: T; message?: string; error?: { message?: string } };

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiBody<T>> {
  const token = await SecureStore.getItemAsync('sanjari.accessToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as ApiBody<T>;
  if (!response.ok) throw new Error(body.message ?? body.error?.message ?? 'Request failed.');
  return body;
}

export const api = {
  request,
  post: <T = unknown>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T = unknown>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  get: <T = unknown>(path: string) => request<T>(path),
  remove: (path: string) => request(path, { method: 'DELETE' }),
};
