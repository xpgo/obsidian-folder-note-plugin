
import { App, MarkdownView, } from "obsidian";
import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { CardBlock } from './card-view';
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

			// for old type folder_brief_live
			if (yaml.type && yaml.type == 'folder_brief_live') {
				var folderPath = '';
				if (yaml.folder) {
					let folderExist = await this.app.vault.adapter.exists(yaml.folder);
					if (folderExist) folderPath = yaml.folder;
				}
				else {
					const activeFile = this.app.workspace.getActiveFile();
					folderPath = await folderNote.getNoteFolderBriefPath(activeFile.path);
				}
				
				if (folderPath.length > 0) {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (view) {
						let folderBrief = new FolderBrief(this.app);
						let briefCards = await folderBrief.makeBriefCards(folderPath);
						const ccardElem = briefCards.getDocElement();
						el.replaceChild(ccardElem, blockToReplace);
					}
				}
			}
			else if (yaml.cards) {
				// new style
				const yCards = yaml.cards;
				if (yCards instanceof Array) {
					let cardBlock = new CardBlock();
					cardBlock.fromYamlCards(yaml);
					const cardsElem = cardBlock.getDocElement();
					el.replaceChild(cardsElem, blockToReplace);
				}
				else if (yCards.constructor == Object) {
					if (yCards.type == 'folder_brief') {
						let folderBrief = new FolderBrief(this.app);
						let cardsElem = await folderBrief.yamlFolderBrief(yaml);
						if (cardsElem) {
							el.replaceChild(cardsElem, blockToReplace);
						}
					}
				}
			}
		}
		catch (error) {
			console.log('Block Render for xcards', error)
		}
	}
}
