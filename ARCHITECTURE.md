# S7R Architecture

## Package shape

S7R is a DSH bundle with two executable faces:

- `src/index.ts` is the Node host plugin. It registers a loopback logical-RPC handler.
- `src/client/index.ts` is the browser plugin. It installs the visual system and shadows the DSH `root` slot at priority `-100`.

`cordis.patch.yml` inserts the package and the official DSH terminal service/backend it consumes. DSH discovers `dsh.client` in `package.json`, serves `lib/client.js`, and materializes the browser face through its lazy CJS module table. `tsdown.config.ts` emits the required `window.__ModuleLoader__.load(...)` wrapper.

The host bundle keeps DSH packages external so the running composition owns service identity. The client bundle externalizes only DSH/React platform modules and embeds application code plus PDF.js.

## Desktop and windows

`DesktopRoot` owns the workstation state. The window model is a reducer with one authoritative list, active id, id counter, and monotonically increasing z-index. Actions cover open, close, focus, move, resize, zoom, collapse, tile, reflow, and retitle. Applications never position themselves.

Each `SystemWindow` uses the same square chrome. Pointer capture makes drag/resize robust outside the original hit target. At 1× browser pointer deltas map directly to desktop pixels; at 2× they are divided by exactly two before the reducer rounds every moved/resized bound to an integer. Bounds are clamped to the menu-free work area. Resolution changes reflow current and zoom-restore bounds, while a base-type change proportionally resizes them around the new menu-bar boundary.

The menu bar receives the active window and application callbacks. Window commands therefore have one state owner and menu enablement cannot diverge from the displayed desktop.

Context menus are desktop-owned overlays expressed in logical coordinates. Their model is assembled by object type, clamped after layout measurement, and supports Arrow/Home/End/Enter/Escape navigation plus focus restoration. Empty desktop, aliases, Trash, Workspace/Agent rows, and Finder entries all route through the same primitive; only aliases ever expose deletion.

Balloon Help listens at the desktop root for marked controls rather than attaching a timer to every component. Pointer and focus coordinates are converted from viewport pixels by the exact magnification, then the measured balloon is flipped/clamped inside the logical work area. Pointer-down, wheel, resize, focus loss, menus, and modal dialogs suppress the overlay. The setting is persisted, but a visible balloon is ephemeral.

The desktop object layer uses one private drag MIME record for Workspace, Agent, contained path, and Scrapbook-card references. Coordinates are stored in logical pixels and pointer drops divide by the exact 1×/2× magnification before clamping. A drag record may carry validated ids for the current multi-selection, so every selected alias moves by one shared logical delta. Marquee hit testing intersects logical icon rectangles and supports additive selection. Directory drops require an explicit Finder-alias versus Workspace-alias choice. Dropping a path into an Agent produces a cwd-relative reference whenever it is inside that Agent's cwd; outside paths remain absolute.

Trash is deliberately an alias-only desktop service. Delete/Backspace and Trash drops move desktop records into a reversible persisted list; restoration reuses their logical locations. The Special menu owns confirmed Empty Trash and Clean Up Desktop. This layer never calls the DSH filesystem, session archive, or Scrapbook deletion APIs.

## DSH compatibility boundary

All DSH-specific code lives under `src/dsh-compat`.

The browser adapter uses supported client services:

- `ctx.sessions` / `SessionRuntime` for create, open, binding, prompt, steer, cancel, history pagination, live snapshots, and attachments;
- `ctx.workspaces` for native host folder choice, Workspace registration, Workspace-owned session connection, and observing older DSH-native archive identifiers;
- `ctx.connection.api.credentials` for value-free credential status and write-only `DEEPSEEK_API_KEY` set/unset;
- `ctx.connection.api.sessions`, `agentPresets`, and `skills` for native session metadata, real model/reasoning selection, blank-session Preset composition, Agent Preset Stationery, and project Skill discovery;
- `ctx.remote.commands` and `ctx.remote.pluginInventory` for Agent-scoped registered commands/modes and authoritative loader inventory;
- `ctx.connection.rpc.call` for package-specific host operations.

The native DSH Control Center treats those catalogs independently: a cold Agent whose project Skill service is not attached can still expose its session model route, commands, Preset metadata, and process-wide plugin inventory. Plugin inventory remains read-only through the rc.8 source runtime validation, and the UI deliberately renders status rather than non-functional toggles. Its command adapter preserves rc.8's optional image-capability metadata while invoking commands through `SessionFace.command()`, which owns the upstream execution-signature change.

The host adapter uses supported host services:

