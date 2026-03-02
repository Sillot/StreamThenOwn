/**
 * Amazon store link resolver.
 *
 * Uses the Amazon URL from MusicBrainz relations when available,
 * otherwise falls back to a search URL.
 */

import type { StoreLink, StoreQuery } from "./types";
import { isAllowedStoreHost } from "../utils/sanitize";
import { appendAmazonTag } from "../config/affiliate";
import { getAmazonDomain } from "../utils/locale";

export function resolveAmazon(query: StoreQuery, mbUrl?: string): StoreLink {
  if (mbUrl && isAllowedStoreHost(mbUrl)) {
    return makeLink(appendAmazonTag(mbUrl), true);
  }

  // Search URL fallback — locale-aware Amazon search
  const domain = getAmazonDomain(query.locale ?? "en");
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(appendAmazonTag(`https://${domain}/s?k=${q}&i=popular`), false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "amazon",
    label: "Amazon",
    format: "cdAndMore", // i18n key
    url,
    isDirect,
  };
}
