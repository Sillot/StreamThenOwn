import { describe, it, expect, beforeEach, vi } from "vitest";
import { SpotifyMetadataExtractor } from "./metadata";

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
      href: `https://open.spotify.com${path}`,
      hostname: "open.spotify.com",
    },
    writable: true,
    configurable: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("SpotifyMetadataExtractor", () => {
  let extractor: SpotifyMetadataExtractor;

  beforeEach(() => {
    extractor = new SpotifyMetadataExtractor();
    document.body.replaceChildren();
  });

  describe("album page", () => {
    it("extracts album + artist from album page", () => {
      setPathname("/album/abc123");
      setDOM(
        buildFragment([
          {
            tag: "span",
            attrs: { "data-testid": "entityTitle" },
            text: "DEADLINE",
          },
          {
            tag: "a",
            attrs: { "data-testid": "creator-link", href: "/artist/xyz" },
            text: "BLACKPINK",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "DEADLINE",
        artist: "BLACKPINK",
        source: "album",
      });
    });

    it("extracts album from locale-prefixed URL (/intl-fr/album/…)", () => {
      setPathname("/intl-fr/album/abc123");
      setDOM(
        buildFragment([
          {
            tag: "span",
            attrs: { "data-testid": "entityTitle" },
            text: "DEADLINE",
          },
          {
            tag: "a",
            attrs: { "data-testid": "creator-link", href: "/artist/xyz" },
            text: "BLACKPINK",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "DEADLINE",
        artist: "BLACKPINK",
        source: "album",
      });
    });

    it("returns null when no title found", () => {
      setPathname("/album/abc123");
      setDOM(buildFragment([{ tag: "div", attrs: { "data-testid": "entityTitle" } }]));

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no artist found", () => {
      setPathname("/album/abc123");
      setDOM(
        buildFragment([
          {
            tag: "span",
            attrs: { "data-testid": "entityTitle" },
            text: "Some Album",
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });
  });

  describe("track page", () => {
    it("extracts track + artist from track page", () => {
      setPathname("/track/def456");
      setDOM(
        buildFragment([
          { tag: "span", attrs: { "data-testid": "entityTitle" }, text: "Some Song" },
          {
            tag: "a",
            attrs: { "data-testid": "creator-link", href: "/artist/xyz" },
            text: "Artist Name",
          },
          { tag: "a", attrs: { href: "/album/abc123" }, text: "Some Album" },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Some Album",
        artist: "Artist Name",
        source: "song",
      });
    });

    it("extracts track without album", () => {
      setPathname("/track/def456");
      setDOM(
        buildFragment([
          { tag: "span", attrs: { "data-testid": "entityTitle" }, text: "Single Song" },
          {
            tag: "a",
            attrs: { "data-testid": "creator-link", href: "/artist/xyz" },
            text: "Artist Name",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        artist: "Artist Name",
        source: "song",
      });
    });
  });

  describe("now playing", () => {
    it("extracts from now playing widget", () => {
      setPathname("/");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { "data-testid": "now-playing-widget" },
            children: [
              {
                tag: "a",
                attrs: { "data-testid": "context-item-link", href: "/track/abc" },
                text: "Track Name",
              },
              {
                tag: "div",
                attrs: { "data-testid": "context-item-info-subtitles" },
                children: [{ tag: "a", attrs: { href: "/artist/xyz" }, text: "Some Artist" }],
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Track Name",
        artist: "Some Artist",
        source: "song",
      });
    });

    it("returns null when no now playing widget", () => {
      setPathname("/");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });
  });
});
