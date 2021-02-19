
import { App, MarkdownView, TFile, } from "obsidian";
import { FolderBrief } from './folder-brief';

// ------------------------------------------------------------
// Folder Note
// ------------------------------------------------------------

enum NoteFileMethod {
    Index, Inside, Outside,
}

export class FolderNote {
    app: App;
    // copy from settings
    method: NoteFileMethod;
    indexBase: string;
    initContent: string;
    hideNoteFile: boolean;
    // local vars
    folderPath: string;
    notePath: string;
    noteBase: string;
    // for rename
    filesToRename: string[];
    filesToRenameSet: boolean;

    constructor(app: App, methodStr: string, indexBase: string) {
        this.app = app;
        this.setMethod(methodStr, indexBase);
        this.emptyPath();
        // for rename
        this.filesToRename = [];
        this.filesToRenameSet = false;
    }

    // set the method
    setMethod(methodStr: string, indexBase: string) {
        if (methodStr == 'index') {
            this.method = NoteFileMethod.Index;
            this.indexBase = indexBase;
        } 
        else if (methodStr == 'inside') { 
            this.method = NoteFileMethod.Inside;
        }
        else if (methodStr == 'outside') { 
            this.method = NoteFileMethod.Outside;
        }
    }

    // clear
    emptyPath() {
        this.folderPath = '';
        this.notePath = '';
        this.noteBase = '';
    }

    // set by folder path
    setByFolderPath(path: string) {
        this.emptyPath();
        var folderPath = path.trim();
        if (folderPath.length == 0) return;

        // set
        this.folderPath = folderPath;
        var notePaths = this.getFolderNotePath(folderPath);
        this.notePath = notePaths[0];
        this.noteBase = notePaths[1];
    }

    // set by note, should ends with .md
    setByNotePath(path: string) {
        this.emptyPath();
        var notePath = path.trim();
        if (notePath.length == 0) return;
        if (!notePath.endsWith('.md')) return;

        // set
        this.notePath = notePath;
        this.noteBase = this.getFileBaseName(notePath);
        this.folderPath = this.getNoteFolderPath(notePath);
    }

    // set by folder element
    setByFolderElement(folderItemEl: Element) {
        var folderPath = '';
        var folderName = '';

        var className = folderItemEl.className.toString();
        var folderElem = folderItemEl;
        if (className.contains('nav-folder-title-content')) {
            folderName = folderElem.getText();
            folderElem = folderItemEl.parentElement;
            folderPath = folderElem.attributes.getNamedItem('data-path').textContent;
        }
        else if (className.contains('nav-folder-title')) {
            folderPath = folderItemEl.attributes.getNamedItem('data-path').textContent;
            folderName = folderItemEl.lastElementChild.getText();
        }

        // fix the folder path
        if (folderPath.length > 0) {
            var slashLast = folderPath.lastIndexOf('/');
            var folderPathLast = folderPath.split('/').pop();
            if (folderPathLast != folderName) {
                folderPath = folderPath.substring(0, slashLast + 1) + folderName;
            }
        }

        // set to mine
        this.setByFolderPath(folderPath);

        // return the element in useage
        return folderElem;
    }

    // get file base name
    getFileBaseName(filePath: string) {
        var baseName = filePath.split('/').pop();
        var dotPos = baseName.lastIndexOf('.');
        if (dotPos > 0) baseName = baseName.substring(0, dotPos);
        return baseName;
    }

    // get folder note path by folder path
    getFolderNotePath(folderPath: string) {
        var notePath = '';
        var noteBaseName = this.indexBase;
        if (this.method == NoteFileMethod.Index) {
            notePath = folderPath + '/' + noteBaseName + '.md';
        }
        else {
            noteBaseName = folderPath.split('/').pop();
            if (this.method == NoteFileMethod.Inside) {
                notePath = folderPath + '/' + noteBaseName + '.md';
            }
            else if  (this.method == NoteFileMethod.Outside) {
                notePath = folderPath + '.md';
            }
        }
        // console.log('notePath: ', notePath);
        return [notePath, noteBaseName];
    }

    // get note folder, make sure it is a note file
    getNoteFolderPath(notePath: string) {
        var folderPath = '';
        if (this.method == NoteFileMethod.Index) {
            folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
        }
        else if (this.method == NoteFileMethod.Inside) {
            folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
        }
        else if (this.method == NoteFileMethod.Outside) {
            folderPath = notePath.substring(0,  notePath.length-3);
        }
        return folderPath;
    }

