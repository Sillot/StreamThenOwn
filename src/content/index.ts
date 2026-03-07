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

/** Current state exposed to the popup via GET_CURRENT_LINKS message. */
let currentMetadata: MusicMetadata | null = null;
let currentLinks: StoreLinksResult | null = null;
/** Now-playing context — only set when it differs from the album-page context. */
let currentSongMetadata: MusicMetadata | null = null;
let currentSongLinks: StoreLinksResult | null = null;

/* ------------------------------------------------------------------ */
/*  Core logic                                                        */
/* ------------------------------------------------------------------ */

function metadataKey(meta: MusicMetadata): string {
  return `${meta.artist}||${meta.album ?? ""}||${meta.source}`;
}

/** Key using only artist + album (ignores source). Used to detect same-album contexts. */
function artistAlbumKey(meta: MusicMetadata): string {
  return `${meta.artist}||${meta.album ?? ""}`;
}

async function check(retries = 3): Promise<void> {
  if (!platform) return;

  const meta = platform.metadata.extract();
  const songMeta = platform.metadata.extractSong?.() ?? null;

  if (!meta && !songMeta) {
    // Retry: SPA frameworks (React) may not have rendered the DOM yet
    if (retries > 0) {
      remainingRetries = retries - 1;
      scheduleCheck(1500);
      return;
    }
    platform.ui.cleanup();
    lastMetadataKey = "";
    currentMetadata = null;
    currentLinks = null;
    currentSongMetadata = null;
    currentSongLinks = null;
    platform.ui.setLinks(null);
    platform.ui.setPlayerLinks?.(null);
    return;
  }

  // At this point, either meta or songMeta is non-null (ensured by the early return above).
  const primaryMeta = meta ?? songMeta;
  if (!primaryMeta) return; // unreachable; satisfies TypeScript's null check
  // Deduplication key combines both contexts so a track change is always detected
  const key = `${metadataKey(primaryMeta)}|||${songMeta ? metadataKey(songMeta) : ""}`;
  if (key === lastMetadataKey) return;
  lastMetadataKey = key;

  platform.ui.cleanup();

  // Resolve primary (album-page, or song as fallback) links
  const result = await requestStoreLinks(primaryMeta);
  if (!result) return;

  // Song context differs from album context when browsing one album while playing another
  const songDiffers =
    songMeta !== null && meta !== null && artistAlbumKey(songMeta) !== artistAlbumKey(meta);

  // Resolve now-playing links independently only when they differ from album links.
  let songResult: StoreLinksResult | null = null;
  if (songDiffers && platform.ui.setPlayerLinks) {
    songResult = await requestStoreLinks(songMeta);
  }

  currentMetadata = primaryMeta;
  currentLinks = result;
  currentSongMetadata = songDiffers ? songMeta : null;
  currentSongLinks = songResult;

  platform.ui.setLinks(result);
  platform.ui.setPlayerLinks?.(songResult ?? result);

  await platform.ui.injectButton(primaryMeta);
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
          locale: meta.locale ?? chrome.i18n.getUILanguage(),
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
  currentMetadata = null;
  currentLinks = null;
  currentSongMetadata = null;
  currentSongLinks = null;
  platform?.ui.cleanup();
  scheduleCheck();
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                         */
/* ------------------------------------------------------------------ */

function init(): void {
  platform = detectPlatform();
  if (!platform) {
    return;
  }

  // Notify background so it enables the action icon for this tab.
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" }, () => {
    // Ignore errors (e.g. service worker not yet ready).
    void chrome.runtime.lastError;
  });

  // Respond to popup requests for current store links.
  chrome.runtime.onMessage.addListener(
    (
      message: { type: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ): boolean | undefined => {
      if (message.type === "GET_CURRENT_LINKS") {
        sendResponse({
          metadata: currentMetadata,
          links: currentLinks,
          songMetadata: currentSongMetadata,
          songLinks: currentSongLinks,
        });
        return;
      }
      return;
    },
  );

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
