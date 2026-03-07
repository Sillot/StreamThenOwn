---
description: "Generate a commit message following Conventional Commits 1.0.0"
mode: "agent"
---

# Conventional Commit Message

Generate a commit message that strictly follows the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#specification) specification.

## Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

## Rules

1. **type** — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
2. **scope** (optional) — a noun describing the section of the codebase, in parentheses (e.g. `ytm`, `stores`, `i18n`, `docker`)
3. **description** — imperative, lowercase, no period at the end, max 100 characters for the full header (`type(scope): description`)
4. **body** (optional) — free-form, explains *what* and *why* (not *how*). Separated from the header by a blank line.
5. **footer** (optional) — `BREAKING CHANGE: <description>` for breaking changes, or `Refs: #<issue>` for issue references.
6. `feat` = new feature (correlates with MINOR in semver). `fix` = bug fix (correlates with PATCH). A `!` after type/scope or a `BREAKING CHANGE` footer = breaking (correlates with MAJOR).

## Examples

```
feat(stores): add 7digital store with locale-aware subdomains
```

```
fix(ytm): use correct selector for album title extraction
```

```
refactor: remove affiliate/monetization system

The affiliate system added unnecessary complexity and raised
privacy concerns. All affiliate-related code has been removed
from stores, options, and UI layers.
```

```
docs: add status badges to README
```

## Guidelines

- Look at the staged diff to understand what changed.
- Pick the most specific `type` that applies.
- Use a `scope` when the change is clearly scoped to one module.
- Keep the description concise and meaningful — describe the *outcome*, not the file changes.
- Do NOT capitalize the first letter of the description.
- Do NOT end the description with a period.
- Write in English.
