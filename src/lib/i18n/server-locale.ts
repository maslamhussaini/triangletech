import { DEFAULT_LOCALE, LOCALE_COOKIE, localeFromValue, type Locale } from "./locales";
import { cookies } from "next/headers";

/**
 * Server-side initial locale for tool pages.
 *
 * Web (default): reads the saved `triangletech-locale` cookie, exactly as
 * before — returning users are server-rendered in their saved language.
 *
 * Mobile static export (`MOBILE_EXPORT=1`, `npm run build:mobile`) and
 * freelancer scoped export (`FREELANCER_EXPORT=1`,
 * `npm run build:freelancer`): return the default locale WITHOUT calling
 * `cookies()`. `cookies()` is a dynamic server API and `output: 'export'`
 * cannot prerender any page that uses it, so neither static export may
 * invoke it. The client-side `LanguageProvider` still re-detects the
 * locale after mount from localStorage / `navigator.languages`, so in-app
 * the saved or detected language applies; only the server-rendered first
 * paint (including FAQ text) is English in the static bundle. Production
 * behaviour is unchanged: both flags are unset for `npm run build`.
 */
export async function getInitialLocale(): Promise<Locale> {
  if (process.env.MOBILE_EXPORT === "1" || process.env.FREELANCER_EXPORT === "1") return DEFAULT_LOCALE;
  const cookieStore = await cookies();
  return localeFromValue(cookieStore.get(LOCALE_COOKIE)?.value);
}
