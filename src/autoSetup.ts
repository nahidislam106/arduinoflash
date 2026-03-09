/**
 * autoSetup.ts
 *
 * Runs once on first activation:
 *  1. Checks whether arduino-cli is already in the system PATH.
 *  2. If not, downloads the correct binary for the current OS/arch and places
 *     it in VS Code's global extension storage.
 *  3. Prepends that directory to process.env.PATH so every child process
 *     (compile, upload, …) can find the CLI without any user action.
 *  4. Configures additional board-manager URLs and installs the three cores:
 *       • arduino:avr   (Arduino Uno)
 *       • esp32:esp32   (ESP32)
 *       • esp8266:esp8266 (ESP8266 NodeMCU)
 *
 * A globalState flag prevents the heavy work from repeating on every startup.
 * The user can reset it with the "ArduinoFlash: Run Setup Again" command.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Bump this key to force a re-run after a major update. */
const SETUP_DONE_KEY = 'arduinoflash.setupDone.v1';

const FALLBACK_CLI_VERSION = '1.1.1';

const ESP32_BMU  = 'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json';
const ESP8266_BMU = 'https://arduino.esp8266.com/stable/package_esp8266com_index.json';

const CORES: Array<{ id: string; name: string; bmu?: string }> = [
  { id: 'arduino:avr',     name: 'Arduino AVR (Uno)'  },
  { id: 'esp32:esp32',     name: 'ESP32',    bmu: ESP32_BMU  },
  { id: 'esp8266:esp8266', name: 'ESP8266',  bmu: ESP8266_BMU },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStorageDir(context: vscode.ExtensionContext): string {
  const dir = context.globalStorageUri.fsPath;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBundledExePath(context: vscode.ExtensionContext): string {
  return path.join(
    getStorageDir(context),
    process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli'
  );
}

/** Prepend the extension storage dir to PATH so spawned processes find the CLI. */
function injectDirIntoPath(dir: string): void {
  if (!process.env.PATH?.split(path.delimiter).includes(dir)) {
    process.env.PATH = `${dir}${path.delimiter}${process.env.PATH ?? ''}`;
  }
}

/** Run a shell command; resolves with stdout, rejects with stderr/message. */
function exec(cmd: string, timeoutMs = 600_000): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(cmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

/** True if `arduino-cli` resolves correctly on the current PATH. */
async function cliInPath(): Promise<boolean> {
  try {
    await exec('arduino-cli version', 8_000);
    return true;
  } catch {
    return false;
  }
}

// ─── Public: restore cached CLI path on every startup ─────────────────────────

/**
 * Call this at the very start of `activate()`.
 * If we previously downloaded the CLI, its directory is re-injected into PATH
 * so the extension works even after VS Code restarts.
 */
export function applyCachedCliPath(context: vscode.ExtensionContext): void {
  const exe = getBundledExePath(context);
  if (fs.existsSync(exe)) {
    injectDirIntoPath(path.dirname(exe));
  }
}

// ─── Step 1 – Download arduino-cli ───────────────────────────────────────────

async function fetchLatestCliVersion(): Promise<string> {
  try {
    const cmd =
      process.platform === 'win32'
        ? `powershell -Command "(Invoke-WebRequest -Uri 'https://api.github.com/repos/arduino/arduino-cli/releases/latest' -UseBasicParsing -Headers @{'User-Agent'='ArduinoFlash'}).Content"`
        : `curl -sL -H 'User-Agent: ArduinoFlash' https://api.github.com/repos/arduino/arduino-cli/releases/latest`;

    const raw = await exec(cmd, 15_000);
    const m = raw.match(/"tag_name"\s*:\s*"v?([^"]+)"/);
    return m ? m[1] : FALLBACK_CLI_VERSION;
  } catch {
    return FALLBACK_CLI_VERSION;
  }
}

interface AssetInfo {
  url: string;
  archiveName: string;
  isZip: boolean;
}

function resolveAsset(version: string): AssetInfo {
  const { platform, arch } = process;

  let osPart: string;
  let isZip = false;

  if (platform === 'win32')       { osPart = 'Windows'; isZip = true; }
  else if (platform === 'darwin') { osPart = 'macOS';                  }
  else                            { osPart = 'Linux';                  }

  let archPart: string;
  if      (arch === 'arm64') { archPart = 'ARM64';  }
  else if (arch === 'arm')   { archPart = 'ARMv7';  }
  else                       { archPart = '64bit';  }

  const ext = isZip ? 'zip' : 'tar.gz';
  const archiveName = `arduino-cli_${version}_${osPart}_${archPart}.${ext}`;
  const url =
    `https://github.com/arduino/arduino-cli/releases/download/v${version}/${archiveName}`;

  return { url, archiveName, isZip };
}

async function downloadCli(
  context: vscode.ExtensionContext,
  progress: vscode.Progress<{ message?: string }>
): Promise<void> {
  progress.report({ message: 'Fetching latest arduino-cli release info…' });
  const version = await fetchLatestCliVersion();

  const { url, archiveName, isZip } = resolveAsset(version);
  const storageDir = getStorageDir(context);
  const archivePath = path.join(storageDir, archiveName);

  progress.report({ message: `Downloading arduino-cli v${version}…` });

  if (process.platform === 'win32') {
    await exec(
      `powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${archivePath}' -UseBasicParsing"`,
      300_000
    );
  } else {
    // curl is pre-installed on macOS and modern Linux; -L follows redirects.
    await exec(`curl -L -o "${archivePath}" "${url}"`, 300_000);
  }

  progress.report({ message: 'Extracting arduino-cli…' });

  if (isZip) {
    await exec(
      `powershell -Command "Expand-Archive -Force -Path '${archivePath}' -DestinationPath '${storageDir}'"`,
      60_000
    );
  } else {
    await exec(`tar -xzf "${archivePath}" -C "${storageDir}"`, 60_000);
  }

  // Free up disk space — archive no longer needed.
  fs.unlink(archivePath, () => {});

  // Ensure the binary is executable on Unix.
  const exe = getBundledExePath(context);
  if (process.platform !== 'win32' && fs.existsSync(exe)) {
    fs.chmodSync(exe, 0o755);
  }

  injectDirIntoPath(storageDir);
}

// ─── Step 2 – Install board cores ────────────────────────────────────────────

async function installCores(
  progress: vscode.Progress<{ message?: string }>
): Promise<void> {
  // Update the index files — include the extra URLs so ESP32/ESP8266 are found.
  progress.report({ message: 'Updating board index…' });
  await exec(
    `arduino-cli core update-index --additional-urls "${ESP32_BMU},${ESP8266_BMU}"`,
    120_000
  );

  for (const core of CORES) {
    progress.report({ message: `Installing ${core.name} core…` });
    const extraFlag = core.bmu ? ` --additional-urls "${core.bmu}"` : '';
    try {
      await exec(`arduino-cli core install ${core.id}${extraFlag}`, 600_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already installed" is not an error.
      if (!msg.toLowerCase().includes('already installed')) {
        throw err;
      }
    }
  }
}

// ─── Public: main entry point ─────────────────────────────────────────────────

/**
 * Runs the full setup in the background (non-blocking).
 * Shows a VS Code progress notification while working.
 * Skips silently if setup was already completed.
 */
export function runSetupIfNeeded(context: vscode.ExtensionContext): void {
  if (context.globalState.get<boolean>(SETUP_DONE_KEY)) {
    return;
  }

  // Fire-and-forget — we intentionally don't await this.
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'ArduinoFlash: First-time setup',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: 'Checking for arduino-cli…' });

        const available = await cliInPath();

        if (!available) {
          const bundled = getBundledExePath(context);
          if (fs.existsSync(bundled)) {
            // Previously downloaded but PATH injection was lost after restart —
            // applyCachedCliPath() should have handled this already.
            injectDirIntoPath(path.dirname(bundled));
          } else {
            await downloadCli(context, progress);
          }
        }

        await installCores(progress);

        await context.globalState.update(SETUP_DONE_KEY, true);

        vscode.window.showInformationMessage(
          'ArduinoFlash: Ready! Arduino CLI and all board cores are installed. ✔'
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const choice = await vscode.window.showErrorMessage(
          `ArduinoFlash: Setup failed — ${message}`,
          'Try Again',
          'Dismiss'
        );
        if (choice === 'Try Again') {
          runSetupIfNeeded(context);
        }
      }
    }
  );
}

/**
 * Clears the setup-done flag so the next activation triggers a fresh setup.
 * Exposed so `extension.ts` can register "ArduinoFlash: Run Setup Again".
 */
export async function resetSetup(context: vscode.ExtensionContext): Promise<void> {
  await context.globalState.update(SETUP_DONE_KEY, undefined);
  vscode.window.showInformationMessage(
    'ArduinoFlash: Setup will run again on next activation.'
  );
}
