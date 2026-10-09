import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./locales";

// No locale-prefixed routing (`/am/dashboard` etc.) — this app has one URL
// per page regardless of language, and the selected locale is carried in a
// cookie instead. Restructuring every route to carry a locale segment is a
// separate, much larger migration than what this module sets up: a working
// i18n mechanism for the strings that are actually translated so far (see
// locales.ts's LOCALES and the per-locale disclaimers in messages/README.md).
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
