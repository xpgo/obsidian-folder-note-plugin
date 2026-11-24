import { App, TAbstractFile, TFile, TFolder, normalizePath } from "obsidian";
import { FolderBrief } from './folder-brief';

// ------------------------------------------------------------
// Folder Note
// ------------------------------------------------------------

export enum NoteFileMethod {
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
    selfRenaming: boolean;

    constructor(app: App, methodStr: string, indexBase: string) {
        this.app = app;
        this.indexBase = indexBase;
        this.setMethod(methodStr, indexBase);
        this.emptyPath();
        this.filesToRename = [];
        this.filesToRenameSet = false;
        this.selfRenaming = false;
    }

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

    emptyPath() {
        this.folderPath = '';
        this.notePath = '';
        this.noteBase = '';
    }

    setByFolderPath(path: string) {
        this.emptyPath();
        const folderPath = path.trim();
        if (folderPath.length == 0) return;
        this.folderPath = folderPath;
        const notePaths = this.getFolderNotePath(folderPath);
        this.notePath = notePaths[0];
        this.noteBase = notePaths[1];
    }

    // set by note, should end with .md
    setByNotePath(path: string) {
        this.emptyPath();
        const notePath = path.trim();
        if (notePath.length == 0) return;
        if (!notePath.endsWith('.md')) return;
        this.notePath = notePath;
        this.noteBase = this.getFileBaseName(notePath);
        this.folderPath = this.getNoteFolderPath(notePath);
    }

    // set by a clicked element inside the file explorer.
    // returns the folder title element, or null if the click was not on a folder.
    setByFolderElement(clickedEl: Element): HTMLElement | null {
        this.emptyPath();
        const folderElem = clickedEl.closest<HTMLElement>('.nav-folder-title[data-path]');
        if (!folderElem) return null;
        // only react inside the file explorer (other views reuse nav-* classes)
        if (!folderElem.closest('.workspace-leaf-content[data-type="file-explorer"]')) return null;

        let folderPath = folderElem.getAttribute('data-path') || '';
        if (folderPath === '/' || folderPath.length === 0) return null; // vault root

        // data-path can lag behind right after a rename; trust the visible name
        const nameEl = folderElem.querySelector('.nav-folder-title-content');
        const folderName = nameEl ? nameEl.textContent : '';
        if (folderName && folderPath.split('/').pop() != folderName) {
            const slashLast = folderPath.lastIndexOf('/');
            folderPath = folderPath.substring(0, slashLast + 1) + folderName;
        }

        this.setByFolderPath(folderPath);
        return folderElem;
    }

    getFileBaseName(filePath: string) {
        let baseName = filePath.split('/').pop();
        const dotPos = baseName.lastIndexOf('.');
        if (dotPos > 0) baseName = baseName.substring(0, dotPos);
        return baseName;
    }

    // [notePath, noteBaseName] for a folder
    getFolderNotePath(folderPath: string): [string, string] {
        let notePath = '';
        let noteBaseName = this.indexBase;
        if (this.method == NoteFileMethod.Index) {
            notePath = folderPath + '/' + noteBaseName + '.md';
        }
        else {
            noteBaseName = folderPath.split('/').pop();
            if (this.method == NoteFileMethod.Inside) {
                notePath = folderPath + '/' + noteBaseName + '.md';
            }
            else if (this.method == NoteFileMethod.Outside) {
                notePath = folderPath + '.md';
            }
        }
        return [notePath, noteBaseName];
    }

    getNoteFolderPath(notePath: string) {
        let folderPath = '';
        if (this.method == NoteFileMethod.Index || this.method == NoteFileMethod.Inside) {
            folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
        }
        else if (this.method == NoteFileMethod.Outside) {
            folderPath = notePath.substring(0, notePath.length - 3);
        }
        return folderPath;
    }

