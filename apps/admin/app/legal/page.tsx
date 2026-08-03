'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type LegalDocument = {
  id: string;
  type: string;
  version: string;
  locale: string;
  contentHash: string;
  publishedAt: string;
};

export default function LegalPage() {
  const [documents, setDocuments] = useState<LegalDocument[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [type, setType] = useState('terms');
  const [version, setVersion] = useState('');
  const [locale, setLocale] = useState('en');
  const [contentHash, setContentHash] = useState('');
  const [publishing, setPublishing] = useState(false);

  function load() {
    setError('');
    void adminRequest<LegalDocument[]>('/admin/operations/legal-documents')
      .then((data) => setDocuments(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load legal documents.'));
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!version.trim() || contentHash.trim().length < 8) return;
    setPublishing(true);
    try {
      await adminRequest('/admin/operations/legal-documents', {
        method: 'POST',
        body: JSON.stringify({ type, version: version.trim(), locale, contentHash: contentHash.trim() }),
      });
      setVersion('');
      setContentHash('');
      setToast('Legal document version published.');
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to publish document version.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Legal-document versions"
        description="Publish the version and content hash for each terms, privacy, or guidelines document. Acceptance is tracked per user against these versions."
      />
      {error ? <ErrorState message={error} /> : null}
      <form className="filter-bar" onSubmit={(event) => void publish(event)}>
        <div className="filter-fields">
          <label className="search-field">
            <span>Document type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="terms">Terms of service</option>
              <option value="privacy">Privacy policy</option>
              <option value="guidelines">Community guidelines</option>
            </select>
          </label>
          <label className="search-field">
            <span>Locale</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value)}>
              <option value="en">English</option>
              <option value="sw">Swahili</option>
            </select>
          </label>
          <label className="search-field">
            <span>Version</span>
            <input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="2026-08-01" maxLength={20} />
          </label>
          <label className="search-field" style={{ flex: '1 1 280px' }}>
            <span>Content hash</span>
            <input
              value={contentHash}
              onChange={(event) => setContentHash(event.target.value)}
              placeholder="sha256 of the published document body"
              maxLength={128}
            />
          </label>
        </div>
        <button className="primary-button filter-submit" type="submit" disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish version'}
        </button>
      </form>
      {documents === null && !error ? <LoadingState label="Loading legal document versions" /> : null}
      {documents && documents.length === 0 ? <EmptyState description="No legal document versions have been published yet." /> : null}
      <div className="case-list">
        {documents?.map((document) => (
          <article className="case-item" key={document.id}>
            <div>
              <strong>{document.type} · {document.version}</strong>
              <span>
                {document.locale.toUpperCase()} · Published {new Date(document.publishedAt).toLocaleString()}
              </span>
              <small>{document.contentHash}</small>
            </div>
          </article>
        ))}
      </div>
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
