import { fstat } from 'fs';
import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	MarkdownRenderer,
	MarkdownView,
	MarkdownPreviewRenderer,
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	Setting,
	getLinkpath
} from 'obsidian';
import * as Yaml from 'yaml';

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
	folderNoteNameVar: boolean;

	async onload() {
		console.log('Loading Folder Note plugin');

		this.folderNoteNameVar = false;
		await this.loadSettings();

		// this.addRibbonIcon('dice', 'Folder Note Plugin', () => {
		// 	new Notice('Auto generate brief description for folder note!');
		// });
		MarkdownPreviewRenderer.registerPostProcessor(this.ccardProcessor);
		this.registerEvent(this.app.vault.on('rename', (newPath, oldPath) => this.handleFileRename(newPath, oldPath)));

		this.addSettingTab(new FolderNoteSettingTab(this.app, this));

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
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
				var folderPathLast = folderPath.substring(slashLast + 1)
				if (folderPathLast != folderName) {
					folderPath = folderPath.substring(0, slashLast + 1) + folderName;
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
					let briefCards = await this.makeOverviewCards(folderPath);
					var folderBrief = briefCards.getHtmlCode();
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
		MarkdownPreviewRenderer.unregisterPostProcessor(this.ccardProcessor)
	}

	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
		this.folderNoteNameVar = this.settings.folderNoteName.contains('{{FOLDER_NAME}}');
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.folderNoteNameVar = this.settings.folderNoteName.contains('{{FOLDER_NAME}}');
	}

	async openFoldNote(folderElem: Element, folderPath: string, doCreate: boolean) {
		// set note name
		var noteBaseName = this.getFolderNoteBaseName(folderPath);
		var folderNotePath = folderPath + '/' + noteBaseName + '.md';

		// check note file
		let hasFolderNote = await this.app.vault.adapter.exists(folderNotePath);
		var showFolderNote = hasFolderNote;
		if (!hasFolderNote) {
			if (doCreate) {
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
					if (hideSetting && (fileNodeTitle == noteBaseName)) {
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
			let briefCards = await this.makeOverviewCards(folderPath);
			var folderBrief = briefCards.getHtmlCode()
			content = content.replace('{{FOLDER_BRIEF}}', folderBrief);
		}
		return content;
	}

	// get folder note name
	getFolderNoteBaseName(folderPath: string) {
		var noteBaseName = this.settings.folderNoteName;
		if (this.folderNoteNameVar) {
			var folderName = folderPath.split('/').pop();
			noteBaseName = noteBaseName.replace('{{FOLDER_NAME}}', folderName);
		}
		return noteBaseName;
	}

	// generate folder overview
	async makeOverviewCards(folderPath: string) {
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
		var noteFileName = this.getFolderNoteBaseName(folderPath) + '.md';
		for (var i = 0; i < subFileList.length; i++) {
			var subFilePath = subFileList[i];
			var subFileName = subFilePath.split('/').pop();
			if (subFileName != noteFileName) {
				let noteCard = await this.makeNoteCard(folderPath, subFilePath);
				cardBlock.addCard(noteCard);
			}
		}

		// return
		return cardBlock;
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
		card.setAbstract(folderBrief);
		// title link?
		var subFolderNoteName = '';
		var noteName = this.getFolderNoteBaseName(subFolderPath) + '.md';
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
		var noteTitle = noteName.substring(0, noteName.length - 3);
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
				while (imageUrl.startsWith('../')) {
					imageUrl = imageUrl.substring(3);
					headPath = headPath.substring(0, headPath.lastIndexOf('/'))
				}
				imageUrl = headPath + '/' + imageUrl;
				imageUrl = this.app.vault.adapter.getResourcePath(imageUrl);
			}
			card.setHeadImage(imageUrl);
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
			card.setAbstract(contentBrief);
		}
		// foot note
		card.setFootnote(notePath);
		// return
		return card;
	}

	// keep notefile name to be the folder name
	handleFileRename(newPath: any, oldPath: any) {
		if (this.folderNoteNameVar && (!oldPath.endsWith('.md'))) {
			// maybe this is a folder
			const newPathStr = newPath.path;
			var oldFolderNoteBaseName = this.getFolderNoteBaseName(oldPath);
			var oldFolderNotePath = newPathStr + '/' + oldFolderNoteBaseName + '.md';
			if (this.app.vault.adapter.exists(oldFolderNotePath)) {
				var newFolderNoteBaseName = this.getFolderNoteBaseName(newPathStr);
				var newFolderNotePath = newPathStr + '/' + newFolderNoteBaseName + '.md';
				// the rename func will not delete the old file.
				// and will not update the old links
				this.app.vault.adapter.rename(oldFolderNotePath, newFolderNotePath);
			}
		}
	}


	// form ccard code block
	ccardProcessor: MarkdownPostProcessor = async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		// Assumption: One section always contains only the code block

		//Which Block should be replaced? -> Codeblocks
		const blockToReplace = el.querySelector('pre')
		if (!blockToReplace) return

		//Only Codeblocks with the Language "chart" should be replaced
		// console.log('has yaml code.')
		const ccardBlock = blockToReplace.querySelector('code.language-ccard')
		if (!ccardBlock) return

		// Change ccard code to html element
		try {
			const yaml = Yaml.parse(ccardBlock.textContent);
			if (!yaml || !yaml.type) return;

			if (yaml.type == 'cute') {
				// console.log('hello cute');
				let cardBlock = new CardBlock();
				cardBlock.fromYamlCards(yaml);
				const ccardElem = cardBlock.getDocElement();
				el.replaceChild(ccardElem, blockToReplace);
			}
			else if (yaml.type == 'folder_overview') {
				// console.log('hello overview');
				const activeFile = this.app.workspace.getActiveFile();
				var folderPath = activeFile.parent.path;
				
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const activeFile = this.app.workspace.getActiveFile();
					var folderPath = activeFile.parent.path;
					let briefCards = await this.makeOverviewCards(folderPath);
					const ccardElem = briefCards.getDocElement();
					el.replaceChild(ccardElem, blockToReplace);
				}
			}
		}
		catch {
			console.log('Folder Note', 'Failed to paser yaml code.')
		}
	}

}


