# Templater Scripts

## Folder Note Item List Automation

This script will create a template to be able to generate an item list, with folder note links, upon creation of a folder note.
Instead of having to create the item list manually, copying it over, creating the links to those folders, this script will do most of the work for you by generating an item list with links to the children folders. This means whenever you create a new child folder, you can delete the parent's folder note and create a new one and the link the new folder note will be added to the folder note.
The pictures of the children folders will have a placeholder: "folder-note-child-name.jpg". The only thing you need to do is add pictures with the folder names to the library asset folder. If not there will be no picture, but links will still work.

### Instructions

You can find a complete tutorial [here](https://docs.kenjibailly.xyz/folder-navigation/).

1. Copy [folder_note_item_list.js](./folder_note_item_list.js) to your templater folder and open it in a text editor.
2. Edit the line below with the path of your library assets and save the file.
```js
var asset_library_path = "Obsidian Vault/Archive/Assets/"
```
3. Open your "Folder Note" settings and add the following lines of code in the "Initial Content":
```js
# {{FOLDER_NAME}}
<% tp.user.folder_note_item_list(tp,app) %>
```
4. Optional: Add files to your folder note, add the following lines of code in the "Initial Content" below the code above:
```
# Files

\`\`\`ccard

type: folder_brief_live
noteOnly: true
\`\`\`
```