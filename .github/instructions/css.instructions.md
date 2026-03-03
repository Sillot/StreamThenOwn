---
name: "CSS Standards"
description: "Coding conventions for all CSS files (BEM naming, specificity, no !important)"
applyTo: "**/*.css"
---

# CSS Coding Standards

## Linting

All CSS files are linted by **Stylelint** with `stylelint-config-standard` as the base. Run `make stylelint` to check and `make stylelint-fix` to auto-fix.

## BEM Naming Convention

All class selectors MUST follow the **BEM** (Block Element Modifier) pattern, prefixed with `sto-`:

```
.sto-<block>__<element>--<modifier>
```

### Rules

- **Block**: `sto-` followed by one or more hyphen-separated words — e.g. `sto-menu`, `sto-action-btn`.
- **Platform prefix**: platform-specific blocks add a short prefix — e.g. `sto-sp-menu` (Spotify), `sto-dz-btn` (Deezer), `sto-am-btn` (Apple Music / Amazon Music).
- **Element**: double underscore `__` — e.g. `sto-menu__item`, `sto-sp-menu__item-icon`.
- **Modifier**: double hyphen `--` — e.g. `sto-dz-btn--open`.
- Only **one** element level: never `sto-menu__item__icon` — use `sto-menu__item-icon` instead.

### Examples

```css
/* ✅ Correct */
.sto-menu {
}
.sto-menu__item {
}
.sto-menu__item-icon {
}
.sto-dz-btn--open {
}

/* ❌ WRONG — nested BEM element */
.sto-menu__item__icon {
}

/* ❌ WRONG — missing sto- prefix */
.menu__item {
}

/* ❌ WRONG — camelCase */
.sto-menuItem {
}
```

## Forbidden Patterns

- **No `!important`** — increase specificity via BEM selectors instead.
- **No ID selectors** (`#foo`) — `selector-max-id: 0`.
- **Max specificity**: `0,4,0` — avoid deeply nested selectors.
- **Max nesting depth**: 2 — keep selectors flat.

## Best Practices

- Use **shorthand properties** when all longhand values are specified (`declaration-block-no-redundant-longhand-properties`).
- Avoid redundant shorthand values: `margin: 8px 8px` → `margin: 8px` (`shorthand-property-no-redundant-values`).
- Keyframe names must start with `sto-` and use kebab-case — e.g. `@keyframes sto-menu-in`.

## File Organisation

- Each streaming platform has its own CSS file: `public/styles/<platform>.css`.
- Styles must match the platform's native design system (colours, radii, fonts, spacing).
- Shared base styles (if needed) go in a dedicated common CSS file referenced in `manifest.json`.
