export type Locale = 'en' | 'sw';

export type UserRole =
  | 'user'
  | 'support_agent'
  | 'moderator'
  | 'senior_moderator'
  | 'verification_officer'
  | 'finance_officer'
  | 'administrator'
  | 'super_administrator';

export type Permission =
  | 'users.read'
  | 'users.suspend'
  | 'users.ban'
  | 'profiles.review'
  | 'verification.review'
  | 'reports.assign'
  | 'reports.resolve'
  | 'moderation.content.remove'
  | 'subscriptions.read'
  | 'refunds.manage'
  | 'analytics.read'
  | 'configuration.manage'
  | 'administrators.manage'
  | 'audit.read';

export type ReportCategory =
  | 'harassment'
  | 'hate_or_discrimination'
  | 'threatening_behaviour'
  | 'scam_or_fraud'
  | 'impersonation'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'spam'
  | 'suspected_underage_user'
  | 'offline_safety_concern'
  | 'other';

export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
  };
}
