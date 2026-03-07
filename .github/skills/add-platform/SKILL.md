---
name: add-platform
description: "Step-by-step guide to add a new streaming music platform to StreamThenOwn"
---

# Add a New Streaming Platform

Use this skill when the user asks to add support for a new streaming service (e.g. Tidal, SoundCloud, Pandora…).

## Architecture Overview

Each platform is a **pluggable adapter** in `src/platforms/<platform>/` with 3 files:

| File | Implements | Purpose |
|------|-----------|---------|
| `metadata.ts` | `MetadataExtractor` | Scrapes artist/album from the service's DOM |
| `ui.ts` | `UIInjector` | Injects the STO button & dropdown, styled to match the service |
| `index.ts` | `PlatformAdapter` | Combines metadata + UI + SPA navigation observer |

Interfaces are defined in `src/platforms/types.ts`.

## Checklist (all steps required)

### 1. Research the target platform

Before writing code, inspect the target platform's DOM in DevTools:

- **Album page**: identify selectors for album title + artist name
- **Song/track page**: identify where track + artist are displayed
- **Player bar**: identify the now-playing bar (if persistent) for `extractSong()`
- **URL patterns**: album pages, track pages, artist pages (for pathname-based detection)
- **SPA navigation**: does the site use `pushState`, `popstate`, or a custom router?
- **Design tokens**: extract colors, fonts, border-radius, button sizes from computed styles

### 2. Create `src/platforms/<platform>/metadata.ts`

Implement `MetadataExtractor`. Key rules:

- Try **multiple selector strategies** (the DOM structure may vary across page types or A/B tests)
- Return `source: "album"` for album pages, `source: "song"` for track/player bar
- `album` is optional — some pages only show artist + track
- Optionally implement `extractSong()` for persistent player bars
- Guard against missing elements: use optional chaining (`el?.textContent?.trim()`)
- If the platform uses locale-prefixed URLs (e.g. `/intl-fr/album/…`), extract and include `locale` in the metadata

**Reference**: `src/platforms/deezer/metadata.ts` is a clean, mid-complexity example.

### 3. Create `src/platforms/<platform>/ui.ts`

Implement `UIInjector`. Key rules:

- Match the host platform's native button style (size, color, border-radius, font)
- Use `document.createElement()` exclusively — **never `innerHTML`**
- Use icons from `src/stores/icons.ts` (`createStoreIcon()`, `createButtonIcon()`)
- The `injectButton()` method must be **idempotent** (no-op if button already exists)
- Use `waitForElement()` from `src/utils/dom.ts` to wait for the target container
- Use `closeMenu()` to dismiss the dropdown when clicking outside
- Apply BEM CSS classes prefixed with `sto-<platform>-` (e.g. `sto-dz-btn`, `sto-sp-menu`)

**Reference**: `src/platforms/deezer/ui.ts` or `src/platforms/spotify/ui.ts`.

### 4. Create `src/platforms/<platform>/index.ts`

Implement `PlatformAdapter`. Standard pattern:

```typescript
import type { PlatformAdapter } from "../types";
import { <Platform>MetadataExtractor } from "./metadata";
import { <Platform>UIInjector } from "./ui";

export class <Platform>Adapter implements PlatformAdapter {
  readonly name = "<Platform Name>";
  readonly metadata = new <Platform>MetadataExtractor();
  readonly ui = new <Platform>UIInjector();

  observeNavigation(onNavigate: () => void): void {
    let lastUrl = location.href;

    window.addEventListener("popstate", () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    });

    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
```

### 5. Register in the platform dispatcher

In `src/platforms/index.ts`:

- Import the new adapter class
- Add the hostname(s) to `PLATFORM_MAP`
- If the platform uses regional domains, add a special-case check like Amazon Music

### 6. Update `public/manifest.json`

Add a new entry to the `content_scripts` array:

```json
{
  "matches": ["*://<hostname>/*"],
  "js": ["content/index.js"],
  "css": ["styles/<platform>.css"],
  "run_at": "document_idle"
}
```

### 7. Create `public/styles/<platform>.css`

- Follow BEM naming: all classes prefixed with `sto-<abbrev>-` (e.g. `sto-td-` for Tidal)
- Match the host platform's design tokens (colors, fonts, radii, spacing)
- Extract design values from computed styles in DevTools
- No `!important`, max specificity = 1 class + 1 element
- See `public/styles/deezer.css` as reference

### 8. Write tests

Create both:

- `src/platforms/<platform>/metadata.test.ts` — test all extraction strategies, edge cases, null returns
- `src/platforms/<platform>/ui.test.ts` — test button injection, menu creation, cleanup, idempotency

**Test DOM pattern**: use `document.createElement` + `DocumentFragment` — never `innerHTML`. See `src/platforms/deezer/metadata.test.ts` for the standard pattern.

### 9. Update documentation

- Add the platform to the **Supported platforms** table in `README.md`
- Add the host permission to the **Permissions explained** table in `README.md`
- Add the platform host to the **Permissions** table in `PRIVACY_POLICY.md`
- Update `extensionDescription` in **all 15 locale files** (`public/_locales/*/messages.json`) if the description lists platforms by name

### 10. Validate

Run `make validate` — everything must pass (typecheck, lint, stylelint, format, knip, tests, build).

## Common Pitfalls

- **SPA navigation**: most streaming services are SPAs — the page doesn't reload on navigation. Always observe URL changes via `MutationObserver` + `popstate`.
- **Dynamic DOM**: elements may not exist when the content script first runs. Always use retry logic or `waitForElement()`.
- **Shadow DOM**: some platforms (e.g. Apple Music) use Web Components with shadow roots. Use `element.shadowRoot?.querySelector()` if needed.
- **A/B tests**: platforms frequently change their DOM. Use multiple fallback selectors.
- **Locale detection**: extract locale from URL if present (e.g. Spotify `/intl-fr/`, Apple Music `/us/album/`).
