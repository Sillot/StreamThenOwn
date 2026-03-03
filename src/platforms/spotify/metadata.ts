/**
 * Spotify Web Player metadata extractor.
 *
 * Scrapes artist/album info from the Spotify DOM using `data-testid`
 * attributes and known CSS selectors.
 */

import type { MetadataExtractor, MusicMetadata } from "../types";

/* ------------------------------------------------------------------ */
/*  URL helpers                                                       */
/* ------------------------------------------------------------------ */

/** Spotify may prefix paths with a locale segment, e.g. /intl-fr/album/… */
function pathWithoutLocale(): string {
  return location.pathname.replace(/^\/intl-[a-z]{2}(?:-[a-z]{2})?/i, "");
}

/**
 * Extract the locale from the Spotify URL path.
 * e.g. "/intl-fr/album/…" → "fr"
 */
function extractLocaleFromPath(): string | undefined {
  const match = /^\/intl-([a-z]{2})/i.exec(location.pathname);
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

export class SpotifyMetadataExtractor implements MetadataExtractor {
  extract(): MusicMetadata | null {
    if (isAlbumPage()) return this.extractAlbumPage();
    if (isTrackPage()) return this.extractTrackPage();
    return this.extractNowPlaying();
  }

  /* ---- Album page (/album/:id) ---- */

  private extractAlbumPage(): MusicMetadata | null {
    // Album title: entityTitle contains the text directly (no child h1)
    const titleEl = document.querySelector<HTMLElement>(
      '[data-testid="entityTitle"], [data-testid="albumTitle"]',
    );
    const album = titleEl?.textContent.trim();
    if (!album) return null;

    const artist = this.extractArtistFromHeader();
    if (!artist) return null;

    const locale = extractLocaleFromPath();
    return locale ? { album, artist, source: "album", locale } : { album, artist, source: "album" };
  }

  /* ---- Track page (/track/:id) ---- */

  private extractTrackPage(): MusicMetadata | null {
    const titleEl = document.querySelector<HTMLElement>('[data-testid="entityTitle"]');
    const trackName = titleEl?.textContent.trim();
    if (!trackName) return null;

    const artist = this.extractArtistFromHeader();
    if (!artist) return null;

    // Try to find the album name from the "appears on" or subtitle section
    const album = this.extractAlbumFromTrackPage();

    const locale = extractLocaleFromPath();
    const base = { ...(album ? { album } : {}), artist, source: "song" as const };
    return locale ? { ...base, locale } : base;
  }

  /* ---- Now-playing bar (bottom bar) ---- */

  private extractNowPlaying(): MusicMetadata | null {
    const bar = document.querySelector('[data-testid="now-playing-widget"]');
    if (!bar) return null;

    // Track/song link
    const trackLink = bar.querySelector<HTMLAnchorElement>(
      '[data-testid="context-item-link"], a[href*="/track/"]',
    );
    const artistLink = bar.querySelector<HTMLAnchorElement>(
      '[data-testid="context-item-info-subtitles"] a, a[href*="/artist/"]',
    );

    const artist = artistLink?.textContent.trim();
    if (!artist) return null;

    const trackName = trackLink?.textContent.trim();
    const locale = extractLocaleFromPath();
    const base = { ...(trackName ? { album: trackName } : {}), artist, source: "song" as const };
    return locale ? { ...base, locale } : base;
  }

  /* ---- Shared helpers ---- */

  /**
   * Extract artist name from the album/track header area.
   * Spotify uses `data-testid="creator-link"` for artist links.
   */
  private extractArtistFromHeader(): string | undefined {
    // Strategy 1: data-testid="creator-link"
    const creatorLink = document.querySelector<HTMLAnchorElement>('[data-testid="creator-link"]');
    const creatorText = creatorLink?.textContent.trim();
    if (creatorText && creatorText.length > 0 && creatorText.length < 200) {
      return creatorText;
    }

    // Strategy 2: subtitle area with artist links
    const subtitleLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/artist/"]');
    for (const link of subtitleLinks) {
      const text = link.textContent.trim();
      if (text && text.length > 0 && text.length < 200) {
        return text;
      }
    }

    return undefined;
  }

  /**
   * Try to find album name on a track page (from the "appears on" section
   * or album link in the track subtitle).
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
