/**
 * Background service worker.
 *
 * Listens for messages from the content script and resolves store links
 * via MusicBrainz + Discogs APIs.
 */

import { resolveStoreLinks } from "../stores";
import type { CustomSearchProvider, StoreLinksResult, StoreQuery } from "../stores/types";

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
        // Read user's enabled stores + display order + custom providers
        const defaultOrder = ["discogs", "qobuz", "amazon", "bandcamp", "ebay", "7digital"];
        const { enabledStores, storeOrder, customProviders } = await chrome.storage.sync.get({
          enabledStores: defaultOrder,
          storeOrder: defaultOrder,
          customProviders: [],
        });
        const providers = customProviders as CustomSearchProvider[];
        const result = await resolveStoreLinks(
          message.payload,
          enabledStores as string[],
          providers,
        );

        // Sort links by user-defined order
        const order = storeOrder as string[];
        result.links.sort((a, b) => {
          const ai = order.indexOf(a.store);
          const bi = order.indexOf(b.store);
          return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
        });

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

/* ------------------------------------------------------------------ */
/*  Action icon — disabled by default, enabled per tab by content script */
/* ------------------------------------------------------------------ */

// Disable the action icon globally; content scripts re-enable it on supported tabs.
void chrome.action.disable();

chrome.runtime.onMessage.addListener(
  (message: { type: string }, sender: chrome.runtime.MessageSender): undefined => {
    if (message.type === "CONTENT_SCRIPT_READY" && sender.tab?.id !== undefined) {
      void chrome.action.enable(sender.tab.id);
    }
    return undefined;
  },
);

// When a tab starts loading a new page, disable the action until a content script re-enables it.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    void chrome.action.disable(tabId);
  }
});

console.log("[StreamThenOwn] Service worker loaded");
