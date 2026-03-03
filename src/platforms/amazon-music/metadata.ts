/**
 * Amazon Music metadata extractor.
 *
 * Scrapes artist/album info from Amazon Music's web player DOM.
 *
 * Album page structure — attributes on `<music-detail-header>`:
 *   <music-detail-header
 *     headline="Album Name"
 *     primary-text="Artist Name"
 *     primary-text-href="/artists/B…/artist-name"
 *     …
 *   >
 *
 * Now-playing bar (`music-horizontal-item` inside `#transport` / footer):
 *   primary-text  = track name
 *   secondary-text = artist name
 *
 * URL patterns:
 *   music.amazon.com/albums/B0xxxxx    → album page
 *   music.amazon.de/albums/B0xxxxx     → regional album page
 *
 * Regional domains (music.amazon.de, music.amazon.fr…) are used to
 * infer the user locale for store-link localisation.
 */

import type { MetadataExtractor, MusicMetadata } from "../types";

/* ------------------------------------------------------------------ */
/*  Locale helpers                                                    */
/* ------------------------------------------------------------------ */

/** Map regional Amazon Music TLDs to locale codes. */
const HOSTNAME_LOCALE: Readonly<Record<string, string>> = {
  "music.amazon.co.uk": "en",
  "music.amazon.de": "de",
  "music.amazon.fr": "fr",
  "music.amazon.it": "it",
  "music.amazon.es": "es",
  "music.amazon.co.jp": "ja",
  "music.amazon.com.br": "pt",
  "music.amazon.nl": "nl",
  "music.amazon.se": "sv",
  "music.amazon.pl": "pl",
};

function extractLocale(): string | undefined {
  return HOSTNAME_LOCALE[location.hostname];
}

/* ------------------------------------------------------------------ */
/*  URL helpers                                                       */
/* ------------------------------------------------------------------ */

function isAlbumPage(): boolean {
  return location.pathname.startsWith("/albums/");
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class AmazonMusicMetadataExtractor implements MetadataExtractor {
  extract(): MusicMetadata | null {
    if (isAlbumPage()) return this.extractAlbumPage();
    return this.extractNowPlaying();
  }

  /* ---- Album page (/albums/:id) ---- */

  private extractAlbumPage(): MusicMetadata | null {
    // Amazon Music may render several <music-detail-header> elements.
    // The one carrying the album data has a `headline` attribute.
    const header = document.querySelector<HTMLElement>("music-detail-header[headline]");
    if (!header) return null;

    const album = header.getAttribute("headline")?.trim();
    if (!album || album.length === 0 || album.length >= 200) return null;

    const artist = header.getAttribute("primary-text")?.trim();
    if (!artist || artist.length === 0 || artist.length >= 200) return null;

    const locale = extractLocale();
    return locale ? { album, artist, source: "album", locale } : { album, artist, source: "album" };
  }

  /* ---- Now-playing bar (bottom player) ---- */

  private extractNowPlaying(): MusicMetadata | null {
    // Strategy 1: music-horizontal-item in the player transport area
    const playerItem = document.querySelector(
      "#transport music-horizontal-item, " +
        "music-player music-horizontal-item, " +
        "footer music-horizontal-item",
    );
    if (playerItem) {
      const trackName = playerItem.getAttribute("primary-text")?.trim();
      const artistName = playerItem.getAttribute("secondary-text")?.trim();
      if (artistName && artistName.length > 0 && artistName.length < 200) {
        const locale = extractLocale();
        const base = {
          ...(trackName ? { album: trackName } : {}),
          artist: artistName,
          source: "song" as const,
        };
        return locale ? { ...base, locale } : base;
      }
    }

    // Strategy 2: now-playing widget with artist links
    const nowPlaying = document.querySelector('[id*="now-playing"], [data-testid="now-playing"]');
    if (nowPlaying) {
      const artistEl = nowPlaying.querySelector<HTMLAnchorElement>('a[href*="/artists/"]');
      const artist = artistEl?.textContent.trim();
      if (!artist) return null;

      const trackEl = nowPlaying.querySelector<HTMLAnchorElement>('a[href*="/albums/"]');
      const trackName = trackEl?.textContent.trim();
      const locale = extractLocale();
      const base = {
        ...(trackName ? { album: trackName } : {}),
        artist,
        source: "song" as const,
      };
      return locale ? { ...base, locale } : base;
    }

    return null;
  }
}
