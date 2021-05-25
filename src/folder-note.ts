import { App, MarkdownView, TFile } from 'obsidian';
import { FolderBrief } from './folder-brief';

// ------------------------------------------------------------
// Folder Note
// ------------------------------------------------------------

enum NoteFileMethod {
  Index,
  Inside,
  Outside,
}

function getPathFromEl(folderContentEl: HTMLDivElement): string {
  if (!folderContentEl.hasClass('nav-folder-title-content'))
    throw new TypeError('not folderContentEl');

  const folderName = folderContentEl.getText();
  const folderElem = folderContentEl.parentElement;
  let folderPath = folderElem.attributes.getNamedItem('data-path').textContent;

  // fix the folder path
  if (folderPath.length > 0) {
    var slashLast = folderPath.lastIndexOf('/');
    var folderPathLast = folderPath.split('/').pop();
    if (folderPathLast != folderName) {
      folderPath = folderPath.substring(0, slashLast + 1) + folderName;
    }
  }
  return folderPath.trim();
}

// get file base name
function getFileBaseName(filePath: string) {
  var baseName = filePath.split('/').pop();
  var dotPos = baseName.lastIndexOf('.');
  if (dotPos > 0) baseName = baseName.substring(0, dotPos);
  return baseName;
}

export class FolderNote {
  app: App;
  // copy from settings
  method: NoteFileMethod;
  indexBase?: string;
  initContent: string;
  hideNoteFile: boolean;
  // local vars
  folderPath: string;
  notePath: string;
  noteBase: string;
  // for rename
  filesToRename: string[];
  filesToRenameSet: boolean;

  constructor(app: App, methodStr: string, indexBase: string) {
    this.app = app;
    this.setMethod(methodStr, indexBase);
    this.emptyPath();
    // for rename
    this.filesToRename = [];
    this.filesToRenameSet = false;
  }

  // set the method
  setMethod(methodStr: string, indexBase: string) {
    if (methodStr == 'index') {
      this.method = NoteFileMethod.Index;
      this.indexBase = indexBase;
    } else if (methodStr == 'inside') {
      this.method = NoteFileMethod.Inside;
    } else if (methodStr == 'outside') {
      this.method = NoteFileMethod.Outside;
    }
  }

  // clear
  emptyPath() {
    this.folderPath = '';
    this.notePath = '';
    this.noteBase = '';
  }

  // set by folder path
  setByFolderPath(path: string) {
    this.emptyPath();
    var folderPath = path.trim();
    if (folderPath.length == 0) return;

    // set
    this.folderPath = folderPath;
    const { noteBaseName, notePath } = this.getFolderNotePath(folderPath);
    this.notePath = notePath;
    this.noteBase = noteBaseName;
  }

  // set by note, should ends with .md
  setByNotePath(path: string) {
    this.emptyPath();
    var notePath = path.trim();
    if (notePath.length == 0) return;
    if (!notePath.endsWith('.md')) return;

    // set
    this.notePath = notePath;
    this.noteBase = getFileBaseName(notePath);
    this.folderPath = this.getNoteFolderPath(notePath);
  }

  // set by folder element
  setByFolderElement(folderContentEl: HTMLDivElement) {
    // set to mine
    this.setByFolderPath(getPathFromEl(folderContentEl));
    // return the element in useage
    return folderContentEl.parentElement;
  }

  // get folder note path by folder path
  getFolderNotePath(folderPath: string): {
    notePath: string;
    noteBaseName: string;
  } {
    let notePath: string, noteBaseName: string;
    if (this.method == NoteFileMethod.Index) {
      noteBaseName = this.indexBase;
      notePath = folderPath + '/' + this.indexBase + '.md';
    } else {
      noteBaseName = folderPath.split('/').pop();
      if (this.method == NoteFileMethod.Inside) {
        notePath = folderPath + '/' + noteBaseName + '.md';
      } else if (this.method == NoteFileMethod.Outside) {
        notePath = folderPath + '.md';
      }
    }
    // console.log('notePath: ', notePath);
    return { notePath, noteBaseName };
  }

  // get note folder, make sure it is a note file
  getNoteFolderPath(notePath: string) {
    var folderPath = '';
    if (this.method == NoteFileMethod.Index) {
      folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
    } else if (this.method == NoteFileMethod.Inside) {
      folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
    } else if (this.method == NoteFileMethod.Outside) {
      folderPath = notePath.substring(0, notePath.length - 3);
    }
    return folderPath;
  }

  async setupElHide(folderContentEl: HTMLDivElement) {
    // get the folder path
    if (!folderContentEl.hasClass('nav-folder-title-content'))
      throw new TypeError('Not folderContentEl');

    const folderPath = getPathFromEl(folderContentEl);
    const { noteBaseName, notePath } = this.getFolderNotePath(folderPath);
    const folderElem = folderContentEl.parentElement;
    if (folderPath) {
      const folderNoteExists = await this.app.vault.adapter.exists(notePath);
      if (folderNoteExists) this.hideFolderNote(folderElem, noteBaseName);
    }
  }

