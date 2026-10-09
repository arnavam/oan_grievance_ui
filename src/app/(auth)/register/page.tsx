import RegisterPage from '@/features/auth/pages/RegisterPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | Grievance Management Portal',
  robots: { index: false, follow: false },
};

export default function Register() {
  return <RegisterPage />;
}
