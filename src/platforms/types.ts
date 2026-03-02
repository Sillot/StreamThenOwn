/**
 * Platform adapter interfaces.
 *
 * Each streaming service (YouTube Music, Spotify, Deezer…) implements
 * these interfaces so the core content script stays platform-agnostic.
 */

import type { StoreLinksResult } from "../stores/types";

/* ------------------------------------------------------------------ */
/*  Metadata                                                          */
/* ------------------------------------------------------------------ */

/** Music metadata extracted from the streaming service page. */
export interface MusicMetadata {
  /** Album title (may be undefined when only a song is playing) */
  album?: string;
  /** Artist / band name */
  artist: string;
  /** The type of page the metadata was extracted from */
  source: "album" | "song";
}

/** Extracts artist/album metadata from the current page DOM. */
export interface MetadataExtractor {
  /** Try to extract metadata. Returns `null` if the page has no relevant info. */
  extract(): MusicMetadata | null;
}

/* ------------------------------------------------------------------ */
/*  UI injection                                                      */
/* ------------------------------------------------------------------ */

/** Handles injecting and managing the STO button + dropdown in the host page. */
export interface UIInjector {
  /**
   * Inject the STO action button into the page.
   * Should be idempotent (no-op if button already present).
   */
  injectButton(meta: MusicMetadata): Promise<void>;

  /** Remove the STO button and close any open menu. */
  cleanup(): void;

  /** Close the dropdown menu if open. */
  closeMenu(): void;

  /** Update the links data used by the dropdown. */
  setLinks(links: StoreLinksResult | null): void;
}

/* ------------------------------------------------------------------ */
/*  Platform adapter                                                  */
/* ------------------------------------------------------------------ */

/** Full adapter for a streaming platform. */
export interface PlatformAdapter {
  /** Human-readable platform name (e.g. "YouTube Music"). */
  readonly name: string;

  /** Metadata extractor instance. */
  readonly metadata: MetadataExtractor;

  /** UI injector instance. */
  readonly ui: UIInjector;

  /**
   * Start listening for SPA navigation events specific to this platform.
   * Calls `onNavigate` whenever the user navigates to a new page.
   */
  observeNavigation(onNavigate: () => void): void;
}
