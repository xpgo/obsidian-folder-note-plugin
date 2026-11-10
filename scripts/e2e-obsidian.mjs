// End-to-end check inside a real, running Obsidian, driven by the Obsidian CLI.
//
// Usage: npm run test:e2e                      create a throwaway vault, test in it, then delete it
//        npm run test:e2e -- <vault name>      test in an existing vault instead (or VAULT=<name>)
//
// Requirements: Obsidian is running with the Obsidian CLI enabled (Settings -> General ->
// Command line interface). By default a temporary vault is created in the OS temp folder, opened
// in its own Obsidian window, and closed, unregistered and deleted at the end; your own vaults
// are not touched. With an existing vault, the built main.js/manifest.json/styles.css are copied
// over `.obsidian/plugins/folder-note-revamped/` and a `__fnr-e2e__` folder is created and
// deleted, so prefer a throwaway vault. Run `npm run build` first (`npm run check` does).
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const existingVault = process.argv[2] || process.env.VAULT;
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const ID = manifest.id;
const OLD_ID = 'folder-note-plugin';
const DIR = '__fnr-e2e__';

// Run JS in whichever Obsidian window the CLI picks (used to open/remove the temporary vault).
function evAnywhere(code) {
    const out = execFileSync('obsidian', ['eval', `code=${code}`], { encoding: 'utf8' }).trim();
    const line = out.split('\n').find((l) => l.startsWith('=> '));
    if (!line) throw new Error(`Unexpected CLI output: ${out}`);
    return line.slice(3);
}

let vault = existingVault;
let tempVaultPath = null;
if (!vault) {
    tempVaultPath = join(realpathSync(tmpdir()), `fnr-e2e-${randomBytes(4).toString('hex')}`);
    vault = tempVaultPath.split('/').pop();
    // Same call Obsidian's own vault picker makes. `true` creates the vault (the folder must not exist yet).
    const opened = evAnywhere(`JSON.stringify(require('electron').ipcRenderer.sendSync('vault-open', ${JSON.stringify(tempVaultPath)}, true))`);
    if (opened !== 'true') {
        rmSync(tempVaultPath, { recursive: true, force: true });
        console.error(`Could not create a temporary vault: ${opened}. Is Obsidian running with the CLI enabled?`);
        process.exit(2);
    }
    console.log(`Created temporary vault ${vault}`);
    process.on('uncaughtException', (e) => {
        console.error(e.message);
        cleanup();
        process.exit(1);
    });
}

// Run async JS inside Obsidian. `body` is the body of an async function that returns JSON-able data.
function ev(body) {
    const code = `(async()=>{try{const __r=await (async()=>{${body}})();return JSON.stringify({ok:true,r:__r})}catch(e){return JSON.stringify({ok:false,e:String(e&&e.stack||e)})}})()`;
    const out = execFileSync('obsidian', [`vault=${vault}`, 'eval', `code=${code}`], { encoding: 'utf8' }).trim();
    const line = out.split('\n').find((l) => l.startsWith('=> '));
    if (!line) throw new Error(`Unexpected CLI output: ${out}`);
    const res = JSON.parse(line.slice(3));
    if (!res.ok) throw new Error(res.e);
    return res.r;
}

