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

/* ------------------------------------------------------------------ */
/*  Core logic                                                        */
/* ------------------------------------------------------------------ */

function metadataKey(meta: MusicMetadata): string {
  return `${meta.artist}||${meta.album ?? ""}||${meta.source}`;
}

async function check(): Promise<void> {
  if (!platform) return;

  const meta = platform.metadata.extract();
  if (!meta) {
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
  console.log(
    LOG,
    `${String(result.links.filter((l) => l.isDirect).length)}/${String(result.links.length)} direct links`,
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
          locale: document.documentElement.lang || navigator.language,
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
  pendingCheck = setTimeout(() => {
    pendingCheck = null;
    void check();
  }, delayMs);
}

function onNavigate(): void {
  lastMetadataKey = "";
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

  // Initial check (delayed for DOM to be ready)
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
