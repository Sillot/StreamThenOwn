/**
 * YouTube Music UI injector.
 *
 * Injects the STO action button into YTM's `#action-buttons` row (album pages)
 * and into `#right-controls` in the player bar (always when music is playing).
 * Manages the shared dropdown purchase-links menu.
 */

import type { UIInjector, MusicMetadata } from "../types";
import type { StoreLinksResult, StoreLink } from "../../stores/types";
import { createStoreIcon, createButtonIcon } from "../../stores/icons";
import { sanitizeUrl } from "../../utils/sanitize";
import { t } from "../../i18n";
import { waitForElement } from "../../utils/dom";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const BTN_ID = "sto-action-btn";
const PLAYER_BTN_ID = "sto-player-btn";
const MENU_ID = "sto-dropdown-menu";

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class YtmUIInjector implements UIInjector {
  private currentLinks: StoreLinksResult | null = null;
  private currentPlayerLinks: StoreLinksResult | null = null;

  setLinks(links: StoreLinksResult | null): void {
    this.currentLinks = links;
  }

  setPlayerLinks(links: StoreLinksResult | null): void {
    this.currentPlayerLinks = links;
  }

  async injectButton(meta: MusicMetadata): Promise<void> {
    const tasks: Promise<void>[] = [];

    // Album page button: inject into #action-buttons only when on an album page
    if (meta.source === "album" && !document.getElementById(BTN_ID)) {
      tasks.push(
        waitForElement("#action-buttons").then((row) => {
          if (row && !document.getElementById(BTN_ID)) {
            row.appendChild(this.createButton(BTN_ID, t("ownThisAlbum"), () => this.currentLinks));
          }
        }),
      );
    }

    // Player bar button: always inject into #right-controls when music is playing
    if (!document.getElementById(PLAYER_BTN_ID)) {
      tasks.push(
        waitForElement("#right-controls").then((controls) => {
          if (controls && !document.getElementById(PLAYER_BTN_ID)) {
            controls.prepend(
              this.createButton(
                PLAYER_BTN_ID,
                t("ownThisTrack"),
                () => this.currentPlayerLinks ?? this.currentLinks,
              ),
            );
          }
        }),
      );
    }

    await Promise.all(tasks);
  }

  cleanup(): void {
    document.getElementById(BTN_ID)?.remove();
    document.getElementById(PLAYER_BTN_ID)?.remove();
    this.closeMenu();
  }

  closeMenu(): void {
    document.getElementById(MENU_ID)?.remove();
  }

  /* ---- Private ---- */

  private createButton(
    id: string,
    title: string,
    getLinks: () => StoreLinksResult | null,
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.id = id;
    btn.type = "button";
    btn.className = "sto-action-btn";
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.appendChild(createButtonIcon(24, "sto-action-btn__icon"));

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(btn, getLinks());
    });

    return btn;
  }

  private toggleMenu(anchor: HTMLElement, links: StoreLinksResult | null): void {
    const existing = document.getElementById(MENU_ID);
    if (existing) {
      existing.remove();
      anchor.classList.remove("sto-action-btn--open");
      return;
    }

    if (!links) return;

    const menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.className = "sto-menu";

    const availableLinks = links.links.filter((l) => l.url && l.url.length > 0);
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
    anchor.classList.add("sto-action-btn--open");

    // Close on click outside
    const onClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchor) {
        menu.remove();
        anchor.classList.remove("sto-action-btn--open");
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
        anchor.classList.remove("sto-action-btn--open");
        document.removeEventListener("keydown", onEsc, true);
      }
    };
    document.addEventListener("keydown", onEsc, true);
  }
}

/* ------------------------------------------------------------------ */
/*  Pure helpers (no state)                                           */
/* ------------------------------------------------------------------ */

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

  a.appendChild(createStoreIcon(link.store, 24, "sto-menu__item-icon"));

  const label = document.createElement("span");
  label.className = "sto-menu__item-label";
  label.textContent = t("buyOn", link.label);
  a.appendChild(label);

  return a;
}
