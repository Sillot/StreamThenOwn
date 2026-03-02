/**
 * Discogs store link resolver.
 *
 * Strategy:
 *  1. If MusicBrainz gave us a direct Discogs URL → use it.
 *  2. Else → search Discogs API for the release (unauthenticated, 25 req/min).
 *  3. Last resort → generate a search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";

const DISCOGS_API = "https://api.discogs.com";

interface DiscogsSearchResult {
  results: {
    id: number;
    title: string;
    uri: string;
    resource_url: string;
    type: string;
  }[];
}

/**
 * Resolve a Discogs purchase link.
 */
export async function resolveDiscogs(query: StoreQuery, mbUrl?: string): Promise<StoreLink> {
  // 1. Direct from MusicBrainz (validate host)
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(mbUrl, true);
  }

  // 2. Search Discogs API
  try {
    const searchTerm = query.album ? `${query.artist} ${query.album}` : query.artist;
    const params = new URLSearchParams({
      q: searchTerm,
      type: "release",
      per_page: "3",
    });

    const res = await fetch(`${DISCOGS_API}/database/search?${params}`, {
      headers: {
        "User-Agent": "StreamThenOwn/1.0.0",
      },
    });

    if (res.ok) {
      const data = (await res.json()) as DiscogsSearchResult;
      if (data.results.length) {
        const best = data.results[0];
        if (best) {
          const url = `https://www.discogs.com${best.uri}`;
          if (isAllowedStoreHost(url)) {
            return makeLink(url, true);
          }
        }
      }
    }
  } catch {
    // Fallback below
  }

  // 3. Search URL fallback
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
