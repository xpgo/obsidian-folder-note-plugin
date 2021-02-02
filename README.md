# Folder Note Plugin

Obsidian Plugin: Add description note to a folder. Generate card-style overview of folder. Make your vault to be a hierarchy note system.

![Folder_Note_Show](https://raw.githubusercontent.com/xpgo/obsidian-folder-note-plugin/master/image/folder-note1.png)

## Usage

- **Add** description note: CTRL+Click on a folder in the file explorer panel.
- **Show** description note: Just Click the folder.
- **Delete** description note: Just delete the opened note file.
- **Configure** : configure the note name and template on the settings panel.

## How it works

Although the mechanism is simple, it would be better to know that there are two ways of creating description note for a folder. 

| Type                 | In-Folder                                                    | Out-Folder                                                   |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Folder Path**      | parent/myFolder                                        | parent/myFolder                                        |
| **Folder Note Path** | parent/myFolder/\_about\_.md                           | parent/myFolder.md                                     |
| **Configure Note Name**        | \_about\_ (or other name you like)               | {{FOLDER_NAME}}                                              |
| **Pros**             | - The note file belongs to the folder. <br />- The note filename keeps the same if you rename a folder. | - The note file has the same name as folder, the note title looks better.<br />- Wiki-style of linking, easy to insert link like [\[myFolder]] |
| **Cons**             | - The note filename and title may looks weird.<br />- Have to use additional file name for linking. | - The note file does not belong to the folder.<br />- The note filename will be changed if you change the folder name. |

- The **default** configuration is the **In-Folder** type with note filename of  `_about_.md`. When create description note for a folder, a note file named `_about_.md` will be created in the clicked folder. However, the file `_about_.md` is hidden by the CSS rules of the plugin. You can let it shown by configure the **Hide Note** option.

- If you like the **Out-Folder** style, please configure the note name as {{FOLDER_NAME}} before using the plugin.

## Configuration

- **Hide Note**: turn off the setting if you want to show the note file in file explorer.
- **Note Name**: set the default folder note name, like `_overview_` or `index`. Keyword {{FOLDER_NAME}} can be used to set the note name same as folder name.
- **Note Initial Content**: set the initial content for a new folder note.
    - {{FOLDER_NAME}} in the content will be replaced with the folder name.
    - {{FOLDER_BRIEF}} in the content will be replaced with a card-style overview of current folder.
    - {{FOLDER_BRIEF_LIVE}} in the content will be replaced with a tiny code block which will be rendered to the folder overview in real time.

## Card-style overview of folder

**Keyword: {{FOLDER_BRIEF}}**

The card-style overview of a folder by keyword {{FOLDER_BRIEF}} is a block of html codes which are generated based on the content of subfolders and note files in the folder. There are some tips:

- Modify the html code of each card item to dispaly whatever contents you want.
- The title of card item is linked to a note, so click it to jump or hover it to preview.
- You can reorder the card items as you wish. 
- The background image of a note item is the first image of the note, you can manually change it.
- If you want to update the overview of a folder, it can be inserted to a note by command: Ctrl+P, Insert Folder Overview.

**Keyword: {{FOLDER_BRIEF_LIVE}}**

The keyword {{FOLDER_BRIEF_LIVE}} is a block of yaml codes which will be rendered to the folder overview in real time. It is useful when you put some notes with image in a folder, e.g. things collecions, it will generate a card view of all the notes dynamically.

## Change log

Remember to update the plugin, if you find some issues.

### 0.4.0

- move note filename with {{FOLDER_NAME}} to out of folder for better orgnization. 

### 0.3.x

- add keyword {{FOLDER_BRIEF_LIVE}} for inital content to generate folder overview in real time. (0.3.3)
- Insert folder overview by command: ctrl+p, Insert Folder Overview (0.3.2)
- Reorganized source code and fixed a mini bug (0.3.2)
- Fix the command key on Mac (0.3.1)
- Automatically generate card-view of folder overview (Experimental).
- Add keyword {{FOLDER_BRIEF}} for generating the folder overview.

### 0.2.x

- Fix folder and note name check for hiding. (0.2.5)
- Add settings option to hide or unhide folder note file. (0.2.3)
- Fix: failed to create note file when create a new folder. (0.2.2)
- Change: change the default note name to \_about\_ because of folder rename problem. (0.2.2)
- Add: settings tab (0.2.1)
- Note name and contents can be configured. (0.2.1)

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

## Status

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/xpgo)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/xpgo/obsidian-folder-note-plugin?style=for-the-badge)
![GitHub all releases](https://img.shields.io/github/downloads/xpgo/obsidian-folder-note-plugin/total?style=for-the-badge)
