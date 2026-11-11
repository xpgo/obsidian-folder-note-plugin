
import { App, TFile, TFolder, } from "obsidian";
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

    // generate folder overview
    async makeBriefCards(folderPath: string, activeNotePath: string) {
        // set note name
        let cardBlock = new CardBlock();

        // children from the vault tree: hidden folders such as .obsidian are not part of it
        const children = this.getChildren(folderPath);
        const subFolderList = children.folders;
        const subFileList = children.files;
        const folderPrefix = folderPath == '/' ? '' : folderPath;

        // sub folders
        if (!this.noteOnly) {
            for (var i = 0; i < subFolderList.length; i++) {
                var subFolderPath = subFolderList[i].path;
                // have outside folder note?
                let noteExists = this.app.vault.getAbstractFileByPath(subFolderPath + '.md') instanceof TFile;
                if (!noteExists) {
                    let folderCard = await this.makeFolderCard(folderPrefix, subFolderPath);
                    cardBlock.addCard(folderCard);
                }
            }
        }

        // notes
        for (var i = 0; i < subFileList.length; i++) {
            var subFilePath = subFileList[i].path;
            if (subFileList[i].extension != 'md') continue;
            if (subFilePath == activeNotePath) continue; // omit self includeing
            let noteCard = await this.makeNoteCard(folderPrefix, subFilePath);
            cardBlock.addCard(noteCard);
        }

        // return
        return cardBlock;
    }

    // sorted sub folders and files of a folder, "/" is the vault root
    getChildren(folderPath: string) {
        const folder = (folderPath == '/' || folderPath == '') ?
            this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(folderPath);
        const folders: TFolder[] = [];
        const files: TFile[] = [];
        if (folder instanceof TFolder) {
            for (const child of folder.children) {
                if (child instanceof TFolder) folders.push(child);
                else if (child instanceof TFile) files.push(child);
            }
        }
        const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
        return { folders: folders.sort(byName), files: files.sort(byName) };
    }

    // make folder brief card
    async makeFolderCard(folderPath: string, subFolderPath: string) {
        // title
        var subFolderName = subFolderPath.split('/').pop();
        let card = new CardItem(subFolderName, CardStyle.Folder);

        // description
        let subChildren = this.getChildren(subFolderPath);
        var folderBrief = 'Contains ';
        folderBrief += subChildren.folders.length.toString() + ' folders, ';
        folderBrief += subChildren.files.filter(f => f.extension == 'md').length.toString() + ' notes.';
        card.setAbstract(folderBrief);

        // footnote, use date in the future
        card.setFootnote(subFolderPath.replace(folderPath ? folderPath + '/' : '', ''));
        
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
