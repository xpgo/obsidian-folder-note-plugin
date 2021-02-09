import {
	Plugin,
	MarkdownView,
	MarkdownPreviewRenderer,
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
} from 'obsidian';

import * as Yaml from 'yaml';
import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { ccardProcessor } from './ccard-block';

import { 
	FolderNotePluginSettings, 
	DEFAULT_SETTINGS, 
	FolderNoteSettingTab 
} from './settings';

// ------------------------------------------------------------
// FolderNotePlugin
// ------------------------------------------------------------

enum NoteFileMethod {
	Index, Inside, Outside,
}

export default class FolderNotePlugin extends Plugin {
	settings: FolderNotePluginSettings;
	folderNote: FolderNote;

	async onload() {
		console.log('Loading Folder Note plugin.');

		// load settings
		await this.loadSettings();
		
		// for ccard rendering
		MarkdownPreviewRenderer.registerPostProcessor(this.blockProcessor);

		// for rename event
		this.registerEvent(this.app.vault.on('rename', 
			(newPath, oldPath) => this.handleFileRename(newPath, oldPath)));

		// for settings
		this.addSettingTab(new FolderNoteSettingTab(this.app, this));

		// for file explorer click
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// get the folder path
			const elemTarget = (evt.target as Element);
			var folderElem = this.folderNote.setByFolderElement(elemTarget);

			// open the infor note
			if (this.folderNote.folderPath.length > 0) {
				// any key?
				var newKey = false;
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
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const editor = view.sourceMode.cmEditor;
					const activeFile = this.app.workspace.getActiveFile();
					// generate brief
					let folderBrief = new FolderBrief(this.app);
					let folderPath = await this.folderNote.getNoteFolderBriefPath(activeFile.path);
					let briefCards = await folderBrief.makeBriefCards(folderPath, activeFile.path);
					editor.replaceSelection(briefCards.getYamlCode(), "end");
				}
			},
			hotkeys: []
		});

		this.addCommand({
			id: 'note-to-folder',
			name: 'Make Current Note to Folder',
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const activeFile = this.app.workspace.getActiveFile();
					this.folderNote.setByNotePath(activeFile.path);
					await this.folderNote.newNoteFolder();
				}
			},
			hotkeys: []
		});
	}

	onunload() {
		console.log('Unloading Folder Note plugin');
		MarkdownPreviewRenderer.unregisterPostProcessor(this.blockProcessor)
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
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
		this.updateFolderNote();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateFolderNote();
	}

	// keep notefile name to be the folder name
	async handleFileRename(newPath: any, oldPath: any) {
		if (!this.settings.folderNoteAutoRename) return;
		this.folderNote.syncName(newPath, oldPath);
	}

	// form ccard code block
	blockProcessor: MarkdownPostProcessor = async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		// Assumption: One section always contains only the code block

		//Which Block should be replaced? -> Codeblocks
		const blockToReplace = el.querySelector('pre');
		if (!blockToReplace) return;

		// run processer
		let proc = new ccardProcessor(this.app);
		await proc.run(el, blockToReplace, this.folderNote);
	}
}
