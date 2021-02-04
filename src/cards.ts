
// ------------------------------------------------------------
// Card block
// ------------------------------------------------------------

enum CardStyle {
	Folder, Note, Image,
}

class CardBlock {
	style: string;
	col: number;
	cards: CardItem[];

	constructor() {
		this.style = 'cute';
		this.cards = [];
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

	getHtmlCode() {
		var htmlSec = '\n<div class="cute-card-band">\n';
		for (var i in this.cards) {
			htmlSec += this.cards[i].getHtmlCode();
		}
		htmlSec += '</div>\n\n';
		return htmlSec;
	}

	getDocElement() {
		const cardDiv = document.createElement('div');
		cardDiv.addClass('cute-card-band');
		var htmlSec = '';
		for (var i in this.cards) {
			htmlSec += this.cards[i].getHtmlCode();
		}
		cardDiv.innerHTML = htmlSec;
		return cardDiv;
	}

	fromYamlCards(yaml: any) {
		if (yaml.cards) {
			this.clear();
			const cardsInfo = yaml.cards;
			for (var i in cardsInfo) {
				const cardInfo = cardsInfo[i];
				if ('title' in cardInfo) {
					let cardItem = new CardItem(cardInfo['title'], CardStyle.Note);
					cardItem.fromDict(cardInfo);
					this.addCard(cardItem);
				}
			}
			return true;
		} 

		return false;
	}
}

class CardItem {
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
		if ('head' in dict) this.headText = dict['head'];
		if ('image' in dict) this.headImage = dict['image'];
		if ('link' in dict) this.titleLink = dict['link'];
		if ('brief' in dict) this.abstract = dict['brief'];
		if ('foot' in dict) this.footnote = dict['foot'];
	}

	getHtmlCode() {
		var htmlSec = '<div class="cute-card-view">\n';
		// Heading
		if (this.headImage) {
			this.cardStyle = CardStyle.Image;
			if (this.headImage.startsWith("#")) {
				htmlSec += '<div class="thumb-color" style="background-color: ';
				htmlSec += this.headImage + ';">';
			}
			else {
				htmlSec += '<div class="thumb" style="background-image: url(';
				htmlSec += this.headImage + ');">';
			}
			if (this.headText) {
				htmlSec += this.headText;
			}
			htmlSec += '</div>\n'
		}
		else if (this.cardStyle == CardStyle.Folder) {
			htmlSec += '<div class="thumb-color thumb-color-folder">';
			htmlSec += 'Folder';
			htmlSec += '</div>\n';
		}
		else if (this.cardStyle == CardStyle.Note) {
			htmlSec += '<div class="thumb-color thumb-color-note">';
			htmlSec += 'Note';
			htmlSec += '</div>\n';
		}
		// Title
		htmlSec += '<article>\n';
		if (this.titleLink) {
			if (this.titleLink.endsWith('.md')) {
				htmlSec += '<a class="internal-link" href="';
			}
			else {
				htmlSec += '<a href="';
			}
			htmlSec += this.titleLink + '"><h1>' + this.title + '</h1></a>\n'
		}
		else {
			htmlSec += '<h1>' + this.title + '</h1>\n';
		}
		// abstract
		htmlSec += '<p>' + this.abstract + '</p>\n';
		// footnote
		if (this.footnote) {
			htmlSec += '<span> ' + this.footnote + '</span>\n';
		}
		// close
		htmlSec += '</article>\n</div>\n';
		return htmlSec;
	}
}
