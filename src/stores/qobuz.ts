/**
 * Qobuz store link resolver.
 *
 * No public search API available — we rely on MusicBrainz URL relations
 * or fall back to a Qobuz search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";

export function resolveQobuz(query: StoreQuery, mbUrl?: string): StoreLink {
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(mbUrl, true);
  }

  // Search URL fallback
  const q = encodeURIComponent(query.album ?? query.artist);
  return makeLink(`https://www.qobuz.com/fr-fr/search/albums/${q}`, false);
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
