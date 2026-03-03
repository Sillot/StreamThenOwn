/**
 * Deezer Web Player platform adapter.
 *
 * Combines metadata extraction, UI injection, and SPA navigation
 * observation into a single `PlatformAdapter`.
 */

import type { PlatformAdapter } from "../types";
import { DeezerMetadataExtractor } from "./metadata";
import { DeezerUIInjector } from "./ui";

export class DeezerAdapter implements PlatformAdapter {
  readonly name = "Deezer";
  readonly metadata = new DeezerMetadataExtractor();
  readonly ui = new DeezerUIInjector();

  observeNavigation(onNavigate: () => void): void {
    // Deezer uses History API for SPA navigation
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
