const isProduction = process.env.NODE_ENV === 'production';

// Central logging surface: a single place to later forward to an observability
// platform and to keep noisy debug output out of production, while security-
// relevant events are never silently lost.
export const logger = {
  warn(message: string, ...optionalParams: unknown[]): void {
    if (!isProduction) {
      console.warn(message, ...optionalParams);
    }
  },
  error(message: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  },
  /**
   * Security-relevant events: rejected sign-ins, rate limits tripped, refused
   * token refreshes. Always emitted, production included — these are exactly
   * the details withheld from the browser's generic error message.
   */
  security(message: string, ...optionalParams: unknown[]): void {
    console.warn(`[security] ${message}`, ...optionalParams);
  },
  log(message: string, ...optionalParams: unknown[]): void {
    if (!isProduction) {
      console.log(message, ...optionalParams);
    }
  },
};
