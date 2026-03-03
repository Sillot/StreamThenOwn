# Privacy Policy — StreamThenOwn

_Last updated: March 3, 2026_

## Overview

StreamThenOwn is an open-source browser extension that displays purchase links for music on streaming services. This privacy policy explains what data the extension accesses, how it is used, and what it does not do.

## Data collection

**StreamThenOwn does not collect, store, or transmit any personal data.**

Specifically, the extension:

- Does **not** collect your browsing history
- Does **not** collect personal information (name, email, location, etc.)
- Does **not** use analytics, telemetry, or tracking scripts
- Does **not** require any account or sign-up
- Does **not** set cookies

## Data accessed locally

The extension reads the following information **locally in your browser** to function:

- **Artist name and album title** displayed on the currently viewed page of a supported streaming service (YouTube Music, Spotify, Apple Music, Deezer, Amazon Music)
- **Your browser language** (via `chrome.i18n.getUILanguage()`) to display store URLs in the appropriate locale

This data is used solely to look up purchase links and is never stored beyond the current browsing session.

## External requests

The extension makes requests to the following third-party services:

| Service                                 | Data sent                | Purpose                                                               |
| --------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| [MusicBrainz](https://musicbrainz.org/) | Artist name, album title | Look up the release to find direct purchase links on supported stores |

These requests contain only the artist and album information visible on the page. No user-identifying information (IP address, browser fingerprint, user ID, etc.) is added by the extension. Standard HTTP headers (including your IP address) are sent by your browser as part of any web request.

MusicBrainz is a non-profit, open music database. See their privacy policy: https://metabrainz.org/privacy

## Local storage

The extension uses `chrome.storage.sync` to save your preferences:

- Which stores are enabled/disabled
- Store display order
- Custom search providers you have added

This data is stored locally on your device (and synced across your Chrome/Edge devices if you are signed in to the browser). It is not accessible to us or any third party.

## Permissions

| Permission                | Justification                                                                    |
| ------------------------- | -------------------------------------------------------------------------------- |
| `storage`                 | Save user preferences (enabled stores, display order, custom providers)          |
| Host: `music.youtube.com` | Read artist/album metadata and inject the purchase-links button on YouTube Music |
| Host: `open.spotify.com`  | Read artist/album metadata and inject the purchase-links button on Spotify       |
| Host: `music.apple.com`   | Read artist/album metadata and inject the purchase-links button on Apple Music   |
| Host: `www.deezer.com`    | Read artist/album metadata and inject the purchase-links button on Deezer        |
| Host: `music.amazon.*`    | Read artist/album metadata and inject the purchase-links button on Amazon Music  |
| Host: `musicbrainz.org`   | Query the MusicBrainz API to resolve purchase links                              |

No other permissions are requested.

## Children's privacy

StreamThenOwn does not knowingly collect any data from children or any other users. The extension does not collect data from anyone.

## Changes to this policy

If this privacy policy is updated, the changes will be reflected in this document with an updated "Last updated" date. As an open-source project, all changes are tracked in the repository's commit history.

## Contact

For questions about this privacy policy, please open an issue on GitHub: https://github.com/Sillot/StreamThenOwn/issues

## Open source

The full source code of StreamThenOwn is available at: https://github.com/Sillot/StreamThenOwn
