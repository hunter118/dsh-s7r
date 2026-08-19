# S7R product and design specification

This document records the public product intent and the constraints that shape S7R. It replaces the original autonomous-build prompt with a stable design reference for contributors.

## Product vision

S7R is a System 7-era workstation shell for the DeepSeek Harness (DSH) Web UI. It is not a screenshot theme and it does not emulate an operating system. It provides a coherent desktop workflow over real DSH sessions, workspaces, files, terminal services, tools, and persisted history.

The shell has two identities:

- **S7R** is the workstation and desktop environment.
- **Knowledge Desk** is the application that manages Workspaces, Agents, and conversations.

The experience should feel period-consistent without copying Apple assets or pretending to be Apple software.

## Product principles

### Keep DSH authoritative

S7R must preserve DSH's real runtime and persistence model. Agent state, streaming, tools, files, credentials, terminal ownership, and event history stay in DSH. Browser-local state is limited to presentation preferences and S7R-owned conveniences such as desktop aliases, Scrapbook cards, reversible local archives, and window geometry.

### Keep the visible world coherent

Every visible control inside the desktop uses the same square, bitmap-oriented visual language. Modern rounded cards, translucent panels, native browser Emoji, interpolated pixel art, and unstyled host controls are treated as visual defects.

### Prefer useful fidelity

System 7 inspiration should increase clarity and density, not make real work harder. Adaptive browser sizing, Markdown reading, secure credential setup, global search, context management, and real filesystem operations are intentional modern concessions expressed through period-compatible UI.

### Own no proprietary Apple material

S7R ships no Apple logo, copied icon, system screenshot, proprietary font, sound, or extracted system resource. Product copy may describe System 7-era inspiration but must not imply affiliation or endorsement.

## Application surface

The first complete workstation includes:

1. **Knowledge Desk** — Workspace/Agent launcher and conversation window
2. **Finder** — contained Workspace file browser
3. **TextEdit** — version-guarded plain text/code editor
4. **Preview** — image and PDF viewer
5. **Terminal** — real DSH-owned zsh session
6. **Timeline** — complete persisted event ledger
7. **Find** — global search across files and Agent data
8. **Monitor** — live Agents, background work, context, CPU, RAM, and process RSS
9. **Scrapbook** — local source-aware knowledge cards
10. **Clock** and **Puzzle** — small desk accessories
11. **Display** — logical resolution, UI size, pixel magnification, filters, and wallpaper
12. **Settings** — safe `DEEPSEEK_API_KEY` status and mutation

Multiple windows may be open simultaneously. A single reducer owns focus, z-order, bounds, zoom/collapse state, tiling, and reflow.

## Information architecture

### Desktop

The desktop stores only aliases. Workspace, Agent, Finder item, and Scrapbook-card aliases can be dragged, marquee-selected, moved as a group, put in Trash, and restored. Trash never deletes source files, Workspaces, conversations, or cards.

A folder alias has two explicit meanings:

- **Finder Alias** opens the folder in the existing Workspace.
- **Workspace Alias** makes that directory a Workspace and connects its Agent.

Paths dropped into an Agent become `./relative/path` when contained by its current Workspace and remain absolute otherwise.

### Agent windows

The compact toolbar contains status, Context, Timeline, and Other. Context opens an on-demand inspector for provider-reported token pressure, estimated category shares, manual compaction, and a summarized handoff into a new Agent. Other contains rename, export, archive, desktop placement, and final-output Markdown rendering.

Completed text may render a safe subset of Markdown: headings, emphasis, inline/fenced code, lists, quotes, and tables. Streaming remains plain text. Raw HTML is never injected. LaTeX remains source text until a genuinely bitmap-compatible math renderer exists.

### Global Find

Find exposes independent scopes for:

- file and folder names;
- text/source contents;
- visible Agent conversation messages;
- every persisted Agent event, including tools and reasoning.

File results route to Finder/TextEdit/Preview, message results to the Agent, and event results to Timeline. Traversal and results are bounded to keep repository-wide searches responsive.

### Monitor and notifications