- `ctx.agents` for the live roster and exact owner identity;
- `Agent.session.events` for the complete currently available live event ledger;
- plugin-injected `ctx.sessionPersistence.inspect` for immutable event/history and workspace metadata when a session is persisted but not live;
- plugin-injected `ctx.fs`, constrained to the selected live or persisted session's canonical workspace, for resolution, listing, versioned reads, and version-guarded writes;
- plugin-injected `ctx.terminals`, with the exact live agent passed as owner, for PTY spawn, line interaction, scrollback, signals, and teardown;
- `ctx.connection.rpc.handle` with `authority: 'loopback'` for the logical endpoint.

The protocol reports unavailable metrics and terminal resize honestly. UI consumers do not probe for host internals.

## Conversation model

Every Knowledge Desk agent window binds to a DSH `SessionFace` and subscribes through `useSyncExternalStore`. The view renders DSH conversation nodes rather than reconstructing chat from a reduced transport:

- user and steering messages;
- assistant text, reasoning, images, and tool calls;
- tool results and failures;
- context records;
- retry, token-limit, compaction, command, and turn-error records;
- streamed partial blocks and active tool calls.

Older history is requested through the session face. Multiple windows may bind to different sessions, or to the same live session, without duplicating host agents.

Completed assistant text can pass through a small safe Markdown parser that emits React elements for headings, emphasis, inline/fenced code, lists, quotes, and tables. It does not interpret raw HTML. Partial streaming blocks remain plain text to avoid repeated table/layout reconstruction. The global choice is stored with desktop state. LaTeX is intentionally left as source text because the package has no bitmap-math glyph/rendering pipeline.

Session rename calls the public `SessionFace.rename`. Export and Find inspect the complete live or cold persisted event ledger on the host; export is not limited to the currently paged conversation projection. New archive actions intentionally do not call DSH's one-way rc.7 archive operation: S7R stores a reversible hidden-session record and leaves the upstream session/log untouched. Since rc.7 has no public unarchive call, pre-existing DSH-native archive identifiers remain visible only as an explicit unsupported boundary.

The Context Inspector combines the latest durable provider token/capacity sample with an estimated text-character breakdown. Final assistant surface messages are divided at content-block level into text, reasoning, and tool material, while their sourced streaming chunks are excluded to prevent double counting. Only the newest request header/capacity record is counted; turn/step/title/permission ledger metadata remains available to Timeline/Find but is excluded from context shares. Compaction uses the public command path. Handoff waits for a newer `compaction/summary`, creates a session in the same cwd, and sends the summary as explicit initial working context.

## Global Find

Find sends a single bounded request describing independent scopes. Workspace traversal skips hidden directories and `node_modules`, stops after 5,000 files, reads only a text/source extension allowlist, and skips files above 1 MiB. Agent message mode restricts matches to message events; all-event mode searches every persisted event payload, including tools, reasoning chunks, and context. The host returns at most 200 typed results so the browser can route directories, files, conversations, and event envelopes without guessing from strings.

## Workspace applications

Finder routes by extension into TextEdit or Preview. All paths returned to the browser are display paths already resolved by DSH. On each host operation, the requested path is re-resolved under the inspected session cwd and rejected if it is outside the canonical workspace root. Inspection supports both live agents and cold persisted sessions without resuming or taking ownership of them.

TextEdit keeps `content`, `savedContent`, and the last DSH filesystem version. A save replaces only that version; concurrent disk changes surface as a conflict. Dirty state is reported to the desktop so closing goes through a System-style discard dialog.

Preview reads binary bytes through the bounded host endpoint. Images pass through `AuthenticImage`. PDF.js renders a copied byte array into canvas; an enabled Preview filter quantizes the resulting canvas, never the source bytes.

## Preview filter pipeline

Display preferences are versioned. The pipeline is pure below the canvas boundary:

1. choose the persisted filter style;
2. for 1-bit mode, apply a fixed 4×4 Bayer threshold and select black or white;
3. for grayscale mode, calculate direct luminance without thresholding;
4. preserve source alpha;
5. return a fresh pixel buffer.

`AuthenticImage` loads the original source, downsamples into a bounded canvas with smoothing disabled, processes a copy, and caches the resulting data URL by source identity plus display settings. An LRU bound prevents long sessions from retaining an unbounded number of processed images.

Pixel-perfect presentation is separate from that content pipeline. The desktop is ordinary live DOM with no filter, canvas mirror, screenshot queue, or asynchronous rasterizer. In default Fit Browser mode, the logical work area is the viewport at 1× and half the viewport at 2×; Chromium then applies exact integer layout magnification. Fixed period-style resolutions remain available and can scroll at 2×. No fractional scale is accepted.

