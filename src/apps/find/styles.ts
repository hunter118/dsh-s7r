export const FIND_STYLES = String.raw`
.kd-find-app { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--s7-surface); }
.kd-find-query { display: grid; grid-template-columns: auto 1fr auto; gap: var(--s7-gap); align-items: center; padding: var(--s7-pad); border-bottom: 1px solid var(--s7-dark); }
.kd-find-query .s7-input { width: 100%; }
.kd-find-options { display: grid; grid-template-columns: 1fr 1.3fr; gap: var(--s7-gap); padding: var(--s7-pad); border-bottom: 1px solid var(--s7-dark); }
.kd-find-options fieldset { min-width: 0; margin: 0; border: 1px solid var(--s7-dark); display: grid; gap: 2px; align-content: start; }
.kd-find-options .s7-select { width: 100%; }
.kd-find-options p { margin: 2px 0 0; }
.kd-find-head, .kd-find-results button { display: grid; grid-template-columns: minmax(calc(var(--s7-font-size) * 8),.8fr) minmax(calc(var(--s7-font-size) * 7),.6fr) minmax(0,2fr); gap: var(--s7-gap); align-items: center; }
.kd-find-head { padding: 1px var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-light); }
.kd-find-results { flex: 1 1 auto; min-height: 0; margin: 0; padding: 0; list-style: none; background: var(--s7-white); }
.kd-find-results li { border-bottom: 1px dotted var(--s7-dark); }
.kd-find-results button { width: 100%; min-height: var(--s7-row-height); border: 0; padding: 2px var(--s7-pad); text-align: left; background: var(--s7-white); font: inherit; }
.kd-find-results button:hover, .kd-find-results button:focus { color: var(--s7-white); background: var(--s7-ink); }
.kd-find-results button span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`
