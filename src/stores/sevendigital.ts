/**
 * 7digital store link resolver.
 *
 * 7digital has no MusicBrainz relations — always falls back to a search URL.
 * The search URL is locale-aware (fr.7digital.com, de.7digital.com, etc.).
 */

import type { StoreLink, StoreQuery } from "./types";
import { get7digitalSubdomain } from "../utils/locale";

export function resolve7digital(query: StoreQuery): StoreLink {
  const locale = query.locale ?? "en";
  const subdomain = get7digitalSubdomain(locale);
  const q = encodeURIComponent(query.album ? `${query.artist} ${query.album}` : query.artist);
  return makeLink(`https://${subdomain}.7digital.com/search?q=${q}`, false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "7digital",
    label: "7digital",
    format: "hiResDigital", // same i18n key as Qobuz — both are hi-res digital stores
    url,
    isDirect,
  };
}
