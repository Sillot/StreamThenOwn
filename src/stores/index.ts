/**
 * Store links orchestrator.
 *
 * Flow:
 *  1. Search MusicBrainz for the release
 *  2. If found → fetch URL relations (Discogs, Amazon, Qobuz)
 *  3. Resolve each store: direct link from MB relations → API fallback → search URL
 *  4. Return all links + cache result
 */

import { searchRelease, getReleaseUrls } from "./musicbrainz";
import { resolveDiscogs } from "./discogs";
import { resolveQobuz } from "./qobuz";
import { resolveAmazon } from "./amazon";
import { resolveBandcamp } from "./bandcamp";
import { resolveEbay } from "./ebay";
import { resolve7digital } from "./sevendigital";
import type {
  CustomSearchProvider,
  StoreLink,
  StoreLinksResult,
  StoreQuery,
  ExternalUrls,
} from "./types";

/** In-memory cache keyed by "artist||album" */
const cache = new Map<string, StoreLinksResult>();

function cacheKey(q: StoreQuery): string {
  return `${q.artist.toLowerCase()}||${(q.album ?? "").toLowerCase()}||${(q.locale ?? "").toLowerCase()}`;
}

/**
 * Resolve purchase links for a given artist + album.
 * Only resolves stores listed in `enabledStores`. Defaults to all.
 * Custom search providers are appended after built-in stores.
 */
export async function resolveStoreLinks(
  query: StoreQuery,
  enabledStores?: string[],
  customProviders?: CustomSearchProvider[],
): Promise<StoreLinksResult> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached) {
    // Filter cached result by enabled stores
    if (enabledStores) {
      return { ...cached, links: cached.links.filter((l) => enabledStores.includes(l.store)) };
    }
    return cached;
  }

  let externalUrls: ExternalUrls = {};

  // Step 1 + 2: MusicBrainz lookup
  if (query.album) {
    try {
      const releaseId = await searchRelease(query.artist, query.album);
      if (releaseId) {
        externalUrls = await getReleaseUrls(releaseId);
      }
    } catch (err) {
      console.warn("[StreamThenOwn] MusicBrainz lookup failed:", err);
    }
  }

  // Step 3: Resolve each store
  const allLinks: StoreLink[] = [];

  const discogs = resolveDiscogs(query, externalUrls.discogs);
  allLinks.push(discogs);

  const qobuz = resolveQobuz(query, externalUrls.qobuz);
  allLinks.push(qobuz);

  const amazon = resolveAmazon(query, externalUrls.amazon);
  allLinks.push(amazon);

  const bandcamp = resolveBandcamp(query, externalUrls.bandcamp);
  allLinks.push(bandcamp);

  const ebay = resolveEbay(query);
  allLinks.push(ebay);

  const sevendigital = resolve7digital(query);
  allLinks.push(sevendigital);

  // Step 4: Resolve custom search providers
  if (customProviders) {
    for (const provider of customProviders) {
      allLinks.push(resolveCustomProvider(query, provider));
    }
  }

  const fullResult: StoreLinksResult = {
    artist: query.artist,
    album: query.album ?? "",
    links: allLinks,
  };

  // Cache the full result (unfiltered)
  cache.set(key, fullResult);

  // Return filtered
  if (enabledStores) {
    return { ...fullResult, links: allLinks.filter((l) => enabledStores.includes(l.store)) };
  }
  return fullResult;
}

/* ------------------------------------------------------------------ */
/*  Custom search provider resolution                                 */
/* ------------------------------------------------------------------ */

/**
 * Build a `StoreLink` from a user-defined custom search provider.
 * Always produces a search-fallback URL (never a direct link).
 */
function resolveCustomProvider(query: StoreQuery, provider: CustomSearchProvider): StoreLink {
  const artist = encodeURIComponent(query.artist);
  const album = encodeURIComponent(query.album ?? "");
  const url = provider.searchUrlTemplate
    .replaceAll("{artist}", artist)
    .replaceAll("{album}", album);

  return {
    store: provider.id,
    label: provider.label,
    format: "customSearch",
    url,
    isDirect: false,
  };
}
