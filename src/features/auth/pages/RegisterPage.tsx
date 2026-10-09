'use client';

import { PortalShell } from '@/components/auth/PortalShell';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <PortalShell badge="Grievance Portal" backHref="/login">
      <div className="max-w-[460px] mx-auto w-full flex-grow flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Create Account</h2>
          <p className="text-gray-500 text-lg font-medium leading-relaxed px-4">Register to submit and track grievances.</p>
        </div>
        <RegisterForm />
      </div>
    </PortalShell>
  );
}
