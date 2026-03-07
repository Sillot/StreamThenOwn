import { describe, it, expect, beforeEach, vi } from "vitest";
import { YtmMetadataExtractor } from "./metadata";

/* ------------------------------------------------------------------ */
/*  Mock chrome.i18n (required by transitive imports)                 */
/* ------------------------------------------------------------------ */

vi.stubGlobal("chrome", {
  i18n: { getMessage: (key: string) => key },
  runtime: { id: "test" },
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function setDOM(fragment: DocumentFragment): void {
  document.body.replaceChildren(fragment);
}

interface NodeSpec {
  tag: string;
  attrs?: Record<string, string>;
  text?: string;
  children?: NodeSpec[];
}

function buildFragment(specs: NodeSpec[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const spec of specs) {
    const el = document.createElement(spec.tag);
    if (spec.attrs) {
      for (const [k, v] of Object.entries(spec.attrs)) {
        el.setAttribute(k, v);
      }
    }
    if (spec.text) el.textContent = spec.text;
    if (spec.children) {
      const childFrag = buildFragment(spec.children);
      el.appendChild(childFrag);
    }
    frag.appendChild(el);
  }
  return frag;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("YtmMetadataExtractor", () => {
  let extractor: YtmMetadataExtractor;

  beforeEach(() => {
    extractor = new YtmMetadataExtractor();
    document.body.replaceChildren();
  });

  describe("album page", () => {
    it("extracts album + artist from immersive header", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-immersive-header-renderer",
            children: [
              {
                tag: "h2",
                children: [{ tag: "yt-formatted-string", text: "Random Access Memories" }],
              },
              {
                tag: "div",
                attrs: { class: "subtitle" },
                children: [
                  {
                    tag: "yt-formatted-string",
                    children: [{ tag: "a", attrs: { href: "/channel/UC1" }, text: "Daft Punk" }],
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Random Access Memories",
        artist: "Daft Punk",
        source: "album",
      });
    });

    it("extracts album + artist from detail header", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-detail-header-renderer",
            children: [
              {
                tag: "h2",
                children: [{ tag: "yt-formatted-string", text: "OK Computer" }],
              },
              {
                tag: "div",
                attrs: { class: "subtitle" },
                children: [
                  {
                    tag: "yt-formatted-string",
                    children: [{ tag: "a", attrs: { href: "/channel/UC2" }, text: "Radiohead" }],
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "OK Computer",
        artist: "Radiohead",
        source: "album",
      });
    });

    it("extracts artist from strapline when subtitle has no links", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-responsive-header-renderer",
            children: [
              {
                tag: "h2",
                children: [{ tag: "yt-formatted-string", text: "Discovery" }],
              },
              {
                tag: "div",
                attrs: { class: "strapline" },
                children: [{ tag: "yt-formatted-string", text: "Daft Punk • 2001 • 14 songs" }],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Discovery",
        artist: "Daft Punk",
        source: "album",
      });
    });

    it("returns null when header has no artist", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-immersive-header-renderer",
            children: [
              {
                tag: "h2",
                children: [{ tag: "yt-formatted-string", text: "Some Album" }],
              },
            ],
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no header is present", () => {
      setDOM(buildFragment([{ tag: "div" }]));
      expect(extractor.extract()).toBeNull();
    });

    it("skips year-only artist candidates", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-immersive-header-renderer",
            children: [
              {
                tag: "h2",
                children: [{ tag: "yt-formatted-string", text: "Album" }],
              },
              {
                tag: "div",
                attrs: { class: "subtitle" },
                children: [{ tag: "yt-formatted-string", text: "2024" }],
              },
            ],
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });
  });

  describe("player bar (now playing)", () => {
    it("extracts artist + album from byline text", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-player-bar",
            children: [
              {
                tag: "div",
                attrs: { class: "content-info-wrapper" },
                children: [
                  {
                    tag: "div",
                    attrs: { class: "byline" },
                    children: [{ tag: "yt-formatted-string", text: "Daft Punk • Discovery" }],
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extractSong();
      expect(meta).toEqual({
        album: "Discovery",
        artist: "Daft Punk",
        source: "song",
      });
    });

    it("extracts artist only when no album in byline", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-player-bar",
            children: [
              {
                tag: "div",
                attrs: { class: "content-info-wrapper" },
                children: [
                  {
                    tag: "div",
                    attrs: { class: "byline" },
                    children: [{ tag: "yt-formatted-string", text: "Daft Punk" }],
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extractSong();
      expect(meta).toEqual({
        artist: "Daft Punk",
        source: "song",
      });
    });

    it("falls back to links inside player bar", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-player-bar",
            children: [
              {
                tag: "div",
                attrs: { class: "content-info-wrapper" },
                children: [
                  {
                    tag: "a",
                    attrs: { href: "/channel/UC1" },
                    text: "Radiohead",
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extractSong();
      expect(meta).toEqual({
        artist: "Radiohead",
        source: "song",
      });
    });

    it("falls back to subtitle span", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-player-bar",
            children: [
              { tag: "span", attrs: { class: "subtitle" }, text: "Gorillaz • Demon Days" },
            ],
          },
        ]),
      );

      const meta = extractor.extractSong();
      expect(meta).toEqual({
        album: "Demon Days",
        artist: "Gorillaz",
        source: "song",
      });
    });

    it("returns null when no player bar", () => {
      setDOM(buildFragment([{ tag: "div" }]));
      expect(extractor.extractSong()).toBeNull();
    });
  });

  describe("extract() priority", () => {
    it("prefers album page over player bar", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-immersive-header-renderer",
            children: [
              {
                tag: "h2",
                children: [{ tag: "yt-formatted-string", text: "Album Page Title" }],
              },
              {
                tag: "div",
                attrs: { class: "subtitle" },
                children: [
                  {
                    tag: "yt-formatted-string",
                    children: [{ tag: "a", attrs: { href: "/channel/UC1" }, text: "Album Artist" }],
                  },
                ],
              },
            ],
          },
          {
            tag: "ytmusic-player-bar",
            children: [
              {
                tag: "div",
                attrs: { class: "content-info-wrapper" },
                children: [
                  {
                    tag: "div",
                    attrs: { class: "byline" },
                    children: [
                      { tag: "yt-formatted-string", text: "Player Artist • Player Album" },
                    ],
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Album Page Title",
        artist: "Album Artist",
        source: "album",
      });
    });

    it("falls back to player bar when no album page header", () => {
      setDOM(
        buildFragment([
          {
            tag: "ytmusic-player-bar",
            children: [
              {
                tag: "div",
                attrs: { class: "content-info-wrapper" },
                children: [
                  {
                    tag: "div",
                    attrs: { class: "byline" },
                    children: [{ tag: "yt-formatted-string", text: "Daft Punk • Homework" }],
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Homework",
        artist: "Daft Punk",
        source: "song",
      });
    });
  });
});
