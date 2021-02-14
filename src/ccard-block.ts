
import { App, MarkdownView, } from "obsidian";
import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { CardBlock } from './card-item';
import * as Yaml from 'yaml';

// ------------------------------------------------------------
// ccards processor
// ------------------------------------------------------------

export class ccardProcessor {
	app: App;

	constructor(app: App) {
        this.app = app;
	}
	
	async run(el: HTMLElement, blockToReplace: HTMLPreElement, folderNote: FolderNote) {
		// Only Codeblocks with the Language "xcards" should be replaced
		// console.log('has yaml code.')
		const codeBlock = blockToReplace.querySelector('code.language-ccard');
		if (!codeBlock) return;

		// Change cards code to html element
		try {
			const yaml = Yaml.parse(codeBlock.textContent);
			if (!yaml) return;

			// set default
			if (yaml.type === undefined) yaml.type = 'static';
			if (yaml.sytle === undefined) yaml.style = 'card';

			// for different types
			if (yaml.type == 'static') {
				const docEl = await this.docElemStatic(yaml);
				if (docEl) {
					el.replaceChild(docEl, blockToReplace);
				}
			}
			else if (yaml.type == 'folder_brief_live') {
				const docEl = await this.docElemFolderBriefLive(yaml, folderNote);
				if (docEl) {
					el.replaceChild(docEl, blockToReplace);
				}
			}
		}
		catch (error) {
			console.log('Code Block: ccard', error)
		}
	}

	// static
	async docElemStatic(yaml: any) {
		if (yaml.items && (yaml.items instanceof Array)) {
			let cardBlock = new CardBlock();
			cardBlock.fromYamlCards(yaml);
			// if (yaml.style == 'card')
			const cardsElem = cardBlock.getDocElement(this.app);
			return cardsElem;
		}
		return null;
	}

	// folder_brief_live
	async docElemFolderBriefLive(yaml: any, folderNote: FolderNote) {
		var folderPath = '';
		const activeFile = this.app.workspace.getActiveFile();
		var notePath = activeFile.path;
		if (yaml.folder) {
			let folderExist = await this.app.vault.adapter.exists(yaml.folder);
			if (folderExist) folderPath = yaml.folder;
		}
		else {
			folderPath = await folderNote.getNoteFolderBriefPath(notePath);
		}
		
		if (folderPath.length > 0) {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				let folderBrief = new FolderBrief(this.app);
				if (yaml.briefMax) {
					folderBrief.briefMax = yaml.briefMax;
				}
				let briefCards = await folderBrief.makeBriefCards(folderPath, notePath);
				if (yaml.col) {
					briefCards.col = yaml.col;
				}
				// if (yaml.style == 'card')
				const ccardElem = briefCards.getDocElement(this.app);
				return ccardElem;
			}
		}
		return null;
	}
}
