// Builds the GitHub release notes for a version from doc/change-log.md.
// Usage: node scripts/release-notes.mjs [version]   (defaults to the manifest version)
// A change log entry belongs to a version when its line ends with "(<version>)" or ", <version>)".
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changeLogUrl = 'https://github.com/SamPlaysKeys/obsidian-folder-note-revamped-plugin/blob/main/doc/change-log.md';

export function changeLogEntries(version) {
    const escaped = version.replace(/\./g, '\\.');
    const tagged = new RegExp(`(\\(|, )${escaped}\\)\\s*$`);
    const lines = readFileSync(resolve(root, 'doc/change-log.md'), 'utf8').split('\n');
    return lines.filter((line) => line.startsWith('- ') && tagged.test(line));
}

export function releaseNotes(version) {
    const entries = changeLogEntries(version).map((line) => line.replace(new RegExp(`(\\(|, )${version.replace(/\./g, '\\.')}\\)\\s*$`), (m, p) => (p === '(' ? '' : ')')).trimEnd());
    return `## Changes\n\n${entries.join('\n')}\n\nFull change log: [doc/change-log.md](${changeLogUrl})\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const version = process.argv[2] || JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')).version;
    if (changeLogEntries(version).length === 0) {
        console.error(`doc/change-log.md has no entry tagged (${version})`);
        process.exit(1);
    }
    process.stdout.write(releaseNotes(version));
}
