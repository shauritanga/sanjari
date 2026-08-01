import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Sanjari Admin',
  description: 'Moderation and platform management for Sanjari.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
