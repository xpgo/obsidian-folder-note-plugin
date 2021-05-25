import { Plugin, MarkdownView } from 'obsidian';

import * as Yaml from 'yaml';
import { FolderBrief } from './folder-brief';
import { FolderNote } from './folder-note';
import { ccardProcessor } from './ccard-block';

import {
  FolderNotePluginSettings,
  FOLDER_NOTE_DEFAULT_SETTINGS,
  FolderNoteSettingTab,
} from './settings';

// ------------------------------------------------------------
// FolderNotePlugin
// ------------------------------------------------------------

enum NoteFileMethod {
  Index,
  Inside,
  Outside,
}

const commonSelector = ' > div.nav-folder-title > div.nav-folder-title-content';
const selector = '.nav-folder' + commonSelector;

type divModified = HTMLDivElement & { modified?: true };

export default class FolderNotePlugin extends Plugin {
  settings: FolderNotePluginSettings;
  folderNote: FolderNote;

  clickHandler = (evt: MouseEvent) => {
    const folderContentEl = evt.target as HTMLDivElement;
    if (folderContentEl.hasClass('is-being-renamed')) return;

    evt.stopPropagation();
    // get the folder path
    const folderElem = this.folderNote.setByFolderElement(folderContentEl);
    // open the infor note
    if (this.folderNote.folderPath.length > 0) {
      // any key?
      let newKey = false;
      if (this.settings.folderNoteKey == 'ctrl') {
        newKey = evt.ctrlKey || evt.metaKey;
      } else if (this.settings.folderNoteKey == 'alt') {
        newKey = evt.altKey;
      }
      // open it
      this.folderNote
        .openFolderNote(folderElem, newKey, evt.type === 'auxclick')
        .then((success) => {
          if (!success && evt.type === 'click') folderElem.click();
        });
    } else {
      if (evt.type === 'click') folderElem.click();
    }
  };

  async onload() {
    console.log('Loading Folder Note plugin.');

    // load settings
    await this.loadSettings();

    // for ccard rendering
    this.registerMarkdownCodeBlockProcessor(
      'ccard',
      async (source, el, ctx) => {
        // run processer
        let proc = new ccardProcessor(this.app);
        await proc.run(source, el, ctx, this.folderNote);
      },
    );

    // for rename event
    this.registerEvent(
      this.app.vault.on('rename', (newPath, oldPath) =>
        this.handleFileRename(newPath, oldPath),
      ),
    );

    // for remove folder
    this.registerEvent(
      this.app.vault.on('delete', (file) => this.handleFileDelete(file)),
    );

    // for settings
    this.addSettingTab(new FolderNoteSettingTab(this.app, this));

    // for file explorer click
    this.app.workspace.onLayoutReady(() => {
      const setupNewEl = (el: HTMLElement) => {
        let folderContentEl;
        if (el.hasClass('nav-folder')) {
          folderContentEl = el.querySelector(
            ':scope' + commonSelector,
          ) as divModified;
        } else {
          folderContentEl = el as divModified;
        }
        this.folderNote.setupElHide(folderContentEl);
        if (folderContentEl.modified !== undefined) return;
        else folderContentEl.modified = true;
        this.registerDomEvent(folderContentEl, 'click', this.clickHandler);
      };
      this.app.workspace.getLeavesOfType('file-explorer').forEach((leaf) => {
        const container = leaf.view.containerEl;
        container.querySelectorAll(selector).forEach(setupNewEl);
        const obs = new MutationObserver((list) => {
          list.forEach((m) => {
            if ((m.target as HTMLElement).hasClass('nav-folder-children'))
              m.addedNodes.forEach((added) => {
                if (
                  added instanceof HTMLElement &&
                  added.hasClass('nav-folder')
                )
                  setupNewEl(added);
                else return;
              });
          });
        });
        obs.observe(container, { childList: true, subtree: true });
      });
    });
    this.registerDomEvent(document, 'auxclick', (evt) => {
      if (
        evt.button === 1 &&
        evt.target instanceof HTMLElement &&
        evt.target.matches(selector)
      )
        this.clickHandler(evt);
    });

    this.addCommand({
      id: 'insert-folder-brief',
      name: 'Insert Folder Brief',
      callback: async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          const editor = view.sourceMode.cmEditor;
          const activeFile = this.app.workspace.getActiveFile();
          // generate brief
          let folderBrief = new FolderBrief(this.app);
          let folderPath = await this.folderNote.getNoteFolderBriefPath(
            activeFile.path,
          );
          let briefCards = await folderBrief.makeBriefCards(
            folderPath,
            activeFile.path,
          );
          editor.replaceSelection(briefCards.getYamlCode(), 'end');
        }
      },
      hotkeys: [],
    });

    this.addCommand({
      id: 'note-to-folder',
      name: 'Make Current Note to Folder',
      callback: async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          const activeFile = this.app.workspace.getActiveFile();
          this.folderNote.setByNotePath(activeFile.path);
          await this.folderNote.newNoteFolder();
        }
      },
      hotkeys: [],
    });
  }

  onunload() {
    console.log('Unloading Folder Note plugin');
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.getLeavesOfType('file-explorer').forEach((leaf) => {
        const container = leaf.view.containerEl;
        container.querySelectorAll(selector).forEach((el) => {
          (el as divModified).modified = undefined;
        });
      });
    });
  }

  updateFolderNote() {
    this.folderNote = new FolderNote(
      this.app,
      this.settings.folderNoteType,
      this.settings.folderNoteName,
    );
    this.folderNote.initContent = this.settings.folderNoteStrInit;
    this.folderNote.hideNoteFile = this.settings.folderNoteHide;
  }

  async loadSettings() {
    this.settings = Object.assign(
      FOLDER_NOTE_DEFAULT_SETTINGS,
      await this.loadData(),
    );
    this.updateFolderNote();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateFolderNote();
  }

  // keep notefile name to be the folder name
  async handleFileRename(newPath: any, oldPath: any) {
    if (!this.settings.folderNoteAutoRename) return;
    this.folderNote.syncName(newPath, oldPath);
  }

  // delete folder
  async handleFileDelete(pathToDel: any) {
    if (!this.settings.folderDelete2Note) return;
    this.folderNote.deleteFolder(pathToDel.path);
  }
}
