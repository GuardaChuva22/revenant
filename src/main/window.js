const { BrowserWindow, screen } = require('electron');
const path = require('path');

let overlayWindow = null;

function createOverlayWindow(config) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    overlayWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    overlayWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    overlayWindow.once('ready-to-show', () => {
        overlayWindow.showInactive();
        overlayWindow.webContents.send('init-config', config);
    });

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });

    return overlayWindow;
}

function getOverlayWindow() {
    return overlayWindow;
}

function setClickThrough(enabled) {
    if (!overlayWindow) return;
    if (enabled) {
        overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        overlayWindow.setFocusable(false);
        overlayWindow.setSkipTaskbar(true);
    } else {
        overlayWindow.setIgnoreMouseEvents(false);
        overlayWindow.setSkipTaskbar(true);
        overlayWindow.setFocusable(true);
        overlayWindow.setSkipTaskbar(true);
        overlayWindow.focus();
        overlayWindow.setSkipTaskbar(true);
    }
}

module.exports = { createOverlayWindow, getOverlayWindow, setClickThrough };
