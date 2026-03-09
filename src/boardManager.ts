import * as vscode from 'vscode';

export interface Board {
  name: string;
  fqbn: string;
}

const SUPPORTED_BOARDS: Board[] = [
  { name: 'Arduino Uno',     fqbn: 'arduino:avr:uno'           },
  { name: 'ESP32 DevKit V1', fqbn: 'esp32:esp32:esp32'         },
  { name: 'ESP8266 NodeMCU', fqbn: 'esp8266:esp8266:nodemcuv2' },
];

export async function selectBoard(
  context: vscode.ExtensionContext
): Promise<Board | undefined> {
  const items: vscode.QuickPickItem[] = SUPPORTED_BOARDS.map((board) => ({
    label: board.name,
    description: board.fqbn,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a target board',
    title: 'ArduinoFlash: Select Board',
  });

  if (!selected) {
    return undefined;
  }

  const board = SUPPORTED_BOARDS.find((b) => b.name === selected.label);
  if (board) {
    await context.workspaceState.update('arduinoflash.selectedBoard', board);
  }
  return board;
}

export function getSelectedBoard(
  context: vscode.ExtensionContext
): Board | undefined {
  return context.workspaceState.get<Board>('arduinoflash.selectedBoard');
}
