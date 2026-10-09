import { parseEnvInt } from '@/lib/envInt';

// Idle-timeout durations, shared between the server-side enforcement
// (`idleSession.ts`, checked by `proxy.ts` and `/api/auth/heartbeat`) and the
// client-side warning countdown (`useIdleTimer.ts`).
//
// Next.js only inlines env vars prefixed `NEXT_PUBLIC_` into the browser
// bundle — plain `IDLE_TIMEOUT_MS` is invisible to client code. So there are
// two names per setting: the server reads the bare one, the client reads the
// `NEXT_PUBLIC_` one. Both fall back to the same default, but if you override
// the server value in a deployment, set the matching `NEXT_PUBLIC_` one too —
// otherwise the warning modal and the actual server-enforced cutoff drift
// apart.
//
// Each `process.env.X` access below must stay written out literally — that's
// what lets Next's build-time inlining find and replace the `NEXT_PUBLIC_`
// ones; see `envInt.ts`'s `envInt` doc comment for what breaks if this
// becomes a dynamic lookup instead.

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60_000;
const DEFAULT_IDLE_WARNING_LEAD_MS = 60_000;

export const IDLE_TIMEOUT_MS = parseEnvInt(process.env.IDLE_TIMEOUT_MS, DEFAULT_IDLE_TIMEOUT_MS);
export const IDLE_WARNING_LEAD_MS = parseEnvInt(
  process.env.IDLE_WARNING_LEAD_MS,
  DEFAULT_IDLE_WARNING_LEAD_MS
);

export const CLIENT_IDLE_TIMEOUT_MS = parseEnvInt(
  process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS,
  DEFAULT_IDLE_TIMEOUT_MS
);
export const CLIENT_IDLE_WARNING_LEAD_MS = parseEnvInt(
  process.env.NEXT_PUBLIC_IDLE_WARNING_LEAD_MS,
  DEFAULT_IDLE_WARNING_LEAD_MS
);
