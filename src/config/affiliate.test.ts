import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Since affiliate.ts reads build-time constants at module scope,
 * we use `vi.hoisted` + dynamic imports to test different configurations.
 */

describe("wrapAwinUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("wraps URL with Awin redirect when configured", async () => {
    vi.stubGlobal("__STO_AWIN_AFFILIATE_ID__", "123456");
    vi.stubGlobal("__STO_AWIN_MERCHANT_ID__", "78901");

    const { wrapAwinUrl } = await import("./affiliate");
    const original = "https://www.qobuz.com/fr-fr/search/albums/radiohead";
    const result = wrapAwinUrl(original);

    expect(result).toBe(
      `https://www.awin1.com/cread.php?awinmid=78901&awinaffid=123456&ued=${encodeURIComponent(original)}`,
    );
  });

  it("returns URL unchanged when affiliate ID is missing", async () => {
    vi.stubGlobal("__STO_AWIN_AFFILIATE_ID__", "");
    vi.stubGlobal("__STO_AWIN_MERCHANT_ID__", "78901");

    const { wrapAwinUrl } = await import("./affiliate");
    const url = "https://www.qobuz.com/fr-fr/album/123";
    expect(wrapAwinUrl(url)).toBe(url);
  });

  it("returns URL unchanged when merchant ID is missing", async () => {
    vi.stubGlobal("__STO_AWIN_AFFILIATE_ID__", "123456");
    vi.stubGlobal("__STO_AWIN_MERCHANT_ID__", "");

    const { wrapAwinUrl } = await import("./affiliate");
    const url = "https://www.qobuz.com/fr-fr/album/123";
    expect(wrapAwinUrl(url)).toBe(url);
  });

  it("returns URL unchanged when both IDs are missing", async () => {
    vi.stubGlobal("__STO_AWIN_AFFILIATE_ID__", "");
    vi.stubGlobal("__STO_AWIN_MERCHANT_ID__", "");

    const { wrapAwinUrl } = await import("./affiliate");
    const url = "https://www.qobuz.com/fr-fr/album/123";
    expect(wrapAwinUrl(url)).toBe(url);
  });
});
