/**
 * Discogs store link resolver.
 *
 * Strategy:
 *  1. If MusicBrainz gave us a direct Discogs URL → use it.
 *  2. Else → generate a search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";

/**
 * Resolve a Discogs purchase link.
 */
export function resolveDiscogs(query: StoreQuery, mbUrl?: string): StoreLink {
  // 1. Direct from MusicBrainz (validate host)
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(mbUrl, true);
  }

  // 2. Search URL fallback
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(`https://www.discogs.com/search/?q=${q}&type=release`, false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "discogs",
    label: "Discogs",
    format: "vinyl", // i18n key
    url,
    isDirect,
  };
}
