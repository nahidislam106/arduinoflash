import * as vscode from 'vscode';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const BAUD_RATES = [9600, 115200, 57600, 38400] as const;

let activePort: SerialPort | undefined;
let activePanel: vscode.WebviewPanel | undefined;

function getWebviewContent(): string {
  const baudOptions = BAUD_RATES.map(
    (r) => `<option value="${r}">${r}</option>`
  ).join('\n          ');

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ArduinoFlash Serial Monitor</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      font-size: 13px;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #d4d4d4);
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 10px;
      gap: 8px;
    }

    /* ── Toolbar ────────────────── */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #858585);
      white-space: nowrap;
    }

    select {
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #555555);
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 13px;
      outline: none;
      cursor: pointer;
    }

    select:focus {
      border-color: var(--vscode-focusBorder, #007fd4);
    }

    /* ── Buttons ─────────────────── */
    button {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: none;
      border-radius: 3px;
      padding: 5px 14px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      transition: background 120ms;
    }

    button:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    button.secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    button.danger {
      background: #a31515;
    }

    button.danger:hover:not(:disabled) {
      background: #cc1717;
    }

    /* ── Status badge ──────────────── */
    .status {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0.4px;
    }

    .status.disconnected {
      background: rgba(244, 135, 113, 0.18);
      color: #f48771;
    }

    .status.connected {
      background: rgba(78, 201, 176, 0.18);
      color: #4ec9b0;
    }

    /* ── Output area ───────────────── */
    #output {
      flex: 1;
      background: #0d0d0d;
      color: #00ff41;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.5;
      padding: 10px;
      border: 1px solid var(--vscode-input-border, #555555);
      border-radius: 3px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* ── Send row ──────────────────── */
    .send-row {
      display: flex;
      gap: 8px;
    }

    .send-row input[type="text"] {
      flex: 1;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #555555);
      border-radius: 3px;
      padding: 5px 10px;
      font-size: 13px;
      outline: none;
    }

    .send-row input[type="text"]:focus {
      border-color: var(--vscode-focusBorder, #007fd4);
    }
  </style>
</head>
<body>

  <!-- Toolbar -->
  <div class="toolbar">
    <label for="baudRate">Baud Rate:</label>
    <select id="baudRate">
          ${baudOptions}
    </select>

    <button id="connectBtn" onclick="toggleConnect()">Connect</button>
    <button class="secondary" onclick="clearOutput()">Clear</button>
    <span id="status" class="status disconnected">Disconnected</span>
  </div>

  <!-- Output -->
  <div id="output"></div>

  <!-- Send row -->
  <div class="send-row">
    <input
      type="text"
      id="sendInput"
      placeholder="Type data to send to the board…"
      disabled
      onkeydown="handleKeyDown(event)"
    />
    <button id="sendBtn" onclick="sendData()" disabled>Send</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let connected = false;

    function toggleConnect() {
      if (connected) {
        vscode.postMessage({ command: 'disconnect' });
      } else {
        const baudRate = parseInt(
          document.getElementById('baudRate').value,
          10
        );
        vscode.postMessage({ command: 'connect', baudRate });
      }
    }

    function sendData() {
      const input = document.getElementById('sendInput');
      const data = input.value;
      if (!data.trim()) { return; }
      vscode.postMessage({ command: 'send', data: data + '\\n' });
      input.value = '';
    }

    function handleKeyDown(event) {
      if (event.key === 'Enter') { sendData(); }
    }

    function clearOutput() {
      document.getElementById('output').textContent = '';
    }

    function appendOutput(text) {
      const output = document.getElementById('output');
      output.textContent += text + '\\n';
      output.scrollTop = output.scrollHeight;
    }

    function setConnected(isConnected) {
      connected = isConnected;

      const connectBtn = document.getElementById('connectBtn');
      const sendInput = document.getElementById('sendInput');
      const sendBtn = document.getElementById('sendBtn');
      const status = document.getElementById('status');

      connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
      connectBtn.className   = isConnected ? 'danger' : '';
      sendInput.disabled     = !isConnected;
      sendBtn.disabled       = !isConnected;
      status.textContent     = isConnected ? 'Connected' : 'Disconnected';
      status.className       = 'status ' + (isConnected ? 'connected' : 'disconnected');
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.command) {
        case 'data':
          appendOutput(msg.line);
          break;
        case 'connected':
          setConnected(true);
          appendOutput('[Connected — baud rate: ' + msg.baudRate + ']');
          break;
        case 'disconnected':
          setConnected(false);
          appendOutput('[Disconnected]');
          break;
        case 'error':
          appendOutput('[Error] ' + msg.message);
          break;
      }
    });
  </script>
</body>
</html>`;
}

async function closePort(): Promise<void> {
  if (activePort && activePort.isOpen) {
    await new Promise<void>((resolve, reject) => {
      activePort!.close((err) => (err ? reject(err) : resolve()));
    });
  }
  activePort = undefined;
}


async function handleConnect(
  panel: vscode.WebviewPanel,
  portPath: string,
  baudRate: number
): Promise<void> {
  try {
    await closePort();

    activePort = new SerialPort({ path: portPath, baudRate, autoOpen: false });

    const parser = activePort.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (line: string) => {
      panel.webview.postMessage({ command: 'data', line: line.trimEnd() });
    });

    activePort.on('error', (err: Error) => {
      panel.webview.postMessage({ command: 'error', message: err.message });
    });

    activePort.on('close', () => {
      panel.webview.postMessage({ command: 'disconnected' });
      activePort = undefined;
    });

    await new Promise<void>((resolve, reject) => {
      activePort!.open((err) => (err ? reject(err) : resolve()));
    });

    panel.webview.postMessage({ command: 'connected', baudRate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    panel.webview.postMessage({ command: 'error', message });
    vscode.window.showErrorMessage(`ArduinoFlash Serial Monitor: ${message}`);
  }
}

async function handleDisconnect(panel: vscode.WebviewPanel): Promise<void> {
  try {
    await closePort();
    panel.webview.postMessage({ command: 'disconnected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    panel.webview.postMessage({ command: 'error', message });
  }
}

async function handleSend(
  panel: vscode.WebviewPanel,
  data: string
): Promise<void> {
  if (!activePort?.isOpen) {
    panel.webview.postMessage({
      command: 'error',
      message: 'Not connected to a serial port.',
    });
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      activePort!.write(data, (err) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    panel.webview.postMessage({ command: 'error', message });
  }
}


export function openSerialMonitor(
  context: vscode.ExtensionContext,
  portPath: string
): void {
  if (activePanel) {
    activePanel.reveal(vscode.ViewColumn.Two);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'arduinoflashMonitor',
    'ArduinoFlash: Serial Monitor',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  activePanel = panel;
  panel.webview.html = getWebviewContent();

  panel.webview.onDidReceiveMessage(
    async (message: { command: string; baudRate?: number; data?: string }) => {
      switch (message.command) {
        case 'connect':
          await handleConnect(panel, portPath, message.baudRate ?? 9600);
          break;
        case 'disconnect':
          await handleDisconnect(panel);
          break;
        case 'send':
          await handleSend(panel, message.data ?? '');
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(
    async () => {
      try {
        await closePort();
      } catch {}
      activePanel = undefined;
    },
    undefined,
    context.subscriptions
  );
}

export async function disposeSerialMonitor(): Promise<void> {
  try {
    await closePort();
  } catch {}
  activePanel?.dispose();
  activePanel = undefined;
}
