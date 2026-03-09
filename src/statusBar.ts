import * as vscode from 'vscode';
import { getSelectedBoard } from './boardManager';
import { getSelectedPort } from './portManager';

const statusBarItems: vscode.StatusBarItem[] = [];

let boardItem!: vscode.StatusBarItem;
let portItem!: vscode.StatusBarItem;

function createItem(
  text: string,
  tooltip: string,
  command: string,
  priority: number
): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    priority
  );
  item.text = text;
  item.tooltip = tooltip;
  item.command = command;
  item.show();
  statusBarItems.push(item);
  return item;
}

export function initStatusBar(context: vscode.ExtensionContext): void {
  boardItem = createItem(
    '$(circuit-board) Select Board',
    'ArduinoFlash: Select target board',
    'arduinoflash.selectBoard',
    100
  );

  portItem = createItem(
    '$(plug) Select Port',
    'ArduinoFlash: Select serial port',
    'arduinoflash.selectPort',
    99
  );

  createItem(
    '$(check) Compile',
    'ArduinoFlash: Compile sketch',
    'arduinoflash.compile',
    98
  );

  createItem(
    '$(arrow-up) Upload',
    'ArduinoFlash: Compile & upload sketch',
    'arduinoflash.upload',
    97
  );

  createItem(
    '$(terminal) Monitor',
    'ArduinoFlash: Open Serial Monitor',
    'arduinoflash.openMonitor',
    96
  );

  refreshStatusBar(context);
}

export function refreshStatusBar(context: vscode.ExtensionContext): void {
  const board = getSelectedBoard(context);
  const port = getSelectedPort(context);

  boardItem.text = board
    ? `$(circuit-board) ${board.name}`
    : '$(circuit-board) Select Board';

  portItem.text = port
    ? `$(plug) ${port}`
    : '$(plug) Select Port';
}

export function disposeStatusBar(): void {
  for (const item of statusBarItems) {
    item.dispose();
  }
  statusBarItems.length = 0;
}
