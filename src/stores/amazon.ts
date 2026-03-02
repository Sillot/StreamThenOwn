/**
 * Amazon store link resolver.
 *
 * Uses the Amazon URL from MusicBrainz relations when available,
 * otherwise falls back to a search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";

export function resolveAmazon(query: StoreQuery, mbUrl?: string): StoreLink {
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(mbUrl, true);
  }

  // Search URL fallback — Amazon Music / physical
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(`https://www.amazon.com/s?k=${q}&i=popular`, false);
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
