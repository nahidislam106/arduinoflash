import * as vscode from 'vscode';

import { selectBoard, getSelectedBoard } from './boardManager';
import { selectPort, getSelectedPort } from './portManager';
import {
  compileSketch,
  uploadSketch,
  getSketchPath,
  disposeOutputChannel,
} from './arduinoCLI';
import { openSerialMonitor, disposeSerialMonitor } from './serialMonitor';
import { initStatusBar, refreshStatusBar, disposeStatusBar } from './statusBar';
import { InoPanel } from './inoPanel';
import { applyCachedCliPath, runSetupIfNeeded, resetSetup } from './autoSetup';

/** Returns true when the document belongs to a .ino sketch file. */
function isInoEditor(editor: vscode.TextEditor | undefined): boolean {
  return !!editor && editor.document.fileName.endsWith('.ino');
}

export function activate(context: vscode.ExtensionContext): void {
  // Re-inject the bundled CLI directory into PATH on every startup (no-op if
  // the CLI was never downloaded or is already in the system PATH).
  applyCachedCliPath(context);

  // Kick off the one-time setup (downloads CLI + installs cores).
  // Runs in the background; skips if already completed.
  runSetupIfNeeded(context);

  initStatusBar(context);

  // Command to force setup to re-run (e.g. after a failed install).
  context.subscriptions.push(
    vscode.commands.registerCommand('arduinoflash.runSetupAgain', async () => {
      await resetSetup(context);
      runSetupIfNeeded(context);
    })
  );

  // Auto-show the ArduinoFlash panel whenever a .ino file is focused.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (isInoEditor(editor)) {
        InoPanel.createOrShow(context);
      }
    })
  );

  // If a .ino file is already open when the extension activates, show it now.
  if (isInoEditor(vscode.window.activeTextEditor)) {
    InoPanel.createOrShow(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('arduinoflash.selectBoard', async () => {
      const board = await selectBoard(context);
      if (board) {
        vscode.window.showInformationMessage(
          `ArduinoFlash: Board set to "${board.name}" (${board.fqbn})`
        );
        refreshStatusBar(context);
        InoPanel.refresh(context);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arduinoflash.selectPort', async () => {
      const port = await selectPort(context);
      if (port) {
        vscode.window.showInformationMessage(
          `ArduinoFlash: Port set to "${port}"`
        );
        refreshStatusBar(context);
        InoPanel.refresh(context);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arduinoflash.compile', async () => {
      const board = getSelectedBoard(context);
      if (!board) {
        vscode.window.showErrorMessage(
          'ArduinoFlash: No board selected. Use "ArduinoFlash: Select Board" first.'
        );
        return;
      }

      const sketchPath = getSketchPath();
      if (!sketchPath) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'ArduinoFlash',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Compiling…' });
          try {
            await compileSketch(sketchPath, board.fqbn);
            vscode.window.showInformationMessage(
              'ArduinoFlash: Compilation successful! ✔'
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(
              `ArduinoFlash: Compilation failed — ${message}`
            );
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arduinoflash.upload', async () => {
      const board = getSelectedBoard(context);
      if (!board) {
        vscode.window.showErrorMessage(
          'ArduinoFlash: No board selected. Use "ArduinoFlash: Select Board" first.'
        );
        return;
      }

      const port = getSelectedPort(context);
      if (!port) {
        vscode.window.showErrorMessage(
          'ArduinoFlash: No port selected. Use "ArduinoFlash: Select Port" first.'
        );
        return;
      }

      const sketchPath = getSketchPath();
      if (!sketchPath) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'ArduinoFlash',
          cancellable: false,
        },
        async (progress) => {
          try {
            progress.report({ message: 'Compiling…' });
            await compileSketch(sketchPath, board.fqbn);

            progress.report({ message: 'Uploading…' });
            await uploadSketch(sketchPath, board.fqbn, port);

            vscode.window.showInformationMessage(
              'ArduinoFlash: Upload successful! ✔'
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`ArduinoFlash: ${message}`);
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arduinoflash.openMonitor', () => {
      const port = getSelectedPort(context);
      if (!port) {
        vscode.window.showErrorMessage(
          'ArduinoFlash: No port selected. Use "ArduinoFlash: Select Port" first.'
        );
        return;
      }
      openSerialMonitor(context, port);
    })
  );
}

export async function deactivate(): Promise<void> {
  await disposeSerialMonitor();
  disposeOutputChannel();
  disposeStatusBar();
  InoPanel.dispose();
}
