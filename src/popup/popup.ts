/**
 * Popup script — shown when the user clicks the extension toolbar icon.
 *
 * Queries the active tab's content script for current metadata + store links,
 * then renders the list of purchase options plus a link to settings.
 */

import { t } from "../i18n";
import { createStoreIcon } from "../stores/icons";
import type { MusicMetadata } from "../platforms/types";
import type { StoreLink, StoreLinksResult } from "../stores/types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface CurrentLinksResponse {
  metadata: MusicMetadata | null;
  links: StoreLinksResult | null;
}

/** Sentinel: content script is not available (unsupported page). */
const UNSUPPORTED = Symbol("unsupported");

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createSvgIcon(pathData: string, size: number, cssClass: string): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "currentColor");
  svg.classList.add(cssClass);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  return svg;
}

function createStoreIconElement(storeId: string): Element {
  const icon = createStoreIcon(storeId, 20, "sto-popup__link-icon");
  // SVG icons need the --svg modifier class instead
  if (icon instanceof SVGSVGElement) {
    icon.classList.remove("sto-popup__link-icon");
    icon.classList.add("sto-popup__link-icon--svg");
  }
  return icon;
}

/** Material Design "settings" gear icon path. */
const SETTINGS_ICON_PATH =
  "M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z";

/* ------------------------------------------------------------------ */
/*  Render functions                                                  */
/* ------------------------------------------------------------------ */

function renderHeader(root: HTMLElement): void {
  const header = document.createElement("div");
  header.className = "sto-popup__header";

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon48.png");
  logo.alt = "StreamThenOwn";
  logo.className = "sto-popup__logo";
  header.appendChild(logo);

  const title = document.createElement("span");
  title.className = "sto-popup__title";
  title.textContent = "StreamThenOwn";
  header.appendChild(title);

  root.appendChild(header);
}

function renderNowPlaying(root: HTMLElement, meta: MusicMetadata): void {
  const section = document.createElement("div");
  section.className = "sto-popup__now-playing";

  const artist = document.createElement("span");
  artist.className = "sto-popup__artist";
  artist.textContent = meta.artist;
  section.appendChild(artist);

  if (meta.album) {
    const sep = document.createTextNode(" — ");
    section.appendChild(sep);

    const album = document.createElement("span");
    album.className = "sto-popup__album";
    album.textContent = meta.album;
    section.appendChild(album);
  }

  root.appendChild(section);
}

function renderLinks(root: HTMLElement, links: StoreLink[]): void {
  const list = document.createElement("div");
  list.className = "sto-popup__links";

  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.className = "sto-popup__link";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    anchor.appendChild(createStoreIconElement(link.store));

    const info = document.createElement("div");
    info.className = "sto-popup__link-info";

    const label = document.createElement("span");
    label.className = "sto-popup__link-label";
    label.textContent = link.label;
    info.appendChild(label);

    anchor.appendChild(info);

    list.appendChild(anchor);
  }

  root.appendChild(list);
}

function renderEmpty(root: HTMLElement): void {
  const section = document.createElement("div");
  section.className = "sto-popup__empty";

  const icon = document.createElement("div");
  icon.className = "sto-popup__empty-icon";
  icon.textContent = "\u{1F3B5}";
  section.appendChild(icon);

  const title = document.createElement("div");
  title.className = "sto-popup__empty-title";
  title.textContent = t("popupNoMusic");
  section.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "sto-popup__empty-desc";
  desc.textContent = t("popupNoMusicDesc");
  section.appendChild(desc);

  root.appendChild(section);
}

function renderUnsupported(root: HTMLElement): void {
  const section = document.createElement("div");
  section.className = "sto-popup__empty";

  const icon = document.createElement("div");
  icon.className = "sto-popup__empty-icon";
  icon.textContent = "\u{1F310}";
  section.appendChild(icon);

  const desc = document.createElement("div");
  desc.className = "sto-popup__empty-desc";
  desc.textContent = t("popupUnsupported");
  section.appendChild(desc);

  root.appendChild(section);
}

function renderFooter(root: HTMLElement): void {
  const footer = document.createElement("div");
  footer.className = "sto-popup__footer";

  const btn = document.createElement("button");
  btn.className = "sto-popup__settings";
  btn.type = "button";

  btn.appendChild(createSvgIcon(SETTINGS_ICON_PATH, 16, "sto-popup__settings-icon"));

  const label = document.createElement("span");
  label.textContent = t("popupSettings");
  btn.appendChild(label);

  btn.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
    window.close();
  });

  footer.appendChild(btn);
  root.appendChild(footer);
}

function renderLoading(root: HTMLElement): void {
  const section = document.createElement("div");
  section.className = "sto-popup__loading";
  section.textContent = "…";
  root.appendChild(section);
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function init(): Promise<void> {
  const root = document.getElementById("popup-root");
  if (!root) return;

  renderHeader(root);
  renderLoading(root);

  const response = await queryActiveTab();

  // Remove loading indicator
  const loading = root.querySelector(".sto-popup__loading");
  if (loading) {
    loading.remove();
  }

  if (response === UNSUPPORTED) {
    renderUnsupported(root);
  } else if (response?.metadata && response.links && response.links.links.length > 0) {
    renderNowPlaying(root, response.metadata);
    renderLinks(root, response.links.links);
  } else {
    renderEmpty(root);
  }

  renderFooter(root);
}

async function queryActiveTab(): Promise<CurrentLinksResponse | typeof UNSUPPORTED | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId === undefined) {
        resolve(UNSUPPORTED);
        return;
      }

      chrome.tabs.sendMessage(tabId, { type: "GET_CURRENT_LINKS" }, (response: unknown) => {
        if (chrome.runtime.lastError) {
          // Content script not available — unsupported page
          resolve(UNSUPPORTED);
          return;
        }
        resolve(response as CurrentLinksResponse | null);
      });
    });
  });
}

void init();
