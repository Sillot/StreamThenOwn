/**
 * Locale utilities for adapting store URLs to the user's language/region.
 *
 * Accepts either a BCP-47 language tag (e.g. "fr", "en-US") from
 * `navigator.language`, or a plain ISO 3166-1 alpha-2 country code
 * (e.g. "gb", "jp") extracted from a platform URL such as Apple Music.
 */

/** Language / locale → ISO 3166-1 alpha-2 country code. */
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
  // Normalise: chrome.i18n.getUILanguage() may return "fr_FR" (underscore)
  const lower = locale.toLowerCase().replace(/_/g, "-");
  // Try exact match first (e.g. "en-gb", "fr", "es")
  const exact = LANG_TO_COUNTRY[lower];
  if (exact) return exact;

  // Try language-only (e.g. "en" from "en-GB")
  const lang = lower.split("-")[0] ?? lower;
  const byLang = LANG_TO_COUNTRY[lang];
  if (byLang) return byLang;

  // If the locale has a region part, use it directly (e.g. "zh-TW" → "tw")
  const parts = lower.split("-");
  if (parts.length >= 2 && parts[1]) return parts[1];

  // If it's a 2-letter code not in our language map, treat it as a
  // country code (e.g. "gb", "jp", "br" from Apple Music URL prefixes).
  if (lang.length === 2) return lang;

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

/**
 * eBay domain for a given locale.
 * e.g. "fr" → "www.ebay.fr", "en-GB" → "www.ebay.co.uk", "de" → "www.ebay.de"
 */
export function getEbayDomain(locale: string): string {
  const country = getCountryCode(locale);
  const COUNTRY_TO_DOMAIN: Record<string, string> = {
    us: "www.ebay.com",
    gb: "www.ebay.co.uk",
    fr: "www.ebay.fr",
    de: "www.ebay.de",
    it: "www.ebay.it",
    es: "www.ebay.es",
    ca: "www.ebay.ca",
    jp: "www.ebay.co.jp",
    au: "www.ebay.com.au",
    nl: "www.ebay.nl",
    pl: "www.ebay.pl",
    be: "www.ebay.be",
    at: "www.ebay.at",
    ch: "www.ebay.ch",
    se: "www.ebay.com", // No Swedish eBay — use global
    br: "www.ebay.com", // No Brazilian eBay — use global
    mx: "www.ebay.com", // No Mexican eBay — use global
    dk: "www.ebay.com", // No Danish eBay — use global
    no: "www.ebay.com", // No Norwegian eBay — use global
    fi: "www.ebay.com", // No Finnish eBay — use global
    kr: "www.ebay.com", // No Korean eBay — use global
  };
  return COUNTRY_TO_DOMAIN[country] ?? "www.ebay.com";
}

/* ------------------------------------------------------------------ */
/*  Country code → BCP-47 locale                                      */
/* ------------------------------------------------------------------ */

/**
 * Map from ISO 3166-1 alpha-2 country code to BCP-47 locale.
 * Only entries where the primary language differs from the country code
 * need to be listed; everything else maps to `{cc}-{CC}` automatically.
 */
const COUNTRY_TO_LANG: Record<string, string> = {
  us: "en",
  gb: "en",
  au: "en",
  ca: "en", // could be French, but English is the default
  br: "pt",
  jp: "ja",
  kr: "ko",
  se: "sv",
  dk: "da",
  no: "nb",
  at: "de",
  ch: "de",
  mx: "es",
  be: "nl",
};

/**
 * Convert a bare country code (e.g. from an Apple Music URL prefix)
 * to a BCP-47 locale string the rest of the locale module understands.
 *
 * Examples: "gb" → "en-gb", "jp" → "ja-jp", "fr" → "fr-fr", "es" → "es-es"
 */
export function countryCodeToLocale(cc: string): string {
  const lower = cc.toLowerCase();
  const lang = COUNTRY_TO_LANG[lower] ?? lower;
  return `${lang}-${lower}`;
}
