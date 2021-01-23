# Folder Note Plugin

Obsidian Plugin: Add description note to a folder. 

## Usage

- **Add** description note for a folder: CTRL+Click on a folder node in the file explorer panel.
- **Show** description note of a folder: Just Click the folder.
- **Delete** description note of a folder: Just delete the opened note file.
- **Configure** : configure the note name and template on the settings panel.

## How it works

Just a simple trick. When create description for a folder, a note file named `_about_.md` will be created in the clicked folder. However, the file `_about_.md` is hidden by CSS rules of the plugin. The reason that the file is hidden because:

- the `_about_.md` file will not always be shown right after the folder node if there are subfolders.
- The file name may looks abnormal or weird.
- In the future, the description will be automatically generated based on the files and their contents in the folder. 

About setting the note file name and inital content:

- The note name can be set to others, like `_overview_` or `index` in the settings panel.
- You can use {{FOLDER_NAME}} in the note name setting which will be replaced with the folder name.
- The initial content for the description can be configured in the settings panel.
- **NOTE**: if  you use {{FOLDER_NAME}} as the note name, you have to manually change it after you rename a folder.

## Change log

### 0.2.3

- Fix: failed to create note file when create a new folder.
- Change: change the default note name to \_about\_ because of folder rename problem.

## Plans for future

- Automatic generate brief contents for the folder note file based on contents in the folder, like the software [Trilium](https://github.com/zadam/trilium) does. 

## Known issues

- Do not try to create a new file by context menu or Ctrl+N (which will create a file named 'Untitled.md' firstly), and change its name to the folder name manually. If you do that, the file will not be hidden due to internal mechanism of Obsidian. However, if you close and reopen Obsidian, it will be hidden again.
- The folder note file may appear when created. It will be hidden by click the folder again.

## Install

- On the Obsidian's settings page, browse the third-party plugins and search 'Folder Note', then install.
- Or manully installing: go to the github release page, copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/folder-note-plugin/`.

## Build

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.