Monitor combines system state and background work. It shows live Agent activity, DSH jobs, provider context pressure when available, system CPU, active RAM, and DSH process RSS. Notifications remain minimal and appear only when an Agent crosses into a completed state.

## DSH integration boundary

All unstable DSH assumptions belong under `src/dsh-compat/`.

The browser adapter consumes supported session, workspace, credential, connection, and slot services. The host adapter consumes supported Agent, persistence, filesystem, terminal, and metrics services. Package-specific host calls are loopback-authorized logical RPC.

The compatibility layer must:

- avoid DOM selectors and private UI mutation;
- validate all identifiers crossing RPC;
- contain every file operation under the inspected Workspace root;
- report unavailable capabilities honestly;
- allow cold persisted sessions to be inspected without resuming them;
- keep future DSH version changes local to the adapter.

See [`../COMPATIBILITY.md`](../COMPATIBILITY.md) for the exact rc.7 seams.

## Files and terminal

Finder, TextEdit, and Preview operate on DSH-resolved paths under the selected Workspace. Text saves carry the last-read version and surface concurrent edits as conflicts. Binary reads are bounded.

Terminal uses DSH's official owner-scoped terminal service and `/bin/zsh -f -i`. It can create a fresh blank live owner for a recent Workspace when no Agent window is active. DSH rc.7 is line-oriented and exposes neither raw browser PTY bytes nor post-spawn resize; S7R must not claim otherwise.

## Display system

S7R renders live DOM at discrete integer metrics. It does not continuously screenshot or rasterize the desktop.

- **Fit Browser** derives a logical area from the viewport.
- Fixed period-style resolutions remain available.
- **1×/2×** uses exact integer layout magnification and inverse pointer mapping.
- **Compact 10px/Comfortable 12px** use their corresponding native Fusion Pixel Font masters and discrete UI metrics.
- Window bounds reflow when resolution or interface size changes.

Images, PDF canvases, and wallpapers have an optional content pipeline:

1. downsample to a bounded low-resolution canvas;
2. apply ordered 1-bit dithering or direct luminance grayscale;
3. preserve alpha;
4. enlarge with integer nearest-neighbor scaling;
5. cache the processed result without modifying the source.

The built-in Cat pattern is constructed from one complete transparent sprite on a deterministic wrapped lattice so every tile edge joins exactly.

## Persistence and safety

Display preferences, imported wallpaper, Scrapbook data, and desktop state use separate versioned local records with strict validation and migrations. Live Terminal windows are deliberately excluded from restore because their PTYs cannot safely be reattached.

`DEEPSEEK_API_KEY` is handled through DSH's official credential service. The browser may write, replace, or remove it but cannot read the stored value. S7R must never serialize credentials into desktop state, logs, exports, screenshots, or repository fixtures.

## Accessibility and interaction

- All primary actions remain reachable through visible menus or buttons.
- Browser-owned Command shortcuts are not advertised as reliable page shortcuts.
- Focus and selection use hard-edged visible states.
- Window titles, status labels, and toolbars must not wrap at supported UI sizes.
- Controls should remain operable at Fit Browser 1×/2× and every fixed resolution.

## Release acceptance criteria

A release is ready when:

- strict host/client type checks pass;
- deterministic unit tests pass;
- production host/client bundles build;
- `pnpm pack` contains runtime bundles, declarations, documentation, and all required third-party notices;
- a clean DSH profile installs the tarball and boots on loopback;
- Agent, Workspace, file, Preview, Terminal, Timeline, Monitor, Context, desktop restore, and display workflows pass browser smoke testing;
- screenshots contain only deliberate demo data;
- a secret/personal-path scan is clean;
- known upstream limitations are documented rather than hidden.

## Deliberate non-goals

- complete Macintosh or System 7 emulation;
- copied Apple assets or pixel-perfect trade-dress replication;
- raw-terminal behavior unsupported by DSH;
- a general third-party accessory SDK in the initial release;
- startup/shutdown animation or sounds;
- full language-server editing;
- selectable PDF text layers;
- browser interception of reserved shortcuts.
