import fusionPixel8ProportionalUrl from '../assets/fonts/fusion-pixel-8px-proportional-zh_hans.otf.woff2'
import fusionPixel8MonospacedUrl from '../assets/fonts/fusion-pixel-8px-monospaced-zh_hans.otf.woff2'
import fusionPixel10ProportionalUrl from '../assets/fonts/fusion-pixel-10px-proportional-zh_hans.otf.woff2'
import fusionPixel10MonospacedUrl from '../assets/fonts/fusion-pixel-10px-monospaced-zh_hans.otf.woff2'
import fusionPixel12ProportionalUrl from '../assets/fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2'
import fusionPixel12MonospacedUrl from '../assets/fonts/fusion-pixel-12px-monospaced-zh_hans.otf.woff2'

export const SYSTEM7_STYLES = String.raw`
@font-face { font-family: "Fusion Pixel 8"; src: url("${fusionPixel8ProportionalUrl}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; }
@font-face { font-family: "Fusion Pixel Mono 8"; src: url("${fusionPixel8MonospacedUrl}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; }
@font-face { font-family: "Fusion Pixel 10"; src: url("${fusionPixel10ProportionalUrl}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; }
@font-face { font-family: "Fusion Pixel Mono 10"; src: url("${fusionPixel10MonospacedUrl}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; }
@font-face { font-family: "Fusion Pixel 12"; src: url("${fusionPixel12ProportionalUrl}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; }
@font-face { font-family: "Fusion Pixel Mono 12"; src: url("${fusionPixel12MonospacedUrl}") format("woff2"); font-style: normal; font-weight: 400; font-display: block; }
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; }
body { background: #777; }
.knowledge-desk-host {
  --s7-font: "Fusion Pixel 12", monospace; --s7-mono: "Fusion Pixel Mono 12", monospace;
  --s7-small-face: "Fusion Pixel 10", monospace; --s7-small-mono: "Fusion Pixel Mono 10", monospace;
  --s7-font-size: 12px; --s7-line-height: 15px; --s7-small-font: 10px; --s7-small-line: 12px;
  --s7-menu-height: 22px; --s7-title-height: 20px; --s7-control-height: 22px; --s7-menu-item-height: 21px;
  --s7-title-control: 14px; --s7-title-left: 20px; --s7-title-right: 42px;
  --s7-gap: 4px; --s7-pad: 4px; --s7-panel-pad: 7px; --s7-toolbar-height: 29px; --s7-row-height: 23px;
  --s7-status-height: 20px; --s7-scrollbar: 14px; --s7-resizer: 14px; --s7-icon: 25px;
  --s7-check: 12px; --s7-dot: 5px; --s7-dialog-width: 400px; --s7-composer-height: 44px;
  --s7-min-window-width: 168px;
  --s7-white: #fff; --s7-light: #eee; --s7-surface: #ddd; --s7-mid: #aaa; --s7-dark: #555; --s7-ink: #000;
  --s7-balloon: var(--s7-light); --s7-success: var(--s7-ink); --s7-attention: var(--s7-surface); --s7-danger: var(--s7-ink);
}
.kd-desktop[data-base-font="10"] {
  --s7-font: "Fusion Pixel 10", monospace; --s7-mono: "Fusion Pixel Mono 10", monospace;
  --s7-small-face: "Fusion Pixel 8", monospace; --s7-small-mono: "Fusion Pixel Mono 8", monospace;
  --s7-font-size: 10px; --s7-line-height: 12px; --s7-small-font: 8px; --s7-small-line: 10px;
  --s7-menu-height: 18px; --s7-title-height: 16px; --s7-control-height: 18px; --s7-menu-item-height: 17px;
  --s7-title-control: 11px; --s7-title-left: 16px; --s7-title-right: 34px;
  --s7-gap: 3px; --s7-pad: 3px; --s7-panel-pad: 6px; --s7-toolbar-height: 24px; --s7-row-height: 19px;
  --s7-status-height: 16px; --s7-scrollbar: 12px; --s7-resizer: 12px; --s7-icon: 21px;
  --s7-check: 10px; --s7-dot: 4px; --s7-dialog-width: 330px; --s7-composer-height: 36px;
  --s7-min-window-width: 140px;
}
.kd-desktop[data-ui-appearance="color"] { --s7-balloon: #eee3ad; --s7-success: #617b67; --s7-attention: #c8c4a8; --s7-danger: #8b5f5c; }
.knowledge-desk-host, .knowledge-desk-host button, .knowledge-desk-host input, .knowledge-desk-host textarea, .knowledge-desk-host select {
  font-family: var(--s7-font); font-size: var(--s7-font-size); line-height: var(--s7-line-height); font-weight: 400; font-synthesis: none; font-kerning: none; font-variant-ligatures: none; font-variant-emoji: text; color: var(--s7-ink); text-rendering: optimizeSpeed;
}
.knowledge-desk-host strong, .knowledge-desk-host b, .knowledge-desk-host h1, .knowledge-desk-host h2, .knowledge-desk-host h3 { font-weight: 400; }
.knowledge-desk-host small { font-family: var(--s7-small-face); font-size: var(--s7-small-font); line-height: var(--s7-small-line); }
.knowledge-desk-host { position: fixed; inset: 0; background: #777; overflow: hidden; user-select: none; }
.kd-stage { position: absolute; inset: 0; overflow: auto; }
.kd-frame-stack { position: absolute; }
.kd-desktop { position: absolute; left: 0; top: 0; overflow: hidden; background-color: #bbb; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%23888'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ddd'/%3E%3C/svg%3E"); image-rendering: pixelated; box-shadow: 0 0 0 1px var(--s7-ink); }
.kd-menu-bar { position: absolute; inset: 0 0 auto; height: var(--s7-menu-height); z-index: 100000; display: flex; align-items: stretch; background: var(--s7-surface); border-bottom: 1px solid var(--s7-ink); box-shadow: inset 0 1px 0 var(--s7-white); }
.kd-menu-button { min-width: calc(var(--s7-font-size) * 3.4); border: 0; background: transparent; padding: 1px calc(var(--s7-gap) * 2) 0; cursor: default; }
.kd-menu-button[data-open="true"], .kd-menu-button:active { background: var(--s7-ink); color: var(--s7-white); }
.kd-menu-logo { min-width: calc(var(--s7-font-size) * 3.5); padding: 0 var(--s7-gap); font-family: var(--s7-mono); }
.kd-menu-clock { margin-left: auto; display: flex; align-items: center; padding: 0 calc(var(--s7-gap) * 2); font-variant-numeric: tabular-nums; }
.kd-menu-popover { position: absolute; top: calc(var(--s7-menu-height) - 1px); min-width: calc(var(--s7-font-size) * 14.6); padding: 2px 0; background: var(--s7-surface); color: var(--s7-ink); border: 1px solid var(--s7-ink); box-shadow: 2px 2px 0 var(--s7-ink), inset 1px 1px 0 var(--s7-white); }
.kd-menu-item { width: 100%; height: var(--s7-menu-item-height); border: 0; background: transparent; text-align: left; padding: 1px calc(var(--s7-font-size) * 1.8) 1px calc(var(--s7-font-size) * 1.4); white-space: nowrap; position: relative; }
.kd-menu-item:hover:not(:disabled), .kd-menu-item:focus-visible:not(:disabled) { background: var(--s7-ink); color: var(--s7-white); outline: none; }
.kd-menu-item:disabled, .s7-button:disabled { color: #777; text-shadow: 1px 1px 0 var(--s7-white); }
.kd-menu-check { position: absolute; left: var(--s7-gap); }
.kd-menu-section { min-height: var(--s7-menu-item-height); display: flex; align-items: center; padding: 1px calc(var(--s7-gap) * 2); font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-mono); color: var(--s7-dark); background: var(--s7-mid); border-top: 1px solid var(--s7-white); border-bottom: 1px solid var(--s7-dark); }
.kd-menu-separator { height: 1px; background: var(--s7-dark); border-bottom: 1px solid var(--s7-white); margin: 2px 0; }
.s7-context-menu { position: absolute; z-index: 150000; min-width: calc(var(--s7-font-size) * 17); max-width: calc(var(--s7-font-size) * 28); padding: 2px 0; border: 1px solid var(--s7-ink); background: var(--s7-surface); color: var(--s7-ink); box-shadow: 2px 2px 0 var(--s7-ink), inset 1px 1px 0 var(--s7-white); }
.s7-context-menu button { position: relative; width: 100%; min-height: var(--s7-menu-item-height); padding: 1px calc(var(--s7-gap) * 2) 1px calc(var(--s7-font-size) * 1.5); border: 0; background: transparent; text-align: left; white-space: nowrap; }
.s7-context-menu button > span { position: absolute; left: var(--s7-gap); }
.s7-context-menu button:hover:not(:disabled),.s7-context-menu button:focus-visible:not(:disabled) { background: var(--s7-ink); color: var(--s7-white); outline: none; }
.s7-context-menu button:disabled { color: var(--s7-dark); text-shadow: 1px 1px 0 var(--s7-white); }
.s7-context-separator { height: 1px; margin: 2px 0; background: var(--s7-dark); border-bottom: 1px solid var(--s7-white); }
.s7-context-heading { overflow: hidden; padding: 1px calc(var(--s7-gap) * 2); border-top: 1px solid var(--s7-white); border-bottom: 1px solid var(--s7-dark); background: var(--s7-mid); color: var(--s7-dark); font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-mono); text-overflow: ellipsis; white-space: nowrap; }
.s7-balloon-help { position: absolute; z-index: 140000; width: max-content; max-width: calc(var(--s7-font-size) * 26); padding: calc(var(--s7-gap) * 2); border: 2px solid var(--s7-ink); background: var(--s7-balloon); color: var(--s7-ink); box-shadow: 2px 2px 0 var(--s7-dark); pointer-events: none; white-space: normal; }
.s7-balloon-help::before { content: ''; position: absolute; left: 8px; top: -8px; width: 8px; height: 8px; border-left: 2px solid var(--s7-ink); border-top: 2px solid var(--s7-ink); background: var(--s7-balloon); transform: skew(-25deg); }
.s7-balloon-help[data-side="above"]::before { top: auto; bottom: -8px; border: 0; border-right: 2px solid var(--s7-ink); border-bottom: 2px solid var(--s7-ink); transform: skew(25deg); }
.kd-window { position: absolute; display: flex; flex-direction: column; min-width: var(--s7-min-window-width); min-height: var(--s7-title-height); background: var(--s7-surface); border: 1px solid var(--s7-ink); box-shadow: 1px 1px 0 var(--s7-white), 2px 2px 0 var(--s7-ink); overflow: clip; }
.kd-window[data-active="false"] { box-shadow: 1px 1px 0 var(--s7-dark); }
.kd-title-bar { height: var(--s7-title-height); flex: 0 0 var(--s7-title-height); display: grid; grid-template-columns: var(--s7-title-left) 1fr var(--s7-title-right); align-items: center; background: var(--s7-surface); border-bottom: 1px solid var(--s7-ink); cursor: default; touch-action: none; }
.kd-window[data-active="true"] .kd-title-bar { background-image: repeating-linear-gradient(to bottom,var(--s7-ink) 0 1px,var(--s7-white) 1px 3px); }
.kd-title { justify-self: center; max-width: calc(100% - 8px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 calc(var(--s7-gap) + 2px); background: var(--s7-surface); line-height: var(--s7-line-height); }
.kd-window[data-active="false"] .kd-title { background: var(--s7-mid); border: 1px dotted var(--s7-dark); line-height: calc(var(--s7-line-height) - 2px); }
.kd-close, .kd-zoom, .kd-collapse { width: var(--s7-title-control); height: var(--s7-title-control); min-height: 0; padding: 0; border: 1px solid var(--s7-ink); background: var(--s7-surface); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); position: relative; }
.kd-close { margin-left: 2px; }
.kd-close::after { content: ""; position: absolute; inset: 2px; border: 1px solid var(--s7-white); }
.kd-title-controls { display: flex; justify-content: flex-end; gap: 2px; margin-right: 2px; background: var(--s7-surface); padding-left: 2px; }
.kd-collapse { font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-mono); }
.kd-zoom::before { content: ""; position: absolute; inset: 2px; border-top: 2px solid var(--s7-ink); border-left: 2px solid var(--s7-ink); }
.kd-window-body { flex: 1 1 auto; min-height: 0; overflow: clip; display: flex; flex-direction: column; background: var(--s7-surface); }
.kd-window[data-collapsed="true"] .kd-window-body, .kd-window[data-collapsed="true"] .kd-resizer { display: none; }
.kd-resizer { position: absolute; right: 0; bottom: 0; width: var(--s7-resizer); height: var(--s7-resizer); cursor: nwse-resize; touch-action: none; background-color: var(--s7-surface); background-image: repeating-linear-gradient(135deg,transparent 0 2px,var(--s7-dark) 2px 3px,transparent 3px 5px); border-left: 1px solid var(--s7-white); border-top: 1px solid var(--s7-white); }
.s7-button { min-height: var(--s7-control-height); padding: 1px calc(var(--s7-gap) * 2); border: 1px solid var(--s7-ink); border-radius: 0; background: var(--s7-surface); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); white-space: nowrap; }
.s7-button:active:not(:disabled), .s7-button[data-pressed="true"] { background: var(--s7-mid); color: var(--s7-ink); box-shadow: inset 1px 1px 0 var(--s7-dark), inset -1px -1px 0 var(--s7-white); }
.s7-button:focus-visible, .s7-input:focus, .s7-textarea:focus, .s7-select:focus { outline: 1px dotted var(--s7-ink); outline-offset: 1px; }
.s7-icon-button { min-width: calc(var(--s7-control-height) + 1px); min-height: calc(var(--s7-control-height) - 1px); padding: 1px var(--s7-gap); border: 1px solid var(--s7-ink); border-radius: 0; background: var(--s7-surface); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); }
.s7-icon-button:active { background: var(--s7-mid); box-shadow: inset 1px 1px 0 var(--s7-dark); }
.s7-input, .s7-textarea, .s7-select { border: 1px solid var(--s7-ink); border-radius: 0; background: var(--s7-white); padding: 2px var(--s7-gap); box-shadow: inset 1px 1px 0 var(--s7-dark); }
.s7-textarea { resize: none; }
.s7-select { min-height: var(--s7-control-height); appearance: auto; }
.s7-check, .s7-radio { position: relative; display: flex; gap: var(--s7-gap); align-items: center; line-height: calc(var(--s7-control-height) - 3px); cursor: default; }
.s7-check input, .s7-radio input { position: absolute; left: 0; top: 50%; width: var(--s7-check); height: var(--s7-check); margin: 0; transform: translateY(-50%); opacity: 0; }
.s7-check-box, .s7-radio-dot { width: var(--s7-check); height: var(--s7-check); border: 1px solid var(--s7-ink); border-radius: 0; background: var(--s7-white); box-shadow: 1px 1px 0 var(--s7-white), inset 1px 1px 0 var(--s7-dark); display: inline-grid; place-content: center; }
.s7-check input:focus-visible + .s7-check-box, .s7-radio input:focus-visible + .s7-radio-dot { outline: 1px dotted var(--s7-ink); outline-offset: 1px; }
.s7-check input:checked + .s7-check-box::after { content: "×"; font: var(--s7-font-size)/var(--s7-small-line) var(--s7-mono); }
.s7-radio input:checked + .s7-radio-dot::after { content: ""; width: var(--s7-dot); height: var(--s7-dot); background: var(--s7-ink); }
.s7-panel { margin: var(--s7-gap); padding: var(--s7-panel-pad); border: 1px solid var(--s7-dark); box-shadow: inset 1px 1px 0 var(--s7-white); min-width: 0; }
.s7-panel legend { padding: 0 var(--s7-gap); }
.s7-status { flex: 0 0 var(--s7-status-height); min-height: var(--s7-status-height); border-top: 1px solid var(--s7-dark); box-shadow: inset 0 1px 0 var(--s7-white); background: var(--s7-surface); display: flex; align-items: center; justify-content: space-between; padding-left: var(--s7-gap); overflow: hidden; white-space: nowrap; }
.s7-resize-lines { display: none; }
.s7-dialog-shade { position: absolute; inset: var(--s7-menu-height) 0 0; z-index: 200000; display: grid; place-items: center; background-color: var(--s7-mid); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2'%3E%3Crect width='1' height='1' fill='%23ddd'/%3E%3C/svg%3E"); image-rendering: pixelated; }
.s7-dialog { width: min(var(--s7-dialog-width),80%); background: var(--s7-surface); border: 2px solid var(--s7-ink); box-shadow: 2px 2px 0 var(--s7-white), 4px 4px 0 var(--s7-ink); }
.s7-dialog-title { height: calc(var(--s7-title-height) + 1px); background: var(--s7-surface); border-bottom: 1px solid var(--s7-dark); box-shadow: inset 0 1px 0 var(--s7-white); text-align: center; padding: 1px; }
.s7-dialog-body { padding: calc(var(--s7-panel-pad) + var(--s7-gap)); }
.s7-inline-error { margin: var(--s7-gap); padding: var(--s7-pad); border: 2px solid var(--s7-ink); background: var(--s7-light); color: var(--s7-ink); }
.s7-app-icon { display: inline-grid; place-items: center; flex: 0 0 var(--s7-icon); width: var(--s7-icon); height: var(--s7-icon); border: 1px solid var(--s7-ink); background: var(--s7-surface); font: var(--s7-small-font)/1 var(--s7-small-mono); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); }
.s7-app-icon-folder { position: relative; border-top-width: 4px; clip-path: none; }
.authentic-image { display: block; max-width: 100%; max-height: 100%; image-rendering: pixelated; object-fit: contain; }
.kd-toolbar { flex: 0 0 auto; display: flex; gap: var(--s7-gap); align-items: center; min-height: var(--s7-toolbar-height); padding: var(--s7-pad); border-bottom: 1px solid var(--s7-dark); box-shadow: inset 0 1px 0 var(--s7-white); background: var(--s7-surface); white-space: nowrap; overflow-x: auto; overflow-y: hidden; }
.kd-spacer { flex: 1 1 auto; }
.kd-scroll { overflow: auto; scrollbar-color: var(--s7-dark) var(--s7-mid); scrollbar-width: auto; }
.kd-scroll::-webkit-scrollbar { width: var(--s7-scrollbar); height: var(--s7-scrollbar); }
.kd-scroll::-webkit-scrollbar-track { background-color: var(--s7-mid); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2'%3E%3Crect width='1' height='1' fill='%23ddd'/%3E%3C/svg%3E"); border-left: 1px solid var(--s7-dark); }
.kd-scroll::-webkit-scrollbar-thumb { background: var(--s7-surface); border: 1px solid var(--s7-ink); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); }
.kd-list { margin: 0; padding: 0; list-style: none; background: var(--s7-white); }
.kd-list-row { min-height: var(--s7-row-height); border-bottom: 1px dotted var(--s7-dark); display: flex; align-items: center; gap: var(--s7-gap); padding: 1px var(--s7-pad); }
.kd-list-row[data-selected="true"], .kd-list-row:hover { background: var(--s7-ink); color: var(--s7-white); }
.kd-empty { margin: auto; max-width: calc(var(--s7-font-size) * 30); text-align: center; padding: calc(var(--s7-pad) * 4); }
.kd-code, code, pre { font-family: var(--s7-mono); font-size: var(--s7-font-size); line-height: var(--s7-line-height); }
.kd-code { tab-size: 2; }
.kd-form-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--s7-gap) calc(var(--s7-gap) * 2); align-items: center; }
.kd-form-stack { display: grid; gap: var(--s7-gap); }
.kd-muted { color: var(--s7-dark); border-left: 1px dotted var(--s7-dark); padding-left: var(--s7-gap); }
.kd-badge { display: inline-block; border: 1px solid currentColor; padding: 0 2px; font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-mono); background: var(--s7-light); color: var(--s7-ink); }
.kd-badge-running { background: var(--s7-ink); color: var(--s7-white); }
.kd-desktop[data-ui-appearance="color"] .kd-led-running { background: var(--s7-success); }
.kd-desktop[data-ui-appearance="color"] .kd-badge-running { background: var(--s7-success); }
.kd-desktop[data-ui-appearance="color"] .s7-inline-error,.kd-desktop[data-ui-appearance="color"] .kd-context-button-critical { border-color: var(--s7-danger); }
.kd-small { font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-face); }
.kd-desktop-notice { position: fixed; inset: 0; z-index: 999999; display: none; place-items: center; background: var(--s7-surface); }
@media (max-width: 340px), (max-height: 260px) { .kd-desktop-notice { display: grid; } }
`

export function installSystem7Styles(): () => void {
  const existing = document.getElementById('dsh-s7r-styles')
  if (existing !== null) return () => undefined
  const style = document.createElement('style')
  style.id = 'dsh-s7r-styles'
  style.textContent = SYSTEM7_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}
