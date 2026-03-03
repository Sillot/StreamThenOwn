/**
 * Deezer Web Player UI injector.
 *
 * Injects the STO action button into Deezer's album/track action area
 * and manages the dropdown purchase-links menu.
 *
 * All DOM is built with createElement — never innerHTML.
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

const BTN_ID = "sto-dz-action-btn";
const MENU_ID = "sto-dz-dropdown-menu";

/* ------------------------------------------------------------------ */
/*  Implementation                                                    */
/* ------------------------------------------------------------------ */

export class DeezerUIInjector implements UIInjector {
  private currentLinks: StoreLinksResult | null = null;

  setLinks(links: StoreLinksResult | null): void {
    this.currentLinks = links;
  }

  async injectButton(meta: MusicMetadata): Promise<void> {
    if (document.getElementById(BTN_ID)) return;

    // Deezer uses a Chakra UI button group as toolbar: data-testid="toolbar"
    const toolbar = await waitForElement('[data-testid="toolbar"]');
    if (!toolbar) return;

    // Wrap in a <div> like sibling buttons in the toolbar
    const wrapper = document.createElement("div");

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.className = "sto-dz-btn chakra-button";
    btn.title = meta.source === "album" ? t("ownThisAlbum") : t("ownThisTrack");
    btn.setAttribute("aria-label", btn.title);
    btn.appendChild(createButtonIcon(24, "sto-dz-btn__icon"));

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(btn);
    });

    wrapper.appendChild(btn);
    toolbar.appendChild(wrapper);
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
      anchor.classList.remove("sto-dz-btn--open");
      return;
    }

    if (!this.currentLinks) return;

    const menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.className = "sto-dz-menu";

    const availableLinks = this.currentLinks.links.filter((l) => l.url && l.url.length > 0);
    for (const link of availableLinks) {
      menu.appendChild(createMenuItem(link));
    }

    if (availableLinks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "sto-dz-menu__empty";
      empty.textContent = t("noLinks");
      menu.appendChild(empty);
    }

    document.body.appendChild(menu);
    positionMenu(menu, anchor);
    anchor.classList.add("sto-dz-btn--open");

    // Close on click outside
    const onClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchor) {
        menu.remove();
        anchor.classList.remove("sto-dz-btn--open");
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
        anchor.classList.remove("sto-dz-btn--open");
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

  let left = rect.left + rect.width / 2 - menuWidth / 2;
  let top = rect.bottom + 8;

  if (left < 8) left = 8;
  if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
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
  a.className = "sto-dz-menu__item";

  a.appendChild(createStoreIcon(link.store, 24, "sto-dz-menu__item-icon"));

  const label = document.createElement("span");
  label.className = "sto-dz-menu__item-label";
  label.textContent = t("buyOn", link.label);
  a.appendChild(label);

  // Show "direct" badge when link is API-resolved
  if (link.isDirect) {
    const badge = document.createElement("span");
    badge.className = "sto-dz-menu__item-badge";
    badge.textContent = "direct";
    a.appendChild(badge);
  }

  return a;
}
