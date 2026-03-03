/**
 * eBay store link resolver.
 *
 * eBay has no MusicBrainz relations — always falls back to a search URL.
 * The search URL is locale-aware (ebay.fr, ebay.de, etc.).
 */

import type { StoreLink, StoreQuery } from "./types";
import { getEbayDomain } from "../utils/locale";

export function resolveEbay(query: StoreQuery): StoreLink {
  const locale = query.locale ?? "en";
  const domain = getEbayDomain(locale);
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(`https://${domain}/sch/i.html?_nkw=${q}&_sacat=176985`, false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "ebay",
    label: "eBay",
    format: "vinylAndCD", // i18n key
    url,
    isDirect,
  };
}
