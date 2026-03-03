/**
 * YouTube Music metadata extractor.
 *
 * Scrapes artist/album info from the YTM DOM using multiple selector
 * strategies (album header, player bar).
 */

import type { MetadataExtractor, MusicMetadata } from "../types";

/* ------------------------------------------------------------------ */
/*  Selector lists                                                    */
/* ------------------------------------------------------------------ */

const HEADER_SELECTORS = [
  "ytmusic-immersive-header-renderer",
  "ytmusic-detail-header-renderer",
  "ytmusic-responsive-header-renderer",
  "ytmusic-header-renderer",
  "#header.ytmusic-detail-header-renderer",
  "#header",
];

const ALBUM_TITLE_SELECTORS = [
  "h2 yt-formatted-string",
  ".title yt-formatted-string",
  "yt-formatted-string.title",
  ".title.ytmusic-detail-header-renderer",
  ".title.ytmusic-responsive-header-renderer",
  "h2.title",
  ".title",
  "h2",
];

const ARTIST_LINK_SELECTORS = [
  ".subtitle yt-formatted-string a",
  "yt-formatted-string.subtitle a",
  ".strapline yt-formatted-string a",
  ".strapline a",
  ".subtitle a",
  ".strapline-text yt-formatted-string a",
  ".strapline-text a",
  ".metadata a",
  ".header-detail a",
];

const ARTIST_TEXT_SELECTORS = [
  ".subtitle yt-formatted-string",
  "yt-formatted-string.subtitle",
  ".strapline yt-formatted-string",
  ".strapline-text yt-formatted-string",
  ".subtitle",
  ".strapline",
  ".strapline-text",
];

const BYLINE_SELECTORS = [
  ".content-info-wrapper .byline yt-formatted-string",
  ".content-info-wrapper yt-formatted-string.byline",
  ".content-info-wrapper .subtitle yt-formatted-string",
  ".content-info-wrapper .byline",
  ".content-info-wrapper .subtitle",
  "yt-formatted-string.byline",
  ".byline",
];

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class YtmMetadataExtractor implements MetadataExtractor {
  extract(): MusicMetadata | null {
    return this.extractAlbumPage() ?? this.extractCurrentSong();
  }

  /* ---- Album page ---- */

  private extractAlbumPage(): MusicMetadata | null {
    let header: Element | null = null;
    for (const sel of HEADER_SELECTORS) {
      header = document.querySelector(sel);
      if (header) break;
    }
    if (!header) return null;

    const album = extractText(header, ALBUM_TITLE_SELECTORS);
    const artist = this.extractArtist(header);
    if (!artist) return null;

    return { ...(album ? { album } : {}), artist, source: "album" as const };
  }

  private extractArtist(header: Element): string | undefined {
    // Strategy 1: subtitle/strapline links
    for (const sel of ARTIST_LINK_SELECTORS) {
      const link = header.querySelector<HTMLAnchorElement>(sel);
      const text = link?.textContent.trim();
      if (text !== undefined && text.length > 0 && text.length < 200) {
        return text;
      }
    }

    // Strategy 2: subtitle/strapline full text split
    for (const sel of ARTIST_TEXT_SELECTORS) {
      const el = header.querySelector<HTMLElement>(sel);
      const raw = el?.textContent.trim() ?? "";
      if (raw) {
        const parts = raw.split(/[•·\n]/);
        const candidate = parts[0] ?? "";
        const trimmed = candidate.trim();
        if (trimmed.length > 0 && trimmed.length < 200) {
          if (!/^\d{4}$/.test(trimmed) && !/^\d+ (?:song|titre|chanson)/i.test(trimmed)) {
            return trimmed;
          }
        }
      }
    }

    // Strategy 3: any <a> linking to a channel/artist page
    const anyArtistLink = header.querySelector<HTMLAnchorElement>(
      'a[href*="/channel/"], a[href*="browse/UC"]',
    );
    if (anyArtistLink?.textContent.trim()) {
      return anyArtistLink.textContent.trim();
    }

    return undefined;
  }

  /* ---- Currently playing song (player bar) ---- */

  private extractCurrentSong(): MusicMetadata | null {
    const playerBar = document.querySelector("ytmusic-player-bar");
    if (!playerBar) return null;

    // Strategy 1: byline text
    for (const sel of BYLINE_SELECTORS) {
      const el = playerBar.querySelector<HTMLElement>(sel);
      const text = el?.textContent.trim();
      if (text) {
        const segments = text.split(/\s*[•·]\s*/);
        const artist = (segments[0] ?? "").trim();
        const album = (segments[1] ?? "").trim();
        if (artist) {
          return { ...(album ? { album } : {}), artist, source: "song" as const };
        }
      }
    }

    // Strategy 2: links inside player bar
    const links = playerBar.querySelectorAll<HTMLAnchorElement>(
      '.content-info-wrapper a[href*="channel"], .content-info-wrapper a[href*="browse"], .content-info-wrapper a',
    );
    for (const link of links) {
      const text = link.textContent.trim();
      if (text && text.length > 0 && text.length < 200) {
        return { artist: text, source: "song" };
      }
    }

    // Strategy 3: span.subtitle inside player bar
    const subtitle = playerBar.querySelector<HTMLElement>("span.subtitle, .subtitle");
    if (subtitle?.textContent.trim()) {
      const segments = subtitle.textContent.trim().split(/\s*[•·]\s*/);
      const artist = (segments[0] ?? "").trim();
      if (artist) {
        const albumText = (segments[1] ?? "").trim();
        return {
          ...(albumText ? { album: albumText } : {}),
          artist,
          source: "song" as const,
        };
      }
    }

    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function extractText(root: Element, selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const el = root.querySelector<HTMLElement>(sel);
    const text = el?.textContent.trim();
    if (text && text.length > 0) {
      return text;
    }
  }
  return undefined;
}
