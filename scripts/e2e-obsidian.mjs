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
const STARTUP_DELAY_SECONDS = 2;

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
    // Give Obsidian a moment to be ready: right after it starts, the CLI answers "Command eval not found".
    execFileSync('sleep', [String(STARTUP_DELAY_SECONDS)]);
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
        // same base name as the folder, but not .md: must never be hidden as the folder note
        await app.vault.createBinary(${JSON.stringify(DIR + '/Created/Created.pdf')}, new TextEncoder().encode('%PDF-1.4\\n').buffer);
        await app.vault.create(${JSON.stringify(DIR + '/Created/Created.base')}, 'views:\\n  - type: table\\n    name: Table\\n');
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
        const state = (p) => {
            const el = view2.fileItems[p] && view2.fileItems[p].selfEl;
            return el ? {rendered: !!el.offsetParent, hasClass: el.classList.contains('is-folder-note'),
                         display: getComputedStyle(el).display} : null;
        };
        return {hasClass: folderEl.classList.contains('has-folder-note'),
                noteHidden: !!noteEl && getComputedStyle(noteEl).display === 'none',
                notePath: noteEl && noteEl.getAttribute('data-path'),
                pdf: state(${JSON.stringify(DIR + '/Created/Created.pdf')}),
                base: state(${JSON.stringify(DIR + '/Created/Created.base')})};`);
    check('folder gets the has-folder-note class', deco.hasClass);
    check('folder note is hidden in the file explorer', deco.noteHidden);
    check('only <folder>.md is hidden as the folder note', deco.notePath === `${DIR}/Created/Created.md`, String(deco.notePath));
    check('<folder>.pdf stays visible next to the folder note', !!deco.pdf && deco.pdf.rendered && !deco.pdf.hasClass && deco.pdf.display !== 'none', JSON.stringify(deco.pdf));
    check('<folder>.base stays visible next to the folder note', !!deco.base && deco.base.rendered && !deco.base.hasClass && deco.base.display !== 'none', JSON.stringify(deco.base));

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

    // ---- ccard uses the note that contains the block, not the active note ----
    // Render a note with a live brief in one pane while a note from another folder is active in
    // a second pane (the same applies to hover previews, embeds and canvas).
    const ctxRender = ev(`
        const d = ${JSON.stringify(DIR)};
        await app.vault.createFolder(d + '/CtxA');
        await app.vault.createFolder(d + '/CtxB');
        await app.vault.create(d + '/CtxA/Host.md', '\`\`\`ccard\\ntype: folder_brief_live\\n\`\`\`');
        await app.vault.create(d + '/CtxA/InA.md', '# InA\\nLives next to the host note.');
        await app.vault.create(d + '/CtxB/Other.md', '# Other\\nThe active note.');
        await app.vault.create(d + '/CtxB/InB.md', '# InB\\nLives next to the active note.');
        const hostFile = app.vault.getAbstractFileByPath(d + '/CtxA/Host.md');
        const hostLeaf = app.workspace.getLeaf('tab');
        await hostLeaf.setViewState({type: 'markdown', state: {file: hostFile.path, mode: 'preview'}, active: true});
        const otherLeaf = app.workspace.getLeaf('split');
        await otherLeaf.openFile(app.vault.getAbstractFileByPath(d + '/CtxB/Other.md'));
        app.workspace.setActiveLeaf(otherLeaf, {focus: true});
        await new Promise(r => setTimeout(r, 500));
        const activePath = app.workspace.getActiveFile().path;
        const read = async () => {
            hostLeaf.view.previewMode.rerender(true);
            await new Promise(r => setTimeout(r, 1500));
            return hostLeaf.view.containerEl.querySelector('.markdown-preview-view').innerText;
        };
        const withActive = await read();
        const orig = app.workspace.getActiveFile;
        app.workspace.getActiveFile = () => null;
        let noActive;
        try { noActive = await read(); } finally { app.workspace.getActiveFile = orig; }
        hostLeaf.detach();
        otherLeaf.detach();
        return {activePath, withActive, noActive};`);
    check('another note in another folder is active during the render', ctxRender.activePath === `${DIR}/CtxB/Other.md`, String(ctxRender.activePath));
    check('ccard lists the folder of the note that contains it, not of the active note',
        ctxRender.withActive.includes('InA') && !ctxRender.withActive.includes('InB'), ctxRender.withActive);
    check('ccard still renders when there is no active file', ctxRender.noActive.includes('InA'), ctxRender.noActive);

    // ---- ccard lists the vault tree (not hidden folders) ----
    const tree = ev(`
        const d = ${JSON.stringify(DIR)};
        await app.vault.adapter.mkdir(d + '/CtxA/.dotfolder');
        await app.vault.adapter.write(d + '/CtxA/.dotfolder/Secret.md', '# Secret');
        await app.vault.create(d + '/RootHost.md', '\`\`\`ccard\\ntype: folder_brief_live\\nfolder: /\\n\`\`\`');
        const read = async (path) => {
            const leaf = app.workspace.getLeaf('tab');
            await leaf.setViewState({type: 'markdown', state: {file: path, mode: 'preview'}, active: true});
            await new Promise(r => setTimeout(r, 300));
            leaf.view.previewMode.rerender(true);
            await new Promise(r => setTimeout(r, 1500));
            const text = leaf.view.containerEl.querySelector('.markdown-preview-view').innerText;
            leaf.detach();
            return text;
        };
        const root = await read(d + '/RootHost.md');
        const sub = await read(d + '/CtxA/Host.md');
        return {root, sub, hasObsidian: !!app.vault.getAbstractFileByPath('.obsidian')};`);
    check('ccard of the vault root lists the vault folders', tree.root.includes(DIR), tree.root);
    check('ccard of the vault root does not list hidden folders like .obsidian', !tree.root.includes('.obsidian'), tree.root);
    check('ccard does not list notes in hidden folders', tree.sub.includes('InA') && !tree.sub.includes('Secret') && !tree.sub.includes('dotfolder'), tree.sub);

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

    // ---- commands with no active file must not throw ----
    const noFile = ev(`
        const leaf = app.workspace.getLeaf(false);
        await leaf.setViewState({type: 'markdown', state: {file: ${JSON.stringify(DIR + '/Renamed/Alpha.md')}, mode: 'source'}, active: true});
        await new Promise(r => setTimeout(r, 500));
        const orig = app.workspace.getActiveFile;
        const rejections = [];
        const onRej = (e) => rejections.push(String(e.reason));
        window.addEventListener('unhandledrejection', onRej);
        app.workspace.getActiveFile = () => null;
        try {
            app.commands.executeCommandById(${JSON.stringify(ID + ':insert-folder-brief')});
            app.commands.executeCommandById(${JSON.stringify(ID + ':note-to-folder')});
            await new Promise(r => setTimeout(r, 1000));
        } finally {
            app.workspace.getActiveFile = orig;
            window.removeEventListener('unhandledrejection', onRej);
        }
        return {rejections};`);
    check('commands do not throw when there is no active file', noFile.rejections.length === 0, noFile.rejections.join('\n'));

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
