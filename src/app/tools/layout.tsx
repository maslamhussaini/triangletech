import { cookies } from "next/headers";
import Link from "next/link";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { ReportBrandingPrintHeader, ReportBrandingProvider } from "@/components/tools/report-branding";
import { LanguageProvider } from "@/lib/i18n/provider";
import { LOCALE_COOKIE, LOCALE_META, localeFromValue } from "@/lib/i18n/locales";
import { tServer } from "@/lib/i18n/dictionaries";

/**
 * Shared tools layout: every /tools/* page gets the same language
 * dropdown, above the tool, in logical (direction-aware) layout.
 * The initial locale comes from the saved cookie, so a returning
 * user's language is rendered by the server with no flash and no
 * hydration mismatch. Language is a preference, not a URL segment:
 * tools keep their single canonical URLs and no locale pages are indexed.
 */
export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = localeFromValue(cookieStore.get(LOCALE_COOKIE)?.value);
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <ReportBrandingProvider>
        <div style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
          <div className="container" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between", paddingBlock: 12 }}>
            <Link href="/tools" style={{ fontWeight: 700, color: "#312E81" }}>
              {LOCALE_META[initialLocale].dir === "rtl" ? "→" : "←"} {tServer(initialLocale, "common.toolsIndex")}
            </Link>
            <LanguageSelector />
          </div>
        </div>
        <ReportBrandingPrintHeader />
        {children}
      </ReportBrandingProvider>
    </LanguageProvider>
  );
}
