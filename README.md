<div align="center">

# ⚡ ArduinoFlash

**The all-in-one Arduino development extension for VS Code.**  
Compile, upload, and monitor your Arduino sketches without ever leaving the editor.

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=NahiidIslam.arduinoflash)
[![VS Code](https://img.shields.io/badge/VS%20Code-%E2%89%A51.80-blueviolet?style=flat-square&logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/NahiidIslam/arduinoflash/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey?style=flat-square)]()

> **Publisher:** NahiidIslam

</div>

---

## What is ArduinoFlash?

ArduinoFlash brings a complete **Arduino development workflow** directly inside VS Code — powered by the official [Arduino CLI](https://arduino.github.io/arduino-cli/).

Install the extension and open any `.ino` file. That's it.  
The extension automatically downloads `arduino-cli`, installs all board cores, and presents you with a dedicated **side panel** with every control you need: board selector, port selector, compile, upload, and serial monitor — all in one place with zero manual setup.

---

## ✨ Features

### 🔧 Zero-Configuration Setup
- **Fully automatic first-run**: downloads `arduino-cli` and installs all board cores silently in the background
- No terminal commands needed — works on Windows, Linux, and macOS out of the box
- If `arduino-cli` is already installed on your system, it uses yours — no duplicate downloads

### 📋 Smart Side Panel
- Opens automatically **beside your sketch** every time you open a `.ino` file
- Displays the currently selected board and port with live status indicators
- One-click access to **Compile**, **Upload**, and **Serial Monitor**
- Buttons are intelligently disabled until prerequisites (board / port) are met

### 🎛️ Board & Port Management
- QuickPick dropdown for all supported boards with FQBN details
- **Auto-detects all connected serial ports** on Windows (`COM`), Linux (`/dev/tty`), and macOS (`/dev/cu`)
- Selections are **persisted across workspace reloads** — set once, remembered forever

### ⚙️ Compile & Upload
- Streams real-time `arduino-cli` output to a dedicated **ArduinoFlash Output Channel**
- Upload pipeline: compiles first, then flashes — stops immediately on compile failure
- Clear, actionable error messages when something goes wrong

### 📡 Built-in Serial Monitor
- Full-featured **Webview Serial Monitor** inside VS Code
- Baud rate selector: `9600 · 38400 · 57600 · 115200`
- Live output with **auto-scroll** and a monospace display
- **Send data** to your board from the input box (press Enter or click Send)
- **Clear** and **Connect / Disconnect** toggles
- Serial port is automatically disconnected when the panel is closed

### 📊 Persistent Status Bar
- Five always-visible buttons in the VS Code status bar (bottom-left)
- Shows the active board name and selected port at a glance
- Updates instantly after every board or port change

---

## 🚀 Getting Started

### 1. Install the extension
Search for **ArduinoFlash** in the VS Code Extensions Marketplace and click **Install**.

### 2. Open a sketch
Open any `.ino` file. The ArduinoFlash side panel appears automatically beside your code.

### 3. Wait for first-time setup
A notification appears:
> *"ArduinoFlash: First-time setup — Downloading arduino-cli…"*

This runs **once** and takes 1–3 minutes depending on your connection.  
When you see **"Ready! ✔"** you're good to go.

### 4. Select your board
Click **Select Board** in the side panel or the status bar → choose your target board.

### 5. Select your port
Connect your board via USB, then click **Select Port** → choose the correct port.

### 6. Compile & Upload
- Click **▶ Compile** to verify your sketch.
- Click **⬆ Upload** to compile and flash in one step.

### 7. Open the Serial Monitor
Click **⬛ Serial Monitor** → select a baud rate → click **Connect**.

---

## 🔌 Supported Boards

| Board | FQBN | Core |
|---|---|---|
| **Arduino Uno** | `arduino:avr:uno` | `arduino:avr` |
| **ESP32 DevKit V1** | `esp32:esp32:esp32` | `esp32:esp32` |
| **ESP8266 NodeMCU** | `esp8266:esp8266:nodemcuv2` | `esp8266:esp8266` |

---

## ⚙️ Automatic Setup — How It Works

When the extension activates for the first time it performs these steps **silently in the background**:

| Step | Action |
|---|---|
| 1 | Checks whether `arduino-cli` is already on your system `PATH` |
| 2 | If not found — downloads the correct binary for your OS and architecture from the official GitHub releases |
| 3 | Stores it in VS Code's private extension storage (no admin rights needed) |
| 4 | Runs `arduino-cli core update-index` with ESP32 and ESP8266 board manager URLs |
| 5 | Installs `arduino:avr`, `esp32:esp32`, and `esp8266:esp8266` cores |
| 6 | Marks setup as complete — this never runs again unless you request it |

> **Something went wrong?** Open the Command Palette (`Ctrl+Shift+P`) and run  
> **ArduinoFlash: Run Setup Again** to retry from scratch.

---

## 🖥️ Status Bar

```
⎡ ⬡ Arduino Uno ⎤ ⎡ ⬡ /dev/ttyUSB0 ⎤ ⎡ ▶ Compile ⎤ ⎡ ⬆ Upload ⎤ ⎡ ⬛ Monitor ⎤
```

All items appear on the **left** side of the status bar and stay visible at all times.

---

## 📟 Serial Monitor

| Feature | Details |
|---|---|
| **Baud rates** | 9600, 38400, 57600, 115200 |
| **Display** | Monospace font, dark background, auto-scroll |
| **Send** | Type in the input box and press Enter or click **Send** |
| **Clear** | Wipes the output area instantly |
| **Connect / Disconnect** | Toggle button to open or close the serial port |
| **Auto-disconnect** | Port closes automatically when the panel is closed |

---

## 📋 Commands

Access all commands from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---|---|
| `ArduinoFlash: Select Board` | Choose target board from a list |
| `ArduinoFlash: Select Port` | Choose serial port from detected devices |
| `ArduinoFlash: Compile Sketch` | Compile the active sketch |
| `ArduinoFlash: Upload Sketch` | Compile and upload to the connected board |
| `ArduinoFlash: Open Serial Monitor` | Open the built-in Serial Monitor |
| `ArduinoFlash: Run Setup Again` | Re-run the automatic CLI + cores setup |

---

## 📁 Project Structure

```
arduinoflash/
├── src/
│   ├── extension.ts        # Activation & command registration
│   ├── autoSetup.ts        # Auto-download arduino-cli + install board cores
│   ├── inoPanel.ts         # Side panel webview (board, port, actions)
│   ├── boardManager.ts     # Board list & QuickPick
│   ├── portManager.ts      # Serial port detection & QuickPick
│   ├── arduinoCLI.ts       # arduino-cli compile / upload runner
│   ├── serialMonitor.ts    # Serial Monitor webview
│   └── statusBar.ts        # Status bar items
├── images/
│   └── logo.png
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📄 License

MIT © [Nahiid Islam](https://github.com/nahidislam106)
