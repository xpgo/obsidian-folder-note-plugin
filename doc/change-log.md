# Change log of Folder Note Plugin


## 0.7.x

- use {{FOLDER_BRIEF_LIVE}} for default initial content (0.7.2)
- add Keyword {{FOLDER_PATH}} for initial content (0.7.1)
- fix multiple usage of some keywords for initial content (0.7.1)
- add imagePrefix key for ccard (0.7.0)
- add noteOnly Key for folder_brief_live (0.7.0)
- fix showing both folder and note for outside mode (0.7.0)
- hide settings according to folder method (0.7.0)

## 0.6.x

- fix inserted card header for folder (0.6.6)
- fix yaml head for note brief (0.6.5)
- use local image path in ccard (0.6.4)
- better folder note brief (0.6.4)
- folder_brief_live use plain text of md paragraph (0.6.3)
- fix the escape of quotes (0.6.2)
- folder_brief_live uses the first paragraph note for its brief (0.6.1)
- folder_brief_live supports wiki style image (0.6.1)
- Add option for the key to create new note (0.6.0)
- Add command for creating a folder based on a note file (0.6.0)

## 0.5.x

- Fix the folder overview card for folder (0.5.2)
- Fix the hiding issue for Outside-Folder method (0.5.1)
- Add automatically rename for Inside-Folder method (0.5.1)
- Add options for three different folder note file method (0.5.0)
- Add options for auto rename (0.5.0)

## 0.4.x

- auto rename folder when the note file name changes.
- move note filename with {{FOLDER_NAME}} to out of folder for better orgnization. (0.4.0)

## 0.3.x

- add keyword {{FOLDER_BRIEF_LIVE}} for initial content to generate folder overview in real-time. (0.3.3)
- Insert folder overview by command: ctrl+p, Insert Folder Overview (0.3.2)
- Reorganized source code and fixed a mini bug (0.3.2)
- Fix the command key on Mac (0.3.1)
- Automatically generate card-view of folder overview (Experimental).
- Add keyword {{FOLDER_BRIEF}} for generating the folder overview.

## 0.2.x

- Fix folder and note name check for hiding. (0.2.5)
- Add settings option to hide or unhide folder note file. (0.2.3)
- Fix: failed to create note file when create a new folder. (0.2.2)
- Change: change the default note name to _about_ because of folder rename problem. (0.2.2)
- Add: settings tab (0.2.1)
- Note name and contents can be configured. (0.2.1)

## 0.1.0

- Add description note for a folder: CTRL+Click on a folder node in the file explorer panel.
- Show description note of a folder: Just Click the folder.
- Delete description note of a folder: Just delete the opened note file.
