# Folder Note Plugin

Add description note to a folder. 

## Usage

- **Add** description note for a folder: CTRL+Click on a folder node in the file explorer panel.
- **Show** description note of a folder: Just Click the folder.
- **Delete** description note of a folder: Just delete the opened note file.

## How it works

Just a simple trick. When create the description, a note file named `_about_.md` will be created in the clicked folder. However, the file `_about_.md` is hidden by CSS rules of the plugin. The reason that the file is hidden because:

- the `_about_.md` file will not always be shown right after the folder node if there are subfolders.
- The file name may looks abnormal.
- In the future, the description will be automatically generated based on the files and their contents in the folder. 

## Plans for future

- Automatic generate brief contents for the file based on the files and their contents in the folder, like the software [Trilium](https://github.com/zadam/trilium) does. 

## Known issues

- Do not try to create a new file by context menu or Ctrl+N (which will create a file named 'Untitled.md' firstly), and change its name to  `_about_.md` manually. If you do that, the file  `_about_.md` will not be hidden due to internal mechanism of Obsidian. However, if you close and reopen Obsidian, it will be hidden again.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

