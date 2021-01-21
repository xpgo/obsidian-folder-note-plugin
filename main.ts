import { fstat } from 'fs';
import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, getLinkpath } from 'obsidian';

interface FolderNotePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: FolderNotePluginSettings = {
	mySetting: 'default'
}

export default class FolderNotePlugin extends Plugin {
	settings: FolderNotePluginSettings;

	async onload() {
		// console.log('loading Folder Note plugin');

		await this.loadSettings();

		// this.addRibbonIcon('dice', 'Folder Note Plugin', () => {
		// 	new Notice('Auto generate brief description for folder note!');
		// });

		this.registerDomEvent(document, 'click', (evt: MouseEvent) =>  {
			// get the folder path
			var folderPath = '';
			const elemTarget = (evt.target as Element);
			if (elemTarget.className == 'nav-folder-title') {
				folderPath = elemTarget.attributes.getNamedItem('data-path').textContent;
			}
			else if (elemTarget.className == 'nav-folder-title-content') {
				const elemTitle = elemTarget.parentElement;
				folderPath = elemTitle.attributes.getNamedItem('data-path').textContent;
			}

			// open the infor note
			if (folderPath.length > 0) {
				if (evt.ctrlKey) {
					this.createFoldNote(folderPath);
				} else {
					this.openFoldNote(folderPath);
				}
				// console.log('note link:', evt.ctrlKey);
			}
		});

		// interval func
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		// console.log('unloading Folder Note plugin');
	}

	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async openFoldNote(folderPath: string) {
		const noteName = '_about_'
		var folderNotePath = folderPath + '/' + noteName + '.md';
		let hasFolderNote = await this.app.vault.adapter.exists(folderNotePath);
		if (hasFolderNote) {
			var linkPath = getLinkpath(folderNotePath);
			// console.log('note link:', linkPath);
			this.app.workspace.openLinkText(noteName, linkPath, false, { active: true });
		} 
	}

	async createFoldNote(folderPath: string) {
		const noteName = '_about_'
		var folderNotePath = folderPath + '/' + noteName + '.md';
		var linkPath = getLinkpath(folderNotePath);
		let hasFolderNote = await this.app.vault.adapter.exists(folderNotePath);
		if (!hasFolderNote) {
			const noteStrInit = '# About the folder\n';
			await this.app.vault.adapter.write(folderNotePath, noteStrInit);
		}
		this.app.workspace.openLinkText(noteName, linkPath, false, { active: true });
	}
}