  // check if it is folder note name
  async isFolderNotePath(notePath: string) {
    var isFN = false;
    if (!notePath.endsWith('.md')) return false;

    if (this.method == NoteFileMethod.Index) {
      isFN = notePath.endsWith(`/${this.indexBase}.md`);
    } else if (this.method == NoteFileMethod.Inside) {
      var noteBaseName = getFileBaseName(notePath);
      if (notePath.endsWith(noteBaseName + '/' + noteBaseName + '.md')) {
        isFN = true;
      }
    } else if (this.method == NoteFileMethod.Outside) {
      var folderPath = notePath.substring(0, notePath.length - 3);
      isFN = await this.app.vault.adapter.exists(folderPath);
    }
    return isFN;
  }

  // check is folder note file?
  async isFolderNote(notePath: string) {
    var isFN = false;
    if (this.method == NoteFileMethod.Index) {
      isFN = notePath.endsWith(`/${this.indexBase}.md`);
    } else if (this.method == NoteFileMethod.Inside) {
      var noteBaseName = getFileBaseName(notePath);
      isFN = notePath.endsWith(`${noteBaseName}/${noteBaseName}.md`);
    } else if (this.method == NoteFileMethod.Outside) {
      var folderPath = notePath.substring(0, notePath.length - 3);
      isFN = await this.app.vault.adapter.exists(folderPath);
    }
    return isFN;
  }

  // open note file
  async openFolderNote(
    folderElem: Element,
    doCreate: boolean,
    newLeaf = false,
  ): Promise<boolean> {
    // check note file
    let folderNoteExists = await this.app.vault.adapter.exists(this.notePath);
    if (!folderNoteExists && doCreate) {
      await this.newFolderNote();
      folderNoteExists = true;
    }

    // open the note
    if (folderNoteExists) {
      this.hideFolderNote(folderElem, this.noteBase);
      // show the note
      this.app.workspace.openLinkText(this.notePath, '', newLeaf, {
        active: true,
      });
    } else if (folderElem.hasClass('has-folder-note')) {
      folderElem.removeClass('has-folder-note');
    }

    return folderNoteExists;
  }

  // create folder note
  async newFolderNote() {
    let noteInitContent = await this.expandContent(this.initContent);
    await this.app.vault.adapter.write(this.notePath, noteInitContent);
  }

  // create folder by note
  async newNoteFolder() {
    if (this.method == NoteFileMethod.Outside) {
      let folderExists = await this.app.vault.adapter.exists(this.folderPath);
      if (!folderExists) {
        await this.app.vault.adapter.mkdir(this.folderPath);
      }
    } else if (this.method == NoteFileMethod.Inside) {
      var folderPath = this.notePath.substring(0, this.notePath.length - 3);
      let folderExists = await this.app.vault.adapter.exists(folderPath);
      if (!folderExists) {
        await this.app.vault.adapter.mkdir(folderPath);
        var newNotePath = folderPath + '/' + this.noteBase + '.md';
        await this.app.vault.adapter.rename(this.notePath, newNotePath);
        this.app.workspace.openLinkText(newNotePath, '', false, {
          active: true,
        });
      }
    }
  }

  // expand content template
  async expandContent(template: string) {
    // keyword: {{FOLDER_NAME}}, {{FOLDER_PATH}}
    var folderName = this.folderPath.split('/').pop();
    var content = template
      .replace(/{{FOLDER_NAME}}/g, folderName)
      .replace(/{{FOLDER_PATH}}/g, this.folderPath);
    // keyword: {{FOLDER_BRIEF}}
    if (content.contains('{{FOLDER_BRIEF}}')) {
      let folderBrief = new FolderBrief(this.app);
      let briefCards = await folderBrief.makeBriefCards(
        this.folderPath,
        this.notePath,
      );
      content = content.replace('{{FOLDER_BRIEF}}', briefCards.getYamlCode());
    }
    // keyword: {{FOLDER_BRIEF_LIVE}}
    if (content.contains('{{FOLDER_BRIEF_LIVE}}')) {
      const briefLiveCode = '\n```ccard\ntype: folder_brief_live\n```\n';
      content = content.replace('{{FOLDER_BRIEF_LIVE}}', briefLiveCode);
    }
    return content;
  }

  // hide folder note
  hideFolderNote(folderElem: Element, noteBase: string) {
    // modify the element
    const hideSetting = this.hideNoteFile;
    folderElem.addClass('has-folder-note');
    var parentElem = folderElem.parentElement;
    var fileSelector =
      ':scope > div.nav-folder-children > div.nav-file > div.nav-file-title';
    var isOutsideMethod = this.method == NoteFileMethod.Outside;
    if (isOutsideMethod) {
      parentElem = parentElem.parentElement;
      fileSelector = ':scope > div.nav-file > div.nav-file-title';
    }
    if (parentElem) {
      parentElem.querySelectorAll(fileSelector).forEach(function (fileElem) {
        var fileNodeTitle = fileElem.firstElementChild.textContent;
        // console.log('fileNoteTitle: ', fileNodeTitle);
        if (hideSetting && fileNodeTitle == noteBase) {
          fileElem.addClass('is-folder-note');
        } else if (!isOutsideMethod) {
          fileElem.removeClass('is-folder-note');
        }
        // console.log('isOutsideMethod: ', isOutsideMethod);
      });
    }
  }

