# Copilot Instructions — StreamThenOwn

## Project Overview

StreamThenOwn (STO) is a **Chrome extension** (Manifest V3) that injects purchase links (Discogs, Qobuz, Amazon, Bandcamp, iTunes, Fnac) next to album/song pages on **streaming music services**. It resolves links via the MusicBrainz API and falls back to search URLs when no direct match is found.

Currently supported streaming platform: **YouTube Music**. The architecture is designed to support additional platforms (Spotify, Deezer, Tidal…) via a pluggable adapter system.

- **Repository**: <https://github.com/Sillot/StreamThenOwn>
- **Target browser**: Chromium-based (Chrome 116+)
- **Locales**: English (`en`), French (`fr`) via `chrome.i18n`

## Tech Stack

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| Language      | TypeScript (strict mode, ES2022 target)     |
| Bundler       | esbuild (IIFE output for Chrome extensions) |
| Linter        | ESLint 9 flat config + typescript-eslint    |
| Formatter     | Prettier                                    |
| Dead code     | Knip                                        |
| Tests         | Vitest (jsdom environment)                  |
| Commits       | Conventional Commits (commitlint)           |
| Containerised | Docker (Node 22 Alpine) + docker-compose    |
| Path alias    | `@/*` → `src/*`                             |

## Docker-First Workflow — MANDATORY

**All build, lint, format, test, and validation commands MUST be executed inside Docker via the Makefile.** Never run `npm run …` directly on the host.

Use the following commands:

```sh
make install        # npm install
make build          # Production build
make watch          # Watch mode
make typecheck      # tsc --noEmit
make lint           # ESLint
make lint-fix       # ESLint --fix
make format         # Prettier --write
make format-check   # Prettier --check
make knip           # Dead code detection
make test           # Vitest run
make test-watch     # Vitest watch
make validate       # Full CI pipeline (typecheck + lint + format + knip + audit + test + build)
make audit          # npm audit
make zip            # Package for Chrome Web Store
make shell          # Interactive shell in container
make clean          # Remove containers, volumes, dist
```

When you need to run a lint check, a build, tests, or any tooling command, always use `make <target>` which runs `docker compose run --rm <service>` under the hood.

## Design Principles

