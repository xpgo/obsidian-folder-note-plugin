# Folder Note Plugin

Obsidian Plugin: Add description note to a folder. Generate card-style overview of folder. Make your vault to be a hierarchy note system.

![Folder_Note_Show](https://raw.githubusercontent.com/xpgo/obsidian-folder-note-plugin/master/image/folder-note1.png)

## Usage

- **Add** description note: CTRL+Click on a folder in the file explorer panel.
- **Show** description note: Just Click the folder.
- **Delete** description note: Just delete the opened note file.
- **Configure** : configure the note file method, file name and template on the settings panel.

## How it works

The mechanism is simple: attaching a note file to a folder. But there is a question: how and where do you put the folder note? There are three methods of creating description note for a folder. (See the dicussion at [Folder as markdown note](https://forum.obsidian.md/t/folder-as-markdown-note/2902/2) )

| Methods         | Index-File                                         | Inside-Folder                                                   | Outside-Folder                                                   |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Folder Path**      | parent/myFolder                         | parent/myFolder                                        | parent/myFolder                                        |
| **Folder Note Path** | parent/myFolder/\_about\_.md | parent/myFolder/myFolder.md                   | parent/myFolder.md                                     |
| **Configuration** | - **Note File method:** Index File<br />- **Index File Name:** \_about\_ (or other name you like) | **Note File method:** Folder Name Inside | **Note File method:** Folder Name Outside                  |
| **Pros**             | - The note file belongs to the folder. <br />- The note filename keeps the same if you rename or move a folder. | - The note file belongs to the folder. <br />- The note file has the same name as folder, the note title looks better. | - The note file has the same name as folder, the note title looks better.<br />- Wiki-style of linking, easy to insert link like [\[myFolder]] |
| **Cons**             | - The note filename and title may looks weird.<br />- Have to use additional file name for linking. | - Linking outside of the folder will be [\[myFolder/myFolder]].<br />- The note filename will be changed if you change the folder name. | - The note file does not belong to the folder. You have to move the note file manually if a folder is moved. <br />- The note filename will be changed if you change the folder name. |

- The **default** configuration is the **Inside-File** method.
- The **Index-File** method uses a note filename of  `_about_.md` (it is configurable). When create description note for a folder, a note file named `_about_.md` will be created in the clicked folder. However, the file `_about_.md` is hidden by the CSS rules of the plugin. You can let it shown by configure the **Hide Note** option.
- If you prefer the **Outside-Folder** or **Index-File**  method, please change the settings.
- **NOTICE**: For those who use the plugin of old versions, please change the **Note File Method** in the settings panel for your choice, and reopen Obsidian to take effect.

## Configuration

- **Note File method**: select the folder note file method.
- **Index File Name**: For the "Index File" method, set the default folder note name, like `_overview_` or `index`. (Do not use {{FOLDER_NAME}} any more)
- **Note Initial Content**: set the initial content for a new folder note.
    - {{FOLDER_NAME}} in the content will be replaced with the folder name.
    - {{FOLDER_BRIEF}} in the content will be replaced with a card-style overview of current folder.
    - {{FOLDER_BRIEF_LIVE}} in the content will be replaced with a tiny code block which will be rendered to the folder overview in real time.
- **Hide Folder Note**: turn off the setting if you want to show the note file in file explorer.
- **Auto Rename**: For the method **Outside-Folder**, the plugin tries to rename the folder note name when a folder name is changed. However, this function is experimental, it does not always work. Reopen Obsidian if you have some issue related to rename operation.

## Card-style overview of folder

**Keyword: {{FOLDER_BRIEF}}**

The card-style overview of a folder by keyword {{FOLDER_BRIEF}} is a block of html codes which are generated based on the content of subfolders and note files in the folder. There are some tips:

- Modify the html code of each card item to display whatever contents you want.
- The title of card item is linked to a note, so click it to jump or hover it to preview.
- You can reorder the card items as you wish. 
- The background image of a note item is the first image of the note, you can manually change it.
- If you want to update the overview of a folder, it can be inserted to a note by command: Ctrl+P, Insert Folder Overview.

**Keyword: {{FOLDER_BRIEF_LIVE}}**

The keyword {{FOLDER_BRIEF_LIVE}} is a block of YAML codes which will be rendered to the folder overview in real time. It is useful when you put some notes with image in a folder, e.g. things collections, it will generate a card view of all the notes dynamically.

## Change log

Remember to update the plugin, if you find some issues.

### 0.5.1

- Fix the hiding issue for Outside-Folder method
- Add automatically rename for Inside-Folder method

### 0.5.0

- Add options for three different folder note file method
- Add options for auto rename

## Plans for future

- Add more template option for generating the initial content.
- Automatically generate overview contents for the folder note file based on contents in the folder, like the software [Trilium](https://github.com/zadam/trilium) does. (Partially done.)

## Known issues

- The folder note file may appear when created. Click it again to hide.
- Leave a message on the GitHub repo if you find any issues or want to improve the plugin.

## Install

- On the Obsidian's settings page, browse the community plugins and search 'Folder Note', then install.
- Or manually installing: go to the GitHub release page, copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/folder-note-plugin/`.
- The plugin will be updated continuously, update it through Obsidian's settings page or manually.

## Build

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.

## Status

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/xpgo)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/xpgo/obsidian-folder-note-plugin?style=for-the-badge)
![GitHub all releases](https://img.shields.io/github/downloads/xpgo/obsidian-folder-note-plugin/total?style=for-the-badge)
