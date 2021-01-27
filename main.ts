import { fstat } from 'fs';
import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, getLinkpath } from 'obsidian';

interface FolderNotePluginSettings {
	folderNoteHide: boolean;
	folderNoteName: string;
	folderNoteStrInit: string;
}

const DEFAULT_SETTINGS: FolderNotePluginSettings = {
	folderNoteHide: true,
	folderNoteName: '_about_',
	folderNoteStrInit: '# About {{FOLDER_NAME}}\n {{FOLDER_BRIEF}} \n'
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

			// open the infor note
			if (folderPath.length > 0) {

				// fix the polderPath
				var slashLast = folderPath.lastIndexOf('/');
				var folderPathLast = folderPath.substring(slashLast+1)
				if (folderPathLast != folderName) {
					folderPath = folderPath.substring(0, slashLast+1) + folderName;
				}

				var ctrlKey = (evt.ctrlKey || evt.metaKey);
				this.openFoldNote(folderElem, folderPath, ctrlKey);
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
				if (noteStrInit.contains('{{FOLDER_BRIEF}}')) {
					let folderBrief = await this.generateFolderBrief(folderElem, folderPath);
					noteStrInit = noteStrInit.replace('{{FOLDER_BRIEF}}', folderBrief);
				}
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
			const hideSetting = this.settings.folderNoteHide;
			folderElem.addClass('has-folder-note');
			folderElem.parentElement
				.querySelectorAll('div.nav-folder-children > div.nav-file > div.nav-file-title')
				.forEach(function (fileElem) {
					var fileNodeTitle = fileElem.firstElementChild.textContent;
					if (hideSetting && (fileNodeTitle == noteName)) {
						fileElem.addClass('is-folder-note');
					}
					else {
						fileElem.removeClass('is-folder-note');
					}
			});

			// show the note
			this.app.workspace.openLinkText(folderNotePath, '', false, { active: true });
		}
	}

	async generateFolderBrief(folderElem: Element, folderPath: string) {
		// set note name
		var noteFileName = this.settings.folderNoteName + '.md';
		var htmlSubs = '';

		// statistic
		let pathList = await this.app.vault.adapter.list(folderPath);
		const subFolderList = pathList.folders;
		const subFileList = pathList.files;

		// sub folders
		for (var i = 0; i < subFolderList.length; i++) {
			var htmlSubSect = '<div class="cute-card-view">\n';
			htmlSubSect += '<div class="thumb-color thumb-color-folder">Folder</div>\n';
			htmlSubSect += '<article>\n';
			// title
			var subFolderPath = subFolderList[i];
			var subFolderName = subFolderPath.split('/').pop();
			htmlSubSect += '<h1>' + subFolderName + '</h1>\n';
			// how many files
			let subPathList = await this.app.vault.adapter.list(subFolderPath);
			htmlSubSect += '<p> ' + subPathList.folders.length.toString() + ' folders, ';
			htmlSubSect += subPathList.files.length.toString() + ' notes</p>\n';
			// logo
			htmlSubSect +=  '<span> ' + subFolderPath + '</span>\n';
			// close
			htmlSubSect += '</article>\n</div>\n';
			htmlSubs += htmlSubSect;
		}

		// notes
		for (var i = 0; i < subFileList.length; i++) {
			var subFilePath = subFileList[i];
			var subFileName = subFilePath.split('/').pop();
			if (subFileName != noteFileName) {
				var htmlSubSect = '<div class="cute-card-view">\n';

				// image
				let content = await this.app.vault.adapter.read(subFilePath);
				// console.log(content);
				let regexImg = new RegExp('!\\[(.*?)\\]\\((.*?)\\)');
				var match = regexImg.exec(content);
				if (match != null) {
					htmlSubSect += '<div class="thumb" style="background-image: url(';
					var imageUrl = match[2];
					if (!imageUrl.startsWith('http')) {
						var headPath = folderPath;
						while(imageUrl.startsWith('../')) {
							imageUrl = imageUrl.substring(3);
							headPath = headPath.substring(0, headPath.lastIndexOf('/'))
						}
						imageUrl = headPath + '/' + imageUrl;
						imageUrl = this.app.vault.adapter.getResourcePath(imageUrl);
					}
					htmlSubSect += imageUrl
					htmlSubSect += ');"></div>\n'
				}
				else {
					htmlSubSect += '<div class="thumb-color thumb-color-note">Note</div>\n';
				}

				// title
				htmlSubSect += '<article>\n';
				var subFileBase = subFileName.substring(0, subFileName.length-3);
				htmlSubSect += '<a class="internal-link" href="' + subFileName + '"><h1>';
				htmlSubSect += subFileBase + '</h1></a>\n'
				// content?
				var contentBrief = '';
				let regexHead = new RegExp('^#{1,6}(?!#)(.*)[\r\n]', 'mg');
				while ((match = regexHead.exec(content)) !== null) {
					contentBrief += match[1] + ', ';
					if (contentBrief.length > 32) {
						break;
					}
				}
				if (contentBrief.length > 0) {
					htmlSubSect += '<p> ' + contentBrief + ' ... </p>\n';
				}
				else {
					htmlSubSect += '<p> No headings in the file. </p>\n';
				}
				// logo
				htmlSubSect +=  '<span> ' + subFilePath + '</span>\n';
				// close
				htmlSubSect += '</article>\n</div>\n';
				htmlSubs += htmlSubSect;
			}
		}

		// return
		var htmlSect = '';
		if (htmlSubs.length > 0) {
			htmlSect = '\n<div class="cute-card-band">\n' + htmlSubs + '</div>\n\n';
		}

		return htmlSect;
	}

}

// ------------------------------------------------------------
// Settings Tab
// ------------------------------------------------------------

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
			.setName('Hide Note')
			.setDesc('Hide the folder note file in the file explorer panel.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.folderNoteHide);
				toggle.onChange(async (value) => {
					this.plugin.settings.folderNoteHide = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Note Name')
			.setDesc('Set the name for folder note.')
			.addText(text => text
				.setValue(this.plugin.settings.folderNoteName)
				.onChange(async (value) => {
					// console.log('Secret: ' + value);
					this.plugin.settings.folderNoteName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Inital Content')
			.setDesc('Set the inital content for new folder note. {{FOLDER_NAME}} will be replaced with current folder name.')
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
