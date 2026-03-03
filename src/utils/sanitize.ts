/**
 * Security utilities for URL and data validation.
 */

/** Allowed URL protocols for store links. */
const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * Allowed hostnames (and subdomains) for direct store links.
 * Only URLs from these domains are accepted as "direct" links.
 */
const ALLOWED_HOSTS = [
  "discogs.com",
  "qobuz.com",
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.co.jp",
  "amazon.ca",
  "amazon.com.au",
  "amazon.com.br",
  "amazon.com.mx",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.com.be",
  "bandcamp.com",
  "ebay.com",
  "ebay.co.uk",
  "ebay.de",
  "ebay.fr",
  "ebay.it",
  "ebay.es",
  "ebay.com.au",
  "ebay.ca",
  "ebay.nl",
  "ebay.at",
  "ebay.pl",
  "7digital.com",
  "fnac.com",
  "musicbrainz.org",
] as const;

/**
 * Validate that a URL uses an allowed protocol (https/http).
 * Returns the URL if valid, or a safe fallback otherwise.
 *
 * This prevents `javascript:`, `data:`, `blob:`, and other
 * dangerous URI schemes from being injected into the DOM.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return url;
    }
  } catch {
    // Malformed URL
  }
  return "about:blank";
}

/**
 * Validate that a direct URL points to one of the known store domains.
 * Returns `true` if the hostname ends with one of the allowed hosts.
 *
 * This prevents a compromised API from redirecting users to
 * a phishing domain via a crafted MusicBrainz relation.
 */
export function isAllowedStoreHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return false;
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

/**
 * Validate a custom search provider URL template.
 *
 * Rules:
 *  - Must use `https:` protocol.
 *  - Must contain the `{artist}` placeholder.
 *  - Must be a parseable URL once placeholders are substituted with dummy values.
 *
 * @returns `true` if the template is valid.
 */
export function isValidSearchUrlTemplate(template: string): boolean {
  // Must contain at least {artist}
  if (!template.includes("{artist}")) return false;

  // Substitute placeholders with safe dummy values for URL parsing
  const testUrl = template
    .replaceAll("{artist}", "test-artist")
    .replaceAll("{album}", "test-album");

  try {
    const parsed = new URL(testUrl);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
