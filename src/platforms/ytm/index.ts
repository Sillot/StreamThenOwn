/**
 * YouTube Music platform adapter.
 *
 * Combines metadata extraction, UI injection, and SPA navigation
 * observation into a single `PlatformAdapter`.
 */

import type { PlatformAdapter } from "../types";
import { YtmMetadataExtractor } from "./metadata";
import { YtmUIInjector } from "./ui";

export class YtmAdapter implements PlatformAdapter {
  readonly name = "YouTube Music";
  readonly metadata = new YtmMetadataExtractor();
  readonly ui = new YtmUIInjector();

  observeNavigation(onNavigate: () => void): void {
    // YTM custom SPA navigation events
    document.addEventListener("yt-navigate-finish", onNavigate);
    document.addEventListener("yt-page-data-updated", onNavigate);

    // Fallback: detect URL changes that events might miss
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });
  }
}
