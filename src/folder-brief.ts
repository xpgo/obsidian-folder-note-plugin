
import { App, MarkdownView, TFile, } from "obsidian";
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
        var notePath = activeFile.path;
        if (yaml.cards.folder) {
            folderPath = yaml.cards.folder;
            let folderExist = await this.app.vault.adapter.exists(folderPath);
            if (!folderExist) folderPath = '';
        }
        else {
            folderPath = activeFile.parent.path;
        }

        // generate
        if (folderPath.length > 0) {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                let briefCards = await this.makeBriefCards(folderPath, notePath);
                const cardsElem = briefCards.getDocElement(this.app);
                return cardsElem;
            }
        }
        return null;
    }
    
    // generate folder overview
    async makeBriefCards(folderPath: string, activeNotePath: string) {
        // set note name
        let cardBlock = new CardBlock();

        // children statistic
        let pathList = await this.app.vault.adapter.list(folderPath);
        const subFolderList = pathList.folders;
        const subFileList = pathList.files;

        // sub folders
        if (!this.noteOnly) {
            for (var i = 0; i < subFolderList.length; i++) {
                var subFolderPath = subFolderList[i];
                // have outside folder note?
                let noteExists = await this.app.vault.adapter.exists(subFolderPath + '.md');
                if (!noteExists) {
                    let folderCard = await this.makeFolderCard(folderPath, subFolderPath);
                    cardBlock.addCard(folderCard);
                }
            }
        }

        // notes
        for (var i = 0; i < subFileList.length; i++) {
            var subFilePath = subFileList[i];
            if (!subFilePath.endsWith('.md')) continue;
            if (subFilePath == activeNotePath) continue; // omit self includeing
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
        var subFolderName = subFolderPath.split('/').pop();
        card.setTitleLink(subFolderPath + "/" + subFolderName + ".md");
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
            let contentOrg = await this.app.vault.cachedRead(file);
            // let content = await this.app.vault.adapter.read(notePath);
            // console.log(content);

            // image
            var imageUrl = this.getContentImage(contentOrg, folderPath);
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
                card.setFootnote(notePath.replace(folderPath + '/', ''));
            }
        }

        // return
        return card;
    }

    getContentImage(contentOrg: string, folderPath: string) {
        var imageUrl = '';
        // for patten: ![xxx.png]
        let regexImg = new RegExp('!\\[(.*?)\\]\\((.*?)\\)');
        var match = regexImg.exec(contentOrg);
        if (match != null) {
            imageUrl = match[2];
        }
        else {
            // for patten: ![[xxx.png]]
            let regexImg2 = new RegExp('!\\[\\[(.*?)\\]\\]');
            match = regexImg2.exec(contentOrg);
            if (match != null) imageUrl = match[1];
        }
        // add image url
        if (imageUrl.length > 0) {
            if (!imageUrl.startsWith('http')) {
                let headPath = folderPath;
                let relativePath = false;
                while (imageUrl.startsWith('../')) {
                    imageUrl = imageUrl.substring(3);
                    headPath = headPath.substring(0, headPath.lastIndexOf('/'));
                    relativePath = true;
                }
                if (relativePath) {
                    imageUrl = headPath + '/' + imageUrl;
                }
                imageUrl = imageUrl.replace(/\%20/g, ' ')
                // imageUrl = this.app.vault.adapter.getResourcePath(imageUrl);
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
