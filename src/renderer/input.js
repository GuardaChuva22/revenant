class InputManager {
    constructor() {
        this.bar = document.getElementById('input-bar');
        this.input = document.getElementById('message-input');
        this.usernameEl = document.getElementById('input-username');
        this.fileBtn = document.getElementById('file-btn');
        this.visible = false;
        this.typingTimeout = null;
        this.lastTypingSent = 0;
        this.messageHistory = [];
        this.historyIndex = -1;

        this.setupEvents();
    }

    setupEvents() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.input.value.trim()) {
                const text = this.input.value.trim();
                this.messageHistory.unshift(text);
                if (this.messageHistory.length > 50) this.messageHistory.pop();
                this.historyIndex = -1;
                this.input.value = '';
                window.revenant.sendMessage(text);
            } else if (e.key === 'Escape') {
                window.revenant.closeInput();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.messageHistory.length > 0) {
                    this.historyIndex = Math.min(this.historyIndex + 1, this.messageHistory.length - 1);
                    this.input.value = this.messageHistory[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.input.value = this.messageHistory[this.historyIndex];
                } else {
                    this.historyIndex = -1;
                    this.input.value = '';
                }
            }
        });

        this.input.addEventListener('input', () => {
            const now = Date.now();
            if (now - this.lastTypingSent > 2000) {
                this.lastTypingSent = now;
                window.revenant.sendTyping();
            }
        });

        // File button
        if (this.fileBtn) {
            this.fileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.revenant.pickFile();
            });
        }

        // Drag and drop support
        this.bar.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.bar.classList.add('drag-over');
        });

        this.bar.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.bar.classList.remove('drag-over');
        });

        this.bar.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.bar.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                window.revenant.sendFile(files[0].path);
            }
        });

        // Mouse events for click-through management
        this.bar.addEventListener('mouseenter', () => {
            window.revenant.inputMouseEnter();
        });

        this.bar.addEventListener('mouseleave', () => {
            if (!this.visible) {
                window.revenant.inputMouseLeave();
            }
        });
    }

    init(config) {
        this.usernameEl.textContent = config.username || 'anonymous';
        const position = config.position || 'bottom-right';

        this.bar.classList.remove('bottom-right', 'bottom-left', 'top-right', 'top-left');
        this.bar.classList.add(position);
    }

    show() {
        this.visible = true;
        this.bar.classList.remove('is-hidden');
        this.bar.classList.add('visible');
        setTimeout(() => this.input.focus(), 100);
    }

    hide() {
        this.visible = false;
        this.bar.classList.remove('visible');
        this.bar.classList.add('is-hidden');
        this.input.value = '';
        this.input.blur();
        this.historyIndex = -1;
    }

    toggle(show) {
        if (show) {
            this.show();
        } else {
            this.hide();
        }
    }
}

window.InputManager = InputManager;
