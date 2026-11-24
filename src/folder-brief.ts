
import { App, TFile, TFolder } from "obsidian";
import { CardStyle, CardBlock, CardItem } from './card-item'

// ------------------------------------------------------------
// Folder Brief
// ------------------------------------------------------------

export class FolderBrief {
    app: App;
    folderPath: string;
    briefMax: number;
    noteOnly: boolean;

    constructor(app: App) {
        this.app = app;
        this.folderPath = '';
        this.briefMax = 64;
        this.noteOnly = false;
    }

    // for cards type: folder_brief (legacy, not used by the ccard processor)
    async yamlFolderBrief(yaml: any) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return null;
        let folderPath = '';
        if (yaml.cards && yaml.cards.folder) {
            folderPath = yaml.cards.folder;
            if (!(this.app.vault.getAbstractFileByPath(folderPath) instanceof TFolder)) folderPath = '';
        }
        else if (activeFile.parent) {
            folderPath = activeFile.parent.path;
        }
        if (folderPath.length == 0) return null;
        const briefCards = await this.makeBriefCards(folderPath, activeFile.path);
        return briefCards.getDocElement(this.app);
    }

    // generate folder overview
    async makeBriefCards(folderPath: string, activeNotePath: string) {
        const cardBlock = new CardBlock();
        const folder = this.app.vault.getAbstractFileByPath(folderPath.length ? folderPath : '/');
        if (!(folder instanceof TFolder)) return cardBlock;

        const byName = (a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        const subFolders = folder.children.filter((f): f is TFolder => f instanceof TFolder).sort(byName);
        const subFiles = folder.children.filter((f): f is TFile => f instanceof TFile).sort(byName);

        // sub folders (skip ones that have an "outside" note, the note card covers them)
        if (!this.noteOnly) {
            for (const sub of subFolders) {
                if (this.app.vault.getAbstractFileByPath(sub.path + '.md') instanceof TFile) continue;
                cardBlock.addCard(await this.makeFolderCard(folder.path, sub.path));
            }
        }

        // notes
        for (const sub of subFiles) {
            if (sub.extension !== 'md') continue;
            if (sub.path == activeNotePath) continue; // omit self
            cardBlock.addCard(await this.makeNoteCard(folder.path, sub.path));
        }

        return cardBlock;
    }

    // make folder brief card
    async makeFolderCard(folderPath: string, subFolderPath: string) {
        // title
        var subFolderName = subFolderPath.split('/').pop();
        let card = new CardItem(subFolderName, CardStyle.Folder);

        // description
        const sub = this.app.vault.getAbstractFileByPath(subFolderPath);
        const children = (sub instanceof TFolder) ? sub.children : [];
        const nFolders = children.filter(f => f instanceof TFolder).length;
        const nNotes = children.filter(f => f instanceof TFile && f.extension === 'md').length;
        const folderBrief = `Contains ${nFolders} folders, ${nNotes} notes.`;
        card.setAbstract(folderBrief);

        // footnote, use date in the future
        card.setFootnote(this.relPath(folderPath, subFolderPath));
        
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
            let contentOrg = await this.app.vault.cachedRead(file);
            // let content = await this.app.vault.adapter.read(notePath);
            // console.log(content);

            // image
            var imageUrl = this.getContentImage(contentOrg, folderPath, notePath);
            if (imageUrl.length > 0) {
                card.setHeadImage(imageUrl);
            }
            
            // content?
            var contentBrief = this.getContentBrief(contentOrg);
            if (contentBrief.length > 0) {
                if (contentBrief.length > this.briefMax) {
                    contentBrief = contentBrief.substring(0, this.briefMax);
                    contentBrief += '...';
                }
                card.setAbstract(contentBrief);
            }

            // foot note
            const fileSt = (file as TFile);
            if (fileSt.stat) {
                let date = new Date(fileSt.stat.mtime);
                card.setFootnote(date.toLocaleString());
            }
            else {
                card.setFootnote(this.relPath(folderPath, notePath));
            }
        }

        // return
        return card;
    }

    relPath(folderPath: string, path: string) {
        if (folderPath === '/' || folderPath === '') return path;
        return path.startsWith(folderPath + '/') ? path.substring(folderPath.length + 1) : path;
    }

    // find the first image in a note and return a vault path (or an http url)
    getContentImage(contentOrg: string, folderPath: string, notePath: string = '') {
        let imageUrl = '';
        let isWiki = false;
        // pattern: ![alt](path)
        let match = /!\[(.*?)\]\((.*?)\)/.exec(contentOrg);
        if (match != null) {
            imageUrl = match[2].trim();
            // strip optional title: ![a](img.png "title")
            imageUrl = imageUrl.replace(/\s+".*"$/, '').replace(/^<|>$/g, '');
        }
        else {
            // pattern: ![[path|size]]
            match = /!\[\[(.*?)\]\]/.exec(contentOrg);
            if (match != null) {
                imageUrl = match[1];
                isWiki = true;
            }
        }
        if (imageUrl.length == 0 || imageUrl.startsWith('http')) return imageUrl;

        // drop "|size" and "#heading" parts, decode %20 etc.
        let linkPath = imageUrl.split('|')[0].split('#')[0].trim();
        try { linkPath = decodeURI(linkPath); } catch (e) { /* keep as-is */ }

        // let Obsidian resolve it the same way it resolves embeds
        const dest = this.app.metadataCache.getFirstLinkpathDest(linkPath, notePath);
        if (dest) return dest.path;

        // fallback: resolve relative markdown paths by hand
        if (!isWiki) {
            let headPath = folderPath;
            let relative = false;
            while (linkPath.startsWith('../')) {
                linkPath = linkPath.substring(3);
                headPath = headPath.substring(0, headPath.lastIndexOf('/'));
                relative = true;
            }
            if (linkPath.startsWith('./')) { linkPath = linkPath.substring(2); relative = true; }
            if (relative && headPath.length > 0) linkPath = headPath + '/' + linkPath;
        }
        return linkPath;
    }

    getContentBrief(contentOrg: string) {
        // remove some special content
        var content = contentOrg.trim();

        // skip yaml head
        if (content.startsWith('---\r') || content.startsWith('---\n') ) {
            const hPos2 = content.indexOf('---', 4);
            if (hPos2 >= 0 && (content[hPos2-1] == '\n' || (content[hPos2-1] == '\r'))) {
                content = content.substring(hPos2+4).trim();
            }
        }

        content = content
        // Remove YAML code
        // .replace(/^---[\r\n][^(---)]*[\r\n]---[\r\n]/g, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // wiki style links
        .replace(/\!\[\[(.*?)\]\]/g, '')
        .replace(/\[\[(.*?)\]\]/g, '$1')
        // Remove images
        .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, '')
        // Remove inline links
        .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1')
        // Remove emphasis (repeat the line to remove double emphasis)
        .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
        // Remove blockquotes
        .replace(/\n(&gt;|\>)(.*)/g, '')
        // Remove code blocks
        .replace(/(```[^\s]*\n[\s\S]*?\n```)/g, '')
        // Remove inline code
        .replace(/`(.+?)`/g, '$1')
        .trim()

        // try to get the first paragraph
        var contentBrief = '';
        content = '\n' + content + '\n';
        let regexP1 = new RegExp('\n([^\n|^#|^>])([^\n]+)\n', 'g'); 
        var match = null;
        if ((match = regexP1.exec(content)) !== null) {
            contentBrief = match[1] + match[2];
        }

        // console.log('contentBrief', contentBrief);
        contentBrief = contentBrief.trim();

        // use section headings
        if (contentBrief.length == 0) {
            let regexHead = new RegExp('^#{1,6}(?!#)(.*)[\r\n]', 'mg');
            while ((match = regexHead.exec(content)) !== null) {
                contentBrief += match[1] + ', ';
                if (contentBrief.length > this.briefMax) {
                    break;
                }
            }
            if (contentBrief.endsWith(', ')) {
                contentBrief = contentBrief.substring(0, contentBrief.length-2);
            }
        }

        // return
        return contentBrief;
    }
}
