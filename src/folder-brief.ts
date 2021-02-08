
import { App, MarkdownView, TFile, } from "obsidian";
import { CardStyle, CardBlock, CardItem } from './card-view'

// ------------------------------------------------------------
// Folder Brief
// ------------------------------------------------------------

export class FolderBrief {
	app: App;

	constructor(app: App) {
        this.app = app;
	}

	// for cards type: folder_brief
	async yamlFolderBrief(yaml: any) {
		var folderPath = '';
		if (yaml.cards.folder) {
			folderPath = yaml.cards.folder;
			let folderExist = await this.app.vault.adapter.exists(folderPath);
			if (!folderExist) folderPath = '';
		}
		else {
			const activeFile = this.app.workspace.getActiveFile();
			folderPath = activeFile.parent.path;
		}

		// generate
		if (folderPath.length > 0) {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				let briefCards = await this.makeBriefCards(folderPath);
				const cardsElem = briefCards.getDocElement();
				return cardsElem;
			}
		}
		return null;
	}
	
	// generate folder overview
	async makeBriefCards(folderPath: string) {
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
		for (var i = 0; i < subFileList.length; i++) {
			var subFilePath = subFileList[i];
			if (!subFilePath.endsWith('.md')) continue;
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
		let file = this.app.vault.getAbstractFileByPath(notePath);
		if (file && file instanceof TFile) {
			let content = await this.app.vault.cachedRead(file);
			// let content = await this.app.vault.adapter.read(notePath);
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
			const fileSt = (file as TFile);
			if (fileSt.stat) {
				let date = new Date(fileSt.stat.mtime);
				card.setFootnote(date.toLocaleString());
			}
			else {
				card.setFootnote(notePath.replace(folderPath + '/', ''));
			}
		}

		// return
		return card;
	}
}
