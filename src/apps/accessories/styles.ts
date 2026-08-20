export const ACCESSORY_STYLES = String.raw`
.kd-timeline { flex: 1 1 auto; min-height: 0; margin: 0; padding: 0; list-style: none; background: var(--s7-white); user-select: text; }
.kd-timeline-event { border-bottom: 1px solid var(--s7-dark); }
.kd-timeline-head { width: 100%; min-height: var(--s7-row-height); border: 0; background: var(--s7-white); display: flex; align-items: center; gap: var(--s7-gap); text-align: left; padding: 2px var(--s7-pad); }
.kd-timeline-head:hover { background: var(--s7-ink); color: var(--s7-white); }
.kd-timeline-detail { padding: var(--s7-pad) calc(var(--s7-pad) * 2) calc(var(--s7-pad) + 1px) calc(var(--s7-font-size) * 3.2); background: var(--s7-light); border-top: 1px dotted var(--s7-dark); }
.kd-timeline-detail pre { max-height: calc(var(--s7-font-size) * 18); overflow: auto; margin: 0 0 var(--s7-gap); padding: var(--s7-pad); border: 1px solid var(--s7-dark); background: var(--s7-white); white-space: pre-wrap; }
.kd-timeline-group-event + .kd-timeline-group-event { margin-top: var(--s7-pad); padding-top: var(--s7-pad); border-top: 1px dotted var(--s7-dark); }
.kd-timeline-group-event > header { display: flex; gap: var(--s7-gap); align-items: center; margin-bottom: 2px; }
.kd-timeline-group-event > div { display: flex; gap: var(--s7-gap); }
.kd-monitor-system { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--s7-dark); background: var(--s7-light); }
.kd-monitor-system section { min-width: 0; display: grid; grid-template-columns: auto 1fr; gap: 1px var(--s7-gap); padding: var(--s7-pad); border-right: 1px solid var(--s7-dark); }
.kd-monitor-system section:last-child { border-right: 0; }
.kd-monitor-system section > span:not(.kd-resource-meter) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
.kd-resource-meter { grid-column: 1 / -1; height: max(4px,calc(var(--s7-small-font) * .55)); border: 1px solid var(--s7-dark); background: var(--s7-white); }
.kd-resource-meter > i { display: block; max-width: 100%; height: 100%; background: repeating-linear-gradient(90deg,var(--s7-ink) 0 2px,transparent 2px 3px); }
.kd-monitor-head, .kd-monitor-row { display: grid; grid-template-columns: var(--s7-small-font) minmax(calc(var(--s7-font-size) * 6.2),1fr) calc(var(--s7-font-size) * 4.4) minmax(calc(var(--s7-font-size) * 7.8),1.1fr) minmax(calc(var(--s7-font-size) * 5.6),1fr) calc(var(--s7-font-size) * 5.2); gap: var(--s7-gap); align-items: center; }
.kd-monitor-head { min-height: var(--s7-menu-item-height); padding: 1px var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-surface); box-shadow: inset 0 1px 0 var(--s7-white); }
.kd-monitor-head span:first-child { grid-column: 1 / 3; }
.kd-monitor-list { flex: 1 1 auto; min-height: 0; }
.kd-monitor-tabs { display: flex; gap: var(--s7-gap); padding: var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-surface); }
.kd-task-head, .kd-task-row { display: grid; grid-template-columns: minmax(calc(var(--s7-font-size) * 6),.8fr) calc(var(--s7-font-size) * 5) calc(var(--s7-font-size) * 6) minmax(0,2fr); gap: var(--s7-gap); align-items: center; }
.kd-task-head { min-height: var(--s7-menu-item-height); padding: 1px var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-surface); }
.kd-task-row > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kd-control-panel { flex: 1 1 auto; min-height: 0; padding: 2px; background: var(--s7-surface); }
.kd-wallpaper-presets { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--s7-gap); }
.kd-wallpaper-presets .s7-radio { min-width: 0; }
.kd-wallpaper-chip { width: calc(var(--s7-font-size) * 2.6); height: calc(var(--s7-font-size) * 1.5); flex: 0 0 auto; display: inline-grid; place-items: center; border: 1px solid var(--s7-ink); font: var(--s7-small-font)/1 var(--s7-small-mono); }
.kd-wallpaper-classic { background-color: #bbb; background-image: radial-gradient(#777 1px,transparent 1px); background-size: 3px 3px; }
.kd-wallpaper-gray { background: #aaa; }
.kd-wallpaper-pinstripe { background: repeating-linear-gradient(135deg,#888 0 1px,#ddd 1px 3px); }
.kd-wallpaper-cats { background: #ddd; }
.kd-desktop[data-ui-appearance="color"] .kd-wallpaper-classic { background-color: #a6b9b5; background-image: radial-gradient(#607b77 1px,transparent 1px); }
.kd-desktop[data-ui-appearance="color"] .kd-wallpaper-gray { background: #9aada9; }
.kd-desktop[data-ui-appearance="color"] .kd-wallpaper-pinstripe { background: repeating-linear-gradient(135deg,#6e8884 0 1px,#c0cfcb 1px 3px); }
.kd-desktop[data-ui-appearance="color"] .kd-wallpaper-cats { background: #a8bbb7; color: #304f4c; }
.kd-wallpaper-custom { background: repeating-linear-gradient(45deg,#eee 0 3px,#888 3px 4px); }
.kd-hidden-file { position: fixed; left: -10000px; width: 1px; height: 1px; opacity: 0; }
.kd-clock { flex: 1; display: flex; align-items: center; justify-content: space-evenly; padding: var(--s7-pad); font-variant-numeric: tabular-nums; }
.kd-clock-face { width: calc(var(--s7-font-size) * 4.8); height: calc(var(--s7-font-size) * 4.8); border: 2px solid var(--s7-ink); border-radius: 0; position: relative; background: var(--s7-light); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); }
.kd-clock-face::before { content: "12\a6"; white-space: pre; position: absolute; inset: 1px; text-align: center; line-height: calc(var(--s7-font-size) * 3.9); font-family: var(--s7-small-mono); font-size: var(--s7-small-font); }
.kd-clock-hand { position: absolute; left: calc(var(--s7-font-size) * 2.2); bottom: calc(var(--s7-font-size) * 2.2); width: 1px; background: var(--s7-ink); transform-origin: bottom; }
.kd-hour { height: calc(var(--s7-font-size) * 1.2); width: 2px; }.kd-minute { height: calc(var(--s7-font-size) * 1.8); }.kd-second { height: calc(var(--s7-font-size) * 2); border-left: 1px dotted var(--s7-dark); background: transparent; }
.kd-clock-pin { position: absolute; width: max(3px,calc(var(--s7-font-size) * .3)); height: max(3px,calc(var(--s7-font-size) * .3)); background: var(--s7-ink); left: calc(var(--s7-font-size) * 2.1); top: calc(var(--s7-font-size) * 2.1); border-radius: 0; }
.kd-puzzle-board { flex: 1 1 auto; align-self: center; width: min(calc(var(--s7-font-size) * 17),calc(100% - var(--s7-pad) * 4)); aspect-ratio: 1; margin: calc(var(--s7-pad) * 2); padding: 2px; display: grid; grid-template-columns: repeat(4,1fr); grid-template-rows: repeat(4,1fr); gap: 1px; border: 2px solid var(--s7-ink); background: var(--s7-dark); box-shadow: inset 1px 1px 0 var(--s7-white), 2px 2px 0 var(--s7-white); }
.kd-puzzle-tile { min-width: 0; min-height: 0; padding: 0; border: 1px solid var(--s7-ink); background: var(--s7-surface); box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark); font: calc(var(--s7-font-size) * 1.15)/1 var(--s7-mono); }
.kd-puzzle-tile:active { box-shadow: inset 1px 1px 0 var(--s7-dark); background: var(--s7-mid); }
.kd-puzzle-empty { background: var(--s7-light); border: 1px solid var(--s7-dark); }
.kd-scrap-card { flex: 1 1 auto; min-height: 0; display: grid; grid-template-rows: auto auto 1fr; gap: var(--s7-gap); padding: calc(var(--s7-pad) + 2px); background: repeating-linear-gradient(0deg,var(--s7-light) 0 var(--s7-line-height),var(--s7-mid) var(--s7-line-height) calc(var(--s7-line-height) + 1px)); }
.kd-scrap-card > .s7-input { font-weight: 400; }
.kd-scrap-card > .s7-textarea { min-height: 0; width: 100%; background: var(--s7-white); }
.kd-scrap-kind { font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-mono); }
.kd-trash-list { flex: 1 1 auto; min-height: 0; }
.kd-trash-list .kd-list-row > span:last-child { min-width: 0; display: grid; }
.kd-trash-list small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kd-about { text-align: center; padding: var(--s7-panel-pad); }
.kd-help-guide { max-height: min(60vh,calc(var(--s7-font-size) * 32)); overflow: auto; text-align: left; }
.kd-help-guide > p { margin: 0 0 var(--s7-gap); }
.kd-help-guide ol { margin: 0 0 var(--s7-gap); padding-left: calc(var(--s7-font-size) * 2.5); }
.kd-help-guide li + li { margin-top: var(--s7-gap); }
.kd-settings { flex: 1 1 auto; min-height: 0; padding: 2px; background: var(--s7-surface); }
.kd-settings-status { min-height: var(--s7-control-height); display: flex; align-items: center; gap: var(--s7-gap); padding: 2px var(--s7-pad); border: 1px solid var(--s7-dark); background: var(--s7-light); }
.kd-key-form { display: grid; grid-template-columns: auto minmax(calc(var(--s7-font-size) * 12),1fr) auto; gap: var(--s7-gap); align-items: center; margin: calc(var(--s7-gap) + 2px) 0 calc(var(--s7-gap) + 1px); }
.kd-key-form .s7-input { width: 100%; min-width: 0; }
.kd-settings-actions { display: flex; gap: var(--s7-gap); margin-top: calc(var(--s7-gap) + 1px); }
.kd-settings-notice { margin-top: calc(var(--s7-gap) + 1px); padding: var(--s7-pad); border: 1px solid var(--s7-dark); background: var(--s7-light); }
`
