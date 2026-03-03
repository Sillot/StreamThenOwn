import { describe, it, expect, beforeEach, vi } from "vitest";
import { AmazonMusicUIInjector } from "./ui";

/* ------------------------------------------------------------------ */
/*  Mock chrome APIs                                                  */
/* ------------------------------------------------------------------ */

vi.stubGlobal("chrome", {
  i18n: {
    getMessage: (key: string, substitutions?: string | string[]) => {
      if (key === "buyOn") return `Buy on ${String(substitutions)}`;
      if (key === "ownThisAlbum") return "Own this album";
      if (key === "ownThisTrack") return "Own this track";
      if (key === "noLinks") return "No links found";
      return key;
    },
  },
  runtime: { id: "test", getURL: (path: string) => `chrome-extension://test/${path}` },
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function setupDOM(): void {
  const header = document.createElement("music-detail-header");
  header.setAttribute("headline", "Test Album");
  const iconsRow = document.createElement("div");
  iconsRow.setAttribute("slot", "icons");
  header.appendChild(iconsRow);
  document.body.replaceChildren(header);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("AmazonMusicUIInjector", () => {
  let ui: AmazonMusicUIInjector;

  beforeEach(() => {
    ui = new AmazonMusicUIInjector();
    document.body.replaceChildren();
  });

  describe("injectButton", () => {
    it("injects a button as last child of the icons row", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });

      const btn = document.getElementById("sto-am-action-btn");
      expect(btn).not.toBeNull();
      expect(btn?.title).toBe("Own this album");

      // Should be inside the icons row
      const iconsRow = document.querySelector('div[slot="icons"]');
      expect(iconsRow?.contains(btn)).toBe(true);

      // Should be the last child (wrapped in a span)
      expect(iconsRow?.lastElementChild?.contains(btn)).toBe(true);
    });

    it("is idempotent", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });
      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });

      const buttons = document.querySelectorAll("#sto-am-action-btn");
      expect(buttons).toHaveLength(1);
    });

    it("uses track title when source is song", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Daft Punk", source: "song" });

      const btn = document.getElementById("sto-am-action-btn");
      expect(btn?.title).toBe("Own this track");
    });
  });

  describe("cleanup", () => {
    it("removes the button", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Test", source: "album" });
      expect(document.getElementById("sto-am-action-btn")).not.toBeNull();

      ui.cleanup();
      expect(document.getElementById("sto-am-action-btn")).toBeNull();
    });
  });

  describe("setLinks + menu", () => {
    it("opens a menu with store links on click", async () => {
      setupDOM();
      ui.setLinks({
        artist: "Daft Punk",
        album: "Discovery",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/search?q=daft+punk",
            isDirect: false,
          },
          {
            store: "qobuz",
            label: "Qobuz",
            format: "Hi-Res",
            url: "https://www.qobuz.com/search?q=daft+punk",
            isDirect: false,
          },
        ],
      });

      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });

      const btn = document.getElementById("sto-am-action-btn");
      btn?.click();

      const menu = document.getElementById("sto-am-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.className).toBe("sto-am-menu");

      const items = menu?.querySelectorAll(".sto-am-menu__item");
      expect(items).toHaveLength(2);
    });

    it("shows empty state when no links available", async () => {
      setupDOM();
      ui.setLinks({ artist: "Test", album: "Album", links: [] });

      await ui.injectButton({ artist: "Test", album: "Album", source: "album" });

      const btn = document.getElementById("sto-am-action-btn");
      btn?.click();

      const menu = document.getElementById("sto-am-dropdown-menu");
      const empty = menu?.querySelector(".sto-am-menu__empty");
      expect(empty?.textContent).toBe("No links found");
    });

    it("toggles menu on second click", async () => {
      setupDOM();
      ui.setLinks({
        artist: "Test",
        album: "Album",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/test",
            isDirect: false,
          },
        ],
      });

      await ui.injectButton({ artist: "Test", album: "Album", source: "album" });

      const btn = document.getElementById("sto-am-action-btn");
      btn?.click();
      expect(document.getElementById("sto-am-dropdown-menu")).not.toBeNull();

      btn?.click();
      expect(document.getElementById("sto-am-dropdown-menu")).toBeNull();
    });
  });
});
