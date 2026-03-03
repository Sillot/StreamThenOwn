/**
 * YouTube Music UI injector.
 *
 * Injects the STO action button into YTM's `#action-buttons` row and
 * manages the dropdown purchase-links menu.
 */

import type { UIInjector, MusicMetadata } from "../types";
import type { StoreLinksResult, StoreLink } from "../../stores/types";
import { sanitizeUrl } from "../../utils/sanitize";
import { t } from "../../i18n";
import { waitForElement } from "../../utils/dom";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const BTN_ID = "sto-action-btn";
const MENU_ID = "sto-dropdown-menu";

/** Material Design icon SVG paths for each store. */
const STORE_ICON_PATHS: Record<string, string> = {
  discogs:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 5.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
  qobuz:
    "M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z",
  amazon:
    "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z",
  bandcamp: "M22 6L13.2 18H2l8.8-12H22z",
  fnac: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z",
};

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class YtmUIInjector implements UIInjector {
  private currentLinks: StoreLinksResult | null = null;

  setLinks(links: StoreLinksResult | null): void {
    this.currentLinks = links;
  }

  async injectButton(meta: MusicMetadata): Promise<void> {
    if (document.getElementById(BTN_ID)) return;

    const actionsRow = await waitForElement("#action-buttons");
    if (!actionsRow) return;

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.className = "sto-action-btn";
    btn.title = meta.source === "album" ? t("ownThisAlbum") : t("ownThisTrack");
    btn.setAttribute("aria-label", btn.title);
    btn.appendChild(createButtonIcon());

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(btn);
    });

    actionsRow.appendChild(btn);
  }

  cleanup(): void {
    document.getElementById(BTN_ID)?.remove();
    this.closeMenu();
  }

  closeMenu(): void {
    document.getElementById(MENU_ID)?.remove();
  }

  /* ---- Private ---- */

  private toggleMenu(anchor: HTMLElement): void {
    const existing = document.getElementById(MENU_ID);
    if (existing) {
      existing.remove();
      return;
    }

    if (!this.currentLinks) return;

    const menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.className = "sto-menu";

    const availableLinks = this.currentLinks.links.filter((l) => l.url && l.url.length > 0);
    for (const link of availableLinks) {
      menu.appendChild(createMenuItem(link));
    }

    if (availableLinks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "sto-menu__empty";
      empty.textContent = t("noLinks");
      menu.appendChild(empty);
    }

    document.body.appendChild(menu);
    positionMenu(menu, anchor);

    // Close on click outside
    const onClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchor) {
        menu.remove();
        document.removeEventListener("click", onClickOutside, true);
      }
    };
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
}

/* ------------------------------------------------------------------ */
/*  Pure helpers (no state)                                           */
/* ------------------------------------------------------------------ */

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

function positionMenu(menu: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const menuWidth = 280;

  let left = rect.right - menuWidth;
  let top = rect.bottom + 8;

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

  const label = document.createElement("span");
  label.className = "sto-menu__item-label";
  label.textContent = t("buyOn", link.label);
  a.appendChild(label);

  return a;
}
