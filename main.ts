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
	folderNoteType: string;
	folderNoteName: string;
	folderNoteAutoRename: boolean;
	folderNoteStrInit: string;
}

const DEFAULT_SETTINGS: FolderNotePluginSettings = {
	folderNoteHide: true,
	folderNoteType: 'inside',
	folderNoteName: '_about_',
	folderNoteAutoRename: true,
	folderNoteStrInit: '# {{FOLDER_NAME}} Overview\n {{FOLDER_BRIEF}} \n'
}

enum NoteFileMethod {
	Index, Inside, Outside,
}

export default class FolderNotePlugin extends Plugin {
	settings: FolderNotePluginSettings;
	noteFileMethod: NoteFileMethod;
	keyFOLDER_NAME: string;
	filesToRename: string[];
	filesToRenameSet: boolean;

	async onload() {
		console.log('Loading Folder Note plugin');

		// class vars
		this.noteFileMethod = NoteFileMethod.Index;
		this.keyFOLDER_NAME = '{{FOLDER_NAME}}';
		this.filesToRename = [];
		this.filesToRenameSet = false;

		// load settings
		await this.loadSettings();
		if (this.settings.folderNoteName.contains(this.keyFOLDER_NAME)) {
			this.settings.folderNoteType = 'outside';
		}

		// this.addRibbonIcon('dice', 'Folder Note Plugin', () => {
		// 	new Notice('Auto generate brief description for folder note!');
		// });

		// for ccard rendering
		MarkdownPreviewRenderer.registerPostProcessor(this.ccardProcessor);

		// for rename event
		this.registerEvent(this.app.vault.on('rename', 
			(newPath, oldPath) => this.handleFileRename(newPath, oldPath)));
		
		// hide sth
		// this.hideRootNoteFiles();

		// for settings
		this.addSettingTab(new FolderNoteSettingTab(this.app, this));

		// for file explorer click
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

			// fix the folder path
			if (folderPath.length > 0) {
				var slashLast = folderPath.lastIndexOf('/');
				var folderPathLast = folderPath.split('/').pop();
				if (folderPathLast != folderName) {
					folderPath = folderPath.substring(0, slashLast + 1) + folderName;
				}
			}

			// open the infor note
			if (folderPath.length > 0) {
				var ctrlKey = (evt.ctrlKey || evt.metaKey);
				this.openFolderNote(folderElem, folderPath, ctrlKey);
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
					let folderPath = await this.getNoteFolderBriefPath(activeFile.path);
					let briefCards = await this.makeFolderBriefCards(folderPath);
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

	setNoteFileMethod() {
		if (this.settings.folderNoteType == 'index') {
			this.noteFileMethod = NoteFileMethod.Index;
		} 
		else if (this.settings.folderNoteType == 'inside') { 
			this.noteFileMethod = NoteFileMethod.Inside;
		}
		else if (this.settings.folderNoteType == 'outside') { 
			this.noteFileMethod = NoteFileMethod.Outside;
		}
		// console.log('folderNoteType', this.settings.folderNoteType);
		// console.log('noteFileMethod', this.noteFileMethod);
	}

	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
		this.setNoteFileMethod();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.setNoteFileMethod();
	}

	// get folder note path
	getFolderNotePath(folderPath: string) {
		var notePath = '';
		var noteBaseName = this.settings.folderNoteName;
		if (this.noteFileMethod == NoteFileMethod.Index) {
			notePath = folderPath + '/' + noteBaseName + '.md';
		}
		else {
			noteBaseName = folderPath.split('/').pop();
			if (this.noteFileMethod == NoteFileMethod.Inside) {
				notePath = folderPath + '/' + noteBaseName + '.md';
			}
			else if  (this.noteFileMethod == NoteFileMethod.Outside) {
				notePath = folderPath + '.md';
			}
		}
		// console.log('notePath: ', notePath);
		return [notePath, noteBaseName];
	}

	// get note folder
	// make sure it is a note file
	getNoteFolderPath(notePath: string) {
		var folderPath = '';
		if (this.noteFileMethod == NoteFileMethod.Index) {
			folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
		}
		else if (this.noteFileMethod == NoteFileMethod.Inside) {
			folderPath = notePath.substring(0, notePath.lastIndexOf('/'));

		}
		else if (this.noteFileMethod == NoteFileMethod.Outside) {
			// just remove .md
			folderPath = notePath.substring(0,  notePath.length-3);
		}
		return folderPath;
	}

	// get the file breif path
	async getNoteFolderBriefPath(notePath: string) {
		var folderPath = '';
		let isFN = await this.isFolderNote(notePath);
		if (isFN) {
			folderPath = this.getNoteFolderPath(notePath);
		}
		else {
			folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
		}
		return folderPath;
	}

	// check is folder note file?
	async isFolderNote(notePath: string) {
		var isFN = false;
		if (this.noteFileMethod == NoteFileMethod.Index) {
			var folderNoteName = this.settings.folderNoteName;
			if (notePath.endsWith('/' + folderNoteName + '.md'))  {
				isFN = true;
			}
		}
		else if (this.noteFileMethod == NoteFileMethod.Inside) {
			var noteBaseName = notePath.split('/').pop();
			noteBaseName = noteBaseName.substring(0, noteBaseName.length-3);
			if (notePath.endsWith(noteBaseName + '/' + noteBaseName + '.md'))  {
				isFN = true;
			}
		}
		else if (this.noteFileMethod == NoteFileMethod.Outside) {
			var folderPath = notePath.substring(0, notePath.length-3);
			isFN = await this.app.vault.adapter.exists(folderPath);
		}
		return isFN;
	}

	// check existence of folder note
	async hasFolderNote(folderPath: string) {
		var notePaths = this.getFolderNotePath(folderPath);
		let noteExists = await this.app.vault.adapter.exists(notePaths[0]);
		return noteExists;
	}

	// open the folder note
	async openFolderNote(folderElem: Element, folderPath: string, doCreate: boolean) {
		// check note file
		let notePaths = this.getFolderNotePath(folderPath);
		var folderNotePath = notePaths[0];
		var noteBaseName = notePaths[1];
		let hasFolderNote = await this.app.vault.adapter.exists(folderNotePath);

		// check note file
		var showFolderNote = hasFolderNote;
		if (!hasFolderNote) {
			if (doCreate) {
				let noteStrInit = await this.expandContent(
					folderPath,
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
			this.hideFolderNote(folderElem, noteBaseName);
			// show the note
			this.app.workspace.openLinkText(folderNotePath, '', false, { active: true });
		}
	}

	// hide folder note
	hideFolderNote(folderElem: Element, noteBaseName: string) {
		// modify the element
		const hideSetting = this.settings.folderNoteHide;
		folderElem.addClass('has-folder-note');
		var parentElem = folderElem.parentElement;
		var fileSelector = ':scope > div.nav-folder-children > div.nav-file > div.nav-file-title';
		var isOutsideMethod = (this.noteFileMethod == NoteFileMethod.Outside);
		if (isOutsideMethod) {
			parentElem = parentElem.parentElement;
			fileSelector = ':scope > div.nav-file > div.nav-file-title';
		}
		parentElem.querySelectorAll(fileSelector)
			.forEach(function (fileElem) {
				var fileNodeTitle = fileElem.firstElementChild.textContent;
				// console.log('fileNoteTitle: ', fileNodeTitle);
				if (hideSetting && (fileNodeTitle == noteBaseName)) {
					fileElem.addClass('is-folder-note');
				}
				else if (!isOutsideMethod) {
					fileElem.removeClass('is-folder-note');
				}
				// console.log('isOutsideMethod: ', isOutsideMethod);
			}
		);
	}

	// expand content template
	async expandContent(folderPath: string, template: string) {
		// keyword: {{FOLDER_NAME}}
		var folderName = folderPath.split('/').pop();
		var content = template.replace(this.keyFOLDER_NAME, folderName);
		// keyword: {{FOLDER_BRIEF}}
		if (content.contains('{{FOLDER_BRIEF}}')) {
			let briefCards = await this.makeFolderBriefCards(folderPath);
			var folderBrief = briefCards.getHtmlCode();
			content = content.replace('{{FOLDER_BRIEF}}', folderBrief);
		}
		// keyword: {{FOLDER_BRIEF_LIVE}}
		if (content.contains('{{FOLDER_BRIEF_LIVE}}')) {
			const briefLiveCode = '\n```ccard\ntype: folder_brief_live\n```\n';
			content = content.replace('{{FOLDER_BRIEF_LIVE}}', briefLiveCode);
		}
		return content;
	}

	// generate folder overview
	async makeFolderBriefCards(folderPath: string) {
		// set note name
		let cardBlock = new CardBlock();

		// children statistic
		let pathList = await this.app.vault.adapter.list(folderPath);
		const subFolderList = pathList.folders;
		const subFileList = pathList.files;

		// sub folders
		for (var i = 0; i < subFolderList.length; i++) {
			var subFolderPath = subFolderList[i];
			let hasFolderNote = await this.hasFolderNote(subFolderPath);
			if (hasFolderNote) continue;
			let folderCard = await this.makeFolderCard(folderPath, subFolderPath);
			cardBlock.addCard(folderCard);
		}

		// notes
		var notePaths = this.getFolderNotePath(folderPath);
		var noteFileName = notePaths[1] + '.md';
		for (var i = 0; i < subFileList.length; i++) {
			var subFilePath = subFileList[i];
			if (this.noteFileMethod != NoteFileMethod.Outside) {
				var subFileName = subFilePath.split('/').pop();
				if (subFileName == noteFileName) {
					continue;
				}
			}
			// check it
			let noteCard = await this.makeNoteCard(folderPath, subFilePath);
			cardBlock.addCard(noteCard);
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
		let hasFolderNote = await this.hasFolderNote(subFolderPath);
		if (hasFolderNote) {
			var notePaths = this.getFolderNotePath(subFolderPath);
			var subFolderNoteName = notePaths[0].replace(folderPath, '');
			card.setTitleLink(subFolderNoteName);
		}

		// footnote, use date in the future
		card.setFootnote(subFolderPath.replace(folderPath + '/', ''));
		
		// return
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
		card.setFootnote(notePath.replace(folderPath + '/', ''));

		// return
		return card;
	}

	// keep notefile name to be the folder name
	async handleFileRename(newPath: any, oldPath: any) {
		if (!this.settings.folderNoteAutoRename) return;
		if (this.noteFileMethod == NoteFileMethod.Outside) {
			if (!oldPath.endsWith('.md')) {
				// changing folder name
				// console.log('changing folder!!!')
				let hasFolderNote = await this.hasFolderNote(oldPath);
				if (hasFolderNote) {
					var oldNotePaths = this.getFolderNotePath(oldPath);
					var newNotePaths = this.getFolderNotePath(newPath.path);
					if (oldNotePaths[1] != newNotePaths[1]) {
						await this.app.vault.adapter.rename(oldNotePaths[0], newNotePaths[0]);
					}
				}
			}
			else {
				// changeing note name
				let isFN = await this.isFolderNote(oldPath);
				if (isFN) {
					// console.log('oldPath: ', oldPath);
					// console.log('newPath: ', newPath.path);
					var oldFolderPath = this.getNoteFolderPath(oldPath);
					var newFolderPath = this.getNoteFolderPath(newPath.path);
					await this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
				}
			}
		}
		else if (this.noteFileMethod == NoteFileMethod.Inside) {
			if (!oldPath.endsWith('.md')) {
				// changing folder name
				var oldNotePaths = this.getFolderNotePath(oldPath);
				var newNotePaths = this.getFolderNotePath(newPath.path);
				var oldNotePathNew = newPath.path + '/' + oldNotePaths[1] + '.md';
				let noteExists = await this.app.vault.adapter.exists(oldNotePathNew);
				if (noteExists) {
					if (newNotePaths[0] != oldNotePathNew) {
						// put it to rename
						this.filesToRename.push(oldNotePathNew);
						this.filesToRename.push(newNotePaths[0]);
					}
				}
			}
			else if (this.filesToRename.length == 0) {
				// changeing note name
				let isFN = await this.isFolderNote(oldPath);
				if (isFN) {
					var oldFolderPath = this.getNoteFolderPath(oldPath);
					// find the new path
					var noteDir = newPath.path;
					noteDir = noteDir.substring(0, noteDir.lastIndexOf('/'));
					noteDir = noteDir.substring(0, noteDir.lastIndexOf('/'));
					var noteBase = newPath.path.split('/').pop();
					noteBase = noteBase.substring(0, noteBase.length-3);
					var newFolderPath = '';
					if (noteDir.length > 0) {
						newFolderPath = noteDir + '/' + noteBase;
					} 
					else {
						newFolderPath = noteBase;
					}
					// put it to rename
					if (oldFolderPath != newFolderPath) {
						this.filesToRename.push(oldFolderPath);
						this.filesToRename.push(newFolderPath);
					}
				}
			}
			// only do once a time
			if (!this.filesToRenameSet && this.filesToRename.length > 0) {
				this.filesToRenameSet = true;
				setTimeout(() => {
					console.log('rename is running after 1 s.');
					if (this.filesToRename.length) {
						var oldFolderPath = this.filesToRename[0];
						var newFolderPath = this.filesToRename[1];
						// console.log('Mod Old Path:', oldFolderPath);
						// console.log('Mod New Path:', newFolderPath);
						this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
						this.filesToRename = [];
						this.filesToRenameSet = false;
					}
				}, 1000);
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
			else if (yaml.type == 'folder_brief_live') {
				// console.log('hello overview');
				var folderPath = '';
				if (yaml.folder) {
					if (this.app.vault.adapter.exists(yaml.folder)) {
						folderPath = yaml.folder;
					}
				}
				else {
					const activeFile = this.app.workspace.getActiveFile();
					folderPath = await this.getNoteFolderBriefPath(activeFile.path);
				}
				
				if (folderPath.length > 0) {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (view) {
						let briefCards = await this.makeFolderBriefCards(folderPath);
						const ccardElem = briefCards.getDocElement();
						el.replaceChild(ccardElem, blockToReplace);
					}
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
			.setName('Note File Method')
			.setDesc('Select the method to put your folder note file. (Read doc for more information.)')
			.addDropdown(dropDown =>
				dropDown
				.addOption('index', 'Index File')
				.addOption('inside', 'Folder Name Inside')
				.addOption('outside', 'Folder Name Outside')
				.setValue(this.plugin.settings.folderNoteType || 'index')
				.onChange((value: string) => {
					this.plugin.settings.folderNoteType = value;
					this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Index File Name')
			.setDesc('Set the index file name for folder note. (only for the Index method)')
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
		
		new Setting(containerEl)
			.setName('Hide Folder Note')
			.setDesc('Hide the folder note file in the file explorer panel.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.folderNoteHide);
				toggle.onChange(async (value) => {
					this.plugin.settings.folderNoteHide = value;
					await this.plugin.saveSettings();
				});
			});
		
		new Setting(containerEl)
			.setName('Auto Rename')
			.setDesc('Try to automatically rename the folder note if a folder name is changed. (Experimental)')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.folderNoteAutoRename);
				toggle.onChange(async (value) => {
					this.plugin.settings.folderNoteAutoRename = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