    // check if it is folder note name
    async isFolderNotePath(notePath: string) {
        var isFN = false;
        if (!notePath.endsWith('.md')) return false;

        if (this.method == NoteFileMethod.Index) {
            isFN = notePath.endsWith(`/${this.indexBase}.md`);
        }
        else if (this.method == NoteFileMethod.Inside) {
            var noteBaseName = this.getFileBaseName(notePath);
            if (notePath.endsWith(noteBaseName + '/' + noteBaseName + '.md'))  {
                isFN = true;
            }
        }
        else if (this.method == NoteFileMethod.Outside) {
            var folderPath = notePath.substring(0, notePath.length-3);
            isFN = await this.app.vault.adapter.exists(folderPath);
        }
        return isFN;
    }

    // check is folder note file?
    async isFolderNote(notePath: string) {
        var isFN = false;
        if (this.method == NoteFileMethod.Index) {
            isFN = notePath.endsWith(`/${this.indexBase}.md`);
        }
        else if (this.method == NoteFileMethod.Inside) {
            var noteBaseName = this.getFileBaseName(notePath);
            isFN = notePath.endsWith(`${noteBaseName}/${noteBaseName}.md`);
        }
        else if (this.method == NoteFileMethod.Outside) {
            var folderPath = notePath.substring(0, notePath.length-3);
            isFN = await this.app.vault.adapter.exists(folderPath);
        }
        return isFN;
    }

    // open note file
    async openFolderNote(folderElem: Element, doCreate: boolean) {
        // check note file
        let folderNoteExists = await this.app.vault.adapter.exists(this.notePath);
        if (!folderNoteExists && doCreate) {
            await this.newFolderNote();
            folderNoteExists = true;
        }

        // open the note
        if (folderNoteExists) {
            this.hideFolderNote(folderElem);
            // show the note
            this.app.workspace.openLinkText(this.notePath, '', false, { active: true });
        } 
        else if (folderElem.hasClass('has-folder-note')) {
            folderElem.removeClass('has-folder-note');
        }
    }

    // create folder note
    async newFolderNote() {
        let noteInitContent = await this.expandContent(this.initContent);
        await this.app.vault.adapter.write(this.notePath, noteInitContent);
    }

    // create folder by note
    async newNoteFolder() {
        if (this.method == NoteFileMethod.Outside) {
            let folderExists = await this.app.vault.adapter.exists(this.folderPath);
            if (!folderExists) {
                await this.app.vault.adapter.mkdir(this.folderPath);
            }
        }
        else if (this.method == NoteFileMethod.Inside) {
            var folderPath = this.notePath.substring(0, this.notePath.length-3);
            let folderExists = await this.app.vault.adapter.exists(folderPath);
            if (!folderExists) {
                await this.app.vault.adapter.mkdir(folderPath);
                var newNotePath = folderPath + '/' + this.noteBase + '.md';
                await this.app.vault.adapter.rename(this.notePath, newNotePath);
                this.app.workspace.openLinkText(newNotePath, '', false, { active: true });
            }
        }
    }

    // expand content template
    async expandContent(template: string) {
        // keyword: {{FOLDER_NAME}}
        var folderName = this.folderPath.split('/').pop();
        var content = template.replace('{{FOLDER_NAME}}', folderName);
        // keyword: {{FOLDER_BRIEF}}
        if (content.contains('{{FOLDER_BRIEF}}')) {
            let folderBrief = new FolderBrief(this.app);
            let briefCards = await folderBrief.makeBriefCards(this.folderPath, this.notePath);
            content = content.replace('{{FOLDER_BRIEF}}', briefCards.getYamlCode());
        }
        // keyword: {{FOLDER_BRIEF_LIVE}}
        if (content.contains('{{FOLDER_BRIEF_LIVE}}')) {
            const briefLiveCode = '\n```ccard\ntype: folder_brief_live\n```\n';
            content = content.replace('{{FOLDER_BRIEF_LIVE}}', briefLiveCode);
        }
        return content;
    }

    // hide folder note
    hideFolderNote(folderElem: Element) {
        // modify the element
        const hideSetting = this.hideNoteFile;
        folderElem.addClass('has-folder-note');
        var parentElem = folderElem.parentElement;
        var fileSelector = ':scope > div.nav-folder-children > div.nav-file > div.nav-file-title';
        var isOutsideMethod = (this.method == NoteFileMethod.Outside);
        if (isOutsideMethod) {
            parentElem = parentElem.parentElement;
            fileSelector = ':scope > div.nav-file > div.nav-file-title';
        }
        var noteBase = this.noteBase;
        parentElem.querySelectorAll(fileSelector)
            .forEach(function (fileElem) {
                var fileNodeTitle = fileElem.firstElementChild.textContent;
                // console.log('fileNoteTitle: ', fileNodeTitle);
                if (hideSetting && (fileNodeTitle == noteBase)) {
                    fileElem.addClass('is-folder-note');
                }
                else if (!isOutsideMethod) {
                    fileElem.removeClass('is-folder-note');
                }
                // console.log('isOutsideMethod: ', isOutsideMethod);
            }
        );
    }
    
