class MessageManager {
    constructor() {
        this.container = document.getElementById('message-container');
        this.messages = [];
        this.config = {};
        this.position = 'bottom-right';
        this.isLeftSide = false;
    }

    init(config) {
        this.config = config;
        this.position = config.position || 'bottom-right';
        this.isLeftSide = this.position.includes('left');

        this.container.className = '';
        this.container.classList.add(this.position);
    }

    addMessage(data) {
        const toast = document.createElement('div');
        toast.className = 'message-toast';
        toast.dataset.id = data.id;

        if (data.isOwn) toast.classList.add('own-message');

        if (this.isLeftSide) {
            toast.style.animation = `messageSlideInLeft 0.4s var(--ease-out-expo) forwards`;
        }

        // Sender name with gradient
        const senderEl = document.createElement('div');
        senderEl.className = 'message-sender';
        if (data.colors) {
            senderEl.style.setProperty('--sender-color-1', data.colors.color1);
            senderEl.style.setProperty('--sender-color-2', data.colors.color2);
        }
        senderEl.textContent = data.sender;

        // Message text with typing animation
        const textEl = document.createElement('div');
        textEl.className = 'message-text';

        toast.appendChild(senderEl);
        toast.appendChild(textEl);
        this.container.appendChild(toast);

        this.messages.push({ element: toast, id: data.id });

        // Typing animation
        this.typeText(textEl, data.content, () => {
            const duration = this.config.messageDisplayDuration || 5000;
            setTimeout(() => this.removeMessage(data.id), duration);
        });

        this.enforceMaxVisible();
    }

    addSystemMessage(data) {
        const toast = document.createElement('div');
        toast.className = 'message-toast system-message';

        const textEl = document.createElement('div');
        textEl.className = 'message-text';

        const icon = data.type === 'join' ? '→' : '←';
        textEl.textContent = `${icon} ${data.content}`;

        toast.appendChild(textEl);
        this.container.appendChild(toast);

        const id = 'sys-' + Date.now();
        this.messages.push({ element: toast, id });

        setTimeout(() => this.removeMessage(id), 3000);
    }

    addFileMessage(data) {
        const toast = document.createElement('div');
        toast.className = 'message-toast file-toast';
        toast.dataset.transferId = data.transferId;

        if (data.isOwn) toast.classList.add('own-message');

        if (this.isLeftSide) {
            toast.style.animation = `messageSlideInLeft 0.4s var(--ease-out-expo) forwards`;
        }

        // Make file toasts clickable (not click-through)
        toast.style.pointerEvents = 'auto';

        // Sender
        const senderEl = document.createElement('div');
        senderEl.className = 'message-sender';
        if (data.colors) {
            senderEl.style.setProperty('--sender-color-1', data.colors.color1);
            senderEl.style.setProperty('--sender-color-2', data.colors.color2);
        }
        senderEl.textContent = data.sender;

        // File info row
        const fileRow = document.createElement('div');
        fileRow.className = 'file-row';

        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = this.getFileEmoji(data.mimeType || '', data.fileName);

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';

        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = data.fileName;

        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = data.fileSize ? this.formatSize(data.fileSize) : 'Sending...';

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);

        fileRow.appendChild(fileIcon);
        fileRow.appendChild(fileInfo);

        // Progress bar
        const progressWrap = document.createElement('div');
        progressWrap.className = 'file-progress-wrap';
        const progressBar = document.createElement('div');
        progressBar.className = 'file-progress-bar';
        progressBar.style.width = '0%';
        progressWrap.appendChild(progressBar);

        // Action buttons (hidden until complete)
        const actions = document.createElement('div');
        actions.className = 'file-actions is-hidden';

        const openBtn = document.createElement('button');
        openBtn.className = 'file-action-btn';
        openBtn.textContent = '▸ Open';
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (data.filePath) window.revenant.openFile(data.filePath);
        });

        const folderBtn = document.createElement('button');
        folderBtn.className = 'file-action-btn';
        folderBtn.textContent = '◫ Folder';
        folderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (data.filePath) window.revenant.openFileFolder(data.filePath);
        });

        actions.appendChild(openBtn);
        actions.appendChild(folderBtn);

        toast.appendChild(senderEl);
        toast.appendChild(fileRow);
        toast.appendChild(progressWrap);
        toast.appendChild(actions);

        this.container.appendChild(toast);

        const id = 'file-' + data.transferId;
        this.messages.push({ element: toast, id, isFile: true, data: { ...data } });
        this.enforceMaxVisible();

        return id;
    }

    updateFileProgress(transferId, progress) {
        const msg = this.messages.find(m => m.id === 'file-' + transferId);
        if (!msg) return;
        const bar = msg.element.querySelector('.file-progress-bar');
        if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
    }

    completeFileTransfer(transferId, filePath) {
        const msg = this.messages.find(m => m.id === 'file-' + transferId);
        if (!msg) return;

        msg.data.filePath = filePath;

        const bar = msg.element.querySelector('.file-progress-bar');
        if (bar) bar.style.width = '100%';

        const progress = msg.element.querySelector('.file-progress-wrap');
        if (progress) {
            setTimeout(() => progress.classList.add('is-hidden'), 500);
        }

        const actions = msg.element.querySelector('.file-actions');
        if (actions) {
            actions.classList.remove('is-hidden');
            // Update button handlers with the actual path
            const buttons = actions.querySelectorAll('button');
            buttons[0].onclick = (e) => { e.stopPropagation(); window.revenant.openFile(filePath); };
            buttons[1].onclick = (e) => { e.stopPropagation(); window.revenant.openFileFolder(filePath); };
        }

        const sizeEl = msg.element.querySelector('.file-size');
        if (sizeEl && msg.data.fileSize) {
            sizeEl.textContent = this.formatSize(msg.data.fileSize) + ' — saved ✓';
        }

        // File messages stay longer so user can click to save
        const duration = this.config.fileDisplayDuration || 15000;
        setTimeout(() => this.removeMessage('file-' + transferId), duration);
    }

    typeText(element, text, onComplete) {
        let i = 0;
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        element.appendChild(cursor);

        const speed = 18;

        const type = () => {
            if (i < text.length) {
                const charNode = document.createTextNode(text[i]);
                element.insertBefore(charNode, cursor);
                i++;
                setTimeout(type, speed + Math.random() * 12);
            } else {
                setTimeout(() => {
                    if (cursor.parentNode) cursor.remove();
                    if (onComplete) onComplete();
                }, 400);
            }
        };

        setTimeout(type, 420);
    }

    removeMessage(id) {
        const idx = this.messages.findIndex(m => m.id === id);
        if (idx === -1) return;

        const { element } = this.messages[idx];

        if (this.isLeftSide) {
            element.style.animation = `messageFadeOutLeft 0.8s ease-out forwards`;
        } else {
            element.classList.add('fade-out');
        }

        setTimeout(() => {
            if (element.parentNode) element.remove();
            this.messages = this.messages.filter(m => m.id !== id);
        }, 850);
    }

    enforceMaxVisible() {
        const max = this.config.maxVisibleMessages || 5;
        // Don't auto-remove file toasts that are still transferring
        const removable = this.messages.filter(m => !m.isFile);
        while (removable.length > max) {
            const oldest = removable.shift();
            this.removeMessage(oldest.id);
        }
    }

    getFileEmoji(mimeType, fileName) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎬';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType === 'application/zip') return '📦';
        if (fileName && fileName.endsWith('.txt')) return '📝';
        return '📎';
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

window.MessageManager = MessageManager;
