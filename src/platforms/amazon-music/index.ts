/**
 * Amazon Music platform adapter.
 *
 * Combines metadata extraction, UI injection, and SPA navigation
 * observation into a single `PlatformAdapter`.
 */

import type { PlatformAdapter } from "../types";
import { AmazonMusicMetadataExtractor } from "./metadata";
import { AmazonMusicUIInjector } from "./ui";

export class AmazonMusicAdapter implements PlatformAdapter {
  readonly name = "Amazon Music";
  readonly metadata = new AmazonMusicMetadataExtractor();
  readonly ui = new AmazonMusicUIInjector();

  observeNavigation(onNavigate: () => void): void {
    // Amazon Music uses History API for SPA navigation
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
