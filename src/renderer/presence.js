class PresenceManager {
    constructor() {
        this.peerCountEl = document.getElementById('peer-count');
        this.typingEl = document.getElementById('typing-indicator');
        this.typingNameEl = this.typingEl.querySelector('.typing-name');
        this.typingTimers = new Map();
        this.position = 'bottom-right';
    }

    init(config) {
        this.position = config.position || 'bottom-right';
        this.typingEl.classList.remove('bottom-right', 'bottom-left', 'top-right', 'top-left');
        this.typingEl.classList.add(this.position);
    }

    updatePeers(data) {
        const count = data.count || 1;
        this.peerCountEl.textContent = `${count} online`;
    }

    showTyping(data) {
        const sender = data.sender;

        if (this.typingTimers.has(sender)) {
            clearTimeout(this.typingTimers.get(sender));
        }

        this.typingNameEl.textContent = sender;
        this.typingEl.classList.remove('is-hidden');

        const timer = setTimeout(() => {
            this.typingEl.classList.add('is-hidden');
            this.typingTimers.delete(sender);
        }, 3000);

        this.typingTimers.set(sender, timer);
    }
}

window.PresenceManager = PresenceManager;

