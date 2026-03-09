import * as vscode from 'vscode';
import { getSelectedBoard } from './boardManager';
import { getSelectedPort } from './portManager';

export class InoPanel {
  private static _panel: vscode.WebviewPanel | undefined;
  private static _context: vscode.ExtensionContext;

  /** Show or reveal the panel. Call whenever an .ino editor becomes active. */
  static createOrShow(context: vscode.ExtensionContext): void {
    InoPanel._context = context;

    if (InoPanel._panel) {
      InoPanel._panel.reveal(vscode.ViewColumn.Beside, /* preserveFocus */ true);
      InoPanel._update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'arduinoflash.inoPanel',
      'ArduinoFlash',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );

    InoPanel._panel = panel;
    InoPanel._update();

    panel.onDidDispose(() => {
      InoPanel._panel = undefined;
    });

    panel.webview.onDidReceiveMessage((msg: { command: string }) => {
      switch (msg.command) {
        case 'selectBoard':
          vscode.commands.executeCommand('arduinoflash.selectBoard');
          break;
        case 'selectPort':
          vscode.commands.executeCommand('arduinoflash.selectPort');
          break;
        case 'compile':
          vscode.commands.executeCommand('arduinoflash.compile');
          break;
        case 'upload':
          vscode.commands.executeCommand('arduinoflash.upload');
          break;
        case 'openMonitor':
          vscode.commands.executeCommand('arduinoflash.openMonitor');
          break;
      }
    });
  }

  /** Refresh the panel HTML (e.g. after board / port selection changes). */
  static refresh(context: vscode.ExtensionContext): void {
    InoPanel._context = context;
    if (InoPanel._panel) {
      InoPanel._update();
    }
  }

  private static _update(): void {
    if (!InoPanel._panel) {
      return;
    }
    const board = getSelectedBoard(InoPanel._context);
    const port  = getSelectedPort(InoPanel._context);
    InoPanel._panel.webview.html = InoPanel._getHtml(
      board?.name  ?? null,
      board?.fqbn  ?? null,
      port         ?? null
    );
  }

  private static _getHtml(
    boardName: string | null,
    boardFqbn: string | null,
    port: string | null
  ): string {
    const boardLabel = boardName ? boardName : 'Not selected';
    const boardSub   = boardFqbn ? `<span class="sub">${boardFqbn}</span>` : '';
    const portLabel  = port      ? port         : 'Not selected';
    const boardSet   = boardName !== null;
    const portSet    = port      !== null;
    const canUpload  = boardSet && portSet;

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>ArduinoFlash</title>
<style>
  :root {
    --bg: #1e1e2e;
    --surface: #2a2a3d;
    --border: #3a3a55;
    --accent: #00b4d8;
    --accent2: #48cae4;
    --green: #4caf50;
    --orange: #ff9800;
    --red: #ef5350;
    --blue: #42a5f5;
    --text: #cdd6f4;
    --subtext: #7f849c;
    --radius: 10px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    padding: 16px;
    min-height: 100vh;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .header-icon {
    width: 36px;
    height: 36px;
    background: var(--accent);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.5px;
  }
  .header p {
    font-size: 11px;
    color: var(--subtext);
    margin-top: 1px;
  }

  /* ── Info cards ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .card-info { flex: 1; overflow: hidden; }
  .card-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--subtext);
    margin-bottom: 3px;
  }
  .card-value {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-value.unset { color: var(--subtext); font-style: italic; }
  .sub {
    display: block;
    font-size: 11px;
    font-weight: 400;
    color: var(--subtext);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-right: 4px;
  }
  .indicator.set   { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .indicator.unset { background: var(--subtext); }

  /* ── Buttons ── */
  button {
    border: none;
    border-radius: 7px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
    white-space: nowrap;
  }
  button:active { transform: scale(.96); }
  button:hover  { opacity: .87; }
  button:disabled { opacity: .35; cursor: not-allowed; transform: none; }

  .btn-change {
    font-size: 12px;
    padding: 6px 12px;
    background: var(--border);
    color: var(--text);
  }

  /* ── Action buttons ── */
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 6px;
  }
  .actions .btn-full { grid-column: 1 / -1; }
  .action-btn {
    font-size: 13px;
    padding: 12px 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }
  .btn-compile  { background: var(--blue);   color: #fff; }
  .btn-upload   { background: var(--green);  color: #fff; }
  .btn-monitor  { background: var(--orange); color: #fff; }

  /* ── Divider ── */
  .divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 16px 0;
  }

  /* ── Section title ── */
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--subtext);
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-icon">⚡</div>
  <div>
    <h1>ArduinoFlash</h1>
    <p>Arduino CLI integration</p>
  </div>
</div>

<p class="section-title">Configuration</p>

<!-- Board -->
<div class="card">
  <span class="indicator ${boardSet ? 'set' : 'unset'}"></span>
  <div class="card-info">
    <div class="card-label">Board</div>
    <div class="card-value ${boardSet ? '' : 'unset'}">${boardLabel}${boardSub}</div>
  </div>
  <button class="btn-change" onclick="send('selectBoard')">Change</button>
</div>

<!-- Port -->
<div class="card">
  <span class="indicator ${portSet ? 'set' : 'unset'}"></span>
  <div class="card-info">
    <div class="card-label">Serial Port</div>
    <div class="card-value ${portSet ? '' : 'unset'}">${portLabel}</div>
  </div>
  <button class="btn-change" onclick="send('selectPort')">Change</button>
</div>

<hr class="divider">
<p class="section-title">Actions</p>

<div class="actions">
  <button class="action-btn btn-compile ${boardSet ? '' : 'disabled-btn'}"
          onclick="send('compile')" ${boardSet ? '' : 'disabled'}>
    ▶ Compile
  </button>

  <button class="action-btn btn-upload ${canUpload ? '' : 'disabled-btn'}"
          onclick="send('upload')" ${canUpload ? '' : 'disabled'}>
    ⬆ Upload
  </button>

  <button class="action-btn btn-monitor btn-full ${portSet ? '' : 'disabled-btn'}"
          onclick="send('openMonitor')" ${portSet ? '' : 'disabled'}>
    ⬛ Serial Monitor
  </button>
</div>

<script>
  const vscode = acquireVsCodeApi();
  function send(command) { vscode.postMessage({ command }); }
</script>
</body>
</html>`;
  }

  static dispose(): void {
    InoPanel._panel?.dispose();
    InoPanel._panel = undefined;
  }
}
