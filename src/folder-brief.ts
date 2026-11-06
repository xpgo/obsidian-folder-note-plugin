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

    // for cards type: folder_brief
    async yamlFolderBrief(yaml: any) {
        var folderPath = '';
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return null;
        var notePath = activeFile.path;
        if (yaml.cards && yaml.cards.folder) {
            folderPath = yaml.cards.folder;
            let folderExist = await this.app.vault.adapter.exists(folderPath);
            if (!folderExist) folderPath = '';
        }
        else if (activeFile.parent) {
            folderPath = activeFile.parent.path;
        }

        // generate
        if (folderPath.length > 0) {
            let briefCards = await this.makeBriefCards(folderPath, notePath);
            const cardsElem = briefCards.getDocElement(this.app);
            return cardsElem;
        }
        return null;
    }
    
    // generate folder overview
    async makeBriefCards(folderPath: string, activeNotePath: string) {
        // set note name
        let cardBlock = new CardBlock();

        const normalizedPath = folderPath === '/' ? '' : folderPath;

        // children statistic
        let subFolderList: string[] = [];
        let subFileList: string[] = [];

        const folderObj = this.app.vault.getAbstractFileByPath(folderPath);
        if (folderObj instanceof TFolder) {
            for (const child of folderObj.children) {
                if (child instanceof TFolder) {
                    subFolderList.push(child.path);
                } else if (child instanceof TFile) {
                    subFileList.push(child.path);
                }
            }
            subFolderList.sort();
            subFileList.sort();
        } else {
            let pathList = await this.app.vault.adapter.list(normalizedPath);
            subFolderList = pathList.folders;
            subFileList = pathList.files;
        }

        // sub folders
        if (!this.noteOnly) {
            for (var i = 0; i < subFolderList.length; i++) {
                var subFolderPath = subFolderList[i];
                // have outside folder note?
                let noteExists = (this.app.vault.getAbstractFileByPath(subFolderPath + '.md') instanceof TFile) ||
                    await this.app.vault.adapter.exists(subFolderPath + '.md');
                if (!noteExists) {
                    let folderCard = await this.makeFolderCard(normalizedPath, subFolderPath);
                    cardBlock.addCard(folderCard);
                }
            }
        }

        // notes
        for (var i = 0; i < subFileList.length; i++) {
            var subFilePath = subFileList[i];
            if (!subFilePath.endsWith('.md')) continue;
            if (subFilePath == activeNotePath) continue; // omit self including
            let noteCard = await this.makeNoteCard(normalizedPath, subFilePath);
            cardBlock.addCard(noteCard);
        }

        // return
        return cardBlock;
    }

    // make folder brief card
    async makeFolderCard(folderPath: string, subFolderPath: string) {
        // title
        var subFolderName = subFolderPath.split('/').pop() || '';
        let card = new CardItem(subFolderName, CardStyle.Folder);

        // description
        let numFolders = 0;
        let numFiles = 0;
        const subFolderObj = this.app.vault.getAbstractFileByPath(subFolderPath);
        if (subFolderObj instanceof TFolder) {
            for (const child of subFolderObj.children) {
                if (child instanceof TFolder) numFolders++;
                else if (child instanceof TFile) numFiles++;
            }
        } else {
            let subPathList = await this.app.vault.adapter.list(subFolderPath);
            numFolders = subPathList.folders.length;
            numFiles = subPathList.files.length;
        }

        var folderBrief = 'Contains ';
        folderBrief += numFolders.toString() + ' folders, ';
        folderBrief += numFiles.toString() + ' notes.';
        card.setAbstract(folderBrief);

        // footnote, use date in the future
        const prefix = folderPath ? folderPath + '/' : '';
        card.setFootnote(subFolderPath.replace(prefix, ''));
        
        // return
        return card;
    }

    // make note brief card
    async makeNoteCard(folderPath: string, notePath: string) {
        // title
        var noteName = notePath.split('/').pop() || '';
        var noteTitle = noteName.substring(0, noteName.length - 3);
        let card = new CardItem(noteTitle, CardStyle.Note);
        card.setTitleLink(notePath);

        // read content
        let file = this.app.vault.getAbstractFileByPath(notePath);
        if (file && file instanceof TFile) {
            let contentOrg = await this.app.vault.cachedRead(file);

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
                const prefix = folderPath ? folderPath + '/' : '';
                card.setFootnote(notePath.replace(prefix, ''));
            }
        }

        // return
        return card;
    }

    getContentImage(contentOrg: string, folderPath: string, notePath: string = '') {
        var imageUrl = '';
        // for pattern: ![xxx](url)
        let regexImg = new RegExp('!\\[(.*?)\\]\\((.*?)\\)');
        var match = regexImg.exec(contentOrg);
        if (match != null) {
            imageUrl = match[2];
        }
        else {
            // for pattern: ![[xxx.png]] or ![[xxx.png|100]]
            let regexImg2 = new RegExp('!\\[\\[(.*?)\\]\\]');
            match = regexImg2.exec(contentOrg);
            if (match != null) {
                imageUrl = match[1].split('|')[0].trim();
            }
        }
        // add image url
        if (imageUrl.length > 0) {
            if (!imageUrl.startsWith('http')) {
                // First try resolving via Obsidian's metadataCache (handles attachment folders & relative paths)
                const linkedFile = this.app.metadataCache.getFirstLinkpathDest(imageUrl, notePath || folderPath);
                if (linkedFile instanceof TFile) {
                    return linkedFile.path;
                }

                let headPath = folderPath;
                let relativePath = false;
                while (imageUrl.startsWith('../')) {
                    imageUrl = imageUrl.substring(3);
                    headPath = headPath.substring(0, headPath.lastIndexOf('/'));
                    relativePath = true;
                }
                if (relativePath && headPath) {
                    imageUrl = headPath + '/' + imageUrl;
                }
                imageUrl = imageUrl.replace(/\%20/g, ' ');
            }
        }
        return imageUrl;
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
        .trim();

        // try to get the first paragraph
        var contentBrief = '';
        content = '\n' + content + '\n';
        let regexP1 = new RegExp('\n([^\n|^#|^>])([^\n]+)\n', 'g'); 
        var match = null;
        if ((match = regexP1.exec(content)) !== null) {
            contentBrief = match[1] + match[2];
        }

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
