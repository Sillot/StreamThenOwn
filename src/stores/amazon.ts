/**
 * Amazon store link resolver.
 *
 * Uses the Amazon URL from MusicBrainz relations when available,
 * otherwise falls back to a search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";
import { appendAmazonTag } from "../config/affiliate";
import { getAmazonDomain } from "../utils/locale";

/**
 * Rewrite an Amazon URL to the user's locale-specific domain.
 * e.g. amazon.com/dp/B123 → amazon.fr/dp/B123 for a French user.
 */
function localizeAmazonUrl(url: string, locale: string): string {
  const targetDomain = getAmazonDomain(locale);
  try {
    const parsed = new URL(url);
    // Only rewrite if the host is an Amazon domain
    if (!parsed.hostname.includes("amazon")) return url;
    parsed.hostname = targetDomain;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolveAmazon(query: StoreQuery, mbUrl?: string): StoreLink {
  const locale = query.locale ?? "en";

  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(appendAmazonTag(localizeAmazonUrl(mbUrl, locale)), true);
  }

  // Search URL fallback — locale-aware Amazon search
  const domain = getAmazonDomain(locale);
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(appendAmazonTag(`https://${domain}/s?k=${q}&i=popular`), false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "amazon",
    label: "Amazon",
    format: "cdAndMore", // i18n key
    url,
    isDirect,
  };
}
