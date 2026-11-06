import {
    Editor,
    Plugin,
    MarkdownView,
    TAbstractFile
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

    async onload() {
        console.log('Loading Folder Note plugin.');

        // load settings
        await this.loadSettings();
        
        // for ccard rendering
        this.registerMarkdownCodeBlockProcessor('ccard', async (source, el, ctx) => {
            // run processor
            let proc = new ccardProcessor(this.app);
            await proc.run(source, el, ctx, this.folderNote);
        });

        // sync file explorer when files/folders are created
        this.registerEvent(this.app.vault.on('create', () => {
            this.folderNote.syncFileExplorer();
        }));

        // for rename event
        this.registerEvent(this.app.vault.on('rename', 
            (file, oldPath) => this.handleFileRename(file, oldPath)));

        // for remove folder
        this.registerEvent(this.app.vault.on('delete', 
            (file) => this.handleFileDelete(file) ));

        // sync file explorer on layout ready and layout changes
        this.app.workspace.onLayoutReady(() => {
            this.folderNote.syncFileExplorer();
            this.folderNote.observeFileExplorer();
        });

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.folderNote.syncFileExplorer();
            this.folderNote.observeFileExplorer();
        }));

        // for settings
        this.addSettingTab(new FolderNoteSettingTab(this.app, this));

        // for file explorer click
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            if (!(evt.target instanceof Element)) return;
            // get the folder path
            const elemTarget = evt.target;
            const folderElem = this.folderNote.setByFolderElement(elemTarget);

            // open the info note
            if (folderElem && this.folderNote.folderPath.length > 0) {
                // any key?
                let newKey = false;
                if (this.settings.folderNoteKey == 'ctrl') {
                    newKey = (evt.ctrlKey || evt.metaKey);
                }
                else if (this.settings.folderNoteKey == 'alt') {
                    newKey = evt.altKey;
                }

                // open it
                this.folderNote.openFolderNote(folderElem, newKey);
            }
        });

        this.addCommand({
            id: 'insert-folder-brief',
            name: 'Insert Folder Brief',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const activeFile = view.file ?? this.app.workspace.getActiveFile();
                if (!activeFile) return;
                // generate brief
                let folderBrief = new FolderBrief(this.app);
                let folderPath = await this.folderNote.getNoteFolderBriefPath(activeFile.path);
                let briefCards = await folderBrief.makeBriefCards(folderPath, activeFile.path);
                editor.replaceSelection(briefCards.getYamlCode());
            },
            hotkeys: []
        });

        this.addCommand({
            id: 'note-to-folder',
            name: 'Make Current Note to Folder',
            callback: async () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                const activeFile = view?.file ?? this.app.workspace.getActiveFile();
                if (activeFile) {
                    this.folderNote.setByNotePath(activeFile.path);
                    await this.folderNote.newNoteFolder();
                }
            },
            hotkeys: []
        });
    }

    onunload() {
        console.log('Unloading Folder Note plugin');
        if (this.folderNote) {
            this.folderNote.cleanupFileExplorer();
        }
    }

    updateFolderNote() {
        if (this.folderNote) {
            this.folderNote.setMethod(this.settings.folderNoteType, this.settings.folderNoteName);
            this.folderNote.initContent = this.settings.folderNoteStrInit;
            this.folderNote.hideNoteFile = this.settings.folderNoteHide;
        } else {
            this.folderNote = new FolderNote(
                this.app, 
                this.settings.folderNoteType, 
                this.settings.folderNoteName);
            this.folderNote.initContent = this.settings.folderNoteStrInit;
            this.folderNote.hideNoteFile = this.settings.folderNoteHide;
        }
        this.folderNote.syncFileExplorer();
    }

    async loadSettings() {
        this.settings = Object.assign({}, FOLDER_NOTE_DEFAULT_SETTINGS, await this.loadData());
        this.updateFolderNote();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateFolderNote();
    }

    // keep notefile name to be the folder name
    async handleFileRename(file: TAbstractFile, oldPath: string) {
        if (this.settings.folderNoteAutoRename) {
            await this.folderNote.syncName(file, oldPath);
        }
        this.folderNote.syncFileExplorer();
    }

    // delete folder
    async handleFileDelete(file: TAbstractFile) {
        if (this.settings.folderDelete2Note) {
            await this.folderNote.deleteFolder(file);
        }
        this.folderNote.syncFileExplorer();
    }
}
