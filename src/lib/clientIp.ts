import { envInt } from '@/lib/envInt';
import { logger } from '@/lib/logger';

// Derives the caller's IP from a request that reached us through a reverse
// proxy. `X-Forwarded-For` is client-writable and each hop appends its own
// view of the peer, so the trustworthy entries are the rightmost ones — one
// per proxy this app actually sits behind.
//
// Trusting it is opt-in, not opt-out: with no `TRUSTED_PROXY_HOPS` configured,
// we do not trust the header at all, rather than defaulting to "trust one
// hop." A deployment with no reverse proxy in front of it (or one that
// forwards the header as-is) would otherwise let any caller set their own
// rate-limit identity by sending an arbitrary `X-Forwarded-For` value. Ops
// must explicitly declare the real proxy topology before this app relies on
// client-supplied forwarding headers for anything security-relevant.
const MAX_TRUSTED_PROXY_HOPS = 4;

export const UNKNOWN_CLIENT_IP = 'unknown';

function trustedProxyHops(): number {
  // envInt's own fallback rule (non-positive-integer input -> fallback) is
  // exactly "don't trust anything" here, so 0 is both the fallback and the
  // safe default — same parse/validate rule every other tunable in this app
  // uses, instead of a second hand-rolled copy of it.
  return Math.min(envInt('TRUSTED_PROXY_HOPS', 0), MAX_TRUSTED_PROXY_HOPS);
}

/**
 * Whether this deployment trusts *any* proxy hop at all — a static,
 * deployment-wide fact, unlike `getClientIp`'s return value. That
 * distinction matters for a caller deciding how much to trust a given
 * `UNKNOWN_CLIENT_IP` result: on a deployment with no trusted proxy
 * configured, *every* request resolves to unknown, so a rate limit keyed on
 * it is really a site-wide bucket and needs sizing for aggregate traffic. On
 * a deployment that *does* trust a proxy, a request still resolving to
 * unknown means only that one anomalous request (a missing or malformed
 * forwarding header) couldn't be attributed — that's the request layer
 * failing on a case the deployment doesn't expect, not the deployment's
 * normal state, and treating it with the same widened, site-wide-sized
 * budget would hand anyone who can make their request look anomalous a much
 * larger flood budget than the deployment intended.
 */
export function hasTrustedProxyConfigured(): boolean {
  return trustedProxyHops() > 0;
}

export function getClientIp(request: Request): string {
  const hops = trustedProxyHops();
  if (hops === 0) return UNKNOWN_CLIENT_IP;

  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const chain = forwardedFor
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (chain.length > 0) {
      if (chain.length < hops) {
        logger.security(
          `X-Forwarded-For has ${chain.length} entr${chain.length === 1 ? 'y' : 'ies'} but ` +
            `TRUSTED_PROXY_HOPS is ${hops}; falling back to the nearest hop.`
        );
        return chain[chain.length - 1] as string;
      }

      const ip = chain[chain.length - hops];
      if (ip) return ip;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return UNKNOWN_CLIENT_IP;
}
