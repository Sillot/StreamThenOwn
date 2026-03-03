/**
 * Deezer Web Player metadata extractor.
 *
 * Scrapes artist/album info from the Deezer DOM.
 * Deezer URLs follow the patterns:
 *   /album/1234567           → album page
 *   /track/1234567           → track page
 *   /fr/album/1234567        → locale-prefixed album page
 *
 * The player bar at the bottom always shows the current track/artist.
 */

import type { MetadataExtractor, MusicMetadata } from "../types";

/* ------------------------------------------------------------------ */
/*  URL helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Deezer may prefix paths with a locale segment, e.g. /fr/album/…
 * Strip it to get a canonical path like /album/…
 */
function pathWithoutLocale(): string {
  return location.pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/)/i, "");
}

/**
 * Extract the locale from the Deezer URL path.
 * e.g. "/fr/album/…" → "fr"
 */
function extractLocaleFromPath(): string | undefined {
  const match = /^\/([a-z]{2})(?=\/)/i.exec(location.pathname);
  return match?.[1]?.toLowerCase();
}

function isAlbumPage(): boolean {
  return pathWithoutLocale().startsWith("/album/");
}

function isTrackPage(): boolean {
  return pathWithoutLocale().startsWith("/track/");
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class DeezerMetadataExtractor implements MetadataExtractor {
  extract(): MusicMetadata | null {
    if (isAlbumPage()) return this.extractAlbumPage();
    if (isTrackPage()) return this.extractTrackPage();
    return this.extractNowPlaying();
  }

  /* ---- Album page (/album/:id) ---- */

  private extractAlbumPage(): MusicMetadata | null {
    const album = this.extractAlbumTitle();
    if (!album) return null;

    const artist = this.extractArtistFromHeader();
    if (!artist) return null;

    const locale = extractLocaleFromPath();
    return locale ? { album, artist, source: "album", locale } : { album, artist, source: "album" };
  }

  /* ---- Track page (/track/:id) ---- */

  private extractTrackPage(): MusicMetadata | null {
    // Deezer uses h2.chakra-heading inside the masthead for the track title
    const titleEl = document.querySelector<HTMLElement>(
      '[data-testid="masthead"] h2.chakra-heading, [data-testid="masthead"] h1, h1, h2.chakra-heading',
    );
    const trackName = titleEl?.textContent.trim();
    if (!trackName) return null;

    const artist = this.extractArtistFromHeader();
    if (!artist) return null;

    // Try to find the album name from the track page
    const album = this.extractAlbumFromTrackPage();

    const locale = extractLocaleFromPath();
    const base = { ...(album ? { album } : {}), artist, source: "song" as const };
    return locale ? { ...base, locale } : base;
  }

  /* ---- Now-playing bar (bottom bar) ---- */

  private extractNowPlaying(): MusicMetadata | null {
    const player =
      document.querySelector('[class*="PlayerBar"]') ??
      document.querySelector(".page-player") ??
      document.querySelector('[data-testid="player"]');
    if (!player) return null;

    // Track link in the player bar
    const trackEl = player.querySelector<HTMLElement>(
      'a[href*="/track/"], [class*="TrackName"], [data-testid="item_title"]',
    );
    // Artist link in the player bar
    const artistEl = player.querySelector<HTMLElement>(
      'a[href*="/artist/"], [data-testid="item_subtitle"]',
    );

    const artist = artistEl?.textContent.trim();
    if (!artist) return null;

    const trackName = trackEl?.textContent.trim();
    const locale = extractLocaleFromPath();
    const base = { ...(trackName ? { album: trackName } : {}), artist, source: "song" as const };
    return locale ? { ...base, locale } : base;
  }

  /* ---- Shared helpers ---- */

  private extractAlbumTitle(): string | undefined {
    // Deezer uses h2.chakra-heading inside the masthead for the album title
    const heading = document.querySelector<HTMLElement>(
      '[data-testid="masthead"] h2.chakra-heading, [data-testid="masthead"] h1',
    );
    const headingText = heading?.textContent.trim();
    if (headingText && headingText.length > 0 && headingText.length < 200) {
      return headingText;
    }

    // Fallback: any h1 or h2 heading on the page
    const fallback = document.querySelector<HTMLElement>("h1, h2.chakra-heading");
    const fallbackText = fallback?.textContent.trim();
    if (fallbackText && fallbackText.length > 0 && fallbackText.length < 200) {
      return fallbackText;
    }

    return undefined;
  }

  private extractArtistFromHeader(): string | undefined {
    // Strategy 1: data-testid="creator-name" (Deezer's primary artist link)
    const creatorLink = document.querySelector<HTMLAnchorElement>('[data-testid="creator-name"]');
    const creatorText = creatorLink?.textContent.trim();
    if (creatorText && creatorText.length > 0 && creatorText.length < 200) {
      return creatorText;
    }

    // Strategy 2: artist link inside the masthead subtitle area
    const mastheadLink = document.querySelector<HTMLAnchorElement>(
      '[data-testid="masthead-subtitle"] a[href*="/artist/"]',
    );
    const mastheadText = mastheadLink?.textContent.trim();
    if (mastheadText && mastheadText.length > 0 && mastheadText.length < 200) {
      return mastheadText;
    }

    // Strategy 3: any artist link on the page with text content
    const anyArtistLink = document.querySelector<HTMLAnchorElement>('a[href*="/artist/"]');
    const anyText = anyArtistLink?.textContent.trim();
    if (anyText && anyText.length > 0 && anyText.length < 200) {
      return anyText;
    }

    return undefined;
  }

  /**
   * Try to find album name on a track page — Deezer shows album links
   * in the track details area.
   */
  private extractAlbumFromTrackPage(): string | undefined {
    const albumLink = document.querySelector<HTMLAnchorElement>('a[href*="/album/"]');
    const text = albumLink?.textContent.trim();
    if (text && text.length > 0 && text.length < 200) {
      return text;
    }
    return undefined;
  }
}
