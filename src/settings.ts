import {
    App,
    PluginSettingTab,
    Setting,
} from 'obsidian';

import FolderNotePlugin from './main';

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------

export interface FolderNotePluginSettings {
    folderNoteHide: boolean;
    folderNoteType: string;
    folderNoteName: string;
    folderNoteKey: string;
    folderNoteAutoRename: boolean;
    folderDelete2Note: boolean;
    folderNoteStrInit: string;
}

export const FOLDER_NOTE_DEFAULT_SETTINGS: FolderNotePluginSettings = {
    folderNoteHide: true,
    folderNoteType: 'inside',
    folderNoteName: '_about_',
    folderNoteKey: 'ctrl',
    folderNoteAutoRename: true,
    folderDelete2Note: false,
    folderNoteStrInit: '# {{FOLDER_NAME}} Overview\n {{FOLDER_BRIEF_LIVE}} \n'
}

// ------------------------------------------------------------
// Settings Tab
// ------------------------------------------------------------

export class FolderNoteSettingTab extends PluginSettingTab {
    plugin: FolderNotePlugin;

    constructor(app: App, plugin: FolderNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Folder Note Plugin: Settings.' });

        new Setting(containerEl)
            .setName('Note File Method')
            .setDesc('Select the method to put your folder note file. (Read doc for more information.)')
            .addDropdown(dropDown =>
                dropDown
                .addOption('index', 'Index File')
                .addOption('inside', 'Folder Name Inside')
                .addOption('outside', 'Folder Name Outside')
                .setValue(this.plugin.settings.folderNoteType || 'inside')
                .onChange((value: string) => {
                    this.plugin.settings.folderNoteType = value;
                    this.plugin.saveSettings();
                    this.display();
                }));

        if (this.plugin.settings.folderNoteType == 'index') {
            new Setting(containerEl)
                .setName('Index File Name')
                .setDesc('Set the index file name for folder note. (only for the Index method)')
                .addText(text => text
                    .setValue(this.plugin.settings.folderNoteName)
                    .onChange(async (value) => {
                        // console.log('Secret: ' + value);
                        this.plugin.settings.folderNoteName = value;
                        await this.plugin.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('Initial Content')
            .setDesc('Set the initial content for new folder note. {{FOLDER_NAME}} will be replaced with current folder name.')
            .addTextArea(text => {
                text
                    .setPlaceholder('About the folder.')
                    .setValue(this.plugin.settings.folderNoteStrInit)
                    .onChange(async (value) => {
                        try {
                            this.plugin.settings.folderNoteStrInit = value;
                            await this.plugin.saveSettings();
                        } catch (e) {
                            return false;
                        }
                    })
                text.inputEl.rows = 8;
                text.inputEl.cols = 50;
            });
        
        new Setting(containerEl)
            .setName('Key for New Note')
            .setDesc('Key + Click a folder to create folder note file. ')
            .addDropdown(dropDown =>
                dropDown
                .addOption('ctrl', 'Ctrl + Click')
                .addOption('alt', 'Alt + Click')
                .setValue(this.plugin.settings.folderNoteKey || 'ctrl')
                .onChange((value: string) => {
                    this.plugin.settings.folderNoteKey = value;
                    this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Hide Folder Note')
            .setDesc('Hide the folder note file in the file explorer panel.')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.folderNoteHide);
                toggle.onChange(async (value) => {
                    this.plugin.settings.folderNoteHide = value;
                    await this.plugin.saveSettings();
                });
            });
        
        if (this.plugin.settings.folderNoteType != 'index') {
            new Setting(containerEl)
                .setName('Auto Rename')
                .setDesc('Try to automatically rename the folder note if a folder name is changed. (Experimental)')
                .addToggle((toggle) => {
                    toggle.setValue(this.plugin.settings.folderNoteAutoRename);
                    toggle.onChange(async (value) => {
                        this.plugin.settings.folderNoteAutoRename = value;
                        await this.plugin.saveSettings();
                    });
                });
        }
        
        if (this.plugin.settings.folderNoteType == 'outside') {
            new Setting(containerEl)
                .setName('Delete Folder Note')
                .setDesc('Try to delete folder note when a folder is deleted. (Dangerous)')
                .addToggle((toggle) => {
                    toggle.setValue(this.plugin.settings.folderDelete2Note);
                    toggle.onChange(async (value) => {
                        this.plugin.settings.folderDelete2Note = value;
                        await this.plugin.saveSettings();
                    });
                });
        }
    }
}
