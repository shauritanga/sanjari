'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminRequest } from '../../src/lib/admin-api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await adminRequest<{ csrfToken: string; admin: { permissions: string[] } }>(
        '/admin/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, ...(mfaCode ? { mfaCode } : {}) }),
        },
      );
      if (result?.csrfToken) window.sessionStorage.setItem('sanjari.admin.csrf', result.csrfToken);
      if (result?.admin)
        window.sessionStorage.setItem('sanjari.admin.claims', JSON.stringify(result.admin));
      router.replace('/moderation');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    }
  }
  return (
    <main className="main auth-main">
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <h1>Admin login</h1>
        <p>Privileged administrators require MFA when enabled on the account.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          MFA code (when enabled)
          <input
            inputMode="numeric"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
