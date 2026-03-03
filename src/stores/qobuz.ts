/**
 * Qobuz store link resolver.
 *
 * No public search API available — we rely on MusicBrainz URL relations
 * or fall back to a Qobuz search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";
import { wrapAwinUrl } from "../config/affiliate";
import { getQobuzLocale } from "../utils/locale";

/**
 * Rewrite a Qobuz URL to the user's locale.
 * e.g. qobuz.com/gb-en/album/… → qobuz.com/fr-fr/album/… for a French user.
 */
function localizeQobuzUrl(url: string, locale: string): string {
  const targetLocale = getQobuzLocale(locale);
  try {
    const parsed = new URL(url);
    // Qobuz paths start with /{country}-{lang}/…  — replace the locale segment
    parsed.pathname = parsed.pathname.replace(/^\/[a-z]{2}-[a-z]{2}\//i, `/${targetLocale}/`);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolveQobuz(query: StoreQuery, mbUrl?: string): StoreLink {
  const locale = query.locale ?? "en";

  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(wrapAwinUrl(localizeQobuzUrl(mbUrl, locale)), true);
  }

  // Search URL fallback — locale-aware
  const qobuzLocale = getQobuzLocale(locale);
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(wrapAwinUrl(`https://www.qobuz.com/${qobuzLocale}/search/albums/${q}`), false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "qobuz",
    label: "Qobuz",
    format: "hiResDigital", // i18n key
    url,
    isDirect,
  };
}
