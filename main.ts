import { fstat } from 'fs';
import { 
	App, 
	Modal, 
	Notice, 
	Plugin, 
	MarkdownView, 
	PluginSettingTab, 
	Setting, 
	getLinkpath } from 'obsidian';

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

		this.addCommand({
            id: 'insert-folder-overview',
            name: 'Insert Folder Overview',
            callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const editor = view.sourceMode.cmEditor;
					const activeFile = this.app.workspace.getActiveFile();
					var folderPath = activeFile.parent.path;
					let folderBrief = await this.generateFolderBrief(folderPath);
					editor.replaceSelection(folderBrief, "end");
				}
			},
            hotkeys: []
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
		var folderNotePath = folderPath + '/' + noteName + '.md';

		// check note file
		let hasFolderNote = await this.app.vault.adapter.exists(folderNotePath);
		var showFolderNote = hasFolderNote;
		if (!hasFolderNote) {
		    if(doCreate) {
				let noteStrInit = await this.expandContent(folderPath, 
					this.settings.folderNoteStrInit);
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

	// expand content template
	async expandContent(folderPath: string, template: string) {
		// keyword: {{FOLDER_NAME}}
		var folderName = folderPath.split('/').pop();
		var content = template.replace('{{FOLDER_NAME}}', folderName);
		// keyword: {{FOLDER_BRIEF}}
		if (content.contains('{{FOLDER_BRIEF}}')) {
			let folderBrief = await this.generateFolderBrief(folderPath);
			content = content.replace('{{FOLDER_BRIEF}}', folderBrief);
		}
		return content;
	}

	// get folder note name
	getFolderNoteName(folderPath: string) {
		var folderName = folderPath.split('/').pop();
		var noteName = this.settings.folderNoteName + '.md';
		noteName = noteName.replace('{{FOLDER_NAME}}', folderName);
		return noteName;
	}

	// generate folder brief
	async generateFolderBrief(folderPath: string) {
		// set note name
		let cardBlock = new CardBlock();

		// children statistic
		let pathList = await this.app.vault.adapter.list(folderPath);
		const subFolderList = pathList.folders;
		const subFileList = pathList.files;

		// sub folders
		for (var i = 0; i < subFolderList.length; i++) {
			var subFolderPath = subFolderList[i];
			let folderCard = await this.makeFolderCard(folderPath, subFolderPath);
			cardBlock.addCard(folderCard);
		}

		// notes
		var noteFileName = this.getFolderNoteName(folderPath)
		for (var i = 0; i < subFileList.length; i++) {
			var subFilePath = subFileList[i];
			var subFileName = subFilePath.split('/').pop();
			if (subFileName != noteFileName) {
				let noteCard = await this.makeNoteCard(folderPath, subFilePath);
				cardBlock.addCard(noteCard);
			}
		}

		// return
		var htmlSect = '';
		if (cardBlock.getCardNum() > 0) {
			htmlSect = cardBlock.getHtmlCode();
		}

		return htmlSect;
	}

	// make folder brief card
	async makeFolderCard(folderPath: string, subFolderPath: string) {
		// title
		var subFolderName = subFolderPath.split('/').pop();
		let card = new CardItem(subFolderName, CardStyle.Folder);
		// description
		let subPathList = await this.app.vault.adapter.list(subFolderPath);
		var folderBrief = 'Contains ';
		folderBrief += subPathList.folders.length.toString() + ' folders, ';
		folderBrief += subPathList.files.length.toString() + ' notes.';
		card.setDesc(folderBrief);
		// title link?
		var subFolderNoteName = '';
		var noteName = this.getFolderNoteName(subFolderPath);
		const subFileList = subPathList.files; 
		for (var i = 0; i < subFileList.length; i++) {
			var subFilePath = subFileList[i];
			if (subFilePath.endsWith(noteName)) {
				subFolderNoteName = subFolderPath + '/' + noteName;
				break;
			}
		}
		if (subFolderNoteName.length > 0) {
			card.setTitleLink(subFolderNoteName);
		}
		// footnote
		card.setFootnote(subFolderPath);
		return card;
	}


	// make note brief card
	async makeNoteCard(folderPath: string, notePath: string) {
		// titile
		var noteName = notePath.split('/').pop();
		var noteTitle = noteName.substring(0, noteName.length-3);
		let card = new CardItem(noteTitle, CardStyle.Note);
		card.setTitleLink(notePath);
		// read content
		let content = await this.app.vault.adapter.read(notePath);
		// console.log(content);
		let regexImg = new RegExp('!\\[(.*?)\\]\\((.*?)\\)');
		var match = regexImg.exec(content);
		if (match != null) {
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
			card.setImageLink(imageUrl);
		}
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
			card.setDesc(contentBrief);
		}
		// foot note
		card.setFootnote(notePath);
		// return
		return card;
	}

}


// ------------------------------------------------------------
// Card block
// ------------------------------------------------------------

enum CardStyle { 
	Folder, Note, Image,
}

class CardBlock {
	cards: CardItem[];

	constructor() {
		this.cards = [];
	}

	addCard(card: CardItem) {
		this.cards.push(card);
	}

	getCardNum() {
		return this.cards.length;
	}

	getHtmlCode() {
		var htmlSec = '\n<div class="cute-card-band">\n';
		for (var i in this.cards) {
			htmlSec += this.cards[i].getHtmlCode();
		}
		htmlSec += '</div>\n\n';
		return htmlSec;
	}
}

class CardItem {
	title: string;
	description: string;
	footnote: string;
	cardStyle: CardStyle;
	titleLink: string;
	imageLink: string;

	constructor(title: string, style: CardStyle) {
		this.title = title;
		this.cardStyle = style;
		this.description = "No descrition.";
		this.footnote = "";
	}

	setImageLink(linkUrl: string) {
		this.imageLink = linkUrl;
	}

	setTitleLink(linkUrl: string) {
		this.titleLink = linkUrl;
	}

	setDesc(desc: string) {
		this.description = desc;
	}

	setFootnote(footnote: string) {
		this.footnote = footnote;
	}

	getHtmlCode() {
		var htmlSec = '<div class="cute-card-view">\n';
		// Heading
		if (this.imageLink) {
			this.cardStyle = CardStyle.Image;
			htmlSec += '<div class="thumb" style="background-image: url(';
			htmlSec += this.imageLink;
			htmlSec += ');"></div>\n'
		}
		else if (this.cardStyle == CardStyle.Folder) {
			htmlSec += '<div class="thumb-color thumb-color-folder">';
			htmlSec += 'Folder';
			htmlSec += '</div>\n';
		}
		else if (this.cardStyle == CardStyle.Note) {
			htmlSec += '<div class="thumb-color thumb-color-note">';
			htmlSec += 'Note';
			htmlSec += '</div>\n';
		}
		// Title
		htmlSec += '<article>\n';
		if (this.titleLink) {
			if (this.titleLink.endsWith('.md')) {
				htmlSec += '<a class="internal-link" href="';
			} 
			else {
				htmlSec += '<a href="';
			}
			htmlSec += this.titleLink + '"><h1>' + this.title + '</h1></a>\n'
		}
		else {
			htmlSec += '<h1>' + this.title + '</h1>\n';
		}
		// description
		htmlSec += '<p>' + this.description + '</p>\n';
		// footnote
		htmlSec +=  '<span> ' + this.footnote + '</span>\n';
		// close
		htmlSec += '</article>\n</div>\n';
		return htmlSec;
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
