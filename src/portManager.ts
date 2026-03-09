import * as vscode from 'vscode';
import { SerialPort } from 'serialport';

export async function selectPort(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  let ports: { path: string; manufacturer?: string }[];

  try {
    ports = await SerialPort.list();
  } catch (err) {
    vscode.window.showErrorMessage(
      `ArduinoFlash: Failed to list serial ports — ${err}`
    );
    return undefined;
  }

  if (ports.length === 0) {
    vscode.window.showWarningMessage(
      'ArduinoFlash: No serial ports found. Make sure your board is connected.'
    );
    return undefined;
  }

  const items: vscode.QuickPickItem[] = ports.map((p) => ({
    label: p.path,
    description: p.manufacturer ?? 'Unknown manufacturer',
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a serial port',
    title: 'ArduinoFlash: Select Port',
  });

  if (!selected) {
    return undefined;
  }

  await context.workspaceState.update('arduinoflash.selectedPort', selected.label);
  return selected.label;
}

export function getSelectedPort(
  context: vscode.ExtensionContext
): string | undefined {
  return context.workspaceState.get<string>('arduinoflash.selectedPort');
}
