/**
 * Apple Music platform adapter.
 *
 * Combines metadata extraction, UI injection, and SPA navigation
 * observation into a single `PlatformAdapter`.
 */

import type { PlatformAdapter } from "../types";
import { AppleMetadataExtractor } from "./metadata";
import { AppleUIInjector } from "./ui";

export class AppleAdapter implements PlatformAdapter {
  readonly name = "Apple Music";
  readonly metadata = new AppleMetadataExtractor();
  readonly ui = new AppleUIInjector();

  observeNavigation(onNavigate: () => void): void {
    // Apple Music uses History API for SPA navigation
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