    // synchronous check using the vault's in-memory file tree
    isFolderNoteSync(notePath: string): boolean {
        if (!notePath || !notePath.endsWith('.md')) return false;
        if (this.method == NoteFileMethod.Index) {
            return notePath.endsWith(`/${this.indexBase}.md`);
        }
        if (this.method == NoteFileMethod.Inside) {
            const base = this.getFileBaseName(notePath);
            const parts = notePath.split('/');
            return parts.length >= 2 && parts[parts.length - 2] === base;
        }
        if (this.method == NoteFileMethod.Outside) {
            const folderPath = notePath.substring(0, notePath.length - 3);
            return this.app.vault.getAbstractFileByPath(folderPath) instanceof TFolder;
        }
        return false;
    }

    hasFolderNoteSync(folderPath: string): boolean {
        const [notePath] = this.getFolderNotePath(folderPath);
        return this.app.vault.getAbstractFileByPath(notePath) instanceof TFile;
    }

    // kept async for backwards compatibility with callers
    async isFolderNotePath(notePath: string) {
        return this.isFolderNoteSync(notePath);
    }

    async isFolderNote(notePath: string) {
        return this.isFolderNoteSync(notePath);
    }

    async openFolderNote(folderElem: HTMLElement, doCreate: boolean) {
        let file = this.app.vault.getAbstractFileByPath(this.notePath);
        if (!(file instanceof TFile) && doCreate) {
            file = await this.newFolderNote();
        }

        if (file instanceof TFile) {
            folderElem.addClass('has-folder-note');
            await this.app.workspace.getLeaf(false).openFile(file, { active: true });
        }
        else {
            folderElem.removeClass('has-folder-note');
        }
    }

    async newFolderNote(): Promise<TFile> {
        const content = await this.expandContent(this.initContent);
        return await this.app.vault.create(normalizePath(this.notePath), content);
    }

