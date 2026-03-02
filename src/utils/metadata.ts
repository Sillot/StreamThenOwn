/**
 * Represents music metadata extracted from the YouTube Music page.
 */
export interface MusicMetadata {
  /** Album title (may be undefined when only a song is playing) */
  album?: string;
  /** Artist / band name */
  artist: string;
  /** The type of page the metadata was extracted from */
  source: "album" | "song";
}

// const _LOG = "[STO/meta]";

/**
 * Attempts to extract metadata from the current YouTube Music page.
 */
export function extractMetadata(): MusicMetadata | null {
  const albumMeta = extractAlbumPage();
  if (albumMeta) return albumMeta;

  const songMeta = extractCurrentSong();
  if (songMeta) return songMeta;

  return null;
}

/* ------------------------------------------------------------------ */
/*  Album page                                                        */
/* ------------------------------------------------------------------ */

const HEADER_SELECTORS = [
  "ytmusic-immersive-header-renderer",
  "ytmusic-detail-header-renderer",
  "ytmusic-responsive-header-renderer",
  "ytmusic-header-renderer",
  // Broader fallbacks
  "#header.ytmusic-detail-header-renderer",
  "#header",
];

function extractAlbumPage(): MusicMetadata | null {
  let header: Element | null = null;

  for (const sel of HEADER_SELECTORS) {
    header = document.querySelector(sel);
    if (header) {
      break;
    }
  }

  if (!header) return null;

  // --- Extract album title ---
  const album = extractText(header, [
    "h2 yt-formatted-string",
    ".title yt-formatted-string",
    "yt-formatted-string.title",
    ".title.ytmusic-detail-header-renderer",
    ".title.ytmusic-responsive-header-renderer",
    "h2.title",
    ".title",
    "h2",
  ]);

  // --- Extract artist ---
  const artist = extractArtist(header);

  if (!artist) {
    return null;
  }

  return { ...(album ? { album } : {}), artist, source: "album" as const };
}

/**
 * Try multiple strategies to find the artist name in a header.
 */
function extractArtist(header: Element): string | undefined {
  // Strategy 1: subtitle/strapline links (most reliable)
  const subtitleSelectors = [
    ".subtitle yt-formatted-string a",
    "yt-formatted-string.subtitle a",
    ".strapline yt-formatted-string a",
    ".strapline a",
    ".subtitle a",
    // YTM responsive header uses strapline-text
    ".strapline-text yt-formatted-string a",
    ".strapline-text a",
    // Generic links in metadata areas
    ".metadata a",
    ".header-detail a",
  ];

  for (const sel of subtitleSelectors) {
    const link = header.querySelector<HTMLAnchorElement>(sel);
    const text = link?.textContent.trim();
    if (text !== undefined && text.length > 0 && text.length < 200) {
      return text;
    }
  }

  // Strategy 2: subtitle/strapline full text split
  const textSelectors = [
    ".subtitle yt-formatted-string",
    "yt-formatted-string.subtitle",
    ".strapline yt-formatted-string",
    ".strapline-text yt-formatted-string",
    ".subtitle",
    ".strapline",
    ".strapline-text",
  ];

  for (const sel of textSelectors) {
    const el = header.querySelector<HTMLElement>(sel);
    const raw = el?.textContent.trim() ?? "";
    if (raw) {
      // Split on common separators: •, ·, \n, comma (for "Artist, Year, Songs")
      const parts = raw.split(/[•·\n]/);
      const candidate = parts[0] ?? "";
      const trimmed = candidate.trim();
      if (trimmed.length > 0 && trimmed.length < 200) {
        // Filter out if it looks like a year or number of songs
        if (!/^\d{4}$/.test(trimmed) && !/^\d+ (song|titre|chanson)/i.test(trimmed)) {
          return trimmed;
        }
      }
    }
  }

  // Strategy 3: look for any <a> linking to a channel/artist page
  const anyArtistLink = header.querySelector<HTMLAnchorElement>(
    'a[href*="/channel/"], a[href*="browse/UC"]',
  );
  if (anyArtistLink?.textContent.trim()) {
    return anyArtistLink.textContent.trim();
  }

  return undefined;
}

/**
 * Try multiple selectors and return the first non-empty text content.
 */
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

/* ------------------------------------------------------------------ */
/*  Currently playing song (player bar)                               */
/* ------------------------------------------------------------------ */

function extractCurrentSong(): MusicMetadata | null {
  const playerBar = document.querySelector("ytmusic-player-bar");
  if (!playerBar) return null;

  // Strategy 1: byline text (e.g. "Artist • Album • Year")
  const bylineSelectors = [
    ".content-info-wrapper .byline yt-formatted-string",
    ".content-info-wrapper yt-formatted-string.byline",
    ".content-info-wrapper .subtitle yt-formatted-string",
    ".content-info-wrapper .byline",
    ".content-info-wrapper .subtitle",
    "yt-formatted-string.byline",
    ".byline",
  ];

  for (const sel of bylineSelectors) {
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
    if (text.length > 0 && text.length < 200) {
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

/* ------------------------------------------------------------------ */
/*  DOM debugging helper — call __STO_DEBUG() in browser console      */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    __STO_DEBUG: () => void;
  }
}

window.__STO_DEBUG = function (): void {
  console.group("[StreamThenOwn] === DOM Debug ===");
  console.log("URL:", window.location.href);

  // List ALL ytmusic-* custom elements present in the page
  const allCustomEls = document.querySelectorAll(
    "[class*='ytmusic-'], ytmusic-app, ytmusic-player-bar, ytmusic-detail-header-renderer, ytmusic-immersive-header-renderer, ytmusic-responsive-header-renderer, ytmusic-header-renderer",
  );
  const tagSet = new Set<string>();
  allCustomEls.forEach((el) => tagSet.add(el.tagName.toLowerCase()));
  console.log("YTMusic custom elements found:", [...tagSet].sort().join(", "));

  // Check each known header
  for (const sel of HEADER_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      console.group(`✅ Header "${sel}" FOUND`);
      console.log("Tag:", el.tagName);
      console.log("Classes:", el.className);
      console.log(
        "Children tags:",
        [...el.children].map((c) => c.tagName.toLowerCase()).join(", "),
      );
      console.log("Child count:", el.childElementCount);
      console.groupEnd();
    } else {
      console.log(`❌ Header "${sel}": not found`);
    }
  }

  // Check player bar
  const pb = document.querySelector("ytmusic-player-bar");
  if (pb) {
    console.group("✅ Player bar FOUND");
    const ciw = pb.querySelector(".content-info-wrapper");
    if (ciw) {
      console.log("content-info-wrapper child count:", ciw.childElementCount);
    } else {
      console.log(
        "No .content-info-wrapper — player bar children:",
        [...pb.children].map((c) => `${c.tagName.toLowerCase()}.${c.className}`).join(", "),
      );
      console.log("Player bar child count:", pb.childElementCount);
    }
    console.groupEnd();
  } else {
    console.log("❌ Player bar: not found");
  }

  // Try extraction
  const meta = extractMetadata();
  console.log("=== Extracted metadata:", meta);

  console.groupEnd();
};
