const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('revenant', {
    // Messages
    sendMessage: (text) => ipcRenderer.send('send-message', text),
    sendTyping: () => ipcRenderer.send('send-typing'),
    closeInput: () => ipcRenderer.send('close-input'),
    inputMouseEnter: () => ipcRenderer.send('input-mouse-enter'),
    inputMouseLeave: () => ipcRenderer.send('input-mouse-leave'),

    // Files
    pickFile: () => ipcRenderer.send('pick-file'),
    sendFile: (filePath) => ipcRenderer.send('send-file', filePath),
    openFile: (filePath) => ipcRenderer.send('open-file', filePath),
    openFileFolder: (filePath) => ipcRenderer.send('open-file-folder', filePath),

    // Event listeners
    onNewMessage: (callback) => ipcRenderer.on('new-message', (_, data) => callback(data)),
    onSystemMessage: (callback) => ipcRenderer.on('system-message', (_, data) => callback(data)),
    onTypingIndicator: (callback) => ipcRenderer.on('typing-indicator', (_, data) => callback(data)),
    onToggleInput: (callback) => ipcRenderer.on('toggle-input', (_, visible) => callback(visible)),
    onPeersChanged: (callback) => ipcRenderer.on('peers-changed', (_, data) => callback(data)),
    onInitConfig: (callback) => ipcRenderer.on('init-config', (_, config) => callback(config)),
    onPlaySound: (callback) => ipcRenderer.on('play-sound', () => callback()),
    onSetSoundPath: (callback) => ipcRenderer.on('set-sound-path', (_, path) => callback(path)),

    // File transfer events
    onFileSendStart: (callback) => ipcRenderer.on('file-send-start', (_, data) => callback(data)),
    onFileSendProgress: (callback) => ipcRenderer.on('file-send-progress', (_, data) => callback(data)),
    onFileSendComplete: (callback) => ipcRenderer.on('file-send-complete', (_, data) => callback(data)),
    onFileReceiveStart: (callback) => ipcRenderer.on('file-receive-start', (_, data) => callback(data)),
    onFileReceiveProgress: (callback) => ipcRenderer.on('file-receive-progress', (_, data) => callback(data)),
    onFileReceiveComplete: (callback) => ipcRenderer.on('file-receive-complete', (_, data) => callback(data))
});
