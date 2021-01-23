import { fstat } from 'fs';
import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, getLinkpath } from 'obsidian';

interface FolderNotePluginSettings {
	folderNoteName: string;
	folderNoteStrInit: string;
}

const DEFAULT_SETTINGS: FolderNotePluginSettings = {
	folderNoteName: '_about_',
	folderNoteStrInit: '# About {{FOLDER_NAME}}\n'
}

export default class FolderNotePlugin extends Plugin {
	settings: FolderNotePluginSettings;

	async onload() {
		console.log('Loading Folder Note plugin');

		await this.loadSettings();

		// this.addRibbonIcon('dice', 'Folder Note Plugin', () => {
		// 	new Notice('Auto generate brief description for folder note!');
		// });

		this.addSettingTab(new FolderNoteSettingTab(this.app, this));

		this.registerDomEvent(document, 'click', (evt: MouseEvent) =>  {
			// get the folder path
			var folderPath = '';
			var folderName = '';
			const elemTarget = (evt.target as Element);
			var className = elemTarget.className.toString();
			var folderElem = elemTarget;
			if (className.contains('nav-folder-title-content')) {
				folderName = folderElem.getText();
				folderElem = elemTarget.parentElement;
				folderPath = folderElem.attributes.getNamedItem('data-path').textContent;
			}
			else if (className.contains('nav-folder-title')) {
				folderPath = elemTarget.attributes.getNamedItem('data-path').textContent;
				folderName = elemTarget.lastElementChild.getText();
			}

			// fix the polderPath
			if (!(folderPath.endsWith(folderName))) {
				var slashLast = folderPath.lastIndexOf('/');
				folderPath = folderPath.substring(0, slashLast+1) + folderName;
			}

			// open the infor note
			if (folderPath.length > 0) {
				this.openFoldNote(folderElem, folderPath, evt.ctrlKey);
			}
		});

		// interval func - keep it, maybe used for auto generation
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log('Unloading Folder Note plugin');
	}

	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async openFoldNote(folderElem: Element, folderPath: string, doCreate: boolean) {
		// set note name
		var noteName = this.settings.folderNoteName;
		var folderName = folderPath.split('/').pop();
		noteName = noteName.replace('{{FOLDER_NAME}}', folderName);

		// check note file
		var folderNotePath = folderPath + '/' + noteName + '.md';
		let hasFolderNote = await this.app.vault.adapter.exists(folderNotePath);
		var showFolderNote = hasFolderNote;
		if (!hasFolderNote) {
		    if(doCreate) {
				var noteStrInit = this.settings.folderNoteStrInit;
				noteStrInit = noteStrInit.replace('{{FOLDER_NAME}}', folderName);
				await this.app.vault.adapter.write(folderNotePath, noteStrInit);
				showFolderNote = true;
			}
			else if (folderElem.hasClass('has-folder-note')) {
				folderElem.removeClass('has-folder-note');
			}
		}

		// show the note
		if (showFolderNote) {
			// modify the element
			folderElem.addClass('has-folder-note');
			folderElem.parentElement
				.querySelectorAll('div.nav-folder-children > div.nav-file > div.nav-file-title')
				.forEach(function (fileElem) {
					// console.log('fileElem:', fileElem);
					let fileDataPath = fileElem.attributes.getNamedItem('data-path').textContent;
					if (fileDataPath.endsWith(folderNotePath)) {
						fileElem.addClass('is-folder-note');
					}
			});

			// show the note
			this.app.workspace.openLinkText(folderNotePath, '', false, { active: true });
		}
	}
}

class FolderNoteSettingTab extends PluginSettingTab {
	plugin: FolderNotePlugin;

	constructor(app: App, plugin: FolderNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Folder Note Plugin: Settings.'});

		new Setting(containerEl)
			.setName('Note Name')
			.setDesc('Set the name for folder note. {{FOLDER_NAME}} will be replaced with current folder name.')
			.addText(text => text
				.setValue(this.plugin.settings.folderNoteName)
				.onChange(async (value) => {
					// console.log('Secret: ' + value);
					this.plugin.settings.folderNoteName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Inital Content')
			.setDesc('Set the inital content for new folder note.')
			.addTextArea(text => {
                    text
                        .setPlaceholder('About the folder.')
                        .setValue(this.plugin.settings.folderNoteStrInit)
                        .onChange(async (value) => {
                            try {
                                this.plugin.settings.folderNoteStrInit = value;
                                await this.plugin.saveSettings();
                            } catch (e) {
                                return false;
                            }
                        })
                    text.inputEl.rows = 8;
                    text.inputEl.cols = 50;
                }
            );
	}
}
