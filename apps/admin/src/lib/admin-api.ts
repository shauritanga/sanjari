const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type ApiResponse<T> = { data?: T; message?: string; error?: { message?: string } };

export async function adminRequest<T>(path: string, options: RequestInit = {}) {
  const csrfToken =
    typeof window === 'undefined' ? null : window.sessionStorage.getItem('sanjari.admin.csrf');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok) throw new Error(body.message ?? body.error?.message ?? 'Admin request failed.');
  return body.data;
}