  // get the file breif path
  async getNoteFolderBriefPath(notePath: string) {
    var folderPath = '';
    let isFN = await this.isFolderNote(notePath);
    if (isFN) {
      folderPath = this.getNoteFolderPath(notePath);
    } else {
      folderPath = notePath.substring(0, notePath.lastIndexOf('/'));
    }
    return folderPath;
  }

  // delete a folder
  async deleteFolder(pathToDel: any) {
    if (this.method == NoteFileMethod.Outside && !pathToDel.endsWith('.md')) {
      // delete a folder
      let myNotePath = pathToDel + '.md';
      let noteExists = await this.app.vault.adapter.exists(myNotePath);
      if (noteExists) {
        await this.app.vault.adapter.trashLocal(myNotePath);
      }
    }
  }

  // sync folder / note name
  async syncName(newPath: any, oldPath: any) {
    if (this.method == NoteFileMethod.Outside) {
      await this.syncNameOutside(newPath, oldPath);
    } else if (this.method == NoteFileMethod.Inside) {
      await this.syncNameInside(newPath, oldPath);
    }
  }

  // sync folder / note name for outside
  async syncNameOutside(newPath: any, oldPath: any) {
    if (!oldPath.endsWith('.md')) {
      // changing folder name
      // console.log('changing folder!!!')
      // console.log('oldPath: ', oldPath);
      // console.log('newPath: ', newPath.path);
      let noteExists = await this.app.vault.adapter.exists(oldPath + '.md');
      if (noteExists) {
        let { notePath: oldNotePath, noteBaseName: oldNoteBase } =
          this.getFolderNotePath(oldPath);
        let { notePath: newNotePath, noteBaseName: newNoteBase } =
          this.getFolderNotePath(newPath.path);
        if (oldNoteBase != newNoteBase) {
          await this.app.vault.adapter.rename(oldNotePath, newNotePath);
        }
      }
    } else {
      // changeing note name
      let isFN = await this.isFolderNote(oldPath);
      if (isFN) {
        // console.log('oldPath: ', oldPath);
        // console.log('newPath: ', newPath.path);
        var oldFolderPath = this.getNoteFolderPath(oldPath);
        var newFolderPath = this.getNoteFolderPath(newPath.path);
        await this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
      }
    }
  }

  //  sync folder / note name for inside case
  async syncNameInside(newPath: any, oldPath: any) {
    if (!oldPath.endsWith('.md')) {
      // changing folder name
      let { noteBaseName: oldNoteBase } = this.getFolderNotePath(oldPath);
      let { notePath: newNotePath } = this.getFolderNotePath(newPath.path);
      var oldNotePathNew = newPath.path + '/' + oldNoteBase + '.md';
      let noteExists = await this.app.vault.adapter.exists(oldNotePathNew);
      if (noteExists) {
        if (newNotePath != oldNotePathNew) {
          // put it to rename
          this.filesToRename.push(oldNotePathNew);
          this.filesToRename.push(newNotePath);
        }
      }
    } else if (this.filesToRename.length == 0) {
      // changing note name
      let isFN = await this.isFolderNote(oldPath);
      if (isFN) {
        var oldFolderPath = this.getNoteFolderPath(oldPath);
        // find the new path
        var noteDir = newPath.path;
        noteDir = noteDir.substring(0, noteDir.lastIndexOf('/'));
        noteDir = noteDir.substring(0, noteDir.lastIndexOf('/'));
        var noteBase = newPath.path.split('/').pop();
        noteBase = noteBase.substring(0, noteBase.length - 3);
        var newFolderPath = '';
        if (noteDir.length > 0) {
          newFolderPath = noteDir + '/' + noteBase;
        } else {
          newFolderPath = noteBase;
        }
        // put it to rename
        if (oldFolderPath != newFolderPath) {
          this.filesToRename.push(oldFolderPath);
          this.filesToRename.push(newFolderPath);
        }
      }
    }
    // only do once a time
    if (!this.filesToRenameSet && this.filesToRename.length > 0) {
      this.filesToRenameSet = true;
      setTimeout(() => {
        // console.log('rename is running after 1 s.');
        if (this.filesToRename.length) {
          var oldFolderPath = this.filesToRename[0];
          var newFolderPath = this.filesToRename[1];
          // console.log('Mod Old Path:', oldFolderPath);
          // console.log('Mod New Path:', newFolderPath);
          this.app.vault.adapter.rename(oldFolderPath, newFolderPath);
          this.filesToRename = [];
          this.filesToRenameSet = false;
        }
      }, 1000);
    }
  }
}
