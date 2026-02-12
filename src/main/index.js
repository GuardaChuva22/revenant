const { app, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { loadConfig, openConfigFile, ensureCustomDirs, findCustomSound, getAssetPath, getAppRoot } = require('./config');
const { createOverlayWindow, getOverlayWindow, setClickThrough } = require('./window');
const { createTray, updateMenu } = require('./tray');
const { registerHotkey, unregisterAll } = require('./hotkey');
const UDPEngine = require('./network/udp');
const HeartbeatManager = require('./network/heartbeat');
const FileTransfer = require('./network/file-transfer');
const { createMessage, parseMessage } = require('./network/protocol');
const { generateColorFromUsername } = require('./network/crypto');

let config = null;
let udp = null;
let heartbeat = null;
let fileTransfer = null;
let inputVisible = false;
let trayCallbacks = null;

app.disableHardwareAcceleration();

function handleRawMessage(msg) {
    const parsed = parseMessage(msg, config.sessionPassword);
    if (!parsed) return;
    if (parsed.sender === config.username) return;

    heartbeat.handleMessage(parsed);

    const overlay = getOverlayWindow();
    if (!overlay) return;

    if (parsed.type === 'message') {
        const colors = generateColorFromUsername(parsed.sender);
        overlay.webContents.send('new-message', {
            id: parsed.id,
            sender: parsed.sender,
            content: parsed.content,
            timestamp: parsed.timestamp,
            colors
        });
        overlay.webContents.send('play-sound');
    } else if (parsed.type === 'typing') {
        overlay.webContents.send('typing-indicator', {
            sender: parsed.sender
        });
    } else if (parsed.type === 'join') {
        overlay.webContents.send('system-message', {
            content: `${parsed.sender} joined`,
            type: 'join'
        });
    } else if (parsed.type === 'leave') {
        overlay.webContents.send('system-message', {
            content: `${parsed.sender} left`,
            type: 'leave'
        });
    } else if (parsed.type === 'file-meta' || parsed.type === 'file-chunk') {
        fileTransfer.handleFileMessage(parsed);
    }
}

app.on('ready', async () => {
    config = loadConfig();
    ensureCustomDirs();

    createOverlayWindow(config);

    udp = new UDPEngine(config.port);
    heartbeat = new HeartbeatManager(udp, config);
    fileTransfer = new FileTransfer(udp, config);

    // File transfer events -> renderer
    fileTransfer.on('receive-start', (data) => {
        const overlay = getOverlayWindow();
        if (overlay) {
            const colors = generateColorFromUsername(data.sender);
            overlay.webContents.send('file-receive-start', { ...data, colors });
            overlay.webContents.send('play-sound');
        }
    });

    fileTransfer.on('receive-progress', (data) => {
        const overlay = getOverlayWindow();
        if (overlay) overlay.webContents.send('file-receive-progress', data);
    });

    fileTransfer.on('receive-complete', (data) => {
        const overlay = getOverlayWindow();
        if (overlay) overlay.webContents.send('file-receive-complete', data);
    });

    fileTransfer.on('send-progress', (data) => {
        const overlay = getOverlayWindow();
        if (overlay) overlay.webContents.send('file-send-progress', data);
    });

    fileTransfer.on('send-complete', (data) => {
        const overlay = getOverlayWindow();
        if (overlay) overlay.webContents.send('file-send-complete', data);
    });

    trayCallbacks = {
        onToggleInput: () => toggleInput(),
        onOpenConfig: () => openConfigFile(),
        onOpenCustom: () => {
            const customPath = path.join(getAppRoot(), 'custom');
            shell.openPath(customPath);
        },
        onReloadConfig: () => reloadConfig(),
        onQuit: () => {
            heartbeat.stop();
            udp.stop();
            app.quit();
        },
        getPeerCount: () => heartbeat.getPeerCount()
    };

    udp.on('raw-message', handleRawMessage);

    heartbeat.on('peers-changed', (peers) => {
        const overlay = getOverlayWindow();
        if (overlay) {
            overlay.webContents.send('peers-changed', {
                count: peers.length + 1,
                peers
            });
        }
        updateMenu(config, trayCallbacks);
    });

    try {
        await udp.start();
        heartbeat.start();
        console.log(`[Revenant] Listening on UDP port ${config.port}`);
    } catch (err) {
        console.error('[Revenant] Failed to start UDP:', err.message);
    }

    createTray(config, trayCallbacks);
    registerHotkey(config.hotkey, () => toggleInput());

    // Resolve sound path and send to renderer
    const soundPath = findCustomSound() || getAssetPath('sounds', 'notification.wav');
    const overlay = getOverlayWindow();
    if (overlay) {
        overlay.webContents.on('did-finish-load', () => {
            overlay.webContents.send('init-config', config);
            overlay.webContents.send('set-sound-path', soundPath);
        });
    }

    // === IPC Handlers ===

    ipcMain.on('send-message', (event, text) => {
        const msg = createMessage('message', text, config.username, config.sessionPassword);
        udp.broadcast(msg);

        const ov = getOverlayWindow();
        if (ov) {
            const colors = generateColorFromUsername(config.username);
            ov.webContents.send('new-message', {
                id: msg.id,
                sender: config.username,
                content: text,
                timestamp: Date.now(),
                colors,
                isOwn: true
            });
        }
        hideInput();
    });

    ipcMain.on('send-typing', () => {
        const msg = createMessage('typing', config.username, config.username, config.sessionPassword);
        udp.broadcast(msg);
    });

    ipcMain.on('close-input', () => {
        hideInput();
    });

    ipcMain.on('input-mouse-enter', () => {
        setClickThrough(false);
    });

    ipcMain.on('input-mouse-leave', () => {
        if (!inputVisible) {
            setClickThrough(true);
        }
    });

    // File sharing IPC
    ipcMain.on('send-file', (event, filePath) => {
        const transferId = fileTransfer.sendFile(filePath, config.sessionPassword, config.username);
        if (transferId) {
            const ov = getOverlayWindow();
            if (ov) {
                const colors = generateColorFromUsername(config.username);
                ov.webContents.send('file-send-start', {
                    transferId,
                    fileName: path.basename(filePath),
                    sender: config.username,
                    colors,
                    isOwn: true
                });
            }
        }
    });

    ipcMain.on('pick-file', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'All Files', extensions: ['*'] },
                { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
                { name: 'Documents', extensions: ['pdf', 'txt', 'zip'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const fp = result.filePaths[0];
            const transferId = fileTransfer.sendFile(fp, config.sessionPassword, config.username);
            if (transferId) {
                const ov = getOverlayWindow();
                if (ov) {
                    const colors = generateColorFromUsername(config.username);
                    ov.webContents.send('file-send-start', {
                        transferId,
                        fileName: path.basename(fp),
                        sender: config.username,
                        colors,
                        isOwn: true
                    });
                }
            }
        }
    });

    ipcMain.on('open-file', (event, filePath) => {
        shell.openPath(filePath);
    });

    ipcMain.on('open-file-folder', (event, filePath) => {
        shell.showItemInFolder(filePath);
    });
});

function toggleInput() {
    if (inputVisible) {
        hideInput();
    } else {
        showInput();
    }
}

function showInput() {
    inputVisible = true;
    setClickThrough(false);
    const overlay = getOverlayWindow();
    if (overlay) {
        overlay.webContents.send('toggle-input', true);
    }
}

function hideInput() {
    inputVisible = false;
    setClickThrough(true);
    const overlay = getOverlayWindow();
    if (overlay) {
        overlay.webContents.send('toggle-input', false);
    }
}

function reloadConfig() {
    const newConfig = loadConfig();

    if (newConfig.hotkey !== config.hotkey) {
        registerHotkey(newConfig.hotkey, () => toggleInput());
    }

    if (newConfig.port !== config.port || newConfig.sessionPassword !== config.sessionPassword) {
        heartbeat.stop();
        udp.stop();

        config = newConfig;
        heartbeat.config = config;

        udp = new UDPEngine(config.port);
        udp.on('raw-message', handleRawMessage);

        udp.start().then(() => {
            heartbeat.udp = udp;
            heartbeat.start();
        });
    }

    config = newConfig;

    const overlay = getOverlayWindow();
    if (overlay) {
        overlay.webContents.send('init-config', config);
        const soundPath = findCustomSound() || getAssetPath('sounds', 'notification.wav');
        overlay.webContents.send('set-sound-path', soundPath);
    }
}

app.on('will-quit', () => {
    unregisterAll();
    if (heartbeat) heartbeat.stop();
    if (udp) udp.stop();
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});
