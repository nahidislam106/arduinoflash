import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('ArduinoFlash');
  }
  return outputChannel;
}

export async function checkArduinoCLI(): Promise<boolean> {
  return new Promise((resolve) => {
    cp.exec('arduino-cli version', (error) => {
      if (error) {
        vscode.window.showErrorMessage(
          'ArduinoFlash: arduino-cli is not ready yet. ' +
          'Please wait for the first-time setup to finish, or check the Output panel for details.'
        );
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const channel = getOutputChannel();
    channel.appendLine(`\n> ${command}`);
    channel.show(true);

    const proc = cp.spawn(command, { shell: true });

    proc.stdout.on('data', (chunk: Buffer) => {
      channel.append(chunk.toString());
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      channel.append(chunk.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

export function getSketchPath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage(
      'ArduinoFlash: No active file found. Please open your sketch file first.'
    );
    return undefined;
  }
  return path.dirname(editor.document.uri.fsPath);
}

export async function compileSketch(
  sketchPath: string,
  fqbn: string
): Promise<void> {
  const cliAvailable = await checkArduinoCLI();
  if (!cliAvailable) {
    throw new Error('arduino-cli is not installed.');
  }

  const channel = getOutputChannel();
  channel.appendLine(`[ArduinoFlash] Compiling sketch: ${sketchPath}`);
  channel.appendLine(`[ArduinoFlash] Board FQBN: ${fqbn}`);

  const safePath = sketchPath.replace(/"/g, '\\"');
  await runCommand(`arduino-cli compile --fqbn ${fqbn} "${safePath}"`);

  channel.appendLine('[ArduinoFlash] Compilation successful.');
}

export async function uploadSketch(
  sketchPath: string,
  fqbn: string,
  port: string
): Promise<void> {
  const cliAvailable = await checkArduinoCLI();
  if (!cliAvailable) {
    throw new Error('arduino-cli is not installed.');
  }

  const channel = getOutputChannel();
  channel.appendLine(`[ArduinoFlash] Uploading sketch to port: ${port}`);

  const safePath = sketchPath.replace(/"/g, '\\"');
  await runCommand(
    `arduino-cli upload -p ${port} --fqbn ${fqbn} "${safePath}"`
  );

  channel.appendLine('[ArduinoFlash] Upload successful.');
}

export function disposeOutputChannel(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
