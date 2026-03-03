/**
 * MusicBrainz API client.
 *
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 * Rate limit: 1 req/sec (we add polite delays).
 * No API key needed — just a descriptive User-Agent.
 */

import type { ExternalUrls } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "StreamThenOwn/1.0.0 (browser-extension)";

/** Minimum delay between MusicBrainz requests (ms). */
let lastRequestTime = 0;
const MIN_INTERVAL = 1100; // respect 1 req/sec

/** Default timeout for MusicBrainz API requests (ms). */
const FETCH_TIMEOUT = 10_000;

/**
 * In-flight request deduplication map.
 * Prevents duplicate concurrent requests to the same MusicBrainz path.
 */
const inflight = new Map<string, Promise<unknown>>();

async function mbFetch<T>(path: string): Promise<T> {
  // Deduplicate: if the same path is already in-flight, reuse the promise
  const existing = inflight.get(path) as Promise<T> | undefined;
  if (existing) return existing;

  const request = mbFetchInternal<T>(path);
  inflight.set(path, request);

  try {
    return await request;
  } finally {
    inflight.delete(path);
  }
}

async function mbFetchInternal<T>(path: string): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequestTime));
  if (wait > 0) await delay(wait);
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT);

  try {
    const res = await fetch(`${MB_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`MusicBrainz ${String(res.status)}: ${res.statusText}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  Search for a release                                              */
/* ------------------------------------------------------------------ */

interface MBReleaseSearchResult {
  releases: MBRelease[];
  count: number;
}

interface MBRelease {
  id: string;
  title: string;
  "artist-credit"?: { name: string }[];
  date?: string;
  status?: string;
  score?: number;
}

/**
 * Search MusicBrainz for a release matching artist + album.
 * Returns the best-matching release ID, or null.
 */
export async function searchRelease(artist: string, album: string): Promise<string | null> {
  const query = encodeURIComponent(`artist:"${artist}" AND release:"${album}"`);
  const data = await mbFetch<MBReleaseSearchResult>(`/release/?query=${query}&limit=5&fmt=json`);

  if (!data.releases.length) return null;

  // Prefer "Official" releases with the highest score
  const best =
    data.releases.find((r) => r.status === "Official" && (r.score ?? 0) >= 80) ?? data.releases[0];

  return best?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  Get external URLs from release relations                          */
/* ------------------------------------------------------------------ */

interface MBReleaseDetail {
  id: string;
  relations?: MBRelation[];
}

interface MBRelation {
  type: string;
  url?: { resource: string };
}

/**
 * Given a release MBID, fetch its URL relations and extract
 * external store URLs (Discogs, Amazon, Qobuz, etc.)
 */
export async function getReleaseUrls(releaseId: string): Promise<ExternalUrls> {
  const data = await mbFetch<MBReleaseDetail>(`/release/${releaseId}?inc=url-rels&fmt=json`);

  const urls: ExternalUrls = {};

  for (const rel of data.relations ?? []) {
    const href = rel.url?.resource;
    if (!href) continue;

    if (href.includes("discogs.com") && isAllowedStoreHost(href)) {
      urls.discogs = href;
    } else if (href.includes("amazon.") && isAllowedStoreHost(href)) {
      urls.amazon = href;
    } else if (href.includes("qobuz.com") && isAllowedStoreHost(href)) {
      urls.qobuz = href;
    } else if (href.includes("bandcamp.com") && isAllowedStoreHost(href)) {
      urls.bandcamp = href;
    }
  }

  return urls;
}
