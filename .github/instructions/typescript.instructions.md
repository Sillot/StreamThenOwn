---
name: "TypeScript & JavaScript Standards"
description: "Strict coding conventions for all TS/JS files in this Chrome extension project"
applyTo: "**/*.{ts,js,mts,mjs}"
---

# TypeScript & JavaScript Coding Standards

## DOM Security — CRITICAL

This is a Chrome extension. XSS prevention is enforced by ESLint `no-unsanitized`.

- **NEVER use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`** — not in source code, not in tests, not even to set empty content.
- Build DOM exclusively with `document.createElement()` + `textContent` / `setAttribute()`.
- To clear an element: `element.replaceChildren()` — never `element.innerHTML = ""`.
- To build test DOM: create a helper using `document.createElement` / `DocumentFragment`, never HTML strings.

```typescript
// ✅ Correct — clearing the body
document.body.replaceChildren();

// ❌ WRONG — triggers no-unsanitized/property
document.body.innerHTML = "";

// ✅ Correct — building test DOM
const div = document.createElement("div");
div.setAttribute("data-testid", "more-button");
document.body.appendChild(div);

// ❌ WRONG — triggers no-unsanitized/property
document.body.innerHTML = `<div data-testid="more-button"></div>`;
```

## Imports

- Always use **`type` imports** for type-only symbols. The `consistent-type-imports` rule is set to `inline-type-imports`:

```typescript
// ✅ Correct
import type { MusicMetadata } from "../types";
import { someFunction, type SomeType } from "../module";

// ❌ WRONG — missing type keyword
import { MusicMetadata } from "../types";
```

## Null Safety & Optional Chaining

- `textContent` is typed `string | null`. Always use optional chaining through it:

```typescript
// ✅ Correct
const text = el?.textContent?.trim();

// ❌ WRONG — .trim() on null throws at runtime
const text = el?.textContent.trim();
```

- Use `??` (nullish coalescing) instead of `||` for default values. The `prefer-nullish-coalescing` rule enforces this:

```typescript
// ✅ Correct
const name = value ?? "default";

// ❌ WRONG — || coerces falsy values
const name = value || "default";
```

## Exported Functions

- All exported functions **must have explicit return types** (`explicit-module-boundary-types`):

```typescript
// ✅ Correct
export function resolve(query: StoreQuery): StoreLink { ... }

// ❌ WRONG — missing return type
export function resolve(query: StoreQuery) { ... }
```

## Promises

- Never leave floating Promises. Always `await` or explicitly `void` them:

```typescript
// ✅ Correct
await chrome.storage.local.set({ key: value });
void someFireAndForgetPromise();

// ❌ WRONG — floating promise
chrome.storage.local.set({ key: value });
```

## Variables & Parameters

- Prefix unused parameters with `_`:

```typescript
// ✅ Correct
array.map((_item, index) => index);

// ❌ WRONG
array.map((item, index) => index);
```

- Always use `const`; use `let` only when reassignment is needed. Never `var`.

## Type Safety

- Never use `any`. Type every API response, parameter, and return value.
- Remember `noUncheckedIndexedAccess` is enabled — array/object index access returns `T | undefined`:

```typescript
const items: string[] = ["a", "b"];
// Type is string | undefined, not string
const first = items[0];
if (first !== undefined) {
  console.log(first.toUpperCase()); // OK
}
```

- `exactOptionalPropertyTypes` is enabled — `undefined` must not be assigned to optional properties unless the type explicitly includes `undefined`:

```typescript
interface Opts {
  name?: string; // means "string" when present, or absent — NOT string | undefined
}
// ✅ Correct
const a: Opts = {};
const b: Opts = { name: "foo" };
// ❌ WRONG — exactOptionalPropertyTypes forbids this
const c: Opts = { name: undefined };
```

## Tests (Vitest)

- Test files live next to source: `*.test.ts` or `*.spec.ts`.
- Mock `chrome.*` APIs with `vi.stubGlobal`:

```typescript
vi.stubGlobal("chrome", {
  i18n: { getMessage: (key: string) => key },
  runtime: { id: "test" },
});
```

- Build test DOM with `createElement` / `DocumentFragment` — **never `innerHTML`**.
- Use `document.body.replaceChildren()` in `beforeEach` to reset DOM.
- When mocking `location`, use `Object.defineProperty` with `configurable: true`.

## Build & Validation

- See the Docker-First Workflow section in [`copilot-instructions.md`](../.github/copilot-instructions.md) for all available `make` targets.
- After writing code, validate with: `make validate` (runs typecheck + lint + format + knip + audit + test + build).
