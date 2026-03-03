/**
 * Affiliate link helpers.
 *
 * Values are injected at build time by esbuild `define`.
 * When empty, affiliate wrapping is skipped and URLs are returned as-is.
 *
 * Note: Amazon Associates links are NOT permitted in browser extensions
 * per their Operating Agreement — only Awin (Qobuz) is supported here.
 */

declare const __STO_AWIN_AFFILIATE_ID__: string;
declare const __STO_AWIN_MERCHANT_ID__: string;

const awinAffiliateId: string =
  typeof __STO_AWIN_AFFILIATE_ID__ !== "undefined" ? __STO_AWIN_AFFILIATE_ID__ : "";
const awinMerchantId: string =
  typeof __STO_AWIN_MERCHANT_ID__ !== "undefined" ? __STO_AWIN_MERCHANT_ID__ : "";

/**
 * Wrap a Qobuz URL with the Awin redirect.
 * Returns the URL unchanged if Awin IDs are not configured.
 */
export function wrapAwinUrl(url: string): string {
  if (!awinAffiliateId || !awinMerchantId) return url;
  const encoded = encodeURIComponent(url);
  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(awinMerchantId)}&awinaffid=${encodeURIComponent(awinAffiliateId)}&ued=${encoded}`;
}
