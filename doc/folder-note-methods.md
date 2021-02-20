# Folder Note Methods

The mechanism of folder note is simple: attaching a note file to a folder. But where do you put the folder note? There are three methods of creating description note for a folder. (See the discussion at [Folder as markdown note](https://forum.obsidian.md/t/folder-as-markdown-note/2902/2) )


| Methods         | Index-File                                         | Inside-Folder                                                   | Outside-Folder                                                   |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Folder Path**      | parent/myFolder                         | parent/myFolder                                        | parent/myFolder                                        |
| **Folder Note Path** | parent/myFolder/\_about\_.md | parent/myFolder/myFolder.md                   | parent/myFolder.md                                     |
| **Configuration** | - **Note File method:** Index File<br />- **Index File Name:** \_about\_ (or other name you like) | **Note File method:** Folder Name Inside | **Note File method:** Folder Name Outside                  |
| **Pros**             | - The note file belongs to the folder. <br />- The note filename keeps the same if you rename a folder. | - The note file belongs to the folder. <br />- The note file has the same name as folder, the note title looks better. | - The note file has the same name as folder, the note title looks better.<br />- Wiki-style of linking, easy to insert link like [\[myFolder]] |
| **Cons**             | - The note filename and title may looks weird.<br />- Have to use additional file name for linking. | - Linking outside of the folder will be [\[myFolder/myFolder]].<br />- The note filename will be changed if you change the folder name. | - The note file does not belong to the folder. You have to move the note file manually if a folder is moved. <br />- The note filename will be changed if you change the folder name. |


When CTRL+Click a folder, the plugin will create a description note with the path dependent on the method you choose. When you Click a folder, the plugin will open the attached note for you. You can configure the plugin to hide/show the folder note. It can also be configured to try to automatically keep the folder and note name in syncing for methods **Inside-Folder** and **Outside-Folder** (Experimental). 

- The **default** configuration is the **Inside-Folder** method.
- If you prefer the **Outside-Folder** or **Index-File**  method, please change the settings.
- The **Index-File** method uses a note filename of  `_about_.md` (it can be configured to be `index` or others).
