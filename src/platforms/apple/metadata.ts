/**
 * Apple Music metadata extractor.
 *
 * Scrapes artist/album info from the Apple Music DOM.
 * Apple Music URLs follow the pattern:
 *   /fr/album/album-name/1234567890         → album page
 *   /fr/album/album-name/1234567890?i=9876  → specific song on album
 */

import type { MetadataExtractor, MusicMetadata } from "../types";
import { countryCodeToLocale } from "../../utils/locale";

/* ------------------------------------------------------------------ */
/*  URL helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Apple Music prefixes paths with a country code: /fr/album/…, /us/album/…
 * Strip it to get a canonical path like /album/…
 */
/**
 * Extract the locale from the Apple Music URL country-code prefix.
 * Converts the bare country code to a BCP-47 locale string.
 * e.g. \"/es/album/…\" → \"es-es\", \"/gb/album/…\" → \"en-gb\"
 */
function extractLocaleFromPath(): string | undefined {
  const match = /^\/([a-z]{2})(?:\/|$)/i.exec(location.pathname);
  const cc = match?.[1];
  return cc ? countryCodeToLocale(cc) : undefined;
}

function pathWithoutLocale(): string {
  return location.pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?/i, "");
}

function isAlbumPage(): boolean {
  return pathWithoutLocale().startsWith("/album/");
}

/** A song page is an album page with an `?i=` query parameter. */
function isSongOnAlbumPage(): boolean {
  return isAlbumPage() && new URLSearchParams(location.search).has("i");
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class AppleMetadataExtractor implements MetadataExtractor {
  extract(): MusicMetadata | null {
    if (isAlbumPage()) return this.extractAlbumPage();
    return this.extractNowPlaying();
  }

  /* ---- Album page (/album/:slug/:id or ?i=…) ---- */

  private extractAlbumPage(): MusicMetadata | null {
    const album = this.extractAlbumTitle();
    if (!album) return null;

    const artist = this.extractArtistFromHeader();
    if (!artist) return null;

    const source = isSongOnAlbumPage() ? "song" : "album";
    const locale = extractLocaleFromPath();
    return locale ? { album, artist, source, locale } : { album, artist, source };
  }

  /* ---- Now-playing bar (bottom bar) ---- */

  private extractNowPlaying(): MusicMetadata | null {
    // Apple Music's player bar at the bottom
    const playerBar =
      document.querySelector(".web-chrome-playback-controls") ??
      document.querySelector("[class*='playback-controls']");
    if (!playerBar) return null;

    const trackEl = playerBar.querySelector<HTMLElement>(
      ".web-chrome-playback-lcd__song-name, [class*='song-name']",
    );
    const artistEl = playerBar.querySelector<HTMLElement>(
      ".web-chrome-playback-lcd__sub-copy-scroll-link, [class*='artist']",
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
    // Strategy 1: heading with data-testid
    const testIdEl = document.querySelector<HTMLElement>(
      '[data-testid="non-truncated-shelf-title"]',
    );
    const testIdText = testIdEl?.textContent.trim();
    if (testIdText && testIdText.length > 0 && testIdText.length < 200) {
      return testIdText;
    }

    // Strategy 2: h1 inside the product/hero area
    const h1 = document.querySelector<HTMLElement>(
      ".headings__title h1, .product-hero h1, .product-page-header h1, h1[data-testid]",
    );
    const h1Text = h1?.textContent.trim();
    if (h1Text && h1Text.length > 0 && h1Text.length < 200) {
      return h1Text;
    }

    // Strategy 3: first h1 on the page (common for album pages)
    const firstH1 = document.querySelector<HTMLElement>("h1");
    const firstH1Text = firstH1?.textContent.trim();
    if (firstH1Text && firstH1Text.length > 0 && firstH1Text.length < 200) {
      return firstH1Text;
    }

    return undefined;
  }

  private extractArtistFromHeader(): string | undefined {
    // Strategy 1: artist link in header area
    const artistLink = document.querySelector<HTMLAnchorElement>(
      'a[href*="/artist/"][data-testid], .headings a[href*="/artist/"]',
    );
    const linkText = artistLink?.textContent.trim();
    if (linkText && linkText.length > 0 && linkText.length < 200) {
      return linkText;
    }

    // Strategy 2: any artist link on the page
    const anyArtistLink = document.querySelector<HTMLAnchorElement>('a[href*="/artist/"]');
    const anyText = anyArtistLink?.textContent.trim();
    if (anyText && anyText.length > 0 && anyText.length < 200) {
      return anyText;
    }

    return undefined;
  }
}