let failures = 0;
const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` - ${detail}` : ''}`);
    if (!ok) failures++;
};

// the new vault window takes a moment to appear
for (let i = 0; ; i++) {
    try {
        ev('return true');
        break;
    } catch (e) {
        if (i >= 40) throw new Error(`Vault "${vault}" did not open: ${e.message}`);
        execFileSync('sleep', ['0.5']);
    }
}
ev('if (!app.plugins.isEnabled()) await app.plugins.setEnable(true); return true');

const info = ev(`return {name: app.vault.getName(), base: app.vault.adapter.basePath,
    oldEnabled: app.plugins.enabledPlugins.has(${JSON.stringify(OLD_ID)})}`);
console.log(`Vault: ${info.name} (${info.base})`);
if (info.oldEnabled) {
    console.error(`The original "${OLD_ID}" plugin is enabled in this vault. Disable it first: both plugins would handle folder clicks.`);
    process.exit(2);
}

// ---- deploy the build ----
const pluginDir = join(info.base, '.obsidian', 'plugins', ID);
mkdirSync(pluginDir, { recursive: true });
for (const f of ['main.js', 'manifest.json', 'styles.css']) {
    if (!existsSync(join(root, f))) throw new Error(`${f} is missing, run "npm run build" first`);
    copyFileSync(join(root, f), join(pluginDir, f));
}

function cleanup() {
    if (tempVaultPath) {
        try {
            ev('setTimeout(() => window.close(), 100); return true');
            execFileSync('sleep', ['2']);
            evAnywhere(`JSON.stringify(require('electron').ipcRenderer.sendSync('vault-remove', ${JSON.stringify(tempVaultPath)}))`);
        } catch (e) {
            console.error(`Could not close the temporary vault window: ${e.message}`);
        }
        rmSync(tempVaultPath, { recursive: true, force: true });
        return;
    }
    try {
        ev(`const f = app.vault.getAbstractFileByPath(${JSON.stringify(DIR)});
            if (f) await app.vault.delete(f, true);
            await app.plugins.disablePlugin(${JSON.stringify(ID)});
            return true`);
    } catch (e) {
        console.error(`Cleanup failed, remove "${DIR}" from the vault manually: ${e.message}`);
    }
}

try {
    // ---- load: the original bug was a silent failure here ----
    const loaded = ev(`
        const id = ${JSON.stringify(ID)};
        await app.plugins.loadManifests();
        await app.plugins.disablePlugin(id);
        await app.plugins.enablePlugin(id);
        const p = app.plugins.plugins[id];
        return {loaded: !!p, version: app.plugins.manifests[id] && app.plugins.manifests[id].version,
                settingTab: !!(app.setting && app.setting.pluginTabs && app.setting.pluginTabs.some(t => t.id === id)) || !!(p && p.settings)};`);
    check('plugin loads (instance registered in app.plugins.plugins)', loaded.loaded);
    check('plugin settings loaded', loaded.settingTab);
    if (!loaded.loaded) throw new Error('Plugin did not load, cannot continue. See `obsidian dev:errors` and `obsidian dev:console`.');

    const cmds = ev(`return Object.keys(app.commands.commands).filter(c => c.startsWith(${JSON.stringify(ID + ':')}))`);
    check('command "Insert Folder Brief" is registered', cmds.includes(`${ID}:insert-folder-brief`));
    check('command "Make Current Note to Folder" is registered', cmds.includes(`${ID}:note-to-folder`));

    // ---- settings tab: the key label matches the host OS ----
    const keyLabels = ev(`
        app.setting.open();
        app.setting.openTabById(${JSON.stringify(ID)});
        await new Promise(r => setTimeout(r, 500));
        const item = [...app.setting.activeTab.containerEl.querySelectorAll('.setting-item')]
            .find(i => i.querySelector('.setting-item-name')?.textContent === 'Key for New Note');
        const options = item ? [...item.querySelectorAll('select:not(.is-measuring) option')].map(o => o.textContent) : [];
        app.setting.close();
        return {options, mac: document.body.classList.contains('mod-macos')};`);
    const expectedKeys = keyLabels.mac ? ['Cmd + Click', 'Option + Click'] : ['Ctrl + Click', 'Alt + Click'];
    check('"Key for New Note" options use the host OS key names', JSON.stringify(keyLabels.options) === JSON.stringify(expectedKeys), JSON.stringify(keyLabels.options));

    // ---- fixtures ----
    ev(`
        await app.vault.adapter.rmdir(${JSON.stringify(DIR)}, true).catch(() => {});
        await app.vault.createFolder(${JSON.stringify(DIR)});
        await app.vault.createFolder(${JSON.stringify(DIR + '/Created')});
        await app.vault.create(${JSON.stringify(DIR + '/Created/Alpha.md')}, '# Alpha\\nFirst note in the folder.');
        await app.vault.create(${JSON.stringify(DIR + '/Created/Beta.md')}, '# Beta\\nSecond note in the folder.');
        await app.vault.create(${JSON.stringify(DIR + '/Loose.md')}, '# Loose\\nA note that should become a folder.');
        // make sure the file explorer exists and the fixture folder is visible
        let leaf = app.workspace.getLeavesOfType('file-explorer')[0];
        if (!leaf) { leaf = app.workspace.getLeftLeaf(false); await leaf.setViewState({type: 'file-explorer'}); }
        await new Promise(r => setTimeout(r, 500));
        return true`);

    const click = (path, mods) => `
        const view = app.workspace.getLeavesOfType('file-explorer')[0].view;
        // folders inside a collapsed parent are not rendered yet (no data-path), so reveal it first
        view.revealInFolder(app.vault.getAbstractFileByPath(${JSON.stringify(path)}));
        await new Promise(r => setTimeout(r, 800));
        const item = view.fileItems[${JSON.stringify(path)}];
        const el = item.selfEl;
        el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, ${mods}}));
        await new Promise(r => setTimeout(r, 1000));`;

    // ---- Ctrl+click creates a folder note and opens it ----
    const created = ev(`
        ${click(DIR + '/Created', 'ctrlKey: true, metaKey: true')}
        const f = app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Created/Created.md')});
        const active = app.workspace.getActiveFile();
        return {exists: !!f, active: active && active.path,
                content: f ? await app.vault.read(f) : null};`);
    check('Ctrl+click on a folder creates <folder>/<folder>.md', created.exists);
    check('the new folder note is opened', created.active === `${DIR}/Created/Created.md`, String(created.active));
    check('the new folder note uses the initial template', !!created.content && created.content.includes('# Created Overview') && created.content.includes('ccard'), String(created.content));

    // ---- decorations ----
    // The note is only hidden once the folder's children are rendered (known issue: "Click it
    // again to hide"), so collapse the folder and plain-click it to expand it like a user would.
    ev(`
        const view = app.workspace.getLeavesOfType('file-explorer')[0].view;
        view.fileItems[${JSON.stringify(DIR + '/Created')}].setCollapsed(true);
        await new Promise(r => setTimeout(r, 500));
        return true`);
    const deco = ev(`
        ${click(DIR + '/Created', '')}
        const view2 = app.workspace.getLeavesOfType('file-explorer')[0].view;
        const folderEl = view2.fileItems[${JSON.stringify(DIR + '/Created')}].selfEl;
        const noteEl = document.querySelector('.is-folder-note');
        return {hasClass: folderEl.classList.contains('has-folder-note'),
                noteHidden: !!noteEl && getComputedStyle(noteEl).display === 'none'};`);
    check('folder gets the has-folder-note class', deco.hasClass);
    check('folder note is hidden in the file explorer', deco.noteHidden);

    // ---- ccard rendering (reading view) ----
    const rendered = ev(`
        const leaf = app.workspace.getLeaf(false);
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Created/Created.md')});
        await leaf.openFile(file);
        await leaf.setViewState({type: 'markdown', state: {file: file.path, mode: 'preview'}, active: true});
        await new Promise(r => setTimeout(r, 1500));
        const root = leaf.view.containerEl;
        const cards = root.querySelectorAll('.cute-card-view, .strip-card-view');
        return {count: cards.length, text: root.querySelector('.markdown-preview-view').innerText};`);
    check('ccard block renders cards for the notes in the folder', rendered.count >= 2, `cards: ${rendered.count}`);
    check('rendered cards show the note titles', rendered.text.includes('Alpha') && rendered.text.includes('Beta'), rendered.text);

    // ---- commands ----
    const brief = ev(`
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Created/Alpha.md')});
        const leaf = app.workspace.getLeaf(false);
        await leaf.openFile(file);
        await leaf.setViewState({type: 'markdown', state: {file: file.path, mode: 'source'}, active: true});
        await new Promise(r => setTimeout(r, 500));
        const editor = leaf.view.editor;
        const before = editor.getValue();
        app.commands.executeCommandById(${JSON.stringify(ID + ':insert-folder-brief')});
        await new Promise(r => setTimeout(r, 1000));
        return {before: before.length, after: editor.getValue().length, hasBlock: editor.getValue().includes('ccard')};`);
    check('"Insert Folder Brief" inserts a ccard block into the note', brief.after > brief.before && brief.hasBlock);

    const toFolder = ev(`
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Loose.md')});
        const leaf = app.workspace.getLeaf(false);
        await leaf.openFile(file);
        await new Promise(r => setTimeout(r, 500));
        app.commands.executeCommandById(${JSON.stringify(ID + ':note-to-folder')});
        await new Promise(r => setTimeout(r, 1500));
        return {moved: !!app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Loose/Loose.md')}),
                oldGone: !app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Loose.md')})};`);
    check('"Make Current Note to Folder" creates <name>/<name>.md', toFolder.moved && toFolder.oldGone, JSON.stringify(toFolder));

    // ---- rename sync ----
    const renamed = ev(`
        const folder = app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Created')});
        await app.fileManager.renameFile(folder, ${JSON.stringify(DIR + '/Renamed')});
        await new Promise(r => setTimeout(r, 3000));
        return {note: !!app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Renamed/Renamed.md')}),
                oldNote: !!app.vault.getAbstractFileByPath(${JSON.stringify(DIR + '/Renamed/Created.md')})};`);
    check('renaming a folder renames its folder note too', renamed.note && !renamed.oldNote, JSON.stringify(renamed));

    // ---- no errors reported while all of this ran ----
    const errs = execFileSync('obsidian', [`vault=${vault}`, 'dev:errors'], { encoding: 'utf8' });
    const mine = errs.split('\n').filter((l) => /folder-note|ccard|FolderNote/i.test(l));
    check('no plugin errors captured by Obsidian', mine.length === 0, mine.join('\n'));
} catch (e) {
    console.error(`\nAborted: ${e.message}`);
    failures++;
} finally {
    cleanup();
}

console.log(failures === 0 ? '\nAll end-to-end checks passed.' : `\n${failures} end-to-end check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
