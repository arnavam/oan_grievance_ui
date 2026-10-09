import { performLogout } from '@/features/auth/logout';
import { isProtectedRoute } from '@/features/auth/rbac';
import { authReducer, getMeThunk } from '@/features/auth/store/authSlice';
import { metadataReducer } from '@/features/metadata/store/metadataSlice';
import { areasApi } from '@/features/metadata/api/areasApi';
import { timelineReducer } from '@/features/all-grievances/store/timelineSlice';
import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';

type AuthState = ReturnType<typeof authReducer>;

/**
 * Session-restore failure isn't caught by the route guard (`proxy.ts`) once
 * the page has already rendered — that only runs on navigation. If the
 * cookie backing `getMeThunk` turns out invalid (expired refresh token,
 * revoked session) while the user is sitting on a protected screen, nothing
 * else sends them back to /login. This is the one place that does.
 *
 * Goes through `performLogout` — same as the Sign Out button and the idle
 * timer — rather than reimplementing "revoke + reset Redux" here. This used
 * to dispatch `logout()` and POST /api/auth/logout directly, which quietly
 * skipped whatever `performLogout` does beyond that (currently: clearing
 * `submitterProfile`'s localStorage entry) — a session ending this way would
 * leave that PII behind while every other sign-out path cleared it.
 */
const sessionExpiryMiddleware: Middleware<object, { auth: AuthState }> = (api) => (next) => (action) => {
  // Read before `next(action)`, not after: `getMeThunk.rejected`'s own
  // reducer case (authSlice.ts) already sets `state.user = null` — by the
  // time control returns from `next`, the email this middleware exists to
  // pass to `performLogout` (so it can clear that user's `submitterProfile`
  // localStorage entry) is already gone. Reading state post-`next` looked
  // right (state seems "not yet cleared" until you trace exactly which
  // reducer runs inside `next`) but always yielded null in practice.
  const isSessionExpiry = (action as UnknownAction).type === getMeThunk.rejected.type;
  const email = isSessionExpiry ? (api.getState().auth.user?.email ?? null) : null;

  const result = next(action);

  if (isSessionExpiry) {
    const onProtectedRoute = typeof window !== 'undefined' && isProtectedRoute(window.location.pathname);

    // Fire-and-forget: redirect regardless of whether the server-side revoke succeeds.
    void performLogout(api.dispatch, email).finally(() => {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Redux middleware runs outside React component tree, no router to call
      if (onProtectedRoute) window.location.href = '/login';
    });
  }

  return result;
};

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      metadata: metadataReducer,
      timeline: timelineReducer,
      [areasApi.reducerPath]: areasApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sessionExpiryMiddleware, areasApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
