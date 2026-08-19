import { ACCESSORY_STYLES } from '../apps/accessories/styles.ts'
import { FILE_APP_STYLES } from '../apps/files/styles.ts'
import { KNOWLEDGE_DESK_STYLES } from '../apps/knowledge-desk/styles.ts'
import { FIND_STYLES } from '../apps/find/styles.ts'

export function AppStylesBridge() {
  return <style>{KNOWLEDGE_DESK_STYLES + FILE_APP_STYLES + FIND_STYLES + DESKTOP_STYLES}</style>
}

export function AccessoriesStylesBridge() {
  return <style>{ACCESSORY_STYLES}</style>
}

const DESKTOP_STYLES = String.raw`
.kd-menu-wrap { position: relative; display: flex; }
.kd-desk-mark { position: absolute; right: calc(var(--s7-font-size) * 8.2); bottom: calc(var(--s7-gap) * 2); width: calc(var(--s7-font-size) * 8.4); min-height: calc(var(--s7-font-size) * 4.8); padding: var(--s7-gap); display: grid; grid-template-rows: auto auto; align-content: center; justify-items: center; overflow: hidden; border: 1px dotted var(--s7-dark); color: var(--s7-ink); background: var(--s7-surface); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); font: var(--s7-font-size)/var(--s7-line-height) var(--s7-mono); }
.kd-desk-mark small { min-width: 0; max-width: 100%; display: grid; justify-items: center; font-size: max(7px,var(--s7-small-font)); line-height: var(--s7-small-line); text-align: center; }
.kd-desk-mark small span { max-width: 100%; overflow: hidden; white-space: nowrap; }
.kd-dialog-actions { display: flex; justify-content: flex-end; gap: var(--s7-gap); margin-top: calc(var(--s7-gap) * 2); }
.kd-desktop-items { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.kd-desktop-item { position: absolute; width: calc(var(--s7-font-size) * 7); min-height: calc(var(--s7-font-size) * 5.2); pointer-events: auto; display: grid; justify-items: center; align-content: start; gap: 2px; padding: 2px; border: 1px solid transparent; color: var(--s7-ink); background: transparent; font: var(--s7-small-font)/var(--s7-small-line) var(--s7-proportional); text-align: center; }
.kd-desktop-item:hover, .kd-desktop-item:focus, .kd-desktop-item[data-selected="true"] { border-color: var(--s7-ink); outline: 1px dotted var(--s7-white); outline-offset: -3px; background: var(--s7-ink); color: var(--s7-white); }
.kd-desktop-item .s7-app-icon { width: calc(var(--s7-icon) * 1.25); height: calc(var(--s7-icon) * 1.1); }
.kd-desktop-item > span:not(.s7-app-icon) { max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.kd-desktop-item small { font: max(7px,var(--s7-small-font))/1 var(--s7-mono); }
.kd-selection-marquee { position: absolute; z-index: 10010; pointer-events: none; border: 1px dotted var(--s7-ink); outline: 1px dotted var(--s7-white); outline-offset: -2px; background: color-mix(in srgb,var(--s7-white) 20%,transparent); }
.kd-trash-icon { position: absolute; right: calc(var(--s7-gap) * 2); bottom: calc(var(--s7-gap) * 2); z-index: 2; width: calc(var(--s7-font-size) * 6.8); min-height: calc(var(--s7-font-size) * 5.4); display: grid; justify-items: center; align-content: start; gap: 2px; padding: 2px; border: 1px solid transparent; background: transparent; color: var(--s7-ink); white-space: nowrap; }
.kd-trash-icon:hover, .kd-trash-icon:focus, .kd-trash-icon[data-full="true"]:active { border-color: var(--s7-ink); outline: 1px dotted var(--s7-white); outline-offset: -3px; background: var(--s7-ink); color: var(--s7-white); }
.kd-trash-icon .s7-app-icon { width: calc(var(--s7-icon) * 1.25); height: calc(var(--s7-icon) * 1.1); font-size: max(7px,var(--s7-small-font)); }
.kd-trash-icon[data-full="true"] .s7-app-icon { border-top-width: calc(var(--s7-gap) + 2px); background: var(--s7-mid); }
.kd-window[data-app="scrapbook"] { min-width: min(calc(var(--s7-font-size) * 40),calc(100% - 4px)); }
.kd-notifications { position: absolute; right: calc(var(--s7-gap) * 2); top: calc(var(--s7-menu-height) + var(--s7-gap)); z-index: 10020; display: grid; gap: 2px; width: calc(var(--s7-font-size) * 18); }
.kd-notifications button { display: grid; gap: 1px; padding: var(--s7-pad); border: 2px solid var(--s7-ink); background: var(--s7-surface); box-shadow: inset 1px 1px 0 var(--s7-white),2px 2px 0 var(--s7-dark); font: inherit; text-align: left; }
.kd-notifications button:active { background: var(--s7-ink); color: var(--s7-white); }
`
