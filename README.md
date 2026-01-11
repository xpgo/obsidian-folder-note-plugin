Written directly in js

![Changes](https://federicoboccaccio.wordpress.com/wp-content/uploads/2025/03/folder-note.jpg)

See https://federicoboccaccio.wordpress.com/folder-note-mod-plugin-per-obsidian/

# Folder Note Plugin

Obsidian Plugin: Add description note to a folder. Generate card-style overview of folder. Make your vault to be a hierarchy note system.

![Folder_Note_Show](https://raw.githubusercontent.com/xpgo/obsidian-folder-note-plugin/master/image/folder-note1.png)

## Usage

- **Add** description note: CTRL+Click on a folder in the file explorer panel.
- **Show** description note: Just Click the folder.
- **Delete** description note: Just delete the opened note file.
- **Settings** : configure the note file method, file name and inital template on the settings panel.
- **Command**: Use some commands to control the folder note plugin.

## Features

- Dispaly and manage folder note easily
- Support 3 different folder note methods
- Automatically keep folder and folder-note name in syncing
- Make a folder by active note file
- Customized initial folder note content
- Card and strip style view of folder content
- ccard code block for elegant view of item data

## How it works

The mechanism is simple: attaching a note file to a folder, and the folder note file will be hidden by CSS rules. But where do you put the folder note? There are three methods of creating description note for a folder: **Inside-Folder**, **Outside-Folder** and **Index-File**, please read [Folder Note Methods](https://github.com/xpgo/obsidian-folder-note-plugin/blob/main/doc/folder-note-methods.md) for more information about the Pros and Cons of each method. The **default** configuration is the **Inside-Folder** method. If you prefer the others, please change the settings.

When CTRL+Click a folder, the plugin will create a description note with the path dependent on the method you choose. When clicking a folder, the plugin will open the attached note for you. You can configure the plugin to hide/show the folder note. It can also be configured to try to automatically keep the folder and note name in syncing. 

## Settings

- **Note File method**: select the folder note file method as mentioned above.
- **Index File Name**: For the  *Index-File*  method, set the folder note name, like `_overview_` or `index`.
- **Note Initial Content**: set the initial content for a new folder note, you can use some keywords:
    - {{FOLDER_NAME}} will be replaced with the folder name.
    - {{FOLDER_PATH}} will be replaced with the folder path.
    - {{FOLDER_BRIEF}} will be replaced with a ccard code block for card-style overview of current folder, and the content in the ccard can be edited, see [ccard Syntax](https://github.com/xpgo/obsidian-folder-note-plugin/blob/main/doc/ccard-syntax.md) for more information.
    - {{FOLDER_BRIEF_LIVE}}  will be replaced with a tiny code block which will be rendered to the folder overview in real time.
- **Key for New Note**: set to use CTRL+Click or ALT+Click for creating new folder note.
- **Hide Folder Note**: turn off the setting if you want to show the note file in file explorer.
- **Auto Rename**: For the methods *Inside-Folder* and *Outside-Folder*, the plugin tries to rename the folder note name when a folder name is changed or vice versa. However, this function is experimental, it does not always work. Rename them manually if you have some issue related to the operation.
- **Delete Folder Note**: For the method *Outside-Folder*, delete folder note file when a folder is deleted. 

## Command

Use `Ctrl+P` to open Obsidian's command panel, and use the following commands of the plugin:

- **Insert Folder Overview**: Insert a folder overview code blocks in the current note file.
- **Make Current Note to Folder**: Create a folder based on the current note and attach the note to the new folder as folder note. 

## Overview of folder

The plugin can automatically generate a code block of `ccard` in a note file for displaying overview of a folder. The code block can be used and edited in any normal note file. For the syntax of `ccard` code block, please refer to [ccard Syntax](https://github.com/xpgo/obsidian-folder-note-plugin/blob/main/doc/ccard-syntax.md).

You can use the `ccard` code block in the inital folder note template in the settings page. Alternatively, you can use some keywords in the initial folder note template to generate the code blocks for you:

**Keyword: {{FOLDER_BRIEF}}**

The keyword {{FOLDER_BRIEF}} will be replaces with a `ccard` code block which describes an brief overview of the folder. You can edit the codes in the code block to display whatever content you like. If you want to update the overview of a folder, it can be inserted to a note by command: Ctrl+P, Insert Folder Overview.

**Keyword: {{FOLDER_BRIEF_LIVE}}**

The keyword {{FOLDER_BRIEF_LIVE}} will be replaced  with a `ccard` code block which will be rendered to the folder overview in real time. It is useful when you put some notes with image in a folder, e.g., things collections, it will generate a card view of all the notes with images dynamically.

**Configuration**

If you want to configure the content and appearence of the `ccard` code block, please refer to [ccard Syntax](https://github.com/xpgo/obsidian-folder-note-plugin/blob/main/doc/ccard-syntax.md). You can configure the style, colume number, image prefix, folder path, note only, max brief length and more. For example, the following image show different styles of folder overview. 

![Card_Strip_Style](https://raw.githubusercontent.com/xpgo/obsidian-folder-note-plugin/master/image/style-card-strip.png)


## Change log

Remember to update the plugin, if you find some issues. 
**For updating from version < 0.4.0**, please refer to [Update from old version](https://github.com/xpgo/obsidian-folder-note-plugin/blob/main/doc/update-old-version.md).


### 0.7.x

- add strip style view of item data (0.7.3)
- use {{FOLDER_BRIEF_LIVE}} for default inital content (0.7.2)
- add Keyword {{FOLDER_PATH}} for inital content (0.7.1)
- fix multiple usage of some keywords for initial content (0.7.1)
- add imagePrefix key for ccard (0.7.0)
- add noteOnly Key for folder_brief_live (0.7.0)
- fix showing both folder and note for outside mode (0.7.0)
- hide settings according to folder method (0.7.0)

See [more change log](https://github.com/xpgo/obsidian-folder-note-plugin/blob/main/doc/change-log.md).

## Plans for future

- Add more template option for generating the initial content.
- Automatically generate overview contents for the folder note file based on contents in the folder, like the software [Trilium](https://github.com/zadam/trilium) does. (Partially done.)
- More robust renaming operation.
- More style of overview.

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

## Support

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/xpgo)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/xpgo/obsidian-folder-note-plugin?style=for-the-badge)
![GitHub all releases](https://img.shields.io/github/downloads/xpgo/obsidian-folder-note-plugin/total?style=for-the-badge)
