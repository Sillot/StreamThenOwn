/**
 * Content script — platform-agnostic entry point.
 *
 * Detects the current streaming service, then uses the appropriate
 * platform adapter to extract metadata, inject UI, and observe navigation.
 */

import { detectPlatform } from "../platforms";
import type { PlatformAdapter, MusicMetadata } from "../platforms/types";
import type { StoreLinksResult } from "../stores/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const LOG = "[STO]";

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

let lastMetadataKey = "";
let pendingCheck: ReturnType<typeof setTimeout> | null = null;
let platform: PlatformAdapter | null = null;
let remainingRetries = 0;

/* ------------------------------------------------------------------ */
/*  Core logic                                                        */
/* ------------------------------------------------------------------ */

function metadataKey(meta: MusicMetadata): string {
  return `${meta.artist}||${meta.album ?? ""}||${meta.source}`;
}

async function check(retries = 3): Promise<void> {
  if (!platform) return;

  const meta = platform.metadata.extract();
  if (!meta) {
    // Retry: SPA frameworks (React) may not have rendered the DOM yet
    if (retries > 0) {
      console.log(LOG, `No metadata yet, retrying (${String(retries)} left)…`);
      remainingRetries = retries - 1;
      scheduleCheck(1500);
      return;
    }
    platform.ui.cleanup();
    lastMetadataKey = "";
    platform.ui.setLinks(null);
    return;
  }

  const key = metadataKey(meta);
  if (key === lastMetadataKey) return;
  lastMetadataKey = key;

  console.log(LOG, `${meta.artist} — ${meta.album ?? "(no album)"} [${meta.source}]`);

  platform.ui.cleanup();

  const result = await requestStoreLinks(meta);
  if (!result) return;

  platform.ui.setLinks(result);
  const direct = result.links.filter((l) => l.isDirect).length;
  const total = result.links.length;
  console.log(
    LOG,
    `${String(total)} links (${String(direct)} direct, ${String(total - direct)} search)`,
  );

  await platform.ui.injectButton(meta);
}

/* ------------------------------------------------------------------ */
/*  Communication with background                                     */
/* ------------------------------------------------------------------ */

async function requestStoreLinks(meta: MusicMetadata): Promise<StoreLinksResult | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "SEARCH_STORES",
        payload: {
          artist: meta.artist,
          album: meta.album,
          locale: navigator.language || document.documentElement.lang,
        },
      },
      (response: { success: boolean; data?: StoreLinksResult; error?: string } | undefined) => {
        if (chrome.runtime.lastError) {
          console.warn(LOG, "Message error:", chrome.runtime.lastError);
          resolve(null);
          return;
        }
        if (response?.success) {
          resolve(response.data ?? null);
        } else {
          console.warn(LOG, "Store error:", response?.error);
          resolve(null);
        }
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Scheduling                                                        */
/* ------------------------------------------------------------------ */

function scheduleCheck(delayMs = 800): void {
  if (pendingCheck) clearTimeout(pendingCheck);
  const retries = remainingRetries;
  pendingCheck = setTimeout(() => {
    pendingCheck = null;
    void check(retries);
  }, delayMs);
}

function onNavigate(): void {
  lastMetadataKey = "";
  remainingRetries = 3;
  platform?.ui.cleanup();
  scheduleCheck();
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                         */
/* ------------------------------------------------------------------ */

function init(): void {
  platform = detectPlatform();
  if (!platform) {
    console.warn(LOG, "Unsupported platform:", location.hostname);
    return;
  }

  console.log(LOG, `Loaded on ${platform.name}:`, window.location.href);

  // Initial check (delayed for DOM to be ready, with retries for SPA)
  remainingRetries = 5;
  scheduleCheck(1500);

  // Observe platform-specific navigation
  platform.observeNavigation(onNavigate);

  // Close menu on scroll
  document.addEventListener("scroll", () => platform?.ui.closeMenu(), { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
