
import { App, MarkdownPostProcessorContext, TFolder} from "obsidian";
import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { CardBlock, CardBlockYaml } from './card-item';
import * as Yaml from 'yaml';

// ------------------------------------------------------------
// ccards processor
// ------------------------------------------------------------

export class ccardProcessor {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
    
    async run(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, folderNote: FolderNote) {
        // Change cards code to html element
        try {
            const yaml = Yaml.parse(source) as CardBlockYaml | null;
            if (!yaml) return;

            // set default
            if (yaml.type === undefined) yaml.type = 'static';
            if (yaml.style === undefined) yaml.style = 'card';

            // for different types
            if (yaml.type == 'static') {
                const docEl = await this.docElemStatic(yaml);
                if (docEl) {
                    el.appendChild(docEl);
                }
            }
            else if (yaml.type == 'folder_brief_live') {
                const docEl = await this.docElemFolderBriefLive(yaml, folderNote, ctx);
                if (docEl) {
                    el.appendChild(docEl);
                }
            }
        }
        catch (error) {
            console.error('Code Block: ccard', error)
        }
    }

    // static
    async docElemStatic(yaml: CardBlockYaml) {
        if (yaml.items && (yaml.items instanceof Array)) {
            const cardBlock = new CardBlock();
            cardBlock.fromYamlCards(yaml);
            const cardsElem = cardBlock.getDocElement(this.app);
            return cardsElem;
        }
        return null;
    }

    // folder_brief_live
    async docElemFolderBriefLive(yaml: CardBlockYaml, folderNote: FolderNote, ctx: MarkdownPostProcessorContext) {
        let folderPath = '';
        // the note that contains the block, not the active note (hover previews, embeds, canvas)
        const notePath = ctx.sourcePath;
        if (yaml.folder) {
            const folderExist = yaml.folder == '/' ||
                this.app.vault.getAbstractFileByPath(yaml.folder) instanceof TFolder;
            if (folderExist) folderPath = yaml.folder;
        }
        else if (notePath) {
            folderPath = await folderNote.getNoteFolderBriefPath(notePath);
        }
        
        if (folderPath.length > 0) {
            const folderBrief = new FolderBrief(this.app);

            // brief options
            if (yaml.briefMax) {
                folderBrief.briefMax = yaml.briefMax;
            }
            if (yaml.noteOnly != undefined) {
                folderBrief.noteOnly = yaml.noteOnly;
            }

            // cards options
            const briefCards = await folderBrief.makeBriefCards(folderPath, notePath);
            briefCards.fromYamlOptions(yaml);
            
            // generate el
            const ccardElem = briefCards.getDocElement(this.app);
            return ccardElem;
        }
        return null;
    }
}
