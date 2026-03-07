# StreamThenOwn

[![Release](https://img.shields.io/github/v/release/Sillot/StreamThenOwn?label=release)](https://github.com/Sillot/StreamThenOwn/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Sillot/StreamThenOwn/release.yml?label=CI)](https://github.com/Sillot/StreamThenOwn/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/github/license/Sillot/StreamThenOwn)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Locales](https://img.shields.io/badge/locales-15-blueviolet)](#features)

**Stream it. Love it. Own it.**

> 🤖 This project was built with the help of AI (GitHub Copilot).

StreamThenOwn is a browser extension that adds purchase links (Discogs, Qobuz, Amazon, Bandcamp) next to albums and songs on music streaming services. Stop renting your music — own it.

## Supported platforms

| Streaming service | Status       |
| ----------------- | ------------ |
| YouTube Music     | ✅ Supported |
| Spotify           | ✅ Supported |
| Apple Music       | ✅ Supported |
| Deezer            | ✅ Supported |
| Amazon Music      | ✅ Supported |

## How it works

1. Browse your favourite streaming service as usual
2. StreamThenOwn detects the artist and album you're viewing
3. A button appears — click it to reveal purchase links
4. Choose your store and buy the music you love

Links are resolved via [MusicBrainz](https://musicbrainz.org/) when possible (direct links), with search-fallback URLs for every store so you always get a result.

## Features

- **One-click purchase links** — Discogs, Qobuz, Amazon, Bandcamp
- **Direct links when available** — resolved via MusicBrainz API
- **Search fallback** — always provides a link, even without an exact match
- **Custom search providers** — add your own stores (eBay, Boomkat, JPC…)
- **Drag-and-drop reordering** — choose which stores appear and in what order
- **Locale-aware** — store URLs adapt to your country (Amazon.fr, Amazon.de…)
- **15 languages** — English, French, Spanish, German, Italian, Portuguese (BR & PT), Japanese, Korean, Dutch, Polish, Swedish, Danish, Norwegian, Finnish
- **Privacy-first** — no personal data collected, no tracking, no accounts

## Install

### Manual install (development)

```sh
make install
make build
```

Then load the `dist/` folder as an unpacked extension in `chrome://extensions` (enable Developer mode).

## Privacy

StreamThenOwn respects your privacy:

- **No personal data is collected or transmitted** — the extension does not collect browsing history, personal information, or usage analytics
- **No accounts or sign-up required**
- **No tracking scripts or pixels**
- **Metadata queries are anonymous** — the extension sends only artist and album names to [MusicBrainz](https://musicbrainz.org/) to resolve purchase links. No user-identifying information is included
- **All code is open-source** and auditable in this repository

Full privacy policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## Permissions explained

| Permission                | Why                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `storage`                 | Save your store preferences (enabled stores, order, custom providers) |
| Host: `music.youtube.com` | Inject the STO button on YouTube Music pages                          |
| Host: `open.spotify.com`  | Inject the STO button on Spotify pages                                |
| Host: `music.apple.com`   | Inject the STO button on Apple Music pages                            |
| Host: `www.deezer.com`    | Inject the STO button on Deezer pages                                 |
| Host: `music.amazon.*`    | Inject the STO button on Amazon Music pages (all regional domains)    |
| Host: `musicbrainz.org`   | Query the MusicBrainz API to resolve purchase links                   |

No other permissions are requested. The extension cannot read your browsing history, passwords, or any data outside of the listed streaming services.

## Development

All commands run inside Docker via the Makefile:

```sh
make install        # npm install
make build          # Production build
make watch          # Watch mode (dev)
make typecheck      # tsc --noEmit
make lint           # ESLint
make test           # Vitest
make validate       # Full CI pipeline
make zip            # Package for store submission
```

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for architecture details and contribution guidelines.

## License

MIT
