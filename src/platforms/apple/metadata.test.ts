import { describe, it, expect, beforeEach, vi } from "vitest";
import { AppleMetadataExtractor } from "./metadata";

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

function setLocation(path: string, search = ""): void {
  Object.defineProperty(window, "location", {
    value: {
      pathname: path,
      search,
      href: `https://music.apple.com${path}${search}`,
      hostname: "music.apple.com",
    },
    writable: true,
    configurable: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("AppleMetadataExtractor", () => {
  let extractor: AppleMetadataExtractor;

  beforeEach(() => {
    extractor = new AppleMetadataExtractor();
    document.body.replaceChildren();
  });

  describe("album page", () => {
    it("extracts album + artist from album page", () => {
      setLocation("/fr/album/blackhole/1873882195");
      setDOM(
        buildFragment([
          { tag: "h1", text: "Blackhole" },
          {
            tag: "a",
            attrs: { href: "/fr/artist/some-artist/123", "data-testid": "click-action" },
            text: "Muse",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Blackhole",
        artist: "Muse",
        source: "album",
        locale: "fr-fr",
      });
    });

    it("extracts album from English locale URL (/us/album/…)", () => {
      setLocation("/us/album/thriller/12345");
      setDOM(
        buildFragment([
          { tag: "h1", text: "Thriller" },
          {
            tag: "a",
            attrs: { href: "/us/artist/michael-jackson/456" },
            text: "Michael Jackson",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Thriller",
        artist: "Michael Jackson",
        source: "album",
        locale: "en-us",
      });
    });

    it("extracts Spanish locale from /es/ URL prefix", () => {
      setLocation("/es/album/el-dorado/12345");
      setDOM(
        buildFragment([
          { tag: "h1", text: "El Dorado" },
          {
            tag: "a",
            attrs: { href: "/es/artist/shakira/456" },
            text: "Shakira",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "El Dorado",
        artist: "Shakira",
        source: "album",
        locale: "es-es",
      });
    });

    it("returns null when no title found", () => {
      setLocation("/fr/album/something/12345");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });

    it("returns null when no artist found", () => {
      setLocation("/fr/album/something/12345");
      setDOM(buildFragment([{ tag: "h1", text: "Some Album" }]));

      expect(extractor.extract()).toBeNull();
    });
  });

  describe("song on album page (?i= parameter)", () => {
    it("detects song source when ?i= is present", () => {
      setLocation("/fr/album/blackhole/1873882195", "?i=1873882200");
      setDOM(
        buildFragment([
          { tag: "h1", text: "Blackhole" },
          {
            tag: "a",
            attrs: { href: "/fr/artist/muse/123" },
            text: "Muse",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Blackhole",
        artist: "Muse",
        source: "song",
        locale: "fr-fr",
      });
    });
  });

  describe("album title extraction strategies", () => {
    it("prefers data-testid non-truncated-shelf-title", () => {
      setLocation("/fr/album/test/123");
      setDOM(
        buildFragment([
          {
            tag: "span",
            attrs: { "data-testid": "non-truncated-shelf-title" },
            text: "Preferred Title",
          },
          { tag: "h1", text: "Fallback Title" },
          {
            tag: "a",
            attrs: { href: "/fr/artist/test/456" },
            text: "Test Artist",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta?.album).toBe("Preferred Title");
    });

    it("falls back to h1 in product-hero", () => {
      setLocation("/fr/album/test/123");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { class: "product-hero" },
            children: [{ tag: "h1", text: "Hero Title" }],
          },
          {
            tag: "a",
            attrs: { href: "/fr/artist/test/456" },
            text: "Test Artist",
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta?.album).toBe("Hero Title");
    });
  });

  describe("now playing", () => {
    it("extracts from now playing controls", () => {
      setLocation("/fr/listen-now");
      setDOM(
        buildFragment([
          {
            tag: "div",
            attrs: { class: "web-chrome-playback-controls" },
            children: [
              {
                tag: "span",
                attrs: { class: "web-chrome-playback-lcd__song-name" },
                text: "Supermassive Black Hole",
              },
              {
                tag: "a",
                attrs: { class: "web-chrome-playback-lcd__sub-copy-scroll-link" },
                text: "Muse",
              },
            ],
          },
        ]),
      );

      const meta = extractor.extract();
      expect(meta).toEqual({
        album: "Supermassive Black Hole",
        artist: "Muse",
        source: "song",
        locale: "fr-fr",
      });
    });

    it("returns null when no now playing controls", () => {
      setLocation("/fr/listen-now");
      setDOM(buildFragment([{ tag: "div" }]));

      expect(extractor.extract()).toBeNull();
    });
  });
});
