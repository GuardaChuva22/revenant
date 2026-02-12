// ═══════════════════════════════════════════════
// REVENANT — Main Renderer
// ═══════════════════════════════════════════════

const messageManager = new MessageManager();
const inputManager = new InputManager();
const presenceManager = new PresenceManager();

let soundPath = null;
let soundEnabled = true;
let soundVolume = 0.5;

// Init config
window.revenant.onInitConfig((config) => {
    messageManager.init(config);
    inputManager.init(config);
    presenceManager.init(config);
    soundEnabled = config.soundEnabled !== false;
    soundVolume = config.soundVolume || 0.5;
});

// Sound path
window.revenant.onSetSoundPath((path) => {
    soundPath = path;
    const audio = document.getElementById('notification-sound');
    if (audio && path) {
        audio.src = path;
        audio.volume = soundVolume;
    }
});

// Play sound
window.revenant.onPlaySound(() => {
    if (!soundEnabled || !soundPath) return;
    const audio = document.getElementById('notification-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = soundVolume;
        audio.play().catch(() => { });
    }
});

// New chat message
window.revenant.onNewMessage((data) => {
    messageManager.addMessage(data);
});

// System message (join/leave)
window.revenant.onSystemMessage((data) => {
    messageManager.addSystemMessage(data);
});

// Toggle input bar
window.revenant.onToggleInput((visible) => {
    inputManager.toggle(visible);
});

// Typing indicator
window.revenant.onTypingIndicator((data) => {
    presenceManager.showTyping(data);
});

// Peers changed
window.revenant.onPeersChanged((data) => {
    presenceManager.updatePeers(data);
});

// === File Transfer Events ===

window.revenant.onFileSendStart((data) => {
    messageManager.addFileMessage(data);
});

window.revenant.onFileSendProgress((data) => {
    messageManager.updateFileProgress(data.transferId, data.progress);
});

window.revenant.onFileSendComplete((data) => {
    messageManager.completeFileTransfer(data.transferId, null);
});

window.revenant.onFileReceiveStart((data) => {
    messageManager.addFileMessage(data);
});

window.revenant.onFileReceiveProgress((data) => {
    messageManager.updateFileProgress(data.transferId, data.progress);
});

window.revenant.onFileReceiveComplete((data) => {
    messageManager.completeFileTransfer(data.transferId, data.filePath);
});
