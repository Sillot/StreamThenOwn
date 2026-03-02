/**
 * Shared types for store link generation.
 */

/** A single purchase link for a store. */
export interface StoreLink {
  store: string;
  /** Human-readable store name */
  label: string;
  /** Format description (e.g. "Vinyl & Physical") */
  format: string;
  /** The URL to the store page (direct link or search fallback) */
  url: string;
  /** Whether this is a direct link (API-resolved) or a search fallback */
  isDirect: boolean;
}

/** The result set returned for a given query. */
export interface StoreLinksResult {
  artist: string;
  album: string;
  links: StoreLink[];
}

/** Input query for store search. */
export interface StoreQuery {
  artist: string;
  album?: string;
  /** Browser locale (e.g. "fr", "en-US") for adapting store URLs. */
  locale?: string;
}

/** MusicBrainz external URLs extracted from release relations. */
export interface ExternalUrls {
  discogs?: string;
  amazon?: string;
  qobuz?: string;
  bandcamp?: string;
  itunes?: string;
}
