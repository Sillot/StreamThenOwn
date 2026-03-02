/**
 * Content script — injected into YouTube Music pages.
 *
 * Injects a STO action button next to the album's "⋮" menu button.
 * Clicking it opens a dropdown with purchase links (Discogs, Qobuz, Amazon).
 */

import { extractMetadata, type MusicMetadata } from "../utils/metadata";
import { sanitizeUrl } from "../utils/sanitize";
import { t } from "../i18n";
import type { StoreLinksResult, StoreLink } from "../stores/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const LOG = "[STO]";
const BTN_ID = "sto-action-btn";
const MENU_ID = "sto-dropdown-menu";
/** Material Design icon SVG paths for each store */
const STORE_ICON_PATHS: Record<string, string> = {
  discogs:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 5.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
  qobuz:
    "M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z",
  amazon:
    "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z",
  bandcamp: "M22 6L13.2 18H2l8.8-12H22z",
  itunes:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14.5c-.83.83-2.17.83-3 0-.83-.83-.83-2.17 0-3 .41-.41.96-.63 1.5-.63V8.5l-5 1.5v5.75c0 .14-.01.27-.04.4-.24 1.3-1.52 2.18-2.84 1.93-1.04-.19-1.81-1.01-2.01-2-.24-1.3.58-2.55 1.84-2.84.42-.1.83-.09 1.23.01L8.17 8.5l.01-.17c.02-.36.16-.68.41-.92.13-.12.28-.22.44-.29l5.84-1.75c.42-.13.86.11.99.53.03.1.04.2.04.3v7.55c.54 0 1.09.21 1.5.63.83.83.83 2.17 0 3z",
  fnac: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z",
};

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

let lastMetadataKey = "";
let currentLinks: StoreLinksResult | null = null;
let pendingCheck: ReturnType<typeof setTimeout> | null = null;

/**
 * Wait for an element matching `selector` to appear in the DOM.
 * Resolves with the element, or `null` after `timeoutMs`.
 */
function waitForElement(selector: string, timeoutMs = 6000): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el && !settled) {
        settled = true;
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);
  });
}

/* ------------------------------------------------------------------ */
/*  Main check — called on navigation only                            */
/* ------------------------------------------------------------------ */

function metadataKey(meta: MusicMetadata): string {
  return `${meta.artist}||${meta.album ?? ""}||${meta.source}`;
}

async function check() {
  const meta = extractMetadata();
  if (!meta) {
    cleanup();
    lastMetadataKey = "";
    currentLinks = null;
    return;
  }

  const key = metadataKey(meta);
  if (key === lastMetadataKey && document.getElementById(BTN_ID)) {
    return; // nothing changed and button still present
  }
  lastMetadataKey = key;

  console.log(LOG, `${meta.artist} — ${meta.album ?? "(no album)"} [${meta.source}]`);

  // Remove old UI
  cleanup();

  // Request store links from background
  const result = await requestStoreLinks(meta);
  if (!result) return;

  currentLinks = result;
  console.log(
    LOG,
    `${String(result.links.filter((l) => l.isDirect).length)}/${String(result.links.length)} direct links`,
  );

  // Inject the action button — wait for #action-buttons to appear in DOM
  const actionsRow = await waitForElement("#action-buttons");
  if (actionsRow) {
    injectActionButton(meta, actionsRow);
  } else {
    console.debug(LOG, "No #action-buttons found after waiting");
  }
}

function cleanup() {
  document.getElementById(BTN_ID)?.remove();
  closeMenu();
}

function closeMenu() {
  document.getElementById(MENU_ID)?.remove();
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
/*  Action button — injected next to the "⋮" button                  */
/* ------------------------------------------------------------------ */

function injectActionButton(meta: MusicMetadata, actionsRow: Element) {
  // Don't duplicate
  if (document.getElementById(BTN_ID)) return;

  // Create button matching YTM's style
  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.className = "sto-action-btn";
  btn.title = meta.source === "album" ? t("ownThisAlbum") : t("ownThisTrack");
  btn.setAttribute("aria-label", btn.title);
  btn.appendChild(createButtonIcon());

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(btn);
  });

  // Append as last child of #action-buttons
  actionsRow.appendChild(btn);
}

/**
 * Build the SVG icon for the STO button using safe DOM APIs (no innerHTML).
 */
function createButtonIcon(): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("fill", "currentColor");
  svg.classList.add("sto-action-btn__icon");

  const path = document.createElementNS(NS, "path");
  path.setAttribute(
    "d",
    "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z",
  );
  svg.appendChild(path);

  return svg;
}

/* ------------------------------------------------------------------ */
/*  Dropdown menu                                                     */
/* ------------------------------------------------------------------ */

function toggleMenu(anchor: HTMLElement) {
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    existing.remove();
    return;
  }

  if (!currentLinks) return;

  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.className = "sto-menu";

  // Links as menu items (only show available links)
  const availableLinks = currentLinks.links.filter((l) => l.url && l.url.length > 0);
  for (const link of availableLinks) {
    const item = createMenuItem(link);
    menu.appendChild(item);
  }

  if (availableLinks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "sto-menu__empty";
    empty.textContent = t("noLinks");
    menu.appendChild(empty);
  }

  // Position the menu below the button
  document.body.appendChild(menu);
  positionMenu(menu, anchor);

  // Close on click outside
  const onClickOutside = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== anchor) {
      menu.remove();
      document.removeEventListener("click", onClickOutside, true);
    }
  };
  // Delay to avoid the current click closing it immediately
  setTimeout(() => {
    document.addEventListener("click", onClickOutside, true);
  }, 0);

  // Close on Escape
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      menu.remove();
      document.removeEventListener("keydown", onEsc, true);
    }
  };
  document.addEventListener("keydown", onEsc, true);
}

function positionMenu(menu: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const menuWidth = 280;

  // Position below the button, aligned right
  let left = rect.right - menuWidth;
  let top = rect.bottom + 8;

  // Make sure it doesn't go off-screen
  if (left < 8) left = 8;
  if (top + 300 > window.innerHeight) {
    top = rect.top - 8;
    menu.style.transform = "translateY(-100%)";
  }

  menu.style.left = `${String(left)}px`;
  menu.style.top = `${String(top)}px`;
  menu.style.width = `${String(menuWidth)}px`;
}

function createMenuItem(link: StoreLink): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = sanitizeUrl(link.url);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "sto-menu__item";

  // Icon — inline Material SVG
  const svgPath = STORE_ICON_PATHS[link.store];
  if (svgPath) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "currentColor");
    svg.classList.add("sto-menu__item-icon");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", svgPath);
    svg.appendChild(path);
    a.appendChild(svg);
  }

  // Label — single line like YTM
  const label = document.createElement("span");
  label.className = "sto-menu__item-label";
  label.textContent = t("buyOn", link.label);
  a.appendChild(label);

  return a;
}

/* ------------------------------------------------------------------ */
/*  Bootstrap — event-driven, no polling                              */
/* ------------------------------------------------------------------ */

function scheduleCheck(delayMs = 800) {
  if (pendingCheck) clearTimeout(pendingCheck);
  pendingCheck = setTimeout(() => {
    pendingCheck = null;
    void check();
  }, delayMs);
}

function onNavigate() {
  lastMetadataKey = "";
  cleanup();
  scheduleCheck();
}

function init() {
  console.log(LOG, "Loaded on:", window.location.href);

  // Initial check (delayed for DOM to be ready)
  scheduleCheck(1500);

  // Re-check on YTM SPA navigation events
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

  // Close menu on scroll
  document.addEventListener("scroll", closeMenu, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