    // get the file breif path
    async getNoteFolderBriefPath(notePath: string) {
        var folderPath = '';
        let isFN = await this.isFolderNote(notePath);
        if (isFN) {
            folderPath = this.getNoteFolderPath(notePath);
        }
        else {
            folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
        }
        return folderPath;
    }

    // delete a folder 
    async deleteFolder(pathToDel: any) {
        if (this.method == NoteFileMethod.Outside && !pathToDel.endsWith('.md')) {
            // delete a folder
            let myNotePath = pathToDel + '.md';
            let noteExists = await this.app.vault.adapter.exists(myNotePath);
            if (noteExists) {
                await this.app.vault.adapter.trashLocal(myNotePath);
            }
        }
    }

    // sync folder / note name
    async syncName(newPath: any, oldPath: any) {
        if (this.method == NoteFileMethod.Outside) {
            await this.syncNameOutside(newPath, oldPath);
        }
        else if (this.method == NoteFileMethod.Inside) {
            await this.syncNameInside(newPath, oldPath);
        }
    }

    // sync folder / note name for outside
    async syncNameOutside(newPath: any, oldPath: any) {
        if (!oldPath.endsWith('.md')) {
            // changing folder name
            // console.log('changing folder!!!')
            // console.log('oldPath: ', oldPath);
            // console.log('newPath: ', newPath.path);
            let noteExists = await this.app.vault.adapter.exists(oldPath + '.md');
            if (noteExists) {
                var oldNotePaths = this.getFolderNotePath(oldPath);
                var newNotePaths = this.getFolderNotePath(newPath.path);
                if (oldNotePaths[1] != newNotePaths[1]) {
                    await this.app.vault.adapter.rename(oldNotePaths[0], newNotePaths[0]);
                }
            }
        }
        else {
            // changeing note name
            let isFN = await this.isFolderNote(oldPath);
            if (isFN) {
                // console.log('oldPath: ', oldPath);
                // console.log('newPath: ', newPath.path);
                var oldFolderPath = this.getNoteFolderPath(oldPath);
                var newFolderPath = this.getNoteFolderPath(newPath.path);
                await this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
            }
        }
    }

    //  sync folder / note name for inside case
    async syncNameInside(newPath: any, oldPath: any) {
        if (!oldPath.endsWith('.md')) {
            // changing folder name
            var oldNotePaths = this.getFolderNotePath(oldPath);
            var newNotePaths = this.getFolderNotePath(newPath.path);
            var oldNotePathNew = newPath.path + '/' + oldNotePaths[1] + '.md';
            let noteExists = await this.app.vault.adapter.exists(oldNotePathNew);
            if (noteExists) {
                if (newNotePaths[0] != oldNotePathNew) {
                    // put it to rename
                    this.filesToRename.push(oldNotePathNew);
                    this.filesToRename.push(newNotePaths[0]);
                }
            }
        }
        else if (this.filesToRename.length == 0) {
            // changing note name
            let isFN = await this.isFolderNote(oldPath);
            if (isFN) {
                var oldFolderPath = this.getNoteFolderPath(oldPath);
                // find the new path
                var noteDir = newPath.path;
                noteDir = noteDir.substring(0, noteDir.lastIndexOf('/'));
                noteDir = noteDir.substring(0, noteDir.lastIndexOf('/'));
                var noteBase = newPath.path.split('/').pop();
                noteBase = noteBase.substring(0, noteBase.length-3);
                var newFolderPath = '';
                if (noteDir.length > 0) {
                    newFolderPath = noteDir + '/' + noteBase;
                } 
                else {
                    newFolderPath = noteBase;
                }
                // put it to rename
                if (oldFolderPath != newFolderPath) {
                    this.filesToRename.push(oldFolderPath);
                    this.filesToRename.push(newFolderPath);
                }
            }
        }
        // only do once a time
        if (!this.filesToRenameSet && this.filesToRename.length > 0) {
            this.filesToRenameSet = true;
            setTimeout(() => {
                // console.log('rename is running after 1 s.');
                if (this.filesToRename.length) {
                    var oldFolderPath = this.filesToRename[0];
                    var newFolderPath = this.filesToRename[1];
                    // console.log('Mod Old Path:', oldFolderPath);
                    // console.log('Mod New Path:', newFolderPath);
                    this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
                    this.filesToRename = [];
                    this.filesToRenameSet = false;
                }
            }, 1000);
        }
    }
}
