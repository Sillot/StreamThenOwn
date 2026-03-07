---
description: "Prepare and publish a new release of StreamThenOwn"
agent: agent
---

# Release StreamThenOwn

Prepare and publish a new release for the StreamThenOwn Chrome extension.

## Input

The user provides the **new version number** (semver: `MAJOR.MINOR.PATCH`).
If not provided, ask for it before proceeding.

## Steps

### 1. Pre-flight checks

- Run `make validate` — all checks must pass (typecheck, lint, stylelint, format, knip, audit, lockfile-lint, tests, build). **Stop if anything fails.**
- Verify the working tree is clean (`git status --short` returns nothing). If there are uncommitted changes, ask the user what to do.

### 2. Bump version

Update the version string in **both** files — they must always stay in sync:

- `public/manifest.json` → `"version": "<new_version>"`
- `package.json` → `"version": "<new_version>"`

### 3. Commit the version bump

```
git add public/manifest.json package.json
git commit -m "chore: bump version to <new_version>"
git push
```

### 4. Create and push the tag

```
git tag -a v<new_version> -m "Release v<new_version>"
git push origin v<new_version>
```

This triggers the **Release** GitHub Actions workflow (`.github/workflows/release.yml`) which automatically:
- Runs `make validate`
- Builds the `.zip` package
- Generates a changelog from conventional commits
- Creates the GitHub Release with the zip attached

### 5. Monitor the workflow

- Check the workflow status: `GH_PAGER=cat gh run list --limit 1 --json name,status,conclusion,headBranch`
- If in progress, wait and check again until it completes.
- If it fails, report the error to the user.

### 6. Enhance the release notes (first release or major milestones)

For the **first release** or any **major version**, update the GitHub Release body with a human-written feature summary using `gh release edit`. For patch/minor releases, the auto-generated changelog from conventional commits is sufficient.

### 7. Confirm

Report to the user:
- The release URL: `https://github.com/Sillot/StreamThenOwn/releases/tag/v<new_version>`
- The zip is ready for Chrome Web Store / Edge Add-ons upload
