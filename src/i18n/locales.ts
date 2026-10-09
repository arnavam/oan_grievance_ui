// Pure constants, safe to import from both client and server code — split
// out of request.ts so a client component (LanguageSelector) doesn't drag in
// that file's `next/headers` import, which only Server Components may use.
export const LOCALES = ["en", "am", "om"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "oan_locale";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
