import { describe, it, expect, beforeEach, vi } from "vitest";
import { YtmUIInjector } from "./ui";

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

function setupAlbumPageDOM(): { actionsRow: HTMLElement; rightControls: HTMLElement } {
  const actionsRow = document.createElement("div");
  actionsRow.id = "action-buttons";

  const rightControls = document.createElement("div");
  rightControls.id = "right-controls";

  document.body.replaceChildren(actionsRow, rightControls);
  return { actionsRow, rightControls };
}

function setupPlayerBarOnlyDOM(): HTMLElement {
  const rightControls = document.createElement("div");
  rightControls.id = "right-controls";
  document.body.replaceChildren(rightControls);
  return rightControls;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("YtmUIInjector", () => {
  let ui: YtmUIInjector;

  beforeEach(() => {
    ui = new YtmUIInjector();
    document.body.replaceChildren();
  });

  describe("injectButton — album source", () => {
    it("injects album button into #action-buttons", async () => {
      const { actionsRow } = setupAlbumPageDOM();

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      const albumBtn = document.getElementById("sto-action-btn");
      expect(albumBtn).not.toBeNull();
      expect(albumBtn?.title).toBe("Own this album");
      expect(actionsRow.contains(albumBtn)).toBe(true);
    });

    it("injects player bar button into #right-controls", async () => {
      const { rightControls } = setupAlbumPageDOM();

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      const playerBtn = document.getElementById("sto-player-btn");
      expect(playerBtn).not.toBeNull();
      expect(rightControls.contains(playerBtn)).toBe(true);
    });

    it("player bar button is prepended as first child of #right-controls", async () => {
      const { rightControls } = setupAlbumPageDOM();
      const existing = document.createElement("button");
      rightControls.appendChild(existing);

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      const playerBtn = document.getElementById("sto-player-btn");
      expect(rightControls.firstElementChild).toBe(playerBtn);
    });

    it("album button title is 'Own this album', player bar button title is 'Own this track'", async () => {
      setupAlbumPageDOM();

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      expect(document.getElementById("sto-action-btn")?.title).toBe("Own this album");
      expect(document.getElementById("sto-player-btn")?.title).toBe("Own this track");
    });
  });

  describe("injectButton — song source", () => {
    it("does not inject album button when source is song", async () => {
      setupPlayerBarOnlyDOM();

      await ui.injectButton({ artist: "Radiohead", source: "song" });

      expect(document.getElementById("sto-action-btn")).toBeNull();
    });

    it("injects player bar button into #right-controls when source is song", async () => {
      const rightControls = setupPlayerBarOnlyDOM();

      await ui.injectButton({ artist: "Radiohead", source: "song" });

      const playerBtn = document.getElementById("sto-player-btn");
      expect(playerBtn).not.toBeNull();
      expect(playerBtn?.title).toBe("Own this track");
      expect(rightControls.contains(playerBtn)).toBe(true);
    });
  });

  describe("idempotency", () => {
    it("album button is not duplicated on repeated calls", async () => {
      setupAlbumPageDOM();

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });
      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      expect(document.querySelectorAll("#sto-action-btn")).toHaveLength(1);
    });

    it("player bar button is not duplicated on repeated calls", async () => {
      setupAlbumPageDOM();

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });
      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      expect(document.querySelectorAll("#sto-player-btn")).toHaveLength(1);
    });
  });

  describe("cleanup", () => {
    it("removes both album button and player bar button", async () => {
      setupAlbumPageDOM();

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });
      expect(document.getElementById("sto-action-btn")).not.toBeNull();
      expect(document.getElementById("sto-player-btn")).not.toBeNull();

      ui.cleanup();

      expect(document.getElementById("sto-action-btn")).toBeNull();
      expect(document.getElementById("sto-player-btn")).toBeNull();
    });

    it("removes player bar button when source is song", async () => {
      setupPlayerBarOnlyDOM();

      await ui.injectButton({ artist: "Radiohead", source: "song" });
      expect(document.getElementById("sto-player-btn")).not.toBeNull();

      ui.cleanup();

      expect(document.getElementById("sto-player-btn")).toBeNull();
    });
  });

  describe("setLinks + menu (player bar button)", () => {
    it("opens a menu when the player bar button is clicked", async () => {
      setupPlayerBarOnlyDOM();
      ui.setLinks({
        artist: "Radiohead",
        album: "Kid A",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/search?q=radiohead",
            isDirect: false,
          },
        ],
      });

      await ui.injectButton({ artist: "Radiohead", source: "song" });

      const playerBtn = document.getElementById("sto-player-btn");
      playerBtn?.click();

      const menu = document.getElementById("sto-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.querySelectorAll(".sto-menu__item")).toHaveLength(1);
    });

    it("shows empty state when no links available", async () => {
      setupPlayerBarOnlyDOM();
      ui.setLinks({ artist: "Radiohead", album: "Kid A", links: [] });

      await ui.injectButton({ artist: "Radiohead", source: "song" });

      document.getElementById("sto-player-btn")?.click();

      const menu = document.getElementById("sto-dropdown-menu");
      expect(menu?.querySelector(".sto-menu__empty")?.textContent).toBe("No links found");
    });

    it("toggles menu closed on second click of player bar button", async () => {
      setupPlayerBarOnlyDOM();
      ui.setLinks({
        artist: "Radiohead",
        album: "Kid A",
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

      await ui.injectButton({ artist: "Radiohead", source: "song" });

      const playerBtn = document.getElementById("sto-player-btn");
      playerBtn?.click();
      expect(document.getElementById("sto-dropdown-menu")).not.toBeNull();

      playerBtn?.click();
      expect(document.getElementById("sto-dropdown-menu")).toBeNull();
    });
  });

  describe("setPlayerLinks — independent link sets", () => {
    it("player bar button uses setPlayerLinks when provided", async () => {
      setupAlbumPageDOM();

      const albumLinks = {
        artist: "Radiohead",
        album: "OK Computer",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/ok-computer",
            isDirect: true,
          },
        ],
      };
      const songLinks = {
        artist: "Air",
        album: "Moon Safari",
        links: [
          {
            store: "qobuz",
            label: "Qobuz",
            format: "Hi-Res",
            url: "https://www.qobuz.com/moon-safari",
            isDirect: true,
          },
        ],
      };

      ui.setLinks(albumLinks);
      ui.setPlayerLinks(songLinks);

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      // Album button uses albumLinks
      const albumBtn = document.getElementById("sto-action-btn");
      albumBtn?.click();
      let menu = document.getElementById("sto-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.querySelector(".sto-menu__item-label")?.textContent).toContain("Discogs");
      albumBtn?.click(); // close menu

      // Player bar button uses songLinks
      const playerBtn = document.getElementById("sto-player-btn");
      playerBtn?.click();
      menu = document.getElementById("sto-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.querySelector(".sto-menu__item-label")?.textContent).toContain("Qobuz");
    });

    it("player bar button falls back to setLinks when setPlayerLinks is not called", async () => {
      setupAlbumPageDOM();

      const albumLinks = {
        artist: "Radiohead",
        album: "OK Computer",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/ok-computer",
            isDirect: false,
          },
        ],
      };

      ui.setLinks(albumLinks);
      // setPlayerLinks NOT called — player bar falls back to currentLinks

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      const playerBtn = document.getElementById("sto-player-btn");
      playerBtn?.click();
      const menu = document.getElementById("sto-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.querySelector(".sto-menu__item-label")?.textContent).toContain("Discogs");
    });

    it("setPlayerLinks(null) falls back to setLinks", async () => {
      setupAlbumPageDOM();

      const albumLinks = {
        artist: "Radiohead",
        album: "OK Computer",
        links: [
          {
            store: "discogs",
            label: "Discogs",
            format: "Vinyl",
            url: "https://www.discogs.com/ok-computer",
            isDirect: false,
          },
        ],
      };

      ui.setLinks(albumLinks);
      ui.setPlayerLinks(null); // explicit null → fall back to currentLinks

      await ui.injectButton({ artist: "Radiohead", album: "OK Computer", source: "album" });

      const playerBtn = document.getElementById("sto-player-btn");
      playerBtn?.click();
      const menu = document.getElementById("sto-dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.querySelector(".sto-menu__item-label")?.textContent).toContain("Discogs");
    });
  });
});