    // turn the current note into a folder (with the note as its folder note)
    async newNoteFolder() {
        if (this.method == NoteFileMethod.Outside) {
            if (!this.app.vault.getAbstractFileByPath(this.folderPath)) {
                await this.app.vault.createFolder(this.folderPath);
            }
        }
        else if (this.method == NoteFileMethod.Inside) {
            const folderPath = this.notePath.substring(0, this.notePath.length - 3);
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                await this.app.vault.createFolder(folderPath);
                const newNotePath = folderPath + '/' + this.noteBase + '.md';
                await this.renamePath(this.notePath, newNotePath);
                const moved = this.app.vault.getAbstractFileByPath(newNotePath);
                if (moved instanceof TFile) {
                    await this.app.workspace.getLeaf(false).openFile(moved, { active: true });
                }
            }
        }
    }

    // keywords: {{FOLDER_NAME}}, {{FOLDER_PATH}}, {{FOLDER_BRIEF}}, {{FOLDER_BRIEF_LIVE}}
    async expandContent(template: string) {
        const folderName = this.folderPath.split('/').pop();
        let content = template
            .replace(/{{FOLDER_NAME}}/g, folderName)
            .replace(/{{FOLDER_PATH}}/g, this.folderPath);
        if (content.includes('{{FOLDER_BRIEF}}')) {
            const folderBrief = new FolderBrief(this.app);
            const briefCards = await folderBrief.makeBriefCards(this.folderPath, this.notePath);
            content = content.replace('{{FOLDER_BRIEF}}', briefCards.getYamlCode());
        }
        if (content.includes('{{FOLDER_BRIEF_LIVE}}')) {
            const briefLiveCode = '\n```ccard\ntype: folder_brief_live\n```\n';
            content = content.replace('{{FOLDER_BRIEF_LIVE}}', briefLiveCode);
        }
        return content;
    }

    async getNoteFolderBriefPath(notePath: string) {
        if (this.isFolderNoteSync(notePath)) {
            return this.getNoteFolderPath(notePath);
        }
        return notePath.substring(0, notePath.lastIndexOf('/'));
    }

    // called after a folder was deleted (outside method only)
    async deleteFolder(pathToDel: string) {
        if (this.method == NoteFileMethod.Outside && !pathToDel.endsWith('.md')) {
            const note = this.app.vault.getAbstractFileByPath(pathToDel + '.md');
            if (note instanceof TFile) {
                // respects the user's "deleted files" setting (system trash / .trash / permanent)
                await this.app.fileManager.trashFile(note);
            }
        }
    }

    // rename through Obsidian so links get updated; never overwrite an existing file
    async renamePath(oldPath: string, newPath: string) {
        const file = this.app.vault.getAbstractFileByPath(oldPath);
        if (!file) return;
        if (this.app.vault.getAbstractFileByPath(newPath)) {
            console.warn(`Folder Note: not renaming ${oldPath} -> ${newPath}, target exists.`);
            return;
        }
        this.selfRenaming = true;
        try {
            await this.app.fileManager.renameFile(file, newPath);
        } finally {
            this.selfRenaming = false;
        }
    }

    async syncName(file: TAbstractFile, oldPath: string) {
        if (this.method == NoteFileMethod.Outside) {
            await this.syncNameOutside(file, oldPath);
        }
        else if (this.method == NoteFileMethod.Inside) {
            await this.syncNameInside(file, oldPath);
        }
    }

    async syncNameOutside(file: TAbstractFile, oldPath: string) {
        if (file instanceof TFolder) {
            // folder renamed: rename sibling note
            const oldNotePaths = this.getFolderNotePath(oldPath);
            const newNotePaths = this.getFolderNotePath(file.path);
            if (this.app.vault.getAbstractFileByPath(oldNotePaths[0]) instanceof TFile
                && oldNotePaths[0] != newNotePaths[0]) {
                await this.renamePath(oldNotePaths[0], newNotePaths[0]);
            }
        }
        else if (oldPath.endsWith('.md')) {
            // note renamed: rename sibling folder if it was a folder note
            const oldFolderPath = this.getNoteFolderPath(oldPath);
            if (this.app.vault.getAbstractFileByPath(oldFolderPath) instanceof TFolder
                && file.path.endsWith('.md')) {
                const newFolderPath = this.getNoteFolderPath(file.path);
                await this.renamePath(oldFolderPath, newFolderPath);
            }
        }
    }

    async syncNameInside(file: TAbstractFile, oldPath: string) {
        if (file instanceof TFolder) {
            // folder renamed: note inside still has the old name
            const oldNotePaths = this.getFolderNotePath(oldPath);
            const newNotePaths = this.getFolderNotePath(file.path);
            const oldNotePathNew = file.path + '/' + oldNotePaths[1] + '.md';
            if (this.app.vault.getAbstractFileByPath(oldNotePathNew) instanceof TFile
                && newNotePaths[0] != oldNotePathNew) {
                this.filesToRename.push(oldNotePathNew, newNotePaths[0]);
            }
        }
        else if (this.filesToRename.length == 0 && oldPath.endsWith('.md')) {
            // note renamed: rename the folder that contains it
            const oldBase = this.getFileBaseName(oldPath);
            const parts = oldPath.split('/');
            const wasFolderNote = parts.length >= 2 && parts[parts.length - 2] === oldBase;
            if (wasFolderNote && file.parent) {
                const oldFolderPath = this.getNoteFolderPath(oldPath);
                // only when the note stayed in the same folder (a rename, not a move)
                if (file.parent.path === oldFolderPath) {
                    const parentDir = oldFolderPath.substring(0, oldFolderPath.lastIndexOf('/'));
                    const newBase = this.getFileBaseName(file.path);
                    const newFolderPath = parentDir.length > 0 ? parentDir + '/' + newBase : newBase;
                    if (oldFolderPath != newFolderPath) {
                        this.filesToRename.push(oldFolderPath, newFolderPath);
                    }
                }
            }
        }

        // Obsidian fires one rename per child when a folder is renamed;
        // wait for that burst to finish, then do a single rename.
        if (!this.filesToRenameSet && this.filesToRename.length > 0) {
            this.filesToRenameSet = true;
            window.setTimeout(async () => {
                const [from, to] = this.filesToRename;
                this.filesToRename = [];
                this.filesToRenameSet = false;
                if (from && to) await this.renamePath(from, to);
            }, 500);
        }
    }
}
