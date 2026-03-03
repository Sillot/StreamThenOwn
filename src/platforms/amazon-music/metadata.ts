/**
 * Amazon Music metadata extractor.
 *
 * Scrapes artist/album info from Amazon Music's web player DOM.
 *
 * Album page structure (`#detailHeaderContainer`):
 *   <div id="detailHeaderContainer">
 *     <header>
 *       <h1 title="Album Name">Album Name</h1>
 *       <p><music-link><a href="/artists/B…/artist-name">Artist</a></music-link></p>
 *     </header>
 *   </div>
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
    // The detail header container wraps a <header> with <h1> + artist <a>
    const container =
      document.querySelector("#detailHeaderContainer") ??
      document.querySelector("music-detail-header");
    if (!container) return null;

    const album = this.extractAlbumTitle(container);
    if (!album) return null;

    const artist = this.extractArtistFromHeader(container);
    if (!artist) return null;

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

  /* ---- Shared helpers ---- */

  /**
   * Extract album title from the detail header.
   * Real DOM: `<h1 title="…">Album Name</h1>` inside `#detailHeaderContainer header`.
   * Fallback: `headline` attribute on `<music-detail-header>`.
   */
  private extractAlbumTitle(container: Element): string | undefined {
    // Strategy 1: <h1> inside the header (real Amazon Music DOM)
    const h1 = container.querySelector<HTMLElement>("h1");
    const h1Text = h1?.textContent.trim();
    if (h1Text && h1Text.length > 0 && h1Text.length < 200) {
      return h1Text;
    }

    // Strategy 2: headline attribute on <music-detail-header> (legacy/fallback)
    const headline = container.getAttribute("headline")?.trim();
    if (headline && headline.length > 0 && headline.length < 200) {
      return headline;
    }

    return undefined;
  }

  /**
   * Extract artist name from the detail header.
   * Real DOM: `<a href="/artists/…">Artist</a>` inside a `<music-link>`.
   * Fallback: `primary-text` attribute on `<music-detail-header>`.
   */
  private extractArtistFromHeader(container: Element): string | undefined {
    // Strategy 1: artist link inside the header
    const artistLink = container.querySelector<HTMLAnchorElement>('a[href*="/artists/"]');
    const linkText = artistLink?.textContent.trim();
    if (linkText && linkText.length > 0 && linkText.length < 200) {
      return linkText;
    }

    // Strategy 2: primary-text attribute (legacy/fallback)
    const primaryText = container.getAttribute("primary-text")?.trim();
    if (primaryText && primaryText.length > 0 && primaryText.length < 200) {
      return primaryText;
    }

    // Strategy 3: any artist link on the page
    const anyArtistLink = document.querySelector<HTMLAnchorElement>('a[href*="/artists/"]');
    const anyText = anyArtistLink?.textContent.trim();
    if (anyText && anyText.length > 0 && anyText.length < 200) {
      return anyText;
    }

    return undefined;
  }
}
