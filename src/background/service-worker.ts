/**
 * Background service worker.
 *
 * Listens for messages from the content script and resolves store links
 * via MusicBrainz + Discogs APIs.
 */

import { resolveStoreLinks } from "../stores";
import type { StoreLinksResult, StoreQuery } from "../stores/types";

/** Message types exchanged between content script ↔ background. */
interface SearchMessage {
  type: "SEARCH_STORES";
  payload: StoreQuery;
}

interface SearchResponse {
  success: boolean;
  data?: StoreLinksResult;
  error?: string;
}

chrome.runtime.onMessage.addListener(
  (
    message: SearchMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: SearchResponse) => void,
  ): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime messages can have any type
    if (message.type !== "SEARCH_STORES") return false;

    // Async handler — must return true to keep the message channel open.
    void (async () => {
      try {
        // Read user's enabled stores preference
        const { enabledStores } = await chrome.storage.sync.get({
          enabledStores: ["discogs", "qobuz", "amazon", "bandcamp", "itunes", "fnac"],
        });
        const result = await resolveStoreLinks(message.payload, enabledStores as string[]);
        sendResponse({ success: true, data: result });
      } catch (err: unknown) {
        console.error("[StreamThenOwn] Store resolution failed:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return true; // keep channel open for async sendResponse
  },
);

// Open options page when clicking the extension icon
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

console.log("[StreamThenOwn] Service worker loaded");
