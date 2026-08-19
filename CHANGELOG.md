# Changelog

All notable user-facing changes to S7R are documented here. The project follows semantic versioning while its DSH dependency remains in release-candidate status.

## 0.8.0 - 2026-08-20

### Added

- Explicit current-Workspace selection with Workspace-scoped Agent creation and browsing.
- Agent filters for Workspace scope and run state, plus recent/name/status sorting and Workspace grouping.
- A reversible **Window → Tile Windows / Restore Previous Layout** workflow.
- A live Agent switcher in the Window menu and keyboard navigation within menus.
- A Settings control for showing 1–9 recent Agents in the Window menu (default 5).
- A **New output** control when fresh streamed content arrives while reading earlier conversation history.

### Changed

- File, View, and Window menus now follow the active application and avoid irrelevant or duplicate commands.
- Knowledge Desk opens at a productive two-pane size and safely enlarges undersized restored launcher/Agent windows once.
- Live output follows the bottom only while the reader is already there, so streaming no longer steals the scroll position.
- The highlighted new-output button now uses a System 7 gray control with a black label, avoiding inverse-text rendering during active streaming.

## 0.7.0 - 2026-08-19

### Added

- Desktop marquee multi-selection, group dragging, alias-only Trash, Put Away, and Empty Trash.
- Agent Context and Other side panels with rename, export, archive, desktop placement, manual compaction, summarized handoff, and Markdown preference.
- Safe completed-output Markdown for headings, emphasis, code, lists, quotes, and tables.
- Relative Workspace-path drops into Agent composers.

### Changed

- Classic Dots is now the default wallpaper.
- Agent and Scrapbook toolbars have larger minimum widths and single-line status controls.
- Agent menu actions live under File; desk accessories remain in the S7R application menu.

## 0.6.0 - 2026-08-18

### Added

- Workspace launcher and persisted desktop/window restoration.
- Agent search, rename, reversible archive/restore, and complete Markdown/JSON export.
- Global Find across file names, source contents, conversations, and complete event streams.
- Integrated Monitor background-work view and on-demand Agent Context Inspector.
- Desktop aliases for Workspaces, Agents, files/folders, and Scrapbook cards.
- Minimal completion notifications.

## 0.5.0 - 2026-08-18

### Added

- Host CPU, active RAM, and DSH process RSS metrics.
- Solvable 4×4 Puzzle desk accessory.
- Built-in wallpapers, imported wallpaper library, 1-bit/grayscale processing, and seamless Cat tiling.

## 0.4.0 - 2026-08-18

### Added

- Fit Browser layout, exact 1×/2× magnification, Compact 10px and Comfortable 12px UI sizes.
- Direct grayscale and ordered 1-bit Preview filters.
- Agent deletion/archive UI, faster Terminal output polling, Timeline chunk folding, and Scrapbook copy actions.

### Changed

- Renamed the workstation shell to S7R and retained Knowledge Desk as the Workspace/Agent application.
- Replaced whole-desktop pixel filtering with native bitmap fonts and component-level pixel design.

## 0.3.0 - 2026-08-18

### Changed

- Rebuilt the interface around native Fusion Pixel Font masters and discrete System 7-style control metrics for crisp interaction.

## 0.2.0 - 2026-08-17

### Added

- Secure `DEEPSEEK_API_KEY` settings, native folder selection, Agent reopening, and independent zsh launch.

## 0.1.0 - 2026-08-17

### Added

- Initial DSH dual-face plugin, System 7 desktop/window manager, Knowledge Desk, Finder, TextEdit, Preview, Terminal, Timeline, Monitor, Scrapbook, Clock, and Display.
