
import { App, } from "obsidian";

// ------------------------------------------------------------
// Card block
// ------------------------------------------------------------

export enum CardStyle {
    Folder, Note, Image,
}

export class CardBlock {
    style: string;
    col: number;
    cards: CardItem[];
    imagePrefix: string;

    constructor() {
        this.style = 'card';
        this.cards = [];
        this.col = -1;
        this.imagePrefix = '';
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

    getDocElement(app: App) {
        const cardDiv = document.createElement('div');
        if (this.style == 'card') {
            cardDiv.addClass('cute-card-band');
            for (var i in this.cards) {
                cardDiv.appendChild(this.cards[i].getBoxElement(app, this.imagePrefix))
            }
            if (this.col > 0) {
                cardDiv.setAttr('style' , 
                `grid-template-columns: repeat(${this.col}, 1fr);`);
            }
        }
        return cardDiv;
    }

    getYamlCode() {
        let yamlStr = '';
        const nCard = this.getCardNum();
        if (nCard > 0) {
            yamlStr = '\n```ccard\nitems: [';
            for (var i in this.cards) {
                yamlStr += '\n  {\n'
                yamlStr += this.cards[i].getYamlCode('    ');
                yamlStr += '  },'
            }
            // get rid of last period
            yamlStr = yamlStr.substring(0, yamlStr.length - 1);
            yamlStr += '\n]\n';
            if (this.col > 0) {
                yamlStr += `col: ${this.col}\n`;
            }
            yamlStr += '```\n';
        }
        return yamlStr;
    }

    fromYamlCards(yaml: any) {
        if (yaml.style) {
            this.style = yaml.style;
        }
        if (yaml.items) {
            this.clear();
            const allItems = yaml.items;
            for (var i in allItems) {
                const cardInfo = allItems[i];
                if ('title' in cardInfo) {
                    let cardItem = new CardItem(cardInfo['title'], CardStyle.Note);
                    cardItem.fromDict(cardInfo);
                    this.addCard(cardItem);
                }
            }
        }
        if (yaml.col) {
            this.col = yaml.col;
        }
        if (yaml.imagePrefix) {
            this.imagePrefix = yaml.imagePrefix;
        }

        return (this.getCardNum() > 0);
    }
}

export class CardItem {
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
        if ('head' in dict) {
            this.headText = dict['head'];
            if (this.headText == 'Folder') {
                this.cardStyle = CardStyle.Folder;
            }
            else if (this.headText == 'Note') {
                this.cardStyle = CardStyle.Note;
            }
        }
        if ('image' in dict) this.headImage = dict['image'];
        if ('link' in dict) this.titleLink = dict['link'];
        if ('brief' in dict) this.abstract = dict['brief'];
        if ('foot' in dict) this.footnote = dict['foot'];
    }

    yamlEscapeQuotes(org: string) {
        return org.replace(/'/gi, "''");
    }

    getYamlCode(prefix: string) {
        var yamlStr = '';
        yamlStr += `${prefix}title: '${this.yamlEscapeQuotes(this.title)}'`;
        if (this.titleLink) yamlStr += `,\n${prefix}link: '${this.yamlEscapeQuotes(this.titleLink)}'`;
        if (this.abstract) yamlStr += `,\n${prefix}brief: '${this.yamlEscapeQuotes(this.abstract)}'`;
        if (this.footnote) yamlStr += `,\n${prefix}foot: '${this.yamlEscapeQuotes(this.footnote)}'`;
        if (this.headImage) {
            yamlStr += `,\n${prefix}image: '${this.yamlEscapeQuotes(this.headImage)}'`;
        } 
        else if (this.headText) {
            yamlStr += `,\n${prefix}head: '${this.yamlEscapeQuotes(this.headText)}'`;
        }
        else {
            if (this.cardStyle == CardStyle.Folder) {
                yamlStr += `,\n${prefix}head: 'Folder'`;
            }
            else if (this.cardStyle == CardStyle.Note) {
                yamlStr += `,\n${prefix}head: 'Note'`;
            }
            else {
                yamlStr += `,\n${prefix}head: 'Card'`;
            }
        }
        yamlStr += '\n';
        return yamlStr;
    }

    getBoxElement(app: App, imagePrefix: string) {
        let cardEl = document.createElement('div');
        cardEl.addClass('cute-card-view');
        // Heading
        let headEl = cardEl.appendChild(document.createElement('div'));
        if (this.headImage) {
            this.cardStyle = CardStyle.Image;
            if (this.headImage.startsWith("#")) {
                // color
                headEl.addClass('thumb-color');
                headEl.setAttr('style', `background-color: ${this.headImage};`);
            }
            else if (this.headImage.contains("://")) {
                // app local image
                headEl.addClass('thumb');
                headEl.setAttr('style', `background-image: url(${this.headImage});`);
            } else {
                // asset file name?
                let imageUrl = this.headImage;
                if (imagePrefix.length > 0) {
                    // skip explicitly path
                    let urlPathList = imageUrl.split('/').join(' ').trimStart();
                    let fixPathList = imagePrefix.split('/').join(' ').trimStart();
                    if (!urlPathList.startsWith(fixPathList)) {
                        imageUrl = imagePrefix + this.headImage;
                    }
                }
                if (!imageUrl.contains('://')) {
                    imageUrl = app.vault.adapter.getResourcePath(imageUrl);
                }
                headEl.addClass('thumb');
                headEl.setAttr('style', `background-image: url(${imageUrl});`);
            }

            if (this.headText) {
                headEl.textContent = this.headText;
            }
        }
        else if (this.cardStyle == CardStyle.Folder) {
            headEl.addClasses(['thumb-color', 'thumb-color-folder']);
            headEl.textContent = 'Folder';
        }
        else if (this.cardStyle == CardStyle.Note) {
            headEl.addClasses(['thumb-color', 'thumb-color-note']);
            headEl.textContent = 'Note';
        }
        // article
        let articleEl = cardEl.appendChild(document.createElement('article'));
        // Title
        if (this.titleLink) {
            let titleEl = articleEl.appendChild(document.createElement('a'));
            if (this.titleLink.endsWith('.md')) {
                titleEl.addClass('internal-link');
            }
            titleEl.href = this.titleLink;
            let h1El = document.createElement('h1');
            h1El.textContent = this.title;
            titleEl.appendChild(h1El);
        }
        else {
            let titleEl = articleEl.appendChild(document.createElement('h1'));
            titleEl.textContent = this.title;
        }
        // abstract
        let briefEl = articleEl.appendChild(document.createElement('p'));
        briefEl.textContent = this.abstract;
        // footnote
        if (this.footnote) {
            let footEl = articleEl.appendChild(document.createElement('span'));
            footEl.textContent = this.footnote;
        }
        // close
        return cardEl;
    }
}

