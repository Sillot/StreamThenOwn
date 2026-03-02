/**
 * iTunes / Apple Music store link resolver.
 *
 * MusicBrainz often has iTunes/Apple Music URLs in release relations.
 * Falls back to an iTunes search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";
import { getAppleMusicLocale } from "../utils/locale";

export function resolveItunes(query: StoreQuery, mbUrl?: string): StoreLink {
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(mbUrl, true);
  }

  // Search URL fallback — locale-aware Apple Music search
  const country = getAppleMusicLocale(query.locale ?? "en");
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(`https://music.apple.com/${country}/search?term=${q}`, false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "itunes",
    label: "iTunes",
    format: "digital",
    url,
    isDirect,
  };
}
