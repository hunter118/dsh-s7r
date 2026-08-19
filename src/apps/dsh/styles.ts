export const DSH_APP_STYLES = String.raw`
.kd-stationery,.kd-native-control { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.kd-stationery-banner { display: flex; align-items: center; gap: calc(var(--s7-gap) * 3); padding: calc(var(--s7-pad) * 2); border-bottom: 1px solid var(--s7-dark); background: var(--s7-light); }
.kd-stationery-banner h2,.kd-stationery-banner p { margin: 0; }
.kd-stationery-sheet { width: calc(var(--s7-font-size) * 4); height: calc(var(--s7-font-size) * 5); display: grid; place-items: center; border: 1px solid var(--s7-ink); background: var(--s7-white); box-shadow: 3px 3px 0 var(--s7-mid); font-family: var(--s7-mono); }
.kd-stationery .s7-panel { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: var(--s7-gap); overflow: auto; }
.kd-stationery .s7-textarea { width: 100%; flex: 1 1 auto; min-height: calc(var(--s7-font-size) * 6); }
.kd-stationery .kd-dialog-actions { position: sticky; bottom: 0; margin-top: auto; padding-top: var(--s7-gap); background: var(--s7-surface); }
.kd-native-description { display: grid; gap: 1px; margin: var(--s7-gap) 0; padding: var(--s7-pad); border: 1px dotted var(--s7-dark); background: var(--s7-light); }
.kd-native-description small { color: var(--s7-dark); }
.kd-native-control > .kd-toolbar .s7-select { min-width: min(calc(var(--s7-font-size) * 24),55%); }
.kd-native-tabs { display: grid; grid-template-columns: 1.15fr 1.4fr .6fr 1fr; gap: 1px; padding: var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-mid); overflow: hidden; }
.kd-native-tabs .s7-button { min-width: 0; overflow: hidden; text-overflow: ellipsis; font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-face); }
.kd-native-body { flex: 1 1 auto; min-height: 0; padding: var(--s7-gap); background: var(--s7-surface); }
.kd-native-cards { display: grid; gap: var(--s7-gap); }
.kd-native-cards > section { padding: var(--s7-pad); border: 1px solid var(--s7-dark); box-shadow: inset 1px 1px 0 var(--s7-white); background: var(--s7-light); }
.kd-native-cards header { display: flex; align-items: center; gap: var(--s7-gap); border-bottom: 1px dotted var(--s7-dark); padding-bottom: 2px; }
.kd-native-cards header .s7-button { margin-left: auto; }
.kd-native-cards p { margin: var(--s7-gap) 0; }
.kd-native-cards .s7-input { width: 100%; }
.kd-native-plugin-head { display: flex; align-items: center; gap: var(--s7-gap); }
.kd-native-plugin-head .s7-input { flex: 1 1 auto; min-width: 0; }
.kd-native-plugin-list { border: 1px solid var(--s7-dark); }
.kd-native-plugin-list .kd-list-row > span:nth-child(2) { min-width: 0; display: grid; }
.kd-native-plugin-list small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kd-native-phase { width: var(--s7-check); height: var(--s7-check); flex: 0 0 var(--s7-check); border: 1px solid var(--s7-ink); background: var(--s7-white); }
.kd-native-phase-active { background: var(--s7-ink); box-shadow: inset 0 0 0 2px var(--s7-white); }
.kd-native-phase-loading,.kd-native-phase-pending { background: repeating-linear-gradient(135deg,var(--s7-ink) 0 1px,var(--s7-white) 1px 3px); }
.kd-native-phase-failed { background: var(--s7-ink); position: relative; }
.kd-native-phase-failed::after { content: 'x'; color: var(--s7-white); position: absolute; inset: -2px 0 0; text-align: center; font-family: var(--s7-mono); }
`
