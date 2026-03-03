import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeezerMetadataExtractor } from "./metadata";

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

/**
 * Build a DocumentFragment from a description object.
 * Each entry: { tag, attrs?, text?, children? }
 */
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

function setPathname(path: string): void {
  Object.defineProperty(window, "location", {
    value: {
      pathname: path,
      href: `https://www.deezer.com${path}`,
      hostname: "www.deezer.com",
      search: "",
    },
    writable: true,
    configurable: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("DeezerMetadataExtractor", () => {
  let extractor: DeezerMetadataExtractor;

  beforeEach(() => {
    extractor = new DeezerMetadataExtractor();
    document.body.replaceChildren();
  });

  describe("album page", () => {
    it("extracts album + artist from album page", () => {
      setPathname("/album/123456");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "masthead" },
            children: [
              {
                tag: "h2",
                attrs: { class: "chakra-heading" },
                text: "Random Access Memories",
              },
              {
                tag: "div",
                attrs: { "data-testid": "masthead-subtitle" },
                children: [
                  {
                    tag: "a",
                    attrs: { "data-testid": "creator-name", href: "/fr/artist/27" },
                    text: "Daft Punk",
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

    it("extracts album from locale-prefixed URL (/fr/album/…)", () => {
      setPathname("/fr/album/123456");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "masthead" },
            children: [
              {
                tag: "h2",
                attrs: { class: "chakra-heading" },
                text: "Random Access Memories",
              },
              {
                tag: "div",
                attrs: { "data-testid": "masthead-subtitle" },
                children: [
                  {
                    tag: "a",
                    attrs: { "data-testid": "creator-name", href: "/fr/artist/27" },
                    text: "Daft Punk",
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
        locale: "fr",
      });
    });

    it("returns null when no title found", () => {
      setPathname("/album/123456");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no artist found", () => {
      setPathname("/album/123456");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "masthead" },
            children: [
              {
                tag: "h2",
                attrs: { class: "chakra-heading" },
                text: "Some Album",
              },
            ],
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });
  });

  describe("track page", () => {
    it("extracts track + artist from track page", () => {
      setPathname("/track/789012");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "masthead" },
            children: [
              {
                tag: "h2",
                attrs: { class: "chakra-heading" },
                text: "Get Lucky",
              },
              {
                tag: "div",
                attrs: { "data-testid": "masthead-subtitle" },
                children: [
                  {
                    tag: "a",
                    attrs: { "data-testid": "creator-name", href: "/fr/artist/27" },
                    text: "Daft Punk",
                  },
                ],
              },
            ],
          },
          { tag: "a", attrs: { href: "/album/123456" }, text: "Random Access Memories" },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Random Access Memories",
        artist: "Daft Punk",
        source: "song",
      });
    });

    it("extracts track without album", () => {
      setPathname("/track/789012");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "masthead" },
            children: [
              {
                tag: "h2",
                attrs: { class: "chakra-heading" },
                text: "Get Lucky",
              },
              {
                tag: "div",
                attrs: { "data-testid": "masthead-subtitle" },
                children: [
                  {
                    tag: "a",
                    attrs: { "data-testid": "creator-name", href: "/fr/artist/27" },
                    text: "Daft Punk",
                  },
                ],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        artist: "Daft Punk",
        source: "song",
      });
    });
  });

  describe("now playing", () => {
    it("extracts from player bar", () => {
      setPathname("/");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "player" },
            children: [
              {
                tag: "a",
                attrs: { href: "/track/789012" },
                text: "Get Lucky",
              },
              {
                tag: "a",
                attrs: { href: "/artist/27" },
                text: "Daft Punk",
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Get Lucky",
        artist: "Daft Punk",
        source: "song",
      });
    });

    it("returns null when no player bar", () => {
      setPathname("/");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no artist in player bar", () => {
      setPathname("/");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "player" },
            children: [{ tag: "a", attrs: { href: "/track/789012" }, text: "Get Lucky" }],
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });
  });
});
