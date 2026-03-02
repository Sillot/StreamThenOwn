/**
 * Locale utilities for adapting store URLs to the user's language/region.
 *
 * Uses navigator.language (e.g. "fr", "en-US", "de-DE") to derive
 * store-specific locale segments for fallback search URLs.
 */

/** Country code mappings derived from navigator.language → ISO country. */
const LANG_TO_COUNTRY: Record<string, string> = {
  en: "us",
  "en-us": "us",
  "en-gb": "gb",
  "en-au": "au",
  "en-ca": "ca",
  fr: "fr",
  "fr-fr": "fr",
  "fr-ca": "ca",
  "fr-be": "be",
  de: "de",
  "de-de": "de",
  "de-at": "at",
  "de-ch": "ch",
  it: "it",
  "it-it": "it",
  es: "es",
  "es-es": "es",
  "es-mx": "mx",
  pt: "pt",
  "pt-br": "br",
  "pt-pt": "pt",
  nl: "nl",
  "nl-nl": "nl",
  "nl-be": "be",
  ja: "jp",
  "ja-jp": "jp",
  ko: "kr",
  "ko-kr": "kr",
  sv: "se",
  "sv-se": "se",
  da: "dk",
  "da-dk": "dk",
  nb: "no",
  "nb-no": "no",
  fi: "fi",
  "fi-fi": "fi",
  pl: "pl",
  "pl-pl": "pl",
};

/**
 * Extract the country code (lowercase ISO 3166-1 alpha-2) from a locale string.
 * Falls back to "us" if no known mapping exists.
 */
function getCountryCode(locale: string): string {
  const lower = locale.toLowerCase();
  // Try exact match first (e.g. "en-gb")
  const exact = LANG_TO_COUNTRY[lower];
  if (exact) return exact;

  // Try language-only (e.g. "en" from "en-GB")
  const lang = lower.split("-")[0] ?? lower;
  const byLang = LANG_TO_COUNTRY[lang];
  if (byLang) return byLang;

  // If the locale has a region part, use it directly (e.g. "zh-TW" → "tw")
  const parts = lower.split("-");
  if (parts.length >= 2 && parts[1]) return parts[1];

  return "us";
}

/**
 * Get the primary language code from a locale string.
 * e.g. "fr-FR" → "fr", "en-US" → "en"
 */
function getLanguageCode(locale: string): string {
  return locale.toLowerCase().split("-")[0] ?? "en";
}

/**
 * Apple Music country path segment.
 * e.g. "fr" → "/fr/", "en-US" → "/us/"
 */
export function getAppleMusicLocale(locale: string): string {
  return getCountryCode(locale);
}

/**
 * Qobuz locale path segment (format: "{country}-{language}").
 * e.g. "fr" → "fr-fr", "en-GB" → "gb-en", "de" → "de-de"
 */
export function getQobuzLocale(locale: string): string {
  const country = getCountryCode(locale);
  const lang = getLanguageCode(locale);
  return `${country}-${lang}`;
}

/**
 * Amazon TLD for a given locale.
 * e.g. "fr" → "amazon.fr", "en-GB" → "amazon.co.uk", "de" → "amazon.de"
 */
export function getAmazonDomain(locale: string): string {
  const country = getCountryCode(locale);
  const COUNTRY_TO_DOMAIN: Record<string, string> = {
    us: "www.amazon.com",
    gb: "www.amazon.co.uk",
    fr: "www.amazon.fr",
    de: "www.amazon.de",
    it: "www.amazon.it",
    es: "www.amazon.es",
    ca: "www.amazon.ca",
    jp: "www.amazon.co.jp",
    au: "www.amazon.com.au",
    br: "www.amazon.com.br",
    mx: "www.amazon.com.mx",
    nl: "www.amazon.nl",
    se: "www.amazon.se",
    pl: "www.amazon.pl",
    be: "www.amazon.com.be",
    at: "www.amazon.de", // Austria → German Amazon
    ch: "www.amazon.de", // Switzerland → German Amazon
  };
  return COUNTRY_TO_DOMAIN[country] ?? "www.amazon.com";
}
