# 👻 Revenant

**Stealth LAN Messenger** — Encrypted ephemeral chat overlay for local networks.

Messages appear as floating toasts over your screen, invisible to anyone not looking directly. No window in the taskbar, no entry in ALT+TAB. Just ghosts talking.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔒 **End-to-end encryption** | AES-256-GCM with PBKDF2 key derivation |
| 👻 **True stealth** | No taskbar icon, no ALT+TAB entry, click-through overlay |
| 💬 **Ephemeral messages** | Toast notifications with typing animation — no history stored |
| 📎 **File sharing** | Drag-and-drop or file picker, chunked UDP transfer (up to 10MB) |
| 🔊 **Sound notifications** | Built-in + custom sounds (`.mp3`, `.wav`, `.ogg`) |
| ⌨️ **Global hotkey** | `Ctrl+Shift+R` to toggle input bar (configurable) |
| 🎨 **Glassmorphism UI** | Frosted glass design with gradient usernames |
| 🖼️ **Custom assets** | Drop your own icons and sounds into `custom/` folder |
| 📦 **NSIS installer** | Proper Windows installer with directory picker |

## 🚀 Quick Start

### Run from source
```bash
git clone https://github.com/GuardaChuva22/revenant.git
cd revenant
npm install
npm start
```

Press `Ctrl+Shift+R` to open the input bar. Type and hit Enter.

### Build installer
```bash
npm run build
```
Creates `dist/Revenant-Setup-1.0.0.exe`.

## ⚙️ Configuration

Edit `config.json` in the app directory:

```json
{
  "username": "ghost_",
  "sessionPassword": "our-secret",
  "hotkey": "Ctrl+Shift+R",
  "port": 47777,
  "messageDisplayDuration": 5000,
  "fileDisplayDuration": 15000,
  "soundEnabled": true,
  "soundVolume": 0.5,
  "hideTrayIcon": false,
  "position": "bottom-right"
}
```

| Option | Description |
|---|---|
| `username` | Your display name |
| `sessionPassword` | Room password — only users with the same password can see messages |
| `hotkey` | Global shortcut to toggle input bar |
| `port` | UDP port for LAN broadcast |
| `position` | Toast position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `soundVolume` | Notification volume (`0.0` to `1.0`) |
| `hideTrayIcon` | Set to `true` for hotkey-only mode |

## 🎨 Custom Assets

Drop files into the `custom/` folder:

```
custom/
├── sounds/    ← notification.mp3, alert.wav, etc.
└── icons/     ← tray-icon.png, tray-icon.ico
```

The app auto-discovers and uses custom assets on startup.

## 🔐 How It Works

1. Messages are encrypted with **AES-256-GCM** using a key derived from `sessionPassword`
2. Encrypted payloads are broadcast via **UDP** on the local network
3. All clients with the same password can decrypt and display messages
4. **No server, no cloud, no logs** — LAN only, ephemeral by design

## 📋 Controls

| Key | Action |
|---|---|
| `Ctrl+Shift+R` | Toggle input bar |
| `Enter` | Send message |
| `Escape` | Close input bar |
| `↑` / `↓` | Recall message history |
| Drag file onto input | Send file |

## 🛠️ Tech Stack

- **Electron** — cross-platform desktop framework
- **Node.js dgram** — UDP broadcast networking
- **AES-256-GCM** — authenticated encryption
- **electron-builder** — NSIS installer packaging

## 📄 License

MIT
