// Shared by every module that reads a tunable positive integer from the
// environment (rate limits, idle-session timeouts, trusted-proxy hop count)
// so the parse/validate/fallback rule lives in exactly one place.
export function parseEnvInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Server-only convenience over `parseEnvInt` that looks the variable up by
 * name itself. Do NOT use this for a `NEXT_PUBLIC_` variable meant to reach
 * client code: Next's build-time inlining only recognizes a literal
 * `process.env.NEXT_PUBLIC_X` expression in the source, not a dynamic
 * `process.env[name]` lookup — a client-bundled call here would just read
 * `undefined` and silently fall back every time. Use `parseEnvInt` with the
 * literal access written out at the call site for those instead (see
 * `idleTimeoutConfig.ts`).
 */
export function envInt(name: string, fallback: number): number {
  return parseEnvInt(process.env[name], fallback);
}
