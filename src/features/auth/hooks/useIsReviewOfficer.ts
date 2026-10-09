'use client';

import { isReviewOfficer } from '@/features/auth/rbac';
import { selectUser } from '@/features/auth/store/authSlice';
import { useAppSelector } from '@/store/hooks';

/** Whether the signed-in user is a Grievance Review Officer (read-only). */
export function useIsReviewOfficer(): boolean {
  const user = useAppSelector(selectUser);
  return isReviewOfficer(user?.roles ?? []);
}
