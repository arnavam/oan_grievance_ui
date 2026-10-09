import { logoutUser } from '@/features/auth/api/authApi';
import { logout } from '@/features/auth/store/authSlice';
import { clearSubmitterProfile } from '@/lib/submitterProfile';
import type { AppDispatch } from '@/store';

/**
 * The single way a session ends: revokes the refresh token server-side, then
 * always resets Redux — a network failure or an already-expired token must
 * not trap the user in a session they asked to leave.
 *
 * `email` is whatever `selectUser` held for this session, if any — it's the
 * key `saveSubmitterProfile` (submitterProfile.ts) used to persist PII to
 * localStorage, so it's what's needed to wipe that PII when the session ends.
 * Callers pass it because it must be read before `dispatch(logout())` clears
 * the very state it lives in.
 */
export async function performLogout(dispatch: AppDispatch, email: string | null): Promise<void> {
  await logoutUser();
  dispatch(logout());
  if (email) clearSubmitterProfile(email);
}
