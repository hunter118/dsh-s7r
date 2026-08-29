# Development notes

This is a concise engineering record for contributors. Release-facing changes are tracked in [`../CHANGELOG.md`](../CHANGELOG.md); the stable product intent lives in [`design-spec.md`](./design-spec.md).

## Baseline

- Runtime-tested DSH target: `0.1.1-rc.2`
- Runtime reference commit: `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- Retained peer branch: `0.1.0-rc.7` through `0.1.0-rc.8`
- Audited unsupported preview: `0.1.2-alpha.1` at `cd5ef8148158c3a752a658978873241fdf8e2bbc`
- Latest audit date: 2026-08-29
- Node target: 22.19+ or 24+
- Package manager: pnpm 11.19.0

DSH is in developer preview and permits compatibility-breaking changes. All version-sensitive access therefore remains under `src/dsh-compat/`.

## Implementation milestones

- **0.1** established the dual-face DSH bundle, loopback RPC boundary, System 7 primitives, desktop/window reducer, and first Agent/Timeline/File applications.
- **0.2** added secure credential setup, native folder selection, Agent reopening, independent zsh launch, and browser-safe menu behavior.
- **0.3** replaced whole-desktop rasterization with native bitmap fonts and discrete component-level pixel metrics.
- **0.4** introduced Fit Browser, 10px/12px UI sizing, grayscale depth, streamlined Preview filters, Agent removal/archive handling, faster Terminal polling, and S7R/Knowledge Desk naming.
- **0.5** added system metrics, Puzzle, wallpaper import/processing, and the seamless Cat pattern.
- **0.6** added the Workspace launcher, Agent search/rename/export/archive restore, global Find, integrated background monitor, Context Inspector, desktop aliases, state restore, and notifications.
- **0.7** completed desktop multi-select/Trash, Agent side panels, safe Markdown rendering, relative path drops, toolbar reflow fixes, and Classic Dots defaults.
- **0.8** made Workspace selection and Agent browsing explicit, added non-disruptive stream following, contextual menus, an Agent switcher, and reversible window tiling.
- **0.9** completed object-level contextual menus, native DSH model/Preset/command/Skill/plugin surfaces, Agent Preset Stationery, and exact-scale Balloon Help.
- **0.9.1** added native 8px small-text faces and removed larger-master downscaling from every semantic small-text surface.
- **0.9.2** contained the long plugin inventory, unified DSH Control Center tab typography, and runtime-validated the compatibility boundary against the rc.8 source merge.
- **0.9.3** added S7R-owned text editing menus, guided Agent setup, muted period color, coordinated blue-green wallpapers, fixed desk accessories, and a scale-safe Stationery action bar.
- **0.9.4** moved the installed/runtime baseline to Harness `0.1.1-rc.2`, retained the rc.7/rc.8 peer branch, and recorded the incompatible `0.1.2-alpha.1` client architecture boundary.

## Architecture decisions

- DSH remains authoritative for sessions, events, filesystem access, terminal ownership, credentials, and background jobs.
- Browser-local state is reserved for S7R presentation and reversible convenience state.
- The root slot is replaced through the supported slot service; no DSH DOM is queried or hidden.
- The client bundle embeds PDF.js so Preview needs no CDN or runtime network access.
- Pixel presentation uses native font masters and integer CSS/layout metrics. Only content images are raster-filtered.
- Desktop Trash contains aliases only and cannot delete real user data.
- Agent archives created by S7R are a reversible local hide layer because rc.2 has no public unarchive API.

## Verification summary

The 0.9.4 release candidate has passed:

- strict host and client TypeScript checks;
- 17 Vitest files / 70 deterministic tests;
- production host and self-contained client builds;
- clean tarball installation through the official Harness `0.1.1-rc.2` CLI into an isolated Web profile;
- root replacement, multi-window focus/move/resize/zoom/collapse/tile/reflow;
- Workspace choice, Agent creation/reopen/rename/export/archive/restore;
- current-Workspace Agent grouping/filtering/sorting and Workspace-targeted creation;
- global Find at file-name, source, message, and all-event depth;
- persisted Timeline, folded chunks, Monitor system/background views, and Context Inspector;
- Finder navigation, version-guarded TextEdit saves, image/PDF Preview;
- independent real zsh launch with retained low-latency output;
- Scrapbook, Clock, solvable Puzzle, wallpaper import, and seamless Cat tiling;
- Fit Browser and fixed resolutions at 1×/2× with 10px/12px UI metrics;
- desktop aliases, marquee multi-selection, group dragging, Trash restore, and state reload;
- contextual menu contents, keyboard menu navigation, Agent switching, and exact post-tile layout restoration;
- native DSH model/reasoning, Preset, command/mode, Skill, and 142-entry rc.2 plugin inventory views;
- DSH Agent Preset Stationery and persistent Balloon Help at Fit Browser 1×/2×;
- non-disruptive streamed-output following with an explicit new-output return control;
- safe Markdown on/off and monochrome Emoji normalization;
- clean browser diagnostics apart from expected restart warnings and PDF.js's bundled worker-fallback warning.

## Known upstream limitation

DSH rc.2's terminal API exposes spawn, line send, retained read, signal, status, and close. It does not expose a raw browser PTY byte stream or post-spawn terminal resizing. S7R therefore provides a real line-oriented zsh terminal, reflows its local viewport, reports `terminalResize: false`, and keeps the future resize adapter isolated. It does not reach into private backend state.

## Contributor verification loop

For normal changes:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack
```

For changes touching DSH adapters or layout, additionally install the tarball into a disposable DSH Web profile and smoke-test Fit Browser at 1×/2×. Update [`../COMPATIBILITY.md`](../COMPATIBILITY.md) whenever an upstream seam changes.
