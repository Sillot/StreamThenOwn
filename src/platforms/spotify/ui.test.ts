import { describe, it, expect, beforeEach, vi } from "vitest";
import { SpotifyUIInjector } from "./ui";

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
  document.body.innerHTML = `
    <div class="action-bar">
      <button data-testid="more-button">⋯</button>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("SpotifyUIInjector", () => {
  let ui: SpotifyUIInjector;

  beforeEach(() => {
    ui = new SpotifyUIInjector();
    document.body.innerHTML = "";
  });

  describe("injectButton", () => {
    it("injects a button after the more-button", async () => {
      setupDOM();

      await ui.injectButton({ artist: "BLACKPINK", album: "DEADLINE", source: "album" });

      const btn = document.getElementById("sto-sp-action-btn");
      expect(btn).not.toBeNull();
      expect(btn?.title).toBe("Own this album");
      expect(btn?.className).toBe("sto-sp-btn");
    });

    it("is idempotent", async () => {
      setupDOM();

      await ui.injectButton({ artist: "BLACKPINK", album: "DEADLINE", source: "album" });
      await ui.injectButton({ artist: "BLACKPINK", album: "DEADLINE", source: "album" });

      const buttons = document.querySelectorAll("#sto-sp-action-btn");
      expect(buttons).toHaveLength(1);
    });

    it("uses track title when source is song", async () => {
      setupDOM();

      await ui.injectButton({ artist: "BLACKPINK", source: "song" });

      const btn = document.getElementById("sto-sp-action-btn");
      expect(btn?.title).toBe("Own this track");
    });
  });

  describe("cleanup", () => {
    it("removes the button", async () => {
      setupDOM();

      await ui.injectButton({ artist: "Test", source: "album" });
      expect(document.getElementById("sto-sp-action-btn")).not.toBeNull();

      ui.cleanup();
      expect(document.getElementById("sto-sp-action-btn")).toBeNull();
    });
  });

  describe("setLinks + menu", () => {
    it("opens a menu with store links on click", async () => {
      setupDOM();
      ui.setLinks({
        artist: "BLACKPINK",
        album: "DEADLINE",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/search?q=blackpink",
            isDirect: false,
          },
          {
            store: "qobuz",
            label: "Qobuz",
            format: "Hi-Res",
            url: "https://www.qobuz.com/search?q=blackpink",
            isDirect: false,
          },
        ],
      });

      await ui.injectButton({ artist: "BLACKPINK", album: "DEADLINE", source: "album" });

      const btn = document.getElementById("sto-sp-action-btn");
      btn?.click();

      const menu = document.getElementById("sto-sp-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.className).toBe("sto-sp-menu");

      const items = menu?.querySelectorAll(".sto-sp-menu__item");
      expect(items).toHaveLength(2);
    });

    it("shows empty state when no links available", async () => {
      setupDOM();
      ui.setLinks({ artist: "Test", album: "Album", links: [] });

      await ui.injectButton({ artist: "Test", album: "Album", source: "album" });

      const btn = document.getElementById("sto-sp-action-btn");
      btn?.click();

      const menu = document.getElementById("sto-sp-dropdown-menu");
      const empty = menu?.querySelector(".sto-sp-menu__empty");
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

      const btn = document.getElementById("sto-sp-action-btn");
      btn?.click();
      expect(document.getElementById("sto-sp-dropdown-menu")).not.toBeNull();

      btn?.click();
      expect(document.getElementById("sto-sp-dropdown-menu")).toBeNull();
    });
  });
});
