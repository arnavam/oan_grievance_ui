'use client';

import { PortalShell } from '@/components/auth/PortalShell';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <PortalShell badge="Grievance Portal">
      <LoginForm />
    </PortalShell>
  );
}