// ------------------------------------------------------------
// Card block
// ------------------------------------------------------------

enum CardStyle {
	Folder, Note, Image,
}

class CardBlock {
	style: string;
	col: number;
	cards: CardItem[];

	constructor() {
		this.style = 'cute';
		this.cards = [];
	}

	addCard(card: CardItem) {
		this.cards.push(card);
	}

	clear() {
		this.cards = [];
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

	getDocElement() {
		const cardDiv = document.createElement('div');
		cardDiv.addClass('cute-card-band');
		var htmlSec = '';
		for (var i in this.cards) {
			htmlSec += this.cards[i].getHtmlCode();
		}
		cardDiv.innerHTML = htmlSec;
		return cardDiv;
	}

	fromYamlCards(yaml: any) {
		if (yaml.cards) {
			this.clear();
			const cardsInfo = yaml.cards;
			for (var i in cardsInfo) {
				const cardInfo = cardsInfo[i];
				if ('title' in cardInfo) {
					let cardItem = new CardItem(cardInfo['title'], CardStyle.Note);
					cardItem.fromDict(cardInfo);
					this.addCard(cardItem);
				}
			}
			return true;
		} 

		return false;
	}
}

class CardItem {
	cardStyle: CardStyle;
	headText: string;
	headImage: string;
	title: string;
	titleLink: string;
	abstract: string;
	footnote: string;

	constructor(title: string, style: CardStyle) {
		this.title = title;
		this.abstract = "No abstract.";
		this.cardStyle = style;
	}

	setHeadText(text: string) {
		this.headText = text;
	}

	setHeadImage(linkUrl: string) {
		this.headImage = linkUrl;
	}

	setTitle(title: string) {
		this.title = title;
	}

	setTitleLink(linkUrl: string) {
		this.titleLink = linkUrl;
	}

	setAbstract(abstract: string) {
		this.abstract = abstract;
	}

	setFootnote(footnote: string) {
		this.footnote = footnote;
	}

	fromDict(dict: any) {
		if ('head' in dict) this.headText = dict['head'];
		if ('image' in dict) this.headImage = dict['image'];
		if ('link' in dict) this.titleLink = dict['link'];
		if ('brief' in dict) this.abstract = dict['brief'];
		if ('foot' in dict) this.footnote = dict['foot'];
	}

	getHtmlCode() {
		var htmlSec = '<div class="cute-card-view">\n';
		// Heading
		if (this.headImage) {
			this.cardStyle = CardStyle.Image;
			if (this.headImage.startsWith("#")) {
				htmlSec += '<div class="thumb-color" style="background-color: ';
				htmlSec += this.headImage + ';">';
			}
			else {
				htmlSec += '<div class="thumb" style="background-image: url(';
				htmlSec += this.headImage + ');">';
			}
			if (this.headText) {
				htmlSec += this.headText;
			}
			htmlSec += '</div>\n'
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
		// abstract
		htmlSec += '<p>' + this.abstract + '</p>\n';
		// footnote
		if (this.footnote) {
			htmlSec += '<span> ' + this.footnote + '</span>\n';
		}
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
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Folder Note Plugin: Settings.' });

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
			});
	}
}
