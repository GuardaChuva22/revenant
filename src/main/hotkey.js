const { globalShortcut } = require('electron');

let registeredHotkey = null;

function normalizeAccelerator(accel) {
    return accel
        .replace(/\bCtrl\b/gi, 'CommandOrControl')
        .replace(/\bCmd\b/gi, 'CommandOrControl');
}

function registerHotkey(accelerator, callback) {
    unregisterHotkey();

    const normalized = normalizeAccelerator(accelerator);

    try {
        globalShortcut.register(normalized, callback);

        if (globalShortcut.isRegistered(normalized)) {
            registeredHotkey = normalized;
            console.log(`[Revenant] Hotkey registered: ${accelerator} → ${normalized}`);
        } else {
            console.error(`[Revenant] Failed to register hotkey: ${normalized} (may be in use by another app)`);
        }
    } catch (err) {
        console.error(`[Revenant] Invalid hotkey: ${normalized}`, err.message);
    }
}

function unregisterHotkey() {
    if (registeredHotkey) {
        try {
            globalShortcut.unregister(registeredHotkey);
        } catch (err) { }
        registeredHotkey = null;
    }
}

function unregisterAll() {
    globalShortcut.unregisterAll();
    registeredHotkey = null;
}

module.exports = { registerHotkey, unregisterHotkey, unregisterAll };