- **KISS (Keep It Simple, Stupid)**: favour the simplest solution that works. Avoid over-engineering, unnecessary abstractions, and premature optimisation.
- **DRY (Don't Repeat Yourself)**: extract shared logic into reusable helpers or modules. If the same pattern appears in more than two places, refactor it into a single source of truth.
- **Maintainability first**: write code that is easy to read, understand, and modify. Prefer explicit over clever. Name things clearly and keep functions short and focused.

## Architecture

```
src/
├── background/          # Chrome service worker (message listener)
│   └── service-worker.ts
├── content/             # Content script — platform-agnostic entry point
│   └── index.ts         # Bootstrap: detects platform → delegates to adapter
├── i18n/                # Thin wrapper around chrome.i18n.getMessage
│   └── index.ts
├── options/             # Extension options page
│   └── options.ts
├── platforms/           # Platform adapter layer (pluggable per streaming service)
│   ├── types.ts         # Interfaces: MusicMetadata, MetadataExtractor, UIInjector, PlatformAdapter
│   ├── index.ts         # Dispatcher: detectPlatform() picks adapter by hostname
│   └── ytm/             # YouTube Music adapter
│       ├── index.ts     # YtmAdapter (combines metadata + UI + navigation)
│       ├── metadata.ts  # YtmMetadataExtractor — DOM scraping for artist/album
│       └── ui.ts        # YtmUIInjector — action button + dropdown menu
├── stores/              # Store link resolution (orchestrator + per-store modules)
│   ├── index.ts         # Orchestrator: MB lookup → resolve each store → cache
│   ├── types.ts         # Shared interfaces (StoreLink, StoreQuery, ExternalUrls…)
│   ├── musicbrainz.ts   # MusicBrainz search + release URL extraction
│   ├── discogs.ts       # Discogs resolution
│   ├── qobuz.ts         # Qobuz resolution
│   ├── amazon.ts        # Amazon resolution
│   ├── bandcamp.ts      # Bandcamp resolution
│   ├── itunes.ts        # iTunes / Apple Music resolution
│   └── fnac.ts          # Fnac resolution
├── styles/              # Shared CSS (injected via manifest)
└── utils/
    ├── dom.ts           # Shared DOM utilities (waitForElement…)
    ├── locale.ts        # Locale detection & per-store URL localisation
    ├── metadata.ts      # [DEPRECATED] Legacy metadata — use platforms/ytm/metadata.ts
    └── sanitize.ts      # URL sanitisation & allowed-host validation
```

### Platform Adapter Pattern

The content script is **platform-agnostic**. Each streaming service is supported via a `PlatformAdapter` (defined in `src/platforms/types.ts`) that provides:

- **`MetadataExtractor`** — scrapes artist/album from the service's DOM
- **`UIInjector`** — injects the STO button & dropdown, styled to match the service's UI
- **`observeNavigation()`** — listens for SPA navigation events specific to the service

The dispatcher (`src/platforms/index.ts`) maps `location.hostname` → adapter factory. The content script (`src/content/index.ts`) calls `detectPlatform()` and delegates all platform-specific work to the returned adapter.

**Data flow**: Content script calls `platform.metadata.extract()` → sends `SEARCH_STORES` message to background → background calls the stores orchestrator → orchestrator queries MusicBrainz, resolves each store, caches result → response sent back to content script → `platform.ui.setLinks()` + `platform.ui.injectButton()`.

## Adding a New Streaming Platform

Follow this pattern:

1. **Create** `src/platforms/<platform>/metadata.ts` implementing `MetadataExtractor`.
2. **Create** `src/platforms/<platform>/ui.ts` implementing `UIInjector`.
3. **Create** `src/platforms/<platform>/index.ts` implementing `PlatformAdapter`.
4. **Register** the hostname in `PLATFORM_MAP` in `src/platforms/index.ts`.
5. **Add** the match pattern to `content_scripts.matches` in `public/manifest.json`.
6. **Add** platform-specific CSS (either in `sto.css` or in a separate `<platform>.css`).
7. **Write tests** in `src/platforms/<platform>/*.test.ts`.

## Adding a New Store

Follow this pattern:

1. **Create** `src/stores/<storename>.ts` exporting a `resolve<StoreName>(query, externalUrls)` function.
2. **Add** the store key to `ExternalUrls` in `src/stores/types.ts` if MusicBrainz may provide a direct URL.
3. **Register** the resolver call in `src/stores/index.ts` orchestrator (parallel with other stores).
4. **Add** a `StoreLink` entry with a unique `store` identifier, `label`, and `format`.
5. **Add** the store icon in the `STORE_ICON_PATHS` record in `src/platforms/ytm/ui.ts` (and in any future platform UI).
6. **Provide a search fallback URL** when no direct/API match is found — every store must return a valid link.
7. **Write tests** in `src/stores/<storename>.test.ts`.

## API Conventions

- **MusicBrainz**: rate-limited to **1 request per second**. Always send a descriptive `User-Agent` header. Handle 503 responses with exponential backoff.
- **Discogs**: respect `X-Discogs-Ratelimit-Remaining` headers. Authenticate if possible.
- **General**: all API calls must handle errors gracefully — never let a single store failure crash the whole resolution. Return a search-fallback URL instead.
- Avoid `any` — every API response must be typed (see [TS instructions](.github/instructions/typescript.instructions.md) for details).

## Security

This is a Chrome extension with content scripts running on streaming music services. Security is critical.

- DOM security rules (`innerHTML` ban, `no-unsanitized`, `createElement`-only) are detailed in the [TS instructions file](.github/instructions/typescript.instructions.md).
- Respect the strict **Content Security Policy** (`script-src 'self'; object-src 'none'; base-uri 'none'`).
- Never use `eval`, `new Function()`, or inline event handlers.
- Sanitize all data coming from external APIs before rendering in the DOM.
- Minimise requested `permissions` and `host_permissions` in `manifest.json`.

## TypeScript Guidelines

See [`.github/instructions/typescript.instructions.md`](.github/instructions/typescript.instructions.md) for detailed TS/JS coding standards with examples. That file is auto-applied to all `*.{ts,js,mts,mjs}` files.

## Testing

- Tests live next to the source files: `src/**/*.test.ts` or `src/**/*.spec.ts`.
- Use **Vitest** with `jsdom` environment for DOM-related tests.
- Run tests with `make test` (inside Docker).
- Mock `chrome.*` APIs when testing background/content scripts.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/). Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Internationalisation

- Use `chrome.i18n.getMessage()` (wrapped by `t()` from `src/i18n/index.ts`) for all user-facing strings.
- Message keys are defined in `public/_locales/{en,fr}/messages.json`.
- Always add translations for **both** `en` and `fr` when adding new strings.
