import LoginPage from '@/features/auth/pages/LoginPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Grievance Management Portal',
  robots: { index: false, follow: false },
};

export default function Login() {
  return <LoginPage />;
}
