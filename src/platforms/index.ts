/**
 * Platform dispatcher.
 *
 * Detects the current streaming service by hostname and returns
 * the appropriate `PlatformAdapter`. Returns `null` for unsupported sites.
 *
 * To add a new platform:
 *  1. Create `src/platforms/<platform>/metadata.ts` (implements MetadataExtractor)
 *  2. Create `src/platforms/<platform>/ui.ts` (implements UIInjector)
 *  3. Create `src/platforms/<platform>/index.ts` (implements PlatformAdapter)
 *  4. Register the hostname(s) in the `PLATFORM_MAP` below
 *  5. Add the match pattern to `public/manifest.json` content_scripts
 */

import type { PlatformAdapter } from "./types";
import { YtmAdapter } from "./ytm";
import { SpotifyAdapter } from "./spotify";
import { AppleAdapter } from "./apple";
import { DeezerAdapter } from "./deezer";
import { AmazonMusicAdapter } from "./amazon-music";

/** Map of hostname → adapter factory. */
const PLATFORM_MAP: Record<string, () => PlatformAdapter> = {
  "music.youtube.com": () => new YtmAdapter(),
  "open.spotify.com": () => new SpotifyAdapter(),
  "music.apple.com": () => new AppleAdapter(),
  "www.deezer.com": () => new DeezerAdapter(),
  "music.amazon.com": () => new AmazonMusicAdapter(),
};

/**
 * Resolve the platform adapter for the current page.
 * Returns `null` if the current hostname is not a supported streaming service.
 */
export function detectPlatform(): PlatformAdapter | null {
  const factory = PLATFORM_MAP[location.hostname];
  if (factory) return factory();

  // Amazon Music uses regional domains (music.amazon.de, music.amazon.fr…)
  if (location.hostname.startsWith("music.amazon.")) {
    return new AmazonMusicAdapter();
  }

  return null;
}
