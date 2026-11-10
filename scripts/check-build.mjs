// Static checks on the built plugin. Run after `npm run build`.
// Usage: node scripts/check-build.mjs
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (f) => JSON.parse(readFileSync(resolve(root, f), 'utf8'));

let failures = 0;
const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` - ${detail}` : ''}`);
    if (!ok) failures++;
};

// ---- release files exist ----
for (const f of ['main.js', 'manifest.json', 'styles.css']) {
    const p = resolve(root, f);
    check(`${f} exists and is not empty`, existsSync(p) && statSync(p).size > 0);
}

// ---- manifest / package / versions consistency ----
const manifest = readJson('manifest.json');
const pkg = readJson('package.json');
const versions = readJson('versions.json');

for (const key of ['id', 'name', 'version', 'minAppVersion', 'description', 'author']) {
    check(`manifest.json has "${key}"`, typeof manifest[key] === 'string' && manifest[key].length > 0);
}
check('manifest id is folder-note-revamped', manifest.id === 'folder-note-revamped', `got ${manifest.id}`);
check('manifest version is semver x.y.z', /^\d+\.\d+\.\d+$/.test(manifest.version), manifest.version);
check('package.json version matches manifest.json', pkg.version === manifest.version, `${pkg.version} vs ${manifest.version}`);
check(
    'versions.json maps the manifest version to minAppVersion',
    versions[manifest.version] === manifest.minAppVersion,
    `versions.json[${manifest.version}] = ${versions[manifest.version]}`
);
if (process.env.GITHUB_REF_TYPE === 'tag') {
    check('git tag matches manifest version', process.env.GITHUB_REF_NAME === manifest.version, `${process.env.GITHUB_REF_NAME} vs ${manifest.version}`);
}

// ---- the build output must be loadable by Obsidian ----
const code = readFileSync(resolve(root, 'main.js'), 'utf8');

// ES5 class output (`_super.apply(this, ...)`) breaks on Obsidian's native ES6 Plugin class.
check('main.js has no ES5 class inheritance (_super.apply / __extends)', !/_super\.apply\(|__extends/.test(code));
check('main.js keeps "obsidian" external', /require\(['"]obsidian['"]\)/.test(code));
check('main.js contains no untranspiled TypeScript enums', !/\benum\s+\w+\s*\{/.test(code));

// Load main.js in node against a stub of the obsidian module whose base classes are native ES6
// classes, the same way Obsidian instantiates the plugin. This fails with
// "Class constructor ... cannot be invoked without 'new'" if the build target is wrong.
const stubs = {
    Plugin: class Plugin {
        constructor(app, manifest) {
            this.app = app;
            this.manifest = manifest;
        }
    },
    PluginSettingTab: class PluginSettingTab {
        constructor(app, plugin) {
            this.app = app;
            this.plugin = plugin;
        }
    },
};
const obsidianStub = new Proxy(stubs, {
    get: (target, prop) => {
        if (prop === '__esModule') return false;
        if (!(prop in target)) target[prop] = class {};
        return target[prop];
    },
});
try {
    const Module = createRequire(import.meta.url)('node:module');
    const originalLoad = Module._load;
    Module._load = function (request, ...rest) {
        return request === 'obsidian' ? obsidianStub : originalLoad.call(this, request, ...rest);
    };
    // The plugin only touches `document`/`window` at runtime, but provide minimal globals just in case.
    globalThis.window ??= globalThis;
    let exported;
    try {
        exported = createRequire(import.meta.url)(resolve(root, 'main.js'));
    } finally {
        Module._load = originalLoad;
    }
    const PluginClass = exported?.default ?? exported;
    check('main.js exports a plugin class', typeof PluginClass === 'function');
    const instance = new PluginClass({}, manifest);
    check('plugin class instantiates with native ES6 Plugin base class', typeof instance.onload === 'function');
} catch (e) {
    check('main.js loads and instantiates against an ES6 Plugin base class', false, e.message);
}

console.log(failures === 0 ? '\nAll build checks passed.' : `\n${failures} build check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
