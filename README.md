<p align="center">
  <img src="image/logo.svg" alt="Folder Note Revamped" width="640">
</p>

<p align="center">
  <a href="https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/SamPlaysKeys/obsidian-folder-note-revamped-plugin?style=for-the-badge"></a>
  <a href="https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/SamPlaysKeys/obsidian-folder-note-revamped-plugin/total?style=for-the-badge"></a>
  <a href="LICENSE.md"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge"></a>
</p>

Create folder-specific notes for descriptions, linking, or anything else. Generate card-style overviews of folder content for rich content management. Turn your vault into a hierarchy note system.

A revamp of [xpgo's Folder Note plugin](https://github.com/xpgo/obsidian-folder-note-plugin), kept working with current Obsidian. See [why this revamp exists](#why-this-revamp-exists).

![Folder_Note_Revamped_Show](https://raw.githubusercontent.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/main/image/folder-note1.png)

**Jump to:** [Install](#install) · [Usage](#usage) · [Settings](#settings) · [Commands](#commands) · [ccard overview](#folder-overview-cards-ccard) · [Waypoint](#works-well-with-waypoint) · [Why this revamp](#why-this-revamp-exists) · [Change log](#change-log)

## Features

- Create, open and manage a note for any folder
- Three folder note methods: inside the folder, outside it, or an index file
- Folder and note names stay in sync when you rename either one
- Turn the current note into a folder with one command
- Customizable starting content for new folder notes
- Card and strip overviews of a folder's contents
- A `ccard` code block that shows notes and folders as cards in any note

## Install

### With BRAT (recommended)

Folder Note Revamped is not in the Obsidian community plugin list, so the easiest way to install it is with the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat):

1. Install **Obsidian42 - BRAT** from Obsidian's community plugins and enable it.
2. Follow the [BRAT quick guide](https://tfthacker.com/brat-quick-guide) and choose **Add Beta plugin**.
3. Paste this repo URL: `https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin`
4. Pick the latest version, then enable **Folder Note Revamped** in Settings -> Community plugins.

BRAT checks for new releases and can update the plugin for you.

### Manually

Go to the [releases page](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/releases), and copy `main.js`, `styles.css` and `manifest.json` to `VaultFolder/.obsidian/plugins/folder-note-revamped/`. Then enable the plugin in Settings -> Community plugins.

### Coming from the original plugin

This plugin uses a new plugin ID (`folder-note-revamped`), so it installs next to the original instead of replacing it. Disable or uninstall the original `folder-note-plugin` so that the two don't both handle folder clicks. To keep your settings, copy `VaultFolder/.obsidian/plugins/folder-note-plugin/data.json` to `VaultFolder/.obsidian/plugins/folder-note-revamped/data.json`. Your existing folder notes keep working because they are normal notes.

## Usage

- **Create** a folder note: Ctrl+Click a folder in the file explorer (Cmd+Click on macOS).
- **Open** it: click the folder.
- **Delete** it: delete the note like any other file.
- **Configure** the folder note method, file name and starting content in the plugin settings.
- **Commands**: the plugin adds a few commands to the command palette (see [Commands](#commands)).

## How it works

The plugin attaches a note to a folder and hides that note in the file explorer with CSS. Where the note lives depends on the method you choose:

- **Inside-Folder** (default): `myFolder/myFolder.md`
- **Outside-Folder**: `myFolder.md`, next to the folder
- **Index-File**: `myFolder/_about_.md`, or another file name you set

[Folder Note Methods](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/folder-note-methods.md) lists the pros and cons of each.

When you Ctrl+Click a folder, the plugin creates the note at the path for your method. When you click a folder, it opens the attached note. You can show or hide folder notes in the explorer, and the plugin can try to keep the folder and note names in sync.

## Settings

- **Note File method**: where the folder note lives (see above).
- **Index File Name**: for the *Index-File* method, the note's name, such as `_about_` or `index`.
- **Note Initial Content**: the starting content for a new folder note. These keywords are replaced when the note is created:
    - `{{FOLDER_NAME}}`: the folder name.
    - `{{FOLDER_PATH}}`: the folder path.
    - `{{FOLDER_BRIEF}}`: a `ccard` code block with a card overview of the folder. You can edit the block afterwards; see [ccard Syntax](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/ccard-syntax.md).
    - `{{FOLDER_BRIEF_LIVE}}`: a short code block that renders the folder overview live.
- **Key for New Note**: use Ctrl+Click or Alt+Click to create a folder note. On macOS these show as Cmd+Click and Option+Click.
- **Hide Folder Note**: turn this off to show folder notes in the file explorer.
- **Auto Rename**: for *Inside-Folder* and *Outside-Folder*, renames the note when the folder is renamed, and the other way around. This is experimental and does not always work; rename manually if something goes wrong.
- **Delete Folder Note**: for *Outside-Folder*, deletes the folder note when its folder is deleted.

## Commands

Open the command palette with Ctrl+P (Cmd+P on macOS) and search for:

- **Insert Folder Brief**: insert a folder overview code block into the current note.
- **Make Current Note to Folder**: create a folder from the current note and attach the note to it as the folder note.

## Folder overview cards (ccard)

A `ccard` code block shows an overview of a folder as cards. You can write one by hand in any note, put one in the initial folder note template, or let the plugin generate it with a keyword:

- `{{FOLDER_BRIEF}}` inserts a `ccard` block you can edit to show whatever you like. To refresh an overview later, run **Insert Folder Brief** from the command palette.
- `{{FOLDER_BRIEF_LIVE}}` inserts a `ccard` block that renders the folder overview live. It suits folders of notes with images, such as a collection, where it builds a card view of every note automatically.

You can set the style, column count, image prefix, folder path, notes only, maximum brief length and more. See [ccard Syntax](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/ccard-syntax.md) for all options and [ccard recipes](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/ccard-recipes.md) for examples. The image below shows the different styles.

![Card_Strip_Style](https://raw.githubusercontent.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/main/image/style-card-strip.png)

## Works well with Waypoint

[Waypoint](https://github.com/IdreesInc/Waypoint) generates an automatic table of contents of links inside a folder note. Because those are real links, the folder shows up in Obsidian's graph view, which a `ccard` block can't do (it lives in a code block, so the graph doesn't see it). The two plugins complement each other: Folder Note Revamped creates and manages the folder note, and Waypoint fills it with links that stay up to date.

Waypoint treats a note with the same name as its parent folder as the folder note. That matches the default **Inside-Folder** method (`myFolder/myFolder.md`). To use it, add Waypoint's trigger text (`%% Waypoint %%` by default) to a folder note; see Waypoint's README for details. You can keep a `ccard` block in the same note for the visual overview.

## Known issues and plans

**Known issues**

- A newly created folder note may stay visible in the file explorer. Click the folder again to hide it.
- Found a bug or have an idea? [Open an issue](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/issues).

**Plans**

- More template options for the initial content.
- Automatic overviews of a folder's contents, like [Trilium](https://github.com/zadam/trilium) does (partly done).
- More robust renaming.
- More overview styles.

## Why this revamp exists

This is a revamp of [xpgo/obsidian-folder-note-plugin](https://github.com/xpgo/obsidian-folder-note-plugin), which has not been updated since 2021 and no longer loads in current versions of Obsidian (tested on 1.15.x). Obsidian's `Plugin` base class is now a native ES6 class, but the original was compiled to ES5 (`"target": "es5"`), whose inheritance pattern calls `Plugin.apply(this, ...)`. That throws `TypeError: Class constructor ... cannot be invoked without 'new'` inside Obsidian's plugin loader. The plugin shows as enabled but never starts, and nothing appears in the console. Fixes in this repo:

- Compile to ES2018 so the plugin works with Obsidian's native classes.
- Fix the Rollup config, because `@rollup/plugin-typescript` skipped `src/main.ts` and a clean build failed.
- Use `view.editor` instead of the removed `view.sourceMode.cmEditor` API.

---

## Change log

See the [change log](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/change-log.md) for every release of Folder Note Revamped and of the original plugin. Version numbering restarts at 1.0.1 for this revamp.

**For updating from version < 0.4.0**, please refer to [Update from old version](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/update-old-version.md).

## Development

### Build

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.

### Testing

- `npm run check` type checks, builds, and verifies the output (`scripts/check-build.mjs`): the release files exist, `manifest.json`, `package.json` and `versions.json` agree, the change log has an entry for the current version, and `main.js` loads and instantiates against a native ES6 `Plugin` class (the original load failure). It runs on every push and pull request through GitHub Actions (`.github/workflows/ci.yml`) and before each release.
- `npm run test:e2e` runs `scripts/e2e-obsidian.mjs` against a real Obsidian through the [Obsidian CLI](https://help.obsidian.md/cli). By default it creates a temporary vault in your OS temp folder, opens it in its own Obsidian window, and closes, unregisters and deletes it at the end, so your own vaults are not touched. Obsidian must be running with the CLI enabled. To use an existing vault instead, run `npm run test:e2e -- <vault name>` (this overwrites `.obsidian/plugins/folder-note-revamped/` there and creates and deletes a `__fnr-e2e__` folder). The test checks that the plugin loads, its commands are registered, Ctrl+click creates and opens a folder note, the note is hidden, the `ccard` block renders, both commands work (and do nothing instead of throwing when no file is active), and renaming a folder renames its note. It needs the desktop app, so it is not part of CI.

## Contributing

Bug reports, ideas and pull requests are welcome. Please [open an issue](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/issues) first for larger changes, so we can agree on the approach. Issues that originate from the original plugin are triaged in [doc/upstream-triage.md](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/upstream-triage.md); check it before starting, since many reports share one root cause.

1. Fork and clone the repo, then run `npm install`.
2. Make your change in `src/`. Keep the diff focused and match the surrounding style. Keep the plugin working on desktop and mobile (no Node or Electron APIs in `src/`), and do not lower the compile target (`es2018`).
3. Run `npm run check` (type check, build and build verification). It is what CI runs. If you changed behavior and have Obsidian installed, also run `npm run build && npm run test:e2e` and add a check to `scripts/e2e-obsidian.mjs` for your change.
4. Add a line to the top of the `## 1.0.x` list in [doc/change-log.md](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/change-log.md). End it with the version it ships in, for example `(1.0.6)`, or `, 1.0.6)` after an issue link. That line becomes the GitHub release notes, so write it for users. Credit whoever reported or fixed the issue with a link to their profile.
5. Open a pull request against `main` with a short imperative title and a reference to the issue (`Refs #N`). A pull request does not need to bump the version; the maintainer does that when releasing.

If your change is based on a PR or issue from the original plugin, say which one in the commit message, add a `Co-authored-by: Name <id+login@users.noreply.github.com>` trailer for its author, and link the issue as `https://redirect.github.com/xpgo/obsidian-folder-note-plugin/issues/N`. Please do not comment on the original repo on our behalf.

Details for AI coding agents and maintainers are in [AGENTS.md](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/AGENTS.md).

### Releasing (maintainer)

1. Bump the version in `manifest.json`, `package.json` and `versions.json` (same value; `versions.json` maps it to `minAppVersion`).
2. Make sure `doc/change-log.md` has entries tagged with that version. `npm run check` fails if there are none.
3. `npm run check`, commit and push to `main`.
4. `git tag <version> && git push origin <version>`. The tag is exactly the version, with no `v` prefix (BRAT requires that).
5. The release workflow publishes a release with `main.js`, `manifest.json`, `styles.css` and a zip, and uses the change log entries for that version as the release notes. If several tags are pushed close together, check afterwards that the newest version is the one marked Latest (`gh release list`); fix it with `gh release edit <version> --latest`.

## License

MIT, see [LICENSE.md](LICENSE.md). Copyright is shared between the original author (xpgo) and the revamp.
