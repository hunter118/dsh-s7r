export const KNOWLEDGE_DESK_STYLES = String.raw`
.kd-agent-toolbar { min-height: var(--s7-toolbar-height); display: flex; align-items: center; gap: var(--s7-gap); padding: 2px var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-surface); box-shadow: inset 0 1px 0 var(--s7-white); white-space: nowrap; overflow-x: auto; overflow-y: hidden; }
.kd-agent-toolbar > strong { white-space: nowrap; }
.kd-led { width: calc(var(--s7-small-font) - 1px); height: calc(var(--s7-small-font) - 1px); border: 1px solid var(--s7-ink); background: var(--s7-surface); display: inline-block; }
.kd-led-running { background: var(--s7-ink); animation: kd-blink 1.2s steps(1,end) infinite; }
@keyframes kd-blink { 50% { background: var(--s7-white); } }
.kd-conversation-shell { position: relative; flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; }
.kd-conversation { flex: 1 1 auto; min-width: 0; min-height: 0; background: var(--s7-light); padding: var(--s7-pad); user-select: text; }
.kd-agent-main { flex: 1 1 auto; min-height: 0; display: flex; }
.kd-agent-main > .kd-conversation-shell { min-width: 0; }
.kd-follow-output { position: absolute; right: calc(var(--s7-scrollbar) + var(--s7-gap)); bottom: var(--s7-gap); z-index: 2; }
.kd-follow-output.kd-follow-output-new { border-width: 2px; background: var(--s7-light); color: var(--s7-ink); text-shadow: none; box-shadow: inset 1px 1px 0 var(--s7-white), inset -1px -1px 0 var(--s7-dark), 2px 2px 0 var(--s7-ink); }
.kd-context-inspector, .kd-agent-actions-inspector { flex: 0 0 min(42%,calc(var(--s7-font-size) * 25)); min-width: calc(var(--s7-font-size) * 19); min-height: 0; overflow: auto; padding: var(--s7-pad); border-left: 2px solid var(--s7-ink); background: var(--s7-surface); }
.kd-context-inspector > header { display: flex; justify-content: space-between; gap: var(--s7-gap); border-bottom: 1px solid var(--s7-dark); margin-bottom: var(--s7-gap); }
.kd-agent-actions-inspector > header { display: flex; justify-content: space-between; gap: var(--s7-gap); border-bottom: 1px solid var(--s7-dark); margin-bottom: var(--s7-gap); }
.kd-agent-actions-inspector p { margin: var(--s7-gap) 0; }
.kd-agent-action-stack { display: grid; gap: var(--s7-gap); margin-top: calc(var(--s7-gap) * 2); }
.kd-agent-action-stack .s7-button { width: 100%; text-align: left; }
.kd-context-inspector p { margin: var(--s7-gap) 0; }
.kd-context-warning { padding: var(--s7-pad); border: 1px solid var(--s7-ink); background: var(--s7-mid); }
.kd-context-critical { border-width: 3px; }
.kd-context-bars { display: grid; gap: var(--s7-gap); }
.kd-context-bars section { display: grid; grid-template-columns: 1fr auto; gap: 1px var(--s7-gap); }
.kd-context-bars i { grid-column: 1 / -1; height: max(5px,calc(var(--s7-small-font) * .7)); border: 1px solid var(--s7-dark); background: var(--s7-white); }
.kd-context-bars b { display: block; height: 100%; max-width: 100%; background: repeating-linear-gradient(90deg,var(--s7-ink) 0 2px,transparent 2px 3px); }
.kd-context-bars small { grid-column: 1 / -1; }
.kd-context-inspector details { margin-top: var(--s7-gap); }
.kd-context-inspector pre { max-height: calc(var(--s7-font-size) * 12); overflow: auto; white-space: pre-wrap; border: 1px solid var(--s7-dark); background: var(--s7-white); padding: var(--s7-pad); }
.kd-context-actions { display: flex; flex-wrap: wrap; gap: var(--s7-gap); margin-top: var(--s7-gap); }
.kd-context-button-critical { border-width: 2px; background: var(--s7-mid); }
.kd-message { margin: 0 0 var(--s7-gap); border: 1px solid var(--s7-dark); background: var(--s7-white); padding: var(--s7-pad); white-space: pre-wrap; overflow-wrap: anywhere; }
.kd-message > header { display: flex; align-items: center; gap: var(--s7-gap); min-height: calc(var(--s7-line-height) + 1px); border-bottom: 1px dotted var(--s7-dark); margin-bottom: 2px; }
.kd-message-user { margin-left: calc(var(--s7-font-size) * 2); background: var(--s7-light); }
.kd-message-assistant { margin-right: var(--s7-font-size); border-width: 2px 1px 1px 2px; }
.kd-message-tool { margin-left: var(--s7-font-size); font-family: var(--s7-mono); font-size: var(--s7-font-size); background: var(--s7-surface); }
.kd-message-context { border-style: dashed; }
.kd-message-error, .kd-composer-error { background: var(--s7-mid); border: 2px solid var(--s7-ink); }
.kd-role { font: var(--s7-small-font)/var(--s7-small-line) var(--s7-small-mono); border: 1px solid var(--s7-ink); padding: 0 2px; background: var(--s7-ink); color: var(--s7-white); }
.kd-message-text { white-space: pre-wrap; line-height: var(--s7-line-height); }
.kd-markdown { white-space: normal; line-height: var(--s7-line-height); overflow-wrap: anywhere; }
.kd-markdown > :first-child { margin-top: 0; }
.kd-markdown > :last-child { margin-bottom: 0; }
.kd-markdown p { margin: 0 0 var(--s7-gap); white-space: pre-wrap; }
.kd-markdown h1, .kd-markdown h2, .kd-markdown h3, .kd-markdown h4, .kd-markdown h5, .kd-markdown h6 { margin: calc(var(--s7-gap) * 2) 0 var(--s7-gap); padding-bottom: 1px; border-bottom: 1px dotted var(--s7-dark); line-height: 1.2; }
.kd-markdown h1 { font-size: calc(var(--s7-font-size) * 1.4); border-bottom-style: double; border-bottom-width: 3px; }
.kd-markdown h2 { font-size: calc(var(--s7-font-size) * 1.25); border-bottom-style: solid; }
.kd-markdown h3 { font-size: calc(var(--s7-font-size) * 1.1); }
.kd-markdown h4, .kd-markdown h5, .kd-markdown h6 { font-size: var(--s7-font-size); }
.kd-markdown strong { font-weight: 400; background: var(--s7-ink); color: var(--s7-white); padding: 0 1px; }
.kd-markdown code { padding: 0 2px; border: 1px solid var(--s7-dark); background: var(--s7-light); }
.kd-markdown ul, .kd-markdown ol { margin: 0 0 var(--s7-gap); padding-left: calc(var(--s7-font-size) * 2.4); }
.kd-markdown blockquote { margin: 0 0 var(--s7-gap); padding-left: var(--s7-pad); border-left: 3px double var(--s7-dark); white-space: pre-wrap; }
.kd-markdown-code { margin: 0 0 var(--s7-gap) !important; }
.kd-markdown-table-wrap { max-width: 100%; overflow: auto; margin: 0 0 var(--s7-gap); border: 1px solid var(--s7-ink); }
.kd-markdown table { width: 100%; border-collapse: collapse; background: var(--s7-white); }
.kd-markdown th, .kd-markdown td { padding: 2px var(--s7-pad); border-right: 1px solid var(--s7-dark); border-bottom: 1px solid var(--s7-dark); text-align: left; vertical-align: top; white-space: pre-wrap; }
.kd-markdown th { background: var(--s7-surface); box-shadow: inset 0 1px 0 var(--s7-white); }
.kd-markdown th:last-child, .kd-markdown td:last-child { border-right: 0; }
.kd-markdown tbody tr:last-child td { border-bottom: 0; }
.kd-message pre, .kd-tool pre, .kd-reasoning pre { margin: 2px 0 0; padding: var(--s7-pad); max-height: calc(var(--s7-font-size) * 21); overflow: auto; background: var(--s7-white); border: 1px solid var(--s7-dark); white-space: pre-wrap; user-select: text; }
.kd-reasoning { margin: 2px 0; border-left: 3px double var(--s7-dark); padding-left: var(--s7-gap); }
.kd-tool { margin: 2px 0; border: 1px solid var(--s7-dark); background: var(--s7-light); padding: 2px; }
.kd-streaming { outline: 1px dotted var(--s7-ink); }
.kd-notice { border: 1px dashed var(--s7-dark); padding: 2px; margin: 2px 0; text-align: center; }
.kd-composer { flex: 0 0 auto; display: grid; grid-template-columns: 1fr auto; gap: var(--s7-gap); padding: var(--s7-pad); background: var(--s7-surface); border-top: 1px solid var(--s7-dark); box-shadow: inset 0 1px 0 var(--s7-white); }
.kd-composer .s7-textarea { width: 100%; min-height: var(--s7-composer-height); font-family: var(--s7-mono); }
.kd-composer-error { padding: 2px var(--s7-pad); border-width: 1px 0 0; }
.kd-mini-action, .kd-file-link { border: 0; background: transparent; padding: 0; text-decoration: underline; font: inherit; color: inherit; }
.kd-scrapbook-link { text-underline-offset: 2px; white-space: nowrap; }
.kd-scrapbook-link:active { color: var(--s7-white); background: var(--s7-ink); }
.kd-scrapbook-link[data-visited="true"] { color: var(--s7-dark); text-decoration-style: dotted; }
.kd-file-link { font-family: var(--s7-mono); }
.kd-load-older { text-align: center; padding: var(--s7-pad); }
.kd-session-picker { min-height: 0; flex: 1; display: flex; flex-direction: column; container-type: inline-size; }
.kd-launcher-top { flex: 0 0 auto; display: grid; grid-template-columns: calc(var(--s7-icon) * 2) minmax(var(--s7-min-window-width),1fr) auto auto; gap: var(--s7-gap); align-items: center; padding: calc(var(--s7-pad) * 2); border-bottom: 2px solid var(--s7-ink); background: var(--s7-surface); }
.kd-launcher-top h2, .kd-launcher-top p { margin: 0 0 2px; }
.kd-current-workspace { min-width: 0; }
.kd-current-workspace > small { display: block; letter-spacing: 1px; }
.kd-current-workspace > p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kd-launcher-columns { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; }
.kd-launcher-pane { min-width: 0; min-height: 0; display: flex; flex-direction: column; border-right: 1px solid var(--s7-dark); }
.kd-launcher-pane:last-child { border-right: 0; }
.kd-launcher-pane > header { min-height: var(--s7-toolbar-height); display: flex; gap: var(--s7-gap); align-items: center; padding: 2px var(--s7-pad); border-bottom: 1px solid var(--s7-dark); background: var(--s7-surface); }
.kd-launcher-pane > .kd-list { flex: 1 1 auto; min-height: 0; }
.kd-agent-search { padding: var(--s7-pad); border-bottom: 1px solid var(--s7-dark); display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: var(--s7-gap); }
.kd-agent-search .s7-input { grid-column: 1 / -1; width: 100%; min-width: 0; }
.kd-agent-search .s7-select { min-width: 0; max-width: none; }
.kd-launcher-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: var(--s7-gap); padding: var(--s7-pad) calc(var(--s7-resizer) + var(--s7-gap)) var(--s7-pad) var(--s7-pad); border-top: 1px solid var(--s7-dark); background: var(--s7-surface); }
.kd-upstream-archive { margin: 0; padding: var(--s7-pad); border-top: 1px solid var(--s7-dark); background: var(--s7-mid); }
.kd-launcher-pane .kd-list-row > span:not(.kd-led):not(.kd-spacer):not(.s7-app-icon) { min-width: 0; display: grid; gap: 2px; }
.kd-launcher-pane small { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kd-workspace-row .s7-app-icon { width: var(--s7-control-height); height: calc(var(--s7-control-height) - 1px); flex-basis: var(--s7-control-height); box-shadow: none; }
.kd-list-heading { position: sticky; top: 0; z-index: 1; min-height: var(--s7-control-height); display: flex; align-items: center; justify-content: space-between; padding: 1px var(--s7-pad); border-bottom: 1px solid var(--s7-ink); background: var(--s7-mid); box-shadow: inset 0 1px 0 var(--s7-white); }
.kd-agent-row small { font-family: var(--s7-small-mono); }
.kd-welcome-mark { margin: 0 auto; width: calc(var(--s7-icon) * 1.7); height: calc(var(--s7-icon) * 1.7); display: grid; place-items: center; border: 3px double var(--s7-ink); font: var(--s7-font-size) var(--s7-mono); background: var(--s7-surface); box-shadow: 2px 2px 0 var(--s7-dark); }
@container (min-width: 480px) { .kd-launcher-columns { grid-template-columns: minmax(calc(var(--s7-font-size) * 19),.75fr) minmax(0,1.25fr); } }
@container (max-width: 479px) {
  .kd-launcher-top { grid-template-columns: calc(var(--s7-icon) * 2) minmax(0,1fr) auto; }
  .kd-launcher-top > .s7-button:last-child { grid-column: 3; }
  .kd-launcher-columns { grid-template-columns: 1fr; grid-template-rows: minmax(calc(var(--s7-font-size) * 10),.8fr) minmax(calc(var(--s7-font-size) * 14),1.2fr); }
  .kd-launcher-pane { border-right: 0; border-bottom: 1px solid var(--s7-dark); }
  .kd-agent-search { grid-template-columns: repeat(3,minmax(0,1fr)); }
}
`
