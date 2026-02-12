const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
    username: 'Anonymous',
    sessionPassword: 'default',
    hotkey: 'Ctrl+Shift+M',
    port: 47777,
    messageDisplayDuration: 5000,
    fileDisplayDuration: 15000,
    maxVisibleMessages: 5,
    position: 'bottom-right',
    opacity: 0.9,
    soundEnabled: true,
    soundVolume: 0.5,
    autoStart: false,
    hideTrayIcon: false
};

function getAppRoot() {
    if (app.isPackaged) {
        return path.dirname(process.execPath);
    }
    return path.join(__dirname, '..', '..');
}

function getConfigPath() {
    return path.join(getAppRoot(), 'config.json');
}

function getCustomPath(...segments) {
    return path.join(getAppRoot(), 'custom', ...segments);
}

function getAssetPath(...segments) {
    return path.join(__dirname, '..', '..', 'assets', ...segments);
}

function loadConfig() {
    const configPath = getConfigPath();

    try {
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify(DEFAULTS, null, 2), 'utf8');
            return { ...DEFAULTS };
        }

        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...parsed };
    } catch (err) {
        console.error('Failed to load config, using defaults:', err.message);
        return { ...DEFAULTS };
    }
}

function findCustomIcon() {
    const iconsDir = getCustomPath('icons');
    try {
        if (!fs.existsSync(iconsDir)) return null;
        const files = fs.readdirSync(iconsDir);
        const iconFile = files.find(f => /^tray-icon\.(png|ico)$/i.test(f));
        if (iconFile) return path.join(iconsDir, iconFile);
        // Fallback: any png or ico
        const anyIcon = files.find(f => /\.(png|ico)$/i.test(f));
        if (anyIcon) return path.join(iconsDir, anyIcon);
    } catch (err) { }
    return null;
}

function findCustomSound() {
    const soundsDir = getCustomPath('sounds');
    try {
        if (!fs.existsSync(soundsDir)) return null;
        const files = fs.readdirSync(soundsDir);
        const soundFile = files.find(f => /\.(mp3|wav|ogg)$/i.test(f));
        if (soundFile) return path.join(soundsDir, soundFile);
    } catch (err) { }
    return null;
}

function openConfigFile() {
    const configPath = getConfigPath();
    require('child_process').exec(`notepad "${configPath}"`);
}

function ensureCustomDirs() {
    const dirs = [getCustomPath('sounds'), getCustomPath('icons')];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

module.exports = {
    loadConfig, getConfigPath, getAppRoot, getCustomPath,
    getAssetPath, openConfigFile, findCustomIcon, findCustomSound,
    ensureCustomDirs, DEFAULTS
};
