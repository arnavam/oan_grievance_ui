import UserManagementPage from '@/features/user-management/page';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'User Management | Grievance Management Dashboard',
};

export default function UsersRoute() {
  return (
    <Suspense>
      <UserManagementPage />
    </Suspense>
  );
}

