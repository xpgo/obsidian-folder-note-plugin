# AGENTS.md

Guidance for AI coding agents (and humans) working on **Folder Note Revamped**, an Obsidian plugin.
This file is also the single source of truth for `.github/copilot-instructions.md` and `CLAUDE.md`, which point here.

## What this project is

- An Obsidian plugin: click a folder in the file explorer to open a note that describes the folder (`<folder>/<folder>.md`). It also provides a `ccard` code block that renders cards for a folder's notes.
- It is a revival of [xpgo/obsidian-folder-note-plugin](https://github.com/xpgo/obsidian-folder-note-plugin), which has been unmaintained since 2021 and no longer loads in modern Obsidian. Original code and ideas are by **xpgo**; keep that credit (see [Attribution](#attribution)).
- Repo: `SamPlaysKeys/obsidian-folder-note-revamped-plugin`. Plugin ID: `folder-note-revamped` (deliberately different from the original `folder-note-plugin`, so both can coexist and settings do not clash). Do not change the ID.
- Distributed through GitHub releases and [BRAT](https://obsidian.md/plugins?id=obsidian42-brat), not the community plugin directory.

## Repo layout

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Plugin entry (`FolderNotePlugin`): global click handler on the file explorer, commands, rename/delete vault handlers, settings load/save. |
| `src/folder-note.ts` | `FolderNote` class: finds the folder element, opens/creates/hides the folder note, `newNoteFolder` (note to folder), `syncName` (rename). Supports three note locations: Index, Inside, Outside. |
| `src/folder-brief.ts` | Builds the folder brief (list of the folder's notes as `ccard` source). |
| `src/ccard-block.ts` | Markdown code block processor for the `ccard` block. |
| `src/card-item.ts` | Card rendering (cute / strip views). |
| `src/settings.ts` | Settings interface, defaults, settings tab UI. |
| `styles.css` | Plugin styles (released as an asset, must stay in repo root). |
| `manifest.json`, `versions.json` | Obsidian plugin manifest and version map. |
| `rollup.config.js`, `tsconfig.json` | Build config (output is `main.js` in the repo root). |
| `scripts/check-build.mjs` | Build sanity checks (run by CI). |
| `scripts/e2e-obsidian.mjs` | End-to-end test against a real running Obsidian (local only). |
| `.github/workflows/ci.yml` | CI: `npm run check` on push to `main` and PRs. |
| `.github/workflows/release.yml` | Release: on tag push (or manual run), builds and publishes a GitHub release. |
| `doc/`, `image/` | Documentation and README images (`image/logo.svg` is the logo shown at the top of the README). README links point at the `main` branch of this repo. |
| `LICENSE.md` | MIT, copyright shared by xpgo (2021) and SamPlaysKeys (2026). |
| `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` | Agent instructions. `CLAUDE.md` and the Copilot file only point at `AGENTS.md`. |

Gitignored (never commit): `node_modules/`, `package-lock.json`, `main.js`, `*.js.map`, `.local/` (personal scratch space, e.g. logo drafts).

## Commands

```sh
npm install          # install deps
npm run build        # rollup -> ./main.js
npm run dev          # rollup watch mode
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + build + scripts/check-build.mjs  (what CI runs; run before every commit)
npm run test:e2e     # drives real Obsidian via its CLI (see below)
```

Always run `npm run check` before committing. If you touch behavior, also run `npm run test:e2e` when Obsidian is available.

## Critical constraints

1. **Compile target must stay ES2015 or newer (currently `es2018` in `tsconfig.json`).** The original plugin used `es5`, which emits `_super.apply(this, arguments)` for subclasses. Obsidian's `Plugin` and `PluginSettingTab` are native ES6 classes, so that throws `Class constructor ... cannot be invoked without 'new'` and the plugin silently fails to load (shows as enabled, nothing in the console). `check-build.mjs` guards against this. Do not lower the target.
2. `@rollup/plugin-typescript` must keep `include: ['src/**/*.ts']` with the explicit tsconfig, otherwise it skips `main.ts` and the build fails with "enum is reserved".
3. `obsidian` is external in the bundle (`require('obsidian')`). Do not bundle it.
4. Version bumps must keep `manifest.json`, `package.json` and `versions.json` in sync (`versions.json[version] == minAppVersion`). `check-build.mjs` enforces this. The release tag must equal the manifest version exactly, with **no `v` prefix** (BRAT requires it).
5. Do not add a donation or funding link for the original author's account, and do not remove xpgo's attribution (see [Attribution](#attribution)).
6. Keep the plugin working on desktop and mobile (`isDesktopOnly: false`). Avoid Node/Electron APIs in `src/`.

## Testing

### Build check (CI-safe)
`node scripts/check-build.mjs` validates the manifest, version consistency, no ES5 class output, `obsidian` kept external, and loads `main.js` in Node with a stubbed `obsidian` module to instantiate the plugin.

### End-to-end (local only, needs Obsidian running with the CLI enabled)
`npm run test:e2e` builds nothing itself: run `npm run build` first. By default it creates a throwaway vault in the OS temp dir, installs the built plugin, runs the 23 checks (load, settings, commands, Ctrl/Cmd+click note creation, hidden folder note, `.pdf`/`.base` files with the folder's name staying visible, ccard rendering, ccard in another pane while a different note is active, Insert Folder Brief, Make Current Note to Folder, rename sync, commands with no active file, no plugin errors), then removes the vault.

- `npm run test:e2e -- <VaultName>` (or `VAULT=<VaultName>`) uses an existing vault instead. It overwrites the plugin folder in that vault and creates/deletes a `__fnr-e2e__` folder. **Never point it at the user's real vaults without asking.**
- The CLI is `obsidian` (e.g. `/opt/homebrew/bin/obsidian`). Useful commands for manual debugging: `obsidian vault=<name> dev:debug on`, `dev:console`, `dev:errors`, `plugin:reload id=folder-note-revamped`, `plugins`, and `eval code='(async()=>{ ... })()'` (needs an IIFE; no top-level `return`; output lines start with `=> `).
- Gotchas: a folder's note is only hidden once its children are rendered in the explorer; newly created folders inside collapsed parents have no `data-path` until revealed (use `view.revealInFolder`).

If a plugin shows as enabled but `app.plugins.plugins['folder-note-revamped']` is undefined, check `obsidian dev:errors` first (usually a load-time exception such as the ES5 problem above).

## Releasing

1. Bump the version in `manifest.json`, `package.json` and `versions.json` (same value, `versions.json` maps it to `minAppVersion`).
2. Update the changelog: the `### 1.0.x` list in `README.md` and the same list in `doc/change-log.md`. Tag each entry with its version, and thank contributors (see [Attribution](#attribution)).
3. `npm run check`, commit, push to `main`.
4. `git tag <version> && git push origin <version>` (tag is exactly the version, no `v`).
5. The release workflow publishes a non-draft release with `main.js`, `manifest.json`, `styles.css` and a zip. BRAT only installs from non-draft releases that have these assets.

Versioning restarted at `1.0.1` for this fork (the original's last release was `0.7.3`).

## Attribution

- **Original plugin:** xpgo is credited in the README (one-line intro under the logo, the "Why this revamp exists" section, and the License section), `LICENSE.md` (copyright line), `manifest.json` (`author` and description), `package.json` (description) and the intro of `doc/ccard-syntax.md` and `doc/change-log.md`. Do not remove these.
- **Ported upstream PRs and issue reports:** when a change comes from a PR or issue in xpgo/obsidian-folder-note-plugin, (1) add a `Co-authored-by: Name <id+login@users.noreply.github.com>` trailer to the commit (get the id with `gh api users/<login> --jq .id`), (2) add a thank-you with a profile link to that version's entry in the README `### 1.0.x` changelog, and (3) note it in `doc/upstream-triage.md` when it affects triage status. The commit message should also say which upstream PR or issue it is based on.
- **Issue references:** link upstream issues with `https://redirect.github.com/xpgo/obsidian-folder-note-plugin/issues/N`, so no cross-reference note appears on the upstream repo.
- **Do not post on the upstream repo** (comments, PRs, issues) without the user's explicit approval.

## Code conventions

- TypeScript, tab/space style as in the surrounding file; match existing naming and structure. Keep diffs focused; do not reformat files you are not changing.
- The code uses Obsidian helper extensions (`createEl`, `addClass`, `getText`, `String.contains`, etc.). They still exist in Obsidian, but prefer standard DOM/JS in new code.
- Settings: stored values for modifier keys remain `ctrl` / `alt` (UI labels are OS-specific: Cmd/Option on macOS). Keep stored values stable for backward compatibility with existing `data.json` files.
- Commit messages: short imperative summary line. A `betterleaks` pre-commit hook scans for secrets; do not bypass it.
- Comments only where the reason is non-obvious.

## Known issues / modernization backlog

Good starting points, roughly by value:

- `ccard-block.ts` and `folder-brief.ts` use `workspace.getActiveFile()` / `getActiveViewOfType` instead of the processor's `ctx.sourcePath`. This breaks in hover previews, embeds and canvas.
- `main.ts`: `Object.assign(FOLDER_NOTE_DEFAULT_SETTINGS, await loadData())` mutates the defaults object; use `Object.assign({}, DEFAULTS, data)`.
- The document-level click listener is registered on the main window only; popout windows are missed (use `registerDomEvent` per window / `activeDocument`).
- File operations use `vault.adapter.rename/write/list/exists/mkdir` and `trashLocal`. Prefer `app.fileManager.renameFile` (updates links), `vault.create/rename`, `fileManager.trashFile`. `adapter.list` includes hidden folders.
- Null dereferences (`getActiveFile()`, `lastElementChild`, etc.) need guards.
- `styles.css` uses CSS variables that no longer exist (`--background-accent`, `--text-nav-selected`); replace with current theme variables.
- `PluginSettingTab.display()` is deprecated since Obsidian 1.13.0 (still works).
- `minAppVersion` (`0.9.12`) is unrealistic; raise it to the oldest version actually tested.
- Toolchain: `obsidian` devDependency is a GitHub master tarball (unpinned); Rollup 2 / TS 4.9; consider esbuild (as in Obsidian's sample plugin) and TS 5.
- README prose below the top sections (Usage, How it works, Settings, ccard) is still largely inherited from the original and needs a rewrite (tracked in issue #8).

## Upstream issues and PRs

`doc/upstream-triage.md` triages every issue and PR from the original repo (xpgo/obsidian-folder-note-plugin): status against current code, priority, suggested work packages and which PR changes are worth porting. Check it before starting a feature or bug fix; many reports are duplicates of each other and share one root cause.

## When in doubt

- Reproduce in a real Obsidian via the CLI/e2e test rather than reasoning from the API typings; the bundled typings lag behind the app.
- Ask before touching the user's real vaults, pushing, tagging, or publishing releases.
