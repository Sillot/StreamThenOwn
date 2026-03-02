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

export function resolveQobuz(query: StoreQuery, mbUrl?: string): StoreLink {
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(wrapAwinUrl(mbUrl), true);
  }

  // Search URL fallback — locale-aware
  const locale = getQobuzLocale(query.locale ?? "en");
  const q = encodeURIComponent(query.album ?? query.artist);
  return makeLink(wrapAwinUrl(`https://www.qobuz.com/${locale}/search/albums/${q}`), false);
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
