import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeezerUIInjector } from "./ui";

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
  const toolbar = document.createElement("div");
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("data-testid", "toolbar");
  toolbar.setAttribute("data-orientation", "horizontal");
  toolbar.className = "chakra-button__group";
  document.body.replaceChildren(toolbar);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("DeezerUIInjector", () => {
  let ui: DeezerUIInjector;

  beforeEach(() => {
    ui = new DeezerUIInjector();
    document.body.replaceChildren();
  });

  describe("injectButton", () => {
    it("injects a button as last child of the toolbar", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });

      const btn = document.getElementById("sto-dz-action-btn");
      expect(btn).not.toBeNull();
      expect(btn?.title).toBe("Own this album");

      // Should be inside the toolbar
      const toolbar = document.querySelector('[data-testid="toolbar"]');
      expect(toolbar?.contains(btn)).toBe(true);

      // Should be the last child (wrapped in a div)
      expect(toolbar?.lastElementChild?.contains(btn)).toBe(true);
    });

    it("is idempotent", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });
      await ui.injectButton({ artist: "Daft Punk", album: "Discovery", source: "album" });

      const buttons = document.querySelectorAll("#sto-dz-action-btn");
      expect(buttons).toHaveLength(1);
    });

    it("uses track title when source is song", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Daft Punk", source: "song" });

      const btn = document.getElementById("sto-dz-action-btn");
      expect(btn?.title).toBe("Own this track");
    });
  });

  describe("cleanup", () => {
    it("removes the button", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Test", source: "album" });
      expect(document.getElementById("sto-dz-action-btn")).not.toBeNull();

      ui.cleanup();
      expect(document.getElementById("sto-dz-action-btn")).toBeNull();
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

      const btn = document.getElementById("sto-dz-action-btn");
      btn?.click();

      const menu = document.getElementById("sto-dz-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.className).toBe("sto-dz-menu");

      const items = menu?.querySelectorAll(".sto-dz-menu__item");
      expect(items).toHaveLength(2);
    });

    it("shows empty state when no links available", async () => {
      setupDOM();
      ui.setLinks({ artist: "Test", album: "Album", links: [] });

      await ui.injectButton({ artist: "Test", album: "Album", source: "album" });

      const btn = document.getElementById("sto-dz-action-btn");
      btn?.click();

      const menu = document.getElementById("sto-dz-dropdown-menu");
      const empty = menu?.querySelector(".sto-dz-menu__empty");
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

      const btn = document.getElementById("sto-dz-action-btn");
      btn?.click();
      expect(document.getElementById("sto-dz-dropdown-menu")).not.toBeNull();

      btn?.click();
      expect(document.getElementById("sto-dz-dropdown-menu")).toBeNull();
    });
  });
});
