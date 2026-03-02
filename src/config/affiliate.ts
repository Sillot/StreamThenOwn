/**
 * Affiliate link helpers.
 *
 * Values are injected at build time by esbuild `define`.
 * When empty, affiliate wrapping is skipped and URLs are returned as-is.
 */

declare const __STO_AMAZON_AFFILIATE_TAG__: string;
declare const __STO_AWIN_AFFILIATE_ID__: string;
declare const __STO_AWIN_MERCHANT_ID__: string;

const amazonTag: string =
  typeof __STO_AMAZON_AFFILIATE_TAG__ !== "undefined" ? __STO_AMAZON_AFFILIATE_TAG__ : "";
const awinAffiliateId: string =
  typeof __STO_AWIN_AFFILIATE_ID__ !== "undefined" ? __STO_AWIN_AFFILIATE_ID__ : "";
const awinMerchantId: string =
  typeof __STO_AWIN_MERCHANT_ID__ !== "undefined" ? __STO_AWIN_MERCHANT_ID__ : "";

/**
 * Append the Amazon Associates tag to a URL.
 * Returns the URL unchanged if no tag is configured.
 */
export function appendAmazonTag(url: string): string {
  if (!amazonTag) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tag=${encodeURIComponent(amazonTag)}`;
}

/**
 * Wrap a Qobuz URL with the Awin redirect.
 * Returns the URL unchanged if Awin IDs are not configured.
 */
export function wrapAwinUrl(url: string): string {
  if (!awinAffiliateId || !awinMerchantId) return url;
  const encoded = encodeURIComponent(url);
  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(awinMerchantId)}&awinaffid=${encodeURIComponent(awinAffiliateId)}&ued=${encoded}`;
}
