// Reads the claims out of a JWT this app already trusts — the access token in
// our own httpOnly cookie, which nothing but our own `/api/auth/login` route
// ever wrote. This is a plain base64url decode of the payload segment, NOT a
// signature verification: the Next server has no copy of oan_auth_service's
// signing secret and shouldn't (verification is the backend's job, on every
// real API call). Never use this to authorize anything — only to read back
// what a token we ourselves issued-into-the-cookie already says, for display.

export interface AccessTokenClaims {
  /** The authenticated user's email — this backend's identifier. */
  sub: string;
  roles: string[];
  /** Epoch seconds. */
  exp: number;
}

// `atob`/`TextDecoder`, not `Buffer` — this runs in the Edge runtime (the
// middleware) as well as the Node runtime (the `/api/auth/me` route handler),
// and `Buffer` doesn't exist in the former.
function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/** Returns the claims, or null if the token is malformed. Does not check expiry. */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
    if (typeof payload.sub !== 'string' || !Array.isArray(payload.roles) || typeof payload.exp !== 'number') {
      return null;
    }
    return { sub: payload.sub, roles: payload.roles as string[], exp: payload.exp };
  } catch {
    return null;
  }
}

export function isExpired(claims: AccessTokenClaims, skewSeconds = 5): boolean {
  return claims.exp <= Date.now() / 1000 + skewSeconds;
}
