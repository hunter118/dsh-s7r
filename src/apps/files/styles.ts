export const FILE_APP_STYLES = String.raw`
.kd-toolbar .s7-input { min-width: 0; flex: 1 1 auto; }
.kd-finder-head, .kd-finder-row { display: grid; grid-template-columns: minmax(calc(var(--s7-font-size) * 14),1fr) calc(var(--s7-font-size) * 7.2) calc(var(--s7-font-size) * 5.6); }
.kd-finder-head { flex: 0 0 var(--s7-status-height); padding: 1px var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-surface); box-shadow: inset 0 1px 0 var(--s7-white); }
.kd-finder-list { flex: 1 1 auto; min-height: 0; }
.kd-finder-row > span:first-child { display: flex; align-items: center; gap: var(--s7-gap); min-width: 0; }
.kd-finder-row .s7-app-icon { width: var(--s7-control-height); height: calc(var(--s7-control-height) - 1px); flex-basis: var(--s7-control-height); box-shadow: none; }
.kd-editor { flex: 1 1 auto; min-height: 0; width: 100%; border: 0; box-shadow: inset 1px 1px 0 var(--s7-dark); padding: var(--s7-pad); line-height: var(--s7-line-height); outline-offset: -2px; user-select: text; background: var(--s7-white); }
.kd-preview-stage { flex: 1 1 auto; min-height: 0; display: grid; place-items: center; background-color: var(--s7-mid); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2'%3E%3Crect width='1' height='1' fill='%23ddd'/%3E%3C/svg%3E"); padding: calc(var(--s7-pad) * 2); }
.kd-preview-stage .authentic-image { background: var(--s7-white); border: 1px solid var(--s7-ink); box-shadow: 2px 2px 0 var(--s7-dark); }
.kd-pdf-view { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.kd-pdf-canvas { background: var(--s7-white); border: 1px solid var(--s7-ink); box-shadow: 2px 2px 0 var(--s7-dark); image-rendering: pixelated; max-width: none; }
.kd-terminal-output { flex: 1 1 auto; min-height: 0; margin: 0; padding: var(--s7-pad); background: var(--s7-ink); color: var(--s7-light); font: var(--s7-font-size)/var(--s7-line-height) var(--s7-mono); white-space: pre-wrap; user-select: text; }
.kd-terminal-input { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--s7-gap); padding: var(--s7-pad); background: var(--s7-surface); border-top: 1px solid var(--s7-dark); font: var(--s7-font-size)/var(--s7-line-height) var(--s7-mono); }
`
