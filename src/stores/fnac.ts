/**
 * Fnac store link resolver.
 *
 * No MusicBrainz relations available — always uses search URL fallback.
 */

import type { StoreLink, StoreQuery } from "./types";

export function resolveFnac(query: StoreQuery): StoreLink {
  const terms = query.album ? `${query.artist}+${query.album}` : query.artist;
  const q = terms.replace(/\s+/g, "+");
  return {
    store: "fnac",
    label: "Fnac",
    format: "cdAndVinyl",
    url: `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(q)}&sft=1&sa=0`,
    isDirect: false,
  };
}
