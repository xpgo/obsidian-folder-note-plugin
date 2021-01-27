# Folder Note Plugin

Obsidian Plugin: Add description note to a folder. Make your vault to be a hierarchy note system.

![Folder_Note_Show](https://raw.githubusercontent.com/xpgo/obsidian-folder-note-plugin/master/image/folder-note2.png)

## Usage

- **Add** description note: CTRL+Click on a folder in the file explorer panel.
- **Show** description note: Just Click the folder.
- **Delete** description note: Just delete the opened note file.
- **Configure** : configure the note name and template on the settings panel.

## How it works

Just a simple trick. When create description note for a folder, a note file named `_about_.md` will be created in the clicked folder. However, the file `_about_.md` is hidden by CSS rules of the plugin. The reason that the file is hidden because:

- The `_about_.md` may not be always shown right after the folder if there are subfolders.
- The file name may looks abnormal or weird.

## Settings

- **Hide Note**: turn off the setting if you want to show the note file in file explorer.
- **Note Name**: set the default folder note name, like `_overview_` or `index`. Keyword {{FOLDER_NAME}} can be used to set the note name same as folder name, _HOWEVER_, it is not recommended, because you have to manually change the note file name if you rename a folder.
- **Note Initial Content**: set the initial content for a new folder note.
    - {{FOLDER_NAME}} in the content will be replaced with the folder name.
    - {{FOLDER_BRIEF}} in the content will be replaced with a folder overview in card view.
    - The card view of content is html-based which can be edited and used in other normal notes.

## Change log

### 0.3.0

- Automatically generate card-view of folder overview (Experimental).
- Add keyword {{FOLDER_BRIEF}} for generating the folder overview.

### 0.2.5

- Fix folder and note name check for hiding.

### 0.2.4

- Add settings option to hide or unhide folder note file.

### 0.2.3

- Fix: failed to create note file when create a new folder.
- Change: change the default note name to \_about\_ because of folder rename problem.

### 0.2.1

- Add: settings tab
- Note name and contents can be configured.

## Plans for future

- Add more template option for generating the initial content.
- Automaticaly generate overview contents for the folder note file based on contents in the folder, like the software [Trilium](https://github.com/zadam/trilium) does. (Partialy done.)

## Known issues

- The folder note file may appear when created. Click it again to hide.
- Leave a message on the github repo if you find any issues or want to improve the plugin.

## Install

- On the Obsidian's settings page, browse the community plugins and search 'Folder Note', then install.
- Or manually installing: go to the github release page, copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/folder-note-plugin/`.
- The plugin will be updated continuously, upate it through Obsidian's settings page or manually.

## Build

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.

## More ...

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/xpgo)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/xpgo/obsidian-folder-note-plugin?style=for-the-badge)
![GitHub all releases](https://img.shields.io/github/downloads/xpgo/obsidian-folder-note-plugin/total?style=for-the-badge)
