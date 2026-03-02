/**
 * Bandcamp store link resolver.
 *
 * No public search API — we rely on MusicBrainz URL relations
 * or fall back to a Bandcamp search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";

export function resolveBandcamp(query: StoreQuery, mbUrl?: string): StoreLink {
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(mbUrl, true);
  }

  // Search URL fallback
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(`https://bandcamp.com/search?q=${q}&item_type=a`, false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "bandcamp",
    label: "Bandcamp",
    format: "digitalAndPhysical",
    url,
    isDirect,
  };
}