Interface sizing is also discrete rather than interpolated. Compact uses the native 10px Fusion Pixel Font master and Comfortable uses the native 12px master. Semantic small text has a separate family token: Compact selects the native 8px proportional/monospaced faces and Comfortable selects the native 10px faces. A component never obtains small text by assigning an 8px/10px CSS size to the active larger master. Each preset supplies its own integer menu, title, control, spacing, scrollbar, icon, minimum-window, and line-height metrics. System surfaces use the layered white/light-gray/mid-gray/dark-gray bevel vocabulary of the System 7 period. This component-level design avoids the input lag and stale/blurred drag frames inherent in repeatedly screenshotting an interactive DOM. Images and PDF canvases remain the only raster content and explicitly disable interpolation where appropriate.

## Persistence

Display preferences, the imported-wallpaper library, Scrapbook cards, and desktop state use separate versioned `localStorage` records. Desktop record version 2 validates every application id, bounds object, primitive payload, alias union, archive record, Trash record, and Markdown preference before accepting the snapshot; malformed records fail closed and version 1 migrates with empty Trash plus Markdown enabled. It restores window bounds/z-order/zoom/collapse, aliases, Trash, reversible archive state, and the reading preference. Terminal windows are filtered on write and read because a serialized browser window cannot safely reattach the owner-scoped PTY.

Preference version 13 makes Classic Dots the upgrade/default wallpaper while retaining Cat as a selectable choice; it consolidates both older Cat identifiers and validates only 1px/2px blocks, treatment, placement, the two Preview target booleans, and 1-bit/grayscale style. It preserves the earlier safe 16px/1152×648 migrations to Comfortable 12px and Fit Browser. Wallpaper library version 4 stores multiple named processed images plus one selected ID; malformed, duplicate-ID, and stale 2px/4px-format records fail closed. Wallpaper processing downsamples into a low-resolution canvas, quantizes that grid, then copies it into an integer-multiple output canvas with smoothing disabled; this bakes hard pixel blocks into the stored PNG before CSS ever scales it. The built-in Cat first alpha-thresholds one complete transparent sprite and lays it on a periodic 384×192 lattice with explicit edge-wrapped copies, making the repeated tile pixel-identical on both axes. Imports are bounded to about 512px. No source document is stored in local persistence unless the user explicitly creates a Scrapbook copy.

## Metrics

The host folds DSH's durable `assistant/chunk`/`assistant/message` token usage and the latest `request/context` capacity. The conversation status bar and Monitor therefore show the latest provider-reported prompt length; a percentage appears only when the active model advertised a context window. System CPU uses deltas between Node OS cumulative counters. On macOS, RAM parses `vm_stat` and reports active + wired + compressor-resident pages, excluding inactive/file cache that `os.freemem()` incorrectly makes look permanently used; other platforms use total minus free. DSH process RSS is reported separately. The first CPU sample is explicitly labelled as sampling rather than fabricated.

## Terminal integration

The Terminal host endpoint chooses DSH's `shell` backend when available, otherwise the first registered backend. The bundle configures that official backend to start `/bin/zsh -f -i`. DSH owns sandbox policy, process spawning, terminal identity, output retention, signaling, and owner cleanup. A submitted line is acknowledged immediately while its public send operation continues on the host; the client reads retained scrollback with one non-overlapping 60ms foreground poll (250ms when the page is hidden). Before opening a PTY, the client verifies the preferred owner against the host live roster; if Workspace connection would reuse a cold blank session, it creates a fresh Workspace-owned session whose host operation births the full Session + Agent. Closing the window closes its PTY.

DSH rc.7 does not publish a PTY resize method. The window and output viewport resize normally, but backend rows/columns remain the terminal-bash deployment setting. This is isolated as `terminal/resize -> { supported: false }` so a future supported seam can be added without changing the Terminal application.

## Styling and asset provenance

The browser face owns one removable style element. The simulated desktop is deliberately self-contained: controls, scrollbars, dialogs, chrome, icons, patterns, status bars, and application surfaces use package CSS and a System 7 grayscale hierarchy. The six browser-bundled Fusion Pixel Font Simplified Chinese WOFF2 faces cover proportional/monospaced 8px, 10px, and 12px masters under SIL OFL 1.1. The original generated cat bitmap is bundled as a data URL and passed through the same pure 1-bit/direct-grayscale pipeline before display. Conversation Emoji are normalized to monochrome glyph/text equivalents before rendering so color-emoji fallback cannot puncture the visual system. Window shells use `overflow: clip`, and hidden native choice inputs are positioned over their visible bitmap controls, preventing focus-driven programmatic scrolling of the window shell. No DSH theme token or native control is rendered inside the root surface, and no DOM selector is used to hide DSH UI. All visible icons are original CSS/text glyph constructions.
