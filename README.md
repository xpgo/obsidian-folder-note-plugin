<p align="center">
  <img src="image/logo.svg" alt="Folder Note Revamped" width="640">
</p>

<p align="center">
  <a href="https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/SamPlaysKeys/obsidian-folder-note-revamped-plugin?style=for-the-badge"></a>
  <a href="https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/SamPlaysKeys/obsidian-folder-note-revamped-plugin/total?style=for-the-badge"></a>
  <a href="LICENSE.md"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge"></a>
</p>

**Obsidian Plugin**: Add description note to a folder. Generate card-style overview of folder. Make your vault to be a hierarchy note system.

A revamp of [xpgo's Folder Note plugin](https://github.com/xpgo/obsidian-folder-note-plugin), kept working with current Obsidian. See [why this revamp exists](#why-this-revamp-exists).

![Folder_Note_Revamped_Show](https://raw.githubusercontent.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/main/image/folder-note1.png)

**Jump to:** [Install](#install) · [Usage](#usage) · [Settings](#settings) · [Commands](#commands) · [ccard overview](#folder-overview-cards-ccard) · [Why this revamp](#why-this-revamp-exists) · [Change log](#change-log)

## Features

- Display and manage folder note easily
- Support 3 different folder note methods
- Automatically keep folder and folder-note name in syncing
- Make a folder by active note file
- Customized initial folder note content
- Card and strip style view of folder content
- ccard code block for elegant view of item data

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

- **Add** description note: CTRL+Click on a folder in the file explorer panel.
- **Show** description note: Just Click the folder.
- **Delete** description note: Just delete the opened note file.
- **Settings** : configure the note file method, file name and initial template on the settings panel.
- **Command**: Use some commands to control the folder note plugin.

## How it works

The mechanism is simple: attaching a note file to a folder, and the folder note file will be hidden by CSS rules. But where do you put the folder note? There are three methods of creating description note for a folder: **Inside-Folder**, **Outside-Folder** and **Index-File**, please read [Folder Note Methods](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/folder-note-methods.md) for more information about the Pros and Cons of each method. The **default** configuration is the **Inside-Folder** method. If you prefer the others, please change the settings.

When CTRL+Click a folder, the plugin will create a description note with the path dependent on the method you choose. When clicking a folder, the plugin will open the attached note for you. You can configure the plugin to hide/show the folder note. It can also be configured to try to automatically keep the folder and note name in syncing. 

## Settings

- **Note File method**: select the folder note file method as mentioned above.
- **Index File Name**: For the  *Index-File*  method, set the folder note name, like `_overview_` or `index`.
- **Note Initial Content**: set the initial content for a new folder note, you can use some keywords:
    - {{FOLDER_NAME}} will be replaced with the folder name.
    - {{FOLDER_PATH}} will be replaced with the folder path.
    - {{FOLDER_BRIEF}} will be replaced with a ccard code block for card-style overview of current folder, and the content in the ccard can be edited, see [ccard Syntax](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/ccard-syntax.md) for more information.
    - {{FOLDER_BRIEF_LIVE}}  will be replaced with a tiny code block which will be rendered to the folder overview in real time.
- **Key for New Note**: set to use CTRL+Click or ALT+Click for creating new folder note. On macOS the options are shown as Cmd+Click and Option+Click.
- **Hide Folder Note**: turn off the setting if you want to show the note file in file explorer.
- **Auto Rename**: For the methods *Inside-Folder* and *Outside-Folder*, the plugin tries to rename the folder note name when a folder name is changed or vice versa. However, this function is experimental, it does not always work. Rename them manually if you have some issue related to the operation.
- **Delete Folder Note**: For the method *Outside-Folder*, delete folder note file when a folder is deleted. 

## Commands

Use `Ctrl+P` to open Obsidian's command panel, and use the following commands of the plugin:

- **Insert Folder Brief**: Insert a folder overview code blocks in the current note file.
- **Make Current Note to Folder**: Create a folder based on the current note and attach the note to the new folder as folder note. 

## Folder overview cards (ccard)

The plugin can automatically generate a code block of `ccard` in a note file for displaying overview of a folder. The code block can be used and edited in any normal note file. For the syntax of `ccard` code block, please refer to [ccard Syntax](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/ccard-syntax.md).

You can use the `ccard` code block in the initial folder note template in the settings page. Alternatively, you can use some keywords in the initial folder note template to generate the code blocks for you:

**Keyword: {{FOLDER_BRIEF}}**

The keyword {{FOLDER_BRIEF}} will be replaced with a `ccard` code block which describes a brief overview of the folder. You can edit the codes in the code block to display whatever content you like. If you want to update the overview of a folder, it can be inserted to a note by command: Ctrl+P, Insert Folder Brief.

**Keyword: {{FOLDER_BRIEF_LIVE}}**

The keyword {{FOLDER_BRIEF_LIVE}} will be replaced  with a `ccard` code block which will be rendered to the folder overview in real time. It is useful when you put some notes with images in a folder, e.g., things collections, it will generate a card view of all the notes with images dynamically.

**Configuration**

If you want to configure the content and appearance of the `ccard` code block, please refer to [ccard Syntax](https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/ccard-syntax.md). You can configure the style, column number, image prefix, folder path, note only, max brief length and more. For example, the following image shows different styles of folder overview. 

![Card_Strip_Style](https://raw.githubusercontent.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/main/image/style-card-strip.png)

## Known issues and plans

**Known issues**

- The folder note file may appear when created. Click it again to hide.
- Leave a message on the GitHub repo if you find any issues or want to improve the plugin.

**Plans**

- Add more template options for generating the initial content.
- Automatically generate overview contents for the folder note file based on contents in the folder, like the software [Trilium](https://github.com/zadam/trilium) does. (Partially done.)
- More robust renaming operation.
- More style of overview.

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
