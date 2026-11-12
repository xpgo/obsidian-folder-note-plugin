## What and why

<!-- A short summary of the change and the problem it solves. -->

Refs #

## Checklist

- [ ] `npm run check` passes (type check, build and build verification; this is what CI runs).
- [ ] `npm run build && npm run test:e2e` passes with all checks green. CI cannot run it because it needs the Obsidian desktop app, so please run it yourself. If you could not, say why here (for example, only docs changed):
- [ ] If this changes behavior, I added a check for it to `scripts/e2e-obsidian.mjs`.
- [ ] I added a line to the top `## 1.0.x` list in `doc/change-log.md`, ending with the version it ships in, for example `(1.0.7)`.
- [ ] If this is based on an issue or PR from the original plugin, I named it in the commit message, added a `Co-authored-by` trailer for its author, and credited them in the change log.
