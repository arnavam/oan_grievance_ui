'use client';

import { PortalShell } from '@/components/auth/PortalShell';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <PortalShell badge="Grievance Portal" backHref="/login">
      <ResetPasswordForm />
    </PortalShell>
  );
}
