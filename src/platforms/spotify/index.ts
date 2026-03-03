/**
 * Spotify Web Player platform adapter.
 *
 * Combines metadata extraction, UI injection, and SPA navigation
 * observation into a single `PlatformAdapter`.
 */

import type { PlatformAdapter } from "../types";
import { SpotifyMetadataExtractor } from "./metadata";
import { SpotifyUIInjector } from "./ui";

export class SpotifyAdapter implements PlatformAdapter {
  readonly name = "Spotify";
  readonly metadata = new SpotifyMetadataExtractor();
  readonly ui = new SpotifyUIInjector();

  observeNavigation(onNavigate: () => void): void {
    // Spotify uses History API for SPA navigation
    let lastUrl = location.href;

    // Listen for popstate (back/forward)
    window.addEventListener("popstate", () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    });

    // MutationObserver to catch pushState navigations
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
