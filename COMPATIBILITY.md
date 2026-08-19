# DSH Compatibility Notes

## Reference baseline

- DSH package version: `0.1.0-rc.7`
- Official repository commit: `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`
- Reconnaissance date: 2026-08-17
- Node target: 22.19+ / 24+

These notes list every seam whose movement could require an adapter change.

## Supported seams used

| Area | DSH seam | Knowledge Desk use | Change impact |
|---|---|---|---|
| Client mounting | `ctx.slots.register({ name: 'root', priority })` | Shadows the default root at priority `-100` | Root slot names or priority semantics changing would require the client entry to change. |
| Root data | `PropsRuntime<'root'>` (`useSessions`, `useWorkspaces`) | Session list/current selection and Workspace registry | Root prop shape changes are isolated to `DesktopRoot`. |
| Sessions | `ctx.sessions` / `SessionRuntime` / `SessionFace` | Create/open/bind/prompt/cancel/load older/read attachment | Snapshot or node union changes affect the client adapter and Knowledge Desk render switch. Unknown nodes currently remain inspectable as JSON. |
| Workspaces | `ctx.workspaces` / `IWorkspaces` | Native folder pick, Workspace registration, blank-session reuse, session connection, and observation of native archive IDs | Directory-picker or Workspace ID changes affect only the browser compatibility adapter and Knowledge Desk. New S7R archive actions deliberately use a reversible local hide layer. |
| Credentials | `ctx.connection.api.credentials` | Value-free `describe` plus write-only `set`/`unset` for `DEEPSEEK_API_KEY` | The saved value never crosses back to the browser. Credential wire changes affect only the browser adapter and Settings app. |
| Agent Presets | `ctx.connection.api.agentPresets` and `sessions.create({ agentPreset })` | Stationery creation plus blank-session composition | Preset identifiers/descriptions and blank-only mutation remain DSH-owned. Schema or lock-rule changes affect the client adapter and the two DSH applications. |
| Models and Skills | `ctx.connection.api.sessions.models/selectModel` and `skills.list` | Per-Agent model/reasoning route plus project Skill catalog | Cold sessions may not have an attached Skill project; S7R keeps other catalogs usable and labels the empty/cold boundary. |
| Commands and plugins | `ctx.remote.commands` and `ctx.remote.pluginInventory` | Agent slash commands/modes and loader inventory | Plugin inventory is read-only in rc.7. Remote namespace or result-envelope changes affect only the browser compatibility adapter. |
| Connection | `ctx.connection.rpc.handle/call` | Logical `/knowledge-desk` endpoint | RPC envelope or authority API changes affect `src/dsh-compat`. |
| Agents | `ctx.agents.list/get` and public `Agent` state | Monitor, timeline ownership, file/terminal authority | A roster/status rename affects the host adapter only. |
| Event ledger | `Agent.session.events` | Complete Timeline/export/Find, estimated context categories, and provider-reported context pressure/capacity | If DSH moves live events behind a projection service, replace those host endpoints. |
| Persistence | plugin-injected `ctx.sessionPersistence.inspect` | Timeline and workspace metadata for sessions that are persisted but not live | Inspection borrows immutable state and deliberately does not resume or take ownership of a session. |
| Filesystem | plugin-injected `ctx.fs` (`resolve`, `contains`, `listDir`, `stat`, `readText`, `readBytes`, `writeText`) plus the inspected session cwd | Finder, TextEdit, Preview | Every target is canonicalized and contained under the session workspace; version and target types stay inside the host adapter. |
| Terminal | official `@deepseek-ai/dsh-terminal` and `@deepseek-ai/dsh-terminal-bash`, consumed through plugin-injected `ctx.terminals` with an exact Agent owner | Spawn configured `/bin/zsh`, send/read/signal/kill | The Web bundle does not mount these by default, so this bundle inserts both official rows. Backend session identities never leave the logical adapter unvalidated. |
| Client packaging | `dsh.client`, `exports['./client']`, lazy CJS module wrapper | Browser bundle discovery/materialization | `tsdown.config.ts` owns the wrapper and externals. |
| Plugin profiles | `dsh.bundle.patch` | Installation through `dsh plugin --profile web add` | Bundle manifest and `cordis.patch.yml` are intentionally minimal. |

## Deliberately unused integration techniques

- **DOM selectors:** none. The plugin does not hide or mutate DSH elements.
- **Private APIs:** none intentionally imported. Publicly exported rc.7 types/services are used.
- **Iframe bridge:** none.
- **Native browser alerts/confirms:** none.
- **Direct filesystem/process access from the browser:** none.
- **Direct `node-pty` dependency:** none; DSH owns the PTY and sandbox policy.

## Known upstream limitation

### Agent unarchive

DSH rc.7 publishes `archiveSession` but no supported unarchive operation. S7R 0.6 therefore does not send new archive actions into that one-way API: it records a reversible local hidden-session entry and leaves the DSH session and event log unchanged. Older session IDs already present in DSH's native archive catalog are labelled in Knowledge Desk and cannot be restored without a future public DSH seam. This is kept separate from exported conversation data and is never presented as deletion.

### Plugin mutation

DSH rc.7 exposes the plugin loader inventory to browser clients but no supported transactional enable/disable operation. S7R therefore reports module, entry, configured enabled state, and current fiber phase without offering switches. Installing or changing DSH plugins remains a DSH profile-management operation.

### Terminal transport

The rc.7 `TerminalSessionService` and `TerminalBackendSession` expose spawn, send, read, signal, status, and close, but no resize operation. The terminal-bash backend sets rows/columns from deployment config at spawn. Knowledge Desk therefore:

- resizes/reflows the Terminal window and scroll viewport;
- reports `terminalResize: false` through capabilities;
- keeps a forward-compatible `terminal/resize` logical endpoint that returns `{ supported: false }`;
- does not reach into service-private backend maps or subprocess handles.

This is the only Definition-of-Done item not implementable through the supported rc.7 terminal API. When DSH publishes owner-checked resize, implement it in `src/dsh-compat/host.ts` and change `TerminalOpenView.resizeSupported` to a boolean.

The same public service is deliberately line-oriented. It accepts a complete text send and returns retained/sanitized scrollback; it does not expose a raw PTY byte stream or browser-side terminal resize channel. Knowledge Desk therefore labels its zsh client honestly instead of embedding xterm.js over an unavailable raw transport.

## Runtime availability boundaries

Finder, TextEdit, Preview, and Timeline work for live agents and cold persisted sessions by inspecting the immutable session header/log. Monitor intentionally reports only live agents. Terminal remains attached to an exact live `Agent` owner. S7R first checks the live roster; when DSH's Workspace connection would reuse a cold blank session, it creates a fresh Workspace-owned session through the public client runtime so the host births a full live Session + Agent. A visible Agent window is not required.

## Upgrade checklist

When moving past rc.7:

1. run `pnpm typecheck` against the new DSH packages;
2. check root-slot name/priority behavior and `PropsRuntime<'root'>`;
3. exhaustively compare `ConversationNode`, `AssistantBlock`, and `ConversationSnapshot`;
4. verify loopback RPC authority and response error schema;
5. verify filesystem containment/version semantics;
6. check for an official terminal resize method;
7. build and install a tarball into a clean Web profile;
8. exercise the workflow in `docs/development-notes.md` in Fit Browser at 1×/2× and across all four fixed resolutions.
