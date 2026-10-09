import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Grievance Management Portal',
  robots: { index: false, follow: false },
};

export default function ResetPassword() {
  return <ResetPasswordPage />;
}
