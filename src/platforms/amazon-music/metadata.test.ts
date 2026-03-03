import { describe, it, expect, beforeEach, vi } from "vitest";
import { AmazonMusicMetadataExtractor } from "./metadata";

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

function setLocation(path: string, hostname = "music.amazon.com"): void {
  Object.defineProperty(window, "location", {
    value: {
      pathname: path,
      href: `https://${hostname}${path}`,
      hostname,
      search: "",
    },
    writable: true,
    configurable: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("AmazonMusicMetadataExtractor", () => {
  let extractor: AmazonMusicMetadataExtractor;

  beforeEach(() => {
    extractor = new AmazonMusicMetadataExtractor();
    document.body.replaceChildren();
  });

  describe("album page", () => {
    it("extracts album + artist from music-detail-header attributes", () => {
      setLocation("/albums/B0XXXXXXXXX");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: {
              headline: "Random Access Memories",
              "primary-text": "Daft Punk",
            },
            children: [{ tag: "div", attrs: { slot: "icons" } }],
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

    it("falls back to artist link inside header", () => {
      setLocation("/albums/B0XXXXXXXXX");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: { headline: "Discovery" },
            children: [{ tag: "a", attrs: { href: "/artists/B001234" }, text: "Daft Punk" }],
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

    it("falls back to any artist link on the page", () => {
      setLocation("/albums/B0XXXXXXXXX");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: { headline: "Homework" },
          },
          { tag: "a", attrs: { href: "/artists/B001234" }, text: "Daft Punk" },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Homework",
        artist: "Daft Punk",
        source: "album",
      });
    });

    it("includes locale from regional hostname (music.amazon.de)", () => {
      setLocation("/albums/B0XXXXXXXXX", "music.amazon.de");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: {
              headline: "Random Access Memories",
              "primary-text": "Daft Punk",
            },
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Random Access Memories",
        artist: "Daft Punk",
        source: "album",
        locale: "de",
      });
    });

    it("includes locale from music.amazon.fr", () => {
      setLocation("/albums/B0XXXXXXXXX", "music.amazon.fr");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: {
              headline: "Découverte",
              "primary-text": "Daft Punk",
            },
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Découverte",
        artist: "Daft Punk",
        source: "album",
        locale: "fr",
      });
    });

    it("returns null when no header found", () => {
      setLocation("/albums/B0XXXXXXXXX");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no headline attribute", () => {
      setLocation("/albums/B0XXXXXXXXX");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: { "primary-text": "Daft Punk" },
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no artist found", () => {
      setLocation("/albums/B0XXXXXXXXX");
      setDOM(
        buildFragment([
          {
            tag: "music-detail-header",
            attrs: { headline: "Some Album" },
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });
  });

  describe("now playing", () => {
    it("extracts from music-horizontal-item in transport", () => {
      setLocation("/");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { id: "transport" },
            children: [
              {
                tag: "music-horizontal-item",
                attrs: {
                  "primary-text": "Get Lucky",
                  "secondary-text": "Daft Punk",
                },
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

    it("extracts from music-horizontal-item in footer", () => {
      setLocation("/");
      setDOM(
        buildFragment([
          {
            tag: "footer",
            children: [
              {
                tag: "music-horizontal-item",
                attrs: {
                  "primary-text": "Around the World",
                  "secondary-text": "Daft Punk",
                },
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Around the World",
        artist: "Daft Punk",
        source: "song",
      });
    });

    it("extracts from now-playing widget with links", () => {
      setLocation("/");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { id: "now-playing-widget" },
            children: [
              { tag: "a", attrs: { href: "/albums/B001234" }, text: "Discovery" },
              { tag: "a", attrs: { href: "/artists/B005678" }, text: "Daft Punk" },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Discovery",
        artist: "Daft Punk",
        source: "song",
      });
    });

    it("returns null when no player bar", () => {
      setLocation("/");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no artist in player", () => {
      setLocation("/");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { id: "transport" },
            children: [
              {
                tag: "music-horizontal-item",
                attrs: { "primary-text": "Get Lucky" },
              },
            ],
          },
        ]),
      );

      expect(extractor.extract()).toBeNull();
    });
  });
});
