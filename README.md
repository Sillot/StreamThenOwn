# StreamThenOwn

**Stream it. Love it. Own it.**

StreamThenOwn is a browser extension that adds purchase links (Discogs, Qobuz, Amazon, Bandcamp) next to albums and songs on music streaming services. Stop renting your music — own it.

## Supported platforms

| Streaming service | Status       |
| ----------------- | ------------ |
| YouTube Music     | ✅ Supported |
| Spotify           | ✅ Supported |
| Apple Music       | ✅ Supported |

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

### Chrome Web Store

_Coming soon_

### Microsoft Edge Add-ons

_Coming soon_

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
- **Some purchase links may contain affiliate identifiers** (Awin/Qobuz) that help support the development of this extension at no extra cost to you. These links may set third-party cookies on the store's website when you click them — the extension itself does not set any cookies
- **All code is open-source** and auditable in this repository

Full privacy policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## Affiliate disclosure

Some links to stores may contain affiliate identifiers that allow us to earn a small commission on qualifying purchases, at no additional cost to you. This supports the continued development of StreamThenOwn.

- **Qobuz**: links may be redirected through [Awin](https://www.awin.com/) (`awin1.com/cread.php?…`)

You can verify this in the source code: [src/config/affiliate.ts](src/config/affiliate.ts).

## Permissions explained

| Permission                | Why                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `storage`                 | Save your store preferences (enabled stores, order, custom providers) |
| Host: `music.youtube.com` | Inject the STO button on YouTube Music pages                          |
| Host: `open.spotify.com`  | Inject the STO button on Spotify pages                                |
| Host: `music.apple.com`   | Inject the STO button on Apple Music pages                            |
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
