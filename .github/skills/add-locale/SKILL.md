---
name: add-locale
description: "Step-by-step guide to add a new translation locale to StreamThenOwn"
---

# Add a New Locale

Use this skill when the user asks to add a new translation/language to StreamThenOwn.

## Current Locales (15)

`da` (Danish), `de` (German), `en` (English — default), `es` (Spanish), `fi` (Finnish), `fr` (French), `it` (Italian), `ja` (Japanese), `ko` (Korean), `nb` (Norwegian Bokmål), `nl` (Dutch), `pl` (Polish), `pt_BR` (Portuguese — Brazil), `pt_PT` (Portuguese — Portugal), `sv` (Swedish).

## Locale Codes

Chrome uses the format from the [chrome.i18n locale list](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales). Common patterns:

- Two-letter: `en`, `fr`, `de`, `ja`
- Region variant: `pt_BR`, `pt_PT`, `zh_CN`, `zh_TW`

## Checklist (all steps required)

### 1. Create the locale file

Create `public/_locales/<locale>/messages.json` with **all message keys** translated.

The reference file is `public/_locales/en/messages.json` — it contains all keys with descriptions explaining their purpose.

**Format**:

```json
{
  "<key>": {
    "message": "<translated text>",
    "description": "<same description as in en>"
  }
}
```

- Keep `extensionName` as `"StreamThenOwn"` (brand name, never translated)
- Translate all other keys: `extensionDescription`, `buyOn`, `vinyl`, `hiResDigital`, `cdAndMore`, `digitalAndPhysical`, `ownThisAlbum`, `ownThisTrack`, `poweredBy`, `noLinks`, `customSearch`, `vinylAndCD`, options page keys, about keys, popup keys…
- Preserve `$PLACEHOLDER$` syntax in `buyOn` and other parameterised messages
- The `description` field is for documentation only (not shown to users) — keep it in English

### 2. Update documentation

Update these files to reflect the new locale count:

**`README.md`** — Features section:

```markdown
- **N languages** — English, French, Spanish, … <add new language>
```

**`.github/copilot-instructions.md`** — Two places:

1. Project Overview → **Locales** line at the top
2. Internationalisation section → **Supported locales** list

### 3. Update store locale mappings (if applicable)

If the new locale corresponds to a country with specific store domains, update `src/utils/locale.ts`:

- `getAmazonDomain()` — map locale to Amazon regional domain
- `getEbayDomain()` — map locale to eBay regional domain
- `get7digitalSubdomain()` — map locale to 7digital subdomain
- Any other locale-to-domain mapping functions

**Example**: adding `tr` (Turkish) might need `amazon.com.tr` and `ebay.com.tr`.

### 4. Validate

Run `make validate` — ensures:

- The new JSON file is valid (no syntax errors)
- Prettier formatting is correct
- Knip doesn't flag unused files
- All tests still pass

## Key Translation Guidelines

- **Be concise** — UI labels have limited space (especially in the popup and options)
- **Use the platform's conventional terms** — e.g. "Vinyl" might be "Vinyle" in French, "Schallplatte" in German
- **Keep format labels short** — they appear next to store names in the dropdown
- **Test right-to-left** — if adding an RTL language (Arabic, Hebrew), the extension CSS may need adjustments

## Verifying Completeness

To check that a locale file has all keys, compare against the English file:

```bash
# Inside Docker
diff <(jq -r 'keys[]' public/_locales/en/messages.json | sort) \
     <(jq -r 'keys[]' public/_locales/<locale>/messages.json | sort)
```

Any keys present in `en` but missing in the new locale will show as differences.
