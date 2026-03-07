---
name: add-store
description: "Step-by-step guide to add a new purchase store to StreamThenOwn"
---

# Add a New Purchase Store

Use this skill when the user asks to add a new store for buying music (e.g. HDtracks, JPC, Boomkat, Fnac…).

## Architecture Overview

Each store is a **resolver module** in `src/stores/<store>.ts` that takes a `StoreQuery` (artist + album + locale) and returns a `StoreLink` (URL + metadata). Stores can optionally receive a direct URL from MusicBrainz via `ExternalUrls`.

Resolution priority: **MusicBrainz direct URL → search fallback URL**. Every store must always return a valid link — never `null`.

Types are defined in `src/stores/types.ts`.

## Checklist (all steps required)

### 1. Create `src/stores/<store>.ts`

Export a `resolve<Store>(query: StoreQuery, directUrl?: string): StoreLink` function.

**Minimal template** (search-only store, no MusicBrainz relations):

```typescript
import type { StoreLink, StoreQuery } from "./types";

export function resolve<Store>(query: StoreQuery): StoreLink {
  const q = encodeURIComponent(
    query.album ? `${query.artist} ${query.album}` : query.artist,
  );
  return {
    store: "<store-id>",
    label: "<Store Name>",
    format: "<i18n-key>",  // e.g. "hiResDigital", "vinylAndCD"
    url: `https://<store-domain>/search?q=${q}`,
    isDirect: false,
  };
}
```

**Template with MusicBrainz direct URL support**:

```typescript
import type { StoreLink, StoreQuery } from "./types";

export function resolve<Store>(query: StoreQuery, directUrl?: string): StoreLink {
  if (directUrl) {
    return makeLink(directUrl, true);
  }
  const q = encodeURIComponent(
    query.album ? `${query.artist} ${query.album}` : query.artist,
  );
  return makeLink(`https://<store-domain>/search?q=${q}`, false);
}

function makeLink(url: string, isDirect: boolean): StoreLink {
  return {
    store: "<store-id>",
    label: "<Store Name>",
    format: "<i18n-key>",
    url,
    isDirect,
  };
}
```

**Reference**: `src/stores/ebay.ts` (search-only) or `src/stores/discogs.ts` (with MB direct URL).

### 2. Add locale support (if applicable)

If the store has regional domains (e.g. `.fr`, `.de`, `.co.uk`):

- Add a `get<Store>Domain(locale: string): string` function in `src/utils/locale.ts`
- Map locale codes to the appropriate domain
- Use it in the resolver to build locale-aware URLs

### 3. Update `ExternalUrls` (if MusicBrainz provides direct URLs)

If MusicBrainz may link to this store, add a new optional field in `src/stores/types.ts`:

```typescript
export interface ExternalUrls {
  discogs?: string;
  amazon?: string;
  qobuz?: string;
  bandcamp?: string;
  <store>?: string;    // ← add this
}
```

Then update `src/stores/musicbrainz.ts` to extract the URL from MusicBrainz release relations.

### 4. Register in the orchestrator

In `src/stores/index.ts`:

- Import the resolver function
- Add the call in the "Step 3: Resolve each store" section:

```typescript
const <store> = resolve<Store>(query, externalUrls.<store>);
allLinks.push(<store>);
```

### 5. Add the store icon

- Place an SVG icon file in `public/icons/<store>.svg` (keep it simple, monochrome, ~24×24 viewBox)
- Register it in `src/stores/icons.ts` → `STORE_ICON_FILES` record:

```typescript
const STORE_ICON_FILES: Readonly<Record<string, string>> = {
  // ...existing entries...
  "<store-id>": "<store>.svg",
};
```

- Declare the icon as a web-accessible resource in `public/manifest.json` (in the `web_accessible_resources` section)

### 6. Add the i18n format label

If the store needs a new format label (e.g. "Hi-Res Digital"), add a new message key to **all 15 locale files** in `public/_locales/*/messages.json`:

```json
"<formatKey>": {
  "message": "<Format description>",
  "description": "<Store name> format label"
}
```

**Locales to update**: `da`, `de`, `en`, `es`, `fi`, `fr`, `it`, `ja`, `ko`, `nb`, `nl`, `pl`, `pt_BR`, `pt_PT`, `sv`.

If an existing format key fits (e.g. `"vinylAndCD"`, `"hiResDigital"`, `"digitalAndPhysical"`), reuse it.

### 7. Update the default store order

In `src/background/service-worker.ts`, add the store ID to the `defaultOrder` array:

```typescript
const defaultOrder = ["discogs", "qobuz", "amazon", "bandcamp", "ebay", "7digital", "<store-id>"];
```

### 8. Write tests

Create `src/stores/<store>.test.ts`:

- Test search fallback URL generation
- Test with direct URL (if supported)
- Test locale-aware URL generation (if applicable)
- Test with missing album (artist-only query)

### 9. Validate

Run `make validate` — everything must pass.

## Common Pitfalls

- **Always return a link** — never return `null` or throw. If a direct URL is invalid, fall back to search.
- **Encode query parameters** — always use `encodeURIComponent()` for search terms in URLs.
- **Use `https:`** — never generate `http:` links.
- **Store ID must be unique** — used as a key throughout the system (icons, options, storage).
- **Format key is an i18n key** — not a raw string. It gets resolved via `chrome.i18n.getMessage()`.
