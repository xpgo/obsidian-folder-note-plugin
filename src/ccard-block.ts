import { App, Keymap, MarkdownPostProcessorContext, TFolder } from "obsidian";
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

    async run(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, folderNote: FolderNote) {
        try {
            const yaml = Yaml.parse(source);
            if (!yaml) return;

            if (yaml.type === undefined) yaml.type = 'static';
            if (yaml.style === undefined) yaml.style = 'card';

            let docEl: HTMLElement | null = null;
            if (yaml.type == 'static') {
                docEl = await this.docElemStatic(yaml);
            }
            else if (yaml.type == 'folder_brief_live') {
                docEl = await this.docElemFolderBriefLive(yaml, folderNote, ctx.sourcePath);
            }

            if (docEl) {
                el.appendChild(docEl);
                this.wireInternalLinks(el, ctx.sourcePath);
            }
        }
        catch (error) {
            console.log('Code Block: ccard', error);
            el.createEl('pre', { text: `ccard error: ${error}` });
        }
    }

    // make card titles open notes in both Reading view and Live Preview
    wireInternalLinks(el: HTMLElement, sourcePath: string) {
        el.querySelectorAll<HTMLAnchorElement>('a.internal-link').forEach(a => {
            a.addEventListener('click', (evt: MouseEvent) => {
                evt.preventDefault();
                evt.stopPropagation();
                const href = a.getAttribute('data-href') || a.getAttribute('href');
                if (href) this.app.workspace.openLinkText(href, sourcePath, Keymap.isModEvent(evt));
            });
        });
    }

    async docElemStatic(yaml: any) {
        if (yaml.items && (yaml.items instanceof Array)) {
            const cardBlock = new CardBlock();
            cardBlock.fromYamlCards(yaml);
            return cardBlock.getDocElement(this.app);
        }
        return null;
    }

    // folder_brief_live
    async docElemFolderBriefLive(yaml: any, folderNote: FolderNote, notePath: string) {
        let folderPath = '';
        if (yaml.folder) {
            if (this.app.vault.getAbstractFileByPath(yaml.folder) instanceof TFolder) {
                folderPath = yaml.folder;
            }
        }
        else {
            // use the note that contains this block, not whichever note is active
            folderPath = await folderNote.getNoteFolderBriefPath(notePath);
        }

        if (folderPath.length == 0) return null;

        const folderBrief = new FolderBrief(this.app);
        if (yaml.briefMax) folderBrief.briefMax = yaml.briefMax;
        if (yaml.noteOnly != undefined) folderBrief.noteOnly = yaml.noteOnly;

        const briefCards = await folderBrief.makeBriefCards(folderPath, notePath);
        briefCards.fromYamlOptions(yaml);
        return briefCards.getDocElement(this.app);
    }
}
