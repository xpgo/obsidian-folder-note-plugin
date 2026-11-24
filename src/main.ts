import {
    Plugin,
    TAbstractFile,
    TFile,
    debounce,
} from 'obsidian';

import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { ccardProcessor } from './ccard-block';

import {
    FolderNotePluginSettings,
    FOLDER_NOTE_DEFAULT_SETTINGS,
    FolderNoteSettingTab
} from './settings';

// ------------------------------------------------------------
// FolderNotePlugin
// ------------------------------------------------------------

export default class FolderNotePlugin extends Plugin {
    settings: FolderNotePluginSettings;
    folderNote: FolderNote;

    // file explorer containers we are already watching
    private observedEls = new WeakSet<HTMLElement>();
    private requestDecorate = debounce(() => this.decorateExplorers(), 50, true);

    async onload() {
        console.log('Loading Folder Note plugin.');

        await this.loadSettings();

        // ccard code block rendering
        this.registerMarkdownCodeBlockProcessor('ccard', async (source, el, ctx) => {
            const proc = new ccardProcessor(this.app);
            await proc.run(source, el, ctx, this.folderNote);
        });

        // vault events (only after the vault has finished indexing,
        // otherwise every file fires a 'create' on startup)
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(this.app.vault.on('rename',
                (file, oldPath) => this.handleFileRename(file, oldPath)));
            this.registerEvent(this.app.vault.on('delete',
                (file) => this.handleFileDelete(file)));
            this.registerEvent(this.app.vault.on('create', () => this.requestDecorate()));

            this.hookFileExplorers();
            this.registerEvent(this.app.workspace.on('layout-change', () => this.hookFileExplorers()));
        });

        this.addSettingTab(new FolderNoteSettingTab(this.app, this));

        // file explorer click
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            const target = evt.target as Element;
            if (!(target instanceof Element)) return;
            // ignore clicks on the collapse arrow so folding still works normally
            if (target.closest('.nav-folder-collapse-indicator, .collapse-icon')) return;

            const folderElem = this.folderNote.setByFolderElement(target);
            if (!folderElem || this.folderNote.folderPath.length == 0) return;

            let newKey = false;
            if (this.settings.folderNoteKey == 'ctrl') {
                newKey = (evt.ctrlKey || evt.metaKey);
            }
            else if (this.settings.folderNoteKey == 'alt') {
                newKey = evt.altKey;
            }
            this.folderNote.openFolderNote(folderElem, newKey);
        });

        this.addCommand({
            id: 'insert-folder-brief',
            name: 'Insert Folder Brief',
            editorCallback: async (editor, ctx) => {
                const activeFile = ctx.file;
                if (!activeFile) return;
                const folderBrief = new FolderBrief(this.app);
                const folderPath = await this.folderNote.getNoteFolderBriefPath(activeFile.path);
                const briefCards = await folderBrief.makeBriefCards(folderPath, activeFile.path);
                editor.replaceSelection(briefCards.getYamlCode());
            },
        });

        this.addCommand({
            id: 'note-to-folder',
            name: 'Make Current Note to Folder',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile || activeFile.extension !== 'md') return false;
                if (!checking) {
                    this.folderNote.setByNotePath(activeFile.path);
                    this.folderNote.newNoteFolder().then(() => this.requestDecorate());
                }
                return true;
            },
        });
    }

    onunload() {
        console.log('Unloading Folder Note plugin');
        // strip our classes so nothing stays hidden after disabling
        document.querySelectorAll('.is-folder-note').forEach(el => el.removeClass('is-folder-note'));
        document.querySelectorAll('.has-folder-note').forEach(el => el.removeClass('has-folder-note'));
    }

    updateFolderNote() {
        this.folderNote = new FolderNote(
            this.app,
            this.settings.folderNoteType,
            this.settings.folderNoteName);
        this.folderNote.initContent = this.settings.folderNoteStrInit;
        this.folderNote.hideNoteFile = this.settings.folderNoteHide;
    }

    async loadSettings() {
        // copy into a fresh object so the defaults are never mutated
        this.settings = Object.assign({}, FOLDER_NOTE_DEFAULT_SETTINGS, await this.loadData());
        this.updateFolderNote();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateFolderNote();
        this.requestDecorate();
    }

    // ------------------------------------------------------------
    // File explorer decoration
    //
    // Newer Obsidian versions render explorer items lazily, so hiding
    // a note only when its folder is clicked (the old approach) is not
    // enough. Instead we watch each explorer's DOM and re-apply the
    // classes whenever items are (re)rendered.
    // ------------------------------------------------------------

    hookFileExplorers() {
        for (const leaf of this.app.workspace.getLeavesOfType('file-explorer')) {
            const el = leaf.view.containerEl;
            if (this.observedEls.has(el)) continue;
            this.observedEls.add(el);
            const observer = new MutationObserver(() => this.requestDecorate());
            // our own changes only touch "class", which is not observed, so no feedback loop
            observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-path'] });
            this.register(() => observer.disconnect());
        }
        this.requestDecorate();
    }

    decorateExplorers() {
        const fn = this.folderNote;
        for (const leaf of this.app.workspace.getLeavesOfType('file-explorer')) {
            const root = leaf.view.containerEl;
            root.querySelectorAll<HTMLElement>('.nav-file-title[data-path]').forEach(el => {
                const path = el.getAttribute('data-path');
                el.toggleClass('is-folder-note', fn.hideNoteFile && fn.isFolderNoteSync(path));
            });
            root.querySelectorAll<HTMLElement>('.nav-folder-title[data-path]').forEach(el => {
                const path = el.getAttribute('data-path');
                el.toggleClass('has-folder-note', path !== '/' && fn.hasFolderNoteSync(path));
            });
        }
    }

    // ------------------------------------------------------------
    // Vault events
    // ------------------------------------------------------------

    async handleFileRename(file: TAbstractFile, oldPath: string) {
        this.requestDecorate();
        if (!this.settings.folderNoteAutoRename) return;
        if (this.folderNote.selfRenaming) return; // ignore renames we triggered
        await this.folderNote.syncName(file, oldPath);
        this.requestDecorate();
    }

    async handleFileDelete(file: TAbstractFile) {
        this.requestDecorate();
        if (!this.settings.folderDelete2Note) return;
        if (file instanceof TFile) return;
        await this.folderNote.deleteFolder(file.path);
    }
}
