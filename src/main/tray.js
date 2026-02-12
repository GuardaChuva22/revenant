const { Tray, Menu, nativeImage } = require('electron');
const { findCustomIcon, getAssetPath } = require('./config');

let tray = null;

function createTray(config, callbacks) {
    // Try custom icon first, then default
    const customIcon = findCustomIcon();
    const iconPath = customIcon || getAssetPath('icon.png');

    let icon;
    try {
        icon = nativeImage.createFromPath(iconPath);
        icon = icon.resize({ width: 16, height: 16 });
    } catch (err) {
        icon = nativeImage.createEmpty();
    }

    if (config.hideTrayIcon) {
        // Still create tray for functionality but with no visible tooltip
        tray = new Tray(icon);
        tray.setToolTip('');
    } else {
        tray = new Tray(icon);
        tray.setToolTip(`Revenant — ${config.username}`);
    }

    updateMenu(config, callbacks);

    tray.on('click', () => {
        if (callbacks.onToggleInput) callbacks.onToggleInput();
    });

    return tray;
}

function updateMenu(config, callbacks) {
    if (!tray) return;

    const peerCount = callbacks.getPeerCount ? callbacks.getPeerCount() : 1;

    const menu = Menu.buildFromTemplate([
        {
            label: `✦ Revenant`,
            enabled: false
        },
        { type: 'separator' },
        {
            label: `Online: ${peerCount}`,
            enabled: false
        },
        {
            label: `Room: ${config.sessionPassword === 'default' ? 'default' : '••••••'}`,
            enabled: false
        },
        { type: 'separator' },
        {
            label: 'Open Config',
            click: () => callbacks.onOpenConfig && callbacks.onOpenConfig()
        },
        {
            label: 'Open Custom Folder',
            click: () => callbacks.onOpenCustom && callbacks.onOpenCustom()
        },
        {
            label: 'Reload Config',
            click: () => callbacks.onReloadConfig && callbacks.onReloadConfig()
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => callbacks.onQuit && callbacks.onQuit()
        }
    ]);

    tray.setContextMenu(menu);
}

function getTray() {
    return tray;
}

module.exports = { createTray, updateMenu, getTray };
