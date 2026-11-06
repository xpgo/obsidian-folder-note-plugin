import { App, TAbstractFile, TFile, TFolder } from "obsidian";
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
    isRenaming: boolean;
    // for file explorer DOM observation
    private explorerObserver: MutationObserver | null = null;
    private observedElements: WeakSet<Element> = new WeakSet();
    private syncScheduled: boolean = false;

    constructor(app: App, methodStr: string, indexBase: string) {
        this.app = app;
        this.setMethod(methodStr, indexBase);
        this.emptyPath();
        // for rename
        this.filesToRename = [];
        this.filesToRenameSet = false;
        this.isRenaming = false;
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
        if (folderPath.length == 0 || folderPath === '/') return;

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
    setByFolderElement(folderItemEl: Element): Element | null {
        this.emptyPath();
        if (!folderItemEl) return null;

        // Ignore clicks directly on the collapse arrow/chevron so users can expand/collapse without opening the note
        if (folderItemEl.closest('.nav-folder-collapse-indicator, .collapse-icon')) {
            return null;
        }

        const folderElem = folderItemEl.closest('.nav-folder-title');
        if (!folderElem) {
            return null;
        }

        const folderPath = folderElem.getAttribute('data-path') ?? '';
        if (!folderPath || folderPath === '/') {
            return null;
        }

        this.setByFolderPath(folderPath);
        return folderElem;
    }

    // get file base name
    getFileBaseName(filePath: string) {
        var baseName = filePath.split('/').pop() || '';
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
            noteBaseName = folderPath.split('/').pop() || '';
            if (this.method == NoteFileMethod.Inside) {
                notePath = folderPath + '/' + noteBaseName + '.md';
            }
            else if (this.method == NoteFileMethod.Outside) {
                notePath = folderPath + '.md';
            }
        }
        return [notePath, noteBaseName];
    }

    // get note folder, make sure it is a note file
    getNoteFolderPath(notePath: string) {
        var folderPath = '';
        if (this.method == NoteFileMethod.Index || this.method == NoteFileMethod.Inside) {
            const lastSlash = notePath.lastIndexOf('/');
            folderPath = lastSlash >= 0 ? notePath.substring(0, lastSlash) : '';
        }
        else if (this.method == NoteFileMethod.Outside) {
            folderPath = notePath.substring(0, notePath.length - 3);
        }
        return folderPath;
    }

    // synchronous check using Obsidian's in-memory Vault cache
    isFolderNoteSync(notePath: string): boolean {
        if (!notePath.endsWith('.md')) return false;
        const parts = notePath.split('/');

        if (this.method == NoteFileMethod.Index) {
            return parts.length >= 2 && parts[parts.length - 1] === `${this.indexBase}.md`;
        }
        else if (this.method == NoteFileMethod.Inside) {
            const noteBaseName = this.getFileBaseName(notePath);
            return parts.length >= 2 &&
                parts[parts.length - 1] === `${noteBaseName}.md` &&
                parts[parts.length - 2] === noteBaseName;
        }
        else if (this.method == NoteFileMethod.Outside) {
            const folderPath = notePath.substring(0, notePath.length - 3);
            const abstractFile = this.app.vault.getAbstractFileByPath(folderPath);
            return abstractFile instanceof TFolder;
        }
        return false;
    }

    // check if it is folder note name
    async isFolderNotePath(notePath: string) {
        return this.isFolderNote(notePath);
    }

    // check is folder note file?
    async isFolderNote(notePath: string) {
        if (!notePath.endsWith('.md')) return false;
        if (this.isFolderNoteSync(notePath)) return true;

        if (this.method == NoteFileMethod.Outside) {
            var folderPath = notePath.substring(0, notePath.length - 3);
            return await this.app.vault.adapter.exists(folderPath);
        }
        return false;
    }

    // open note file
    async openFolderNote(folderElem: Element, doCreate: boolean) {
        let noteFile = this.app.vault.getAbstractFileByPath(this.notePath);
        let folderNoteExists = noteFile instanceof TFile;
        if (!folderNoteExists) {
            folderNoteExists = await this.app.vault.adapter.exists(this.notePath);
        }

        if (!folderNoteExists && doCreate) {
            await this.newFolderNote();
            folderNoteExists = true;
        }

        // open the note
        if (folderNoteExists) {
            this.hideFolderNote(folderElem);
            this.syncFileExplorer();
            // show the note
            await this.app.workspace.openLinkText(this.notePath, '', false, { active: true });
        } 
        else if (folderElem.hasClass('has-folder-note')) {
            folderElem.removeClass('has-folder-note');
        }
    }

    // create folder note
    async newFolderNote() {
        let noteInitContent = await this.expandContent(this.initContent);
        const existing = this.app.vault.getAbstractFileByPath(this.notePath);
        if (!existing) {
            try {
                await this.app.vault.create(this.notePath, noteInitContent);
            } catch {
                await this.app.vault.adapter.write(this.notePath, noteInitContent);
            }
        }
    }

    // create folder by note
    async newNoteFolder() {
        if (!this.notePath) return;
        const noteFile = this.app.vault.getAbstractFileByPath(this.notePath);

        if (this.method == NoteFileMethod.Outside) {
            let folderExists = this.app.vault.getAbstractFileByPath(this.folderPath) instanceof TFolder ||
                await this.app.vault.adapter.exists(this.folderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(this.folderPath);
            }
        }
        else if (this.method == NoteFileMethod.Inside) {
            if (await this.isFolderNote(this.notePath)) return;
            var folderPath = this.notePath.substring(0, this.notePath.length - 3);
            let folderExists = this.app.vault.getAbstractFileByPath(folderPath) instanceof TFolder ||
                await this.app.vault.adapter.exists(folderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(folderPath);
                var newNotePath = folderPath + '/' + this.noteBase + '.md';
                if (noteFile instanceof TFile) {
                    await this.app.fileManager.renameFile(noteFile, newNotePath);
                } else {
                    await this.app.vault.adapter.rename(this.notePath, newNotePath);
                }
                await this.app.workspace.openLinkText(newNotePath, '', false, { active: true });
            }
        }
        else if (this.method == NoteFileMethod.Index) {
            if (await this.isFolderNote(this.notePath)) return;
            var folderPath = this.notePath.substring(0, this.notePath.length - 3);
            let folderExists = this.app.vault.getAbstractFileByPath(folderPath) instanceof TFolder ||
                await this.app.vault.adapter.exists(folderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(folderPath);
                var newNotePath = folderPath + '/' + this.indexBase + '.md';
                if (noteFile instanceof TFile) {
                    await this.app.fileManager.renameFile(noteFile, newNotePath);
                } else {
                    await this.app.vault.adapter.rename(this.notePath, newNotePath);
                }
                await this.app.workspace.openLinkText(newNotePath, '', false, { active: true });
            }
        }
        this.syncFileExplorer();
    }

    // expand content template
    async expandContent(template: string) {
        // keyword: {{FOLDER_NAME}}, {{FOLDER_PATH}}
        var folderName = this.folderPath.split('/').pop() || '';
        var content = template
            .replace(/{{FOLDER_NAME}}/g, folderName)
            .replace(/{{FOLDER_PATH}}/g, this.folderPath);
        // keyword: {{FOLDER_BRIEF}}
        if (content.contains('{{FOLDER_BRIEF}}')) {
            let folderBrief = new FolderBrief(this.app);
            let briefCards = await folderBrief.makeBriefCards(this.folderPath, this.notePath);
            content = content.replace(/{{FOLDER_BRIEF}}/g, briefCards.getYamlCode());
        }
        // keyword: {{FOLDER_BRIEF_LIVE}}
        if (content.contains('{{FOLDER_BRIEF_LIVE}}')) {
            const briefLiveCode = '\n```ccard\ntype: folder_brief_live\n```\n';
            content = content.replace(/{{FOLDER_BRIEF_LIVE}}/g, briefLiveCode);
        }
        return content;
    }

    // hide folder note for a specific clicked folder element
    hideFolderNote(folderElem: Element) {
        const hideSetting = this.hideNoteFile;
        folderElem.addClass('has-folder-note');
        const parentElem = folderElem.parentElement;
        if (!parentElem) return;

        const targetNotePath = this.notePath;
        const container = (this.method == NoteFileMethod.Outside)
            ? parentElem.parentElement
            : parentElem;
        if (!container) return;

        container.querySelectorAll('div.nav-file-title[data-path]').forEach((fileElem) => {
            const dataPath = fileElem.getAttribute('data-path');
            if (dataPath === targetNotePath) {
                fileElem.toggleClass('is-folder-note', hideSetting);
                if (fileElem.parentElement?.hasClass('nav-file')) {
                    fileElem.parentElement.toggleClass('is-folder-note', hideSetting);
                }
            }
        });
    }

    // synchronize has-folder-note and is-folder-note across the File Explorer DOM
    syncFileExplorer() {
        // 1. Update folder title elements
        document.querySelectorAll('div.nav-folder-title[data-path]').forEach((folderTitleEl) => {
            const folderPath = folderTitleEl.getAttribute('data-path');
            if (!folderPath || folderPath === '/') return;
            const [expectedNotePath] = this.getFolderNotePath(folderPath);
            const hasNote = this.app.vault.getAbstractFileByPath(expectedNotePath) instanceof TFile;
            folderTitleEl.toggleClass('has-folder-note', hasNote);
        });

        // 2. Update file title elements
        document.querySelectorAll('div.nav-file-title[data-path]').forEach((fileTitleEl) => {
            const filePath = fileTitleEl.getAttribute('data-path');
            if (!filePath) return;
            const shouldHide = this.hideNoteFile && this.isFolderNoteSync(filePath);
            fileTitleEl.toggleClass('is-folder-note', shouldHide);
            if (fileTitleEl.parentElement?.hasClass('nav-file')) {
                fileTitleEl.parentElement.toggleClass('is-folder-note', shouldHide);
            }
        });
    }

    // observe File Explorer DOM mutations (for virtualized rendering / folder expansion)
    observeFileExplorer() {
        if (!this.explorerObserver) {
            this.explorerObserver = new MutationObserver(() => {
                if (!this.syncScheduled) {
                    this.syncScheduled = true;
                    window.requestAnimationFrame(() => {
                        this.syncScheduled = false;
                        this.syncFileExplorer();
                    });
                }
            });
        }

        const leaves = this.app.workspace.getLeavesOfType('file-explorer');
        for (const leaf of leaves) {
            const containerEl = leaf.view?.containerEl;
            if (containerEl && !this.observedElements.has(containerEl)) {
                this.explorerObserver.observe(containerEl, {
                    childList: true,
                    subtree: true,
                });
                this.observedElements.add(containerEl);
            }
        }
    }

    // clean up observer and classes on plugin unload
    cleanupFileExplorer() {
        if (this.explorerObserver) {
            this.explorerObserver.disconnect();
            this.explorerObserver = null;
        }
        this.observedElements = new WeakSet();
        document.querySelectorAll('.has-folder-note').forEach((el) => el.removeClass('has-folder-note'));
        document.querySelectorAll('.is-folder-note').forEach((el) => el.removeClass('is-folder-note'));
    }
    
    // get the file brief path
    async getNoteFolderBriefPath(notePath: string) {
        var folderPath = '';
        let isFN = await this.isFolderNote(notePath);
        if (isFN) {
            folderPath = this.getNoteFolderPath(notePath);
        }
        else {
            const lastSlash = notePath.lastIndexOf('/');
            folderPath = lastSlash >= 0 ? notePath.substring(0, lastSlash) : '/';
        }
        return folderPath;
    }

    // delete a folder 
    async deleteFolder(fileOrPath: TAbstractFile | string) {
        const pathToDel = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
        const isFolder = typeof fileOrPath === 'string'
            ? !pathToDel.endsWith('.md')
            : fileOrPath instanceof TFolder;

        if (this.method == NoteFileMethod.Outside && isFolder) {
            let myNotePath = pathToDel + '.md';
            const noteFile = this.app.vault.getAbstractFileByPath(myNotePath);
            if (noteFile instanceof TFile) {
                await this.app.vault.trash(noteFile, false);
            } else if (await this.app.vault.adapter.exists(myNotePath)) {
                await this.app.vault.adapter.trashLocal(myNotePath);
            }
        }
    }

    // sync folder / note name
    async syncName(file: TAbstractFile, oldPath: string) {
        if (this.isRenaming) return;
        this.isRenaming = true;
        try {
            if (this.method == NoteFileMethod.Outside) {
                await this.syncNameOutside(file, oldPath);
            }
            else if (this.method == NoteFileMethod.Inside) {
                await this.syncNameInside(file, oldPath);
            }
        } finally {
            this.isRenaming = false;
        }
    }

    // sync folder / note name for outside
    async syncNameOutside(file: TAbstractFile, oldPath: string) {
        if (file instanceof TFolder) {
            // changing folder name
            var oldNotePaths = this.getFolderNotePath(oldPath);
            var newNotePaths = this.getFolderNotePath(file.path);
            if (oldNotePaths[0] !== newNotePaths[0]) {
                const noteFile = this.app.vault.getAbstractFileByPath(oldNotePaths[0]);
                if (noteFile instanceof TFile) {
                    await this.app.fileManager.renameFile(noteFile, newNotePaths[0]);
                } else if (await this.app.vault.adapter.exists(oldNotePaths[0])) {
                    await this.app.vault.adapter.rename(oldNotePaths[0], newNotePaths[0]);
                }
            }
        }
        else if (file instanceof TFile && file.extension === 'md') {
            // changing note name
            var oldFolderPath = this.getNoteFolderPath(oldPath);
            var newFolderPath = this.getNoteFolderPath(file.path);
            if (oldFolderPath !== newFolderPath) {
                const folder = this.app.vault.getAbstractFileByPath(oldFolderPath);
                if (folder instanceof TFolder) {
                    await this.app.fileManager.renameFile(folder, newFolderPath);
                } else if (await this.app.vault.adapter.exists(oldFolderPath)) {
                    await this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
                }
            }
        }
    }

    // sync folder / note name for inside case
    async syncNameInside(file: TAbstractFile, oldPath: string) {
        if (file instanceof TFolder) {
            // changing folder name: the note inside now lives at `${file.path}/${oldFolderName}.md`
            var oldNotePaths = this.getFolderNotePath(oldPath);
            var newNotePaths = this.getFolderNotePath(file.path);
            var oldNotePathNew = file.path + '/' + oldNotePaths[1] + '.md';
            if (newNotePaths[0] !== oldNotePathNew) {
                const noteFile = this.app.vault.getAbstractFileByPath(oldNotePathNew);
                if (noteFile instanceof TFile) {
                    await this.app.fileManager.renameFile(noteFile, newNotePaths[0]);
                } else if (await this.app.vault.adapter.exists(oldNotePathNew)) {
                    await this.app.vault.adapter.rename(oldNotePathNew, newNotePaths[0]);
                }
            }
        }
        else if (file instanceof TFile && file.extension === 'md') {
            // Check if the note was previously an Inside folder note
            const oldParts = oldPath.split('/');
            if (oldParts.length < 2) return;
            const oldFileName = oldParts[oldParts.length - 1];
            const oldFolderName = oldParts[oldParts.length - 2];
            if (oldFileName !== `${oldFolderName}.md`) return;

            const oldFolderPath = oldParts.slice(0, -1).join('/');
            // Ensure the note is still inside that same folder (not just a child event from a folder rename)
            if (!file.parent || file.parent.path !== oldFolderPath) return;

            const parentDir = (file.parent.parent && file.parent.parent.path !== '/')
                ? file.parent.parent.path + '/'
                : '';
            const newFolderPath = parentDir + file.basename;
            if (oldFolderPath !== newFolderPath) {
                await this.app.fileManager.renameFile(file.parent, newFolderPath);
            }
        }
    }
}
