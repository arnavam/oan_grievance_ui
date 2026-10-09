'use client';

import { isOfficerOrAdmin } from '@/features/auth/rbac';
import { selectUser } from '@/features/auth/store/authSlice';
import { useAppSelector } from '@/store/hooks';

/** Whether the signed-in user is a Grievance Officer or Grievance Admin. */
export function useIsOfficerOrAdmin(): boolean {
  const user = useAppSelector(selectUser);
  return isOfficerOrAdmin(user?.roles ?? []);
}
