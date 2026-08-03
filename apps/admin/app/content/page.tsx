'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type Prompt = { id: string; locale: string; prompt: string; active: boolean; createdAt: string };

export default function ContentPage() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [locale, setLocale] = useState('en');
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState('');

  function load() {
    setError('');
    void adminRequest<Prompt[]>('/admin/operations/content/prompts')
      .then((data) => setPrompts(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load prompts.'));
  }

  useEffect(() => {
    load();
  }, []);

  async function createPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim().length < 4) return;
    setCreating(true);
    try {
      await adminRequest('/admin/operations/content/prompts', {
        method: 'POST',
        body: JSON.stringify({ locale, prompt: text.trim() }),
      });
      setText('');
      setToast('Prompt added.');
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add prompt.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(prompt: Prompt) {
    setBusyId(prompt.id);
    try {
      await adminRequest(`/admin/operations/content/prompts/${prompt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !prompt.active }),
      });
      setPrompts((current) =>
        current?.map((item) => (item.id === prompt.id ? { ...item, active: !prompt.active } : item)) ?? null,
      );
      setToast(prompt.active ? 'Prompt deactivated.' : 'Prompt activated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update prompt.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Content configuration"
        description="Manage the onboarding profile prompts members choose from and answer."
      />
      {error ? <ErrorState message={error} /> : null}
      <form className="filter-bar" onSubmit={(event) => void createPrompt(event)}>
        <div className="filter-fields">
          <label className="search-field">
            <span>Locale</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value)}>
              <option value="en">English</option>
              <option value="sw">Swahili</option>
            </select>
          </label>
          <label className="search-field" style={{ flex: '1 1 320px' }}>
            <span>New prompt</span>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="A perfect weekend looks like..."
              maxLength={300}
            />
          </label>
        </div>
        <button className="primary-button filter-submit" type="submit" disabled={creating || text.trim().length < 4}>
          {creating ? 'Adding...' : 'Add prompt'}
        </button>
      </form>
      {prompts === null && !error ? <LoadingState label="Loading prompts" /> : null}
      {prompts && prompts.length === 0 ? <EmptyState description="No prompts have been created yet." /> : null}
      <div className="case-list">
        {prompts?.map((prompt) => (
          <article className="case-item" key={prompt.id}>
            <div>
              <strong>{prompt.prompt}</strong>
              <span>
                {prompt.locale.toUpperCase()} · <StatusBadge status={prompt.active ? 'active' : 'suspended'} label={prompt.active ? 'Active' : 'Inactive'} />
              </span>
            </div>
            <button
              className="secondary-button"
              disabled={busyId === prompt.id}
              onClick={() => void toggleActive(prompt)}
            >
              {busyId === prompt.id ? 'Saving...' : prompt.active ? 'Deactivate' : 'Activate'}
            </button>
          </article>
        ))}
      </div>
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
