'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { adminRequest } from '../../src/lib/admin-api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="main auth-main">
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <div className="auth-brand"><span className="brand-mark">S</span><span>Sanjari operations</span></div>
        <p className="eyebrow">Secure workspace</p><h1>Welcome back</h1>
        <p>Sign in to manage trust, safety, and platform operations.</p>
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
          <span className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" disabled={submitting}><LockKeyhole size={16} />{submitting ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </main>
  );
}
