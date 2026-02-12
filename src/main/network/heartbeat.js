const { EventEmitter } = require('events');
const { createMessage, parseMessage } = require('./protocol');

class HeartbeatManager extends EventEmitter {
    constructor(udpEngine, config) {
        super();
        this.udp = udpEngine;
        this.config = config;
        this.peers = new Map();
        this.heartbeatInterval = null;
        this.cleanupInterval = null;
        this.HEARTBEAT_RATE = 10000;
        this.PEER_TIMEOUT = 30000;
    }

    start() {
        this.sendHeartbeat();
        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), this.HEARTBEAT_RATE);
        this.cleanupInterval = setInterval(() => this.cleanupPeers(), 5000);

        this.sendJoin();
    }

    stop() {
        this.sendLeave();
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        this.peers.clear();
    }

    sendHeartbeat() {
        const msg = createMessage('heartbeat', this.config.username, this.config.username, this.config.sessionPassword);
        this.udp.broadcast(msg);
    }

    sendJoin() {
        const msg = createMessage('join', this.config.username, this.config.username, this.config.sessionPassword);
        this.udp.broadcast(msg);
    }

    sendLeave() {
        const msg = createMessage('leave', this.config.username, this.config.username, this.config.sessionPassword);
        this.udp.broadcast(msg);
    }

    handleMessage(parsed) {
        if (!parsed) return;

        const { sender, type } = parsed;
        if (sender === this.config.username) return;

        if (type === 'heartbeat') {
            const isNew = !this.peers.has(sender);
            this.peers.set(sender, Date.now());
            if (isNew) {
                this.emit('peer-joined', sender);
                this.emit('peers-changed', this.getPeerList());
            }
        } else if (type === 'join') {
            this.peers.set(sender, Date.now());
            this.emit('peer-joined', sender);
            this.emit('peers-changed', this.getPeerList());
        } else if (type === 'leave') {
            if (this.peers.has(sender)) {
                this.peers.delete(sender);
                this.emit('peer-left', sender);
                this.emit('peers-changed', this.getPeerList());
            }
        }
    }

    cleanupPeers() {
        const now = Date.now();
        let changed = false;
        for (const [name, lastSeen] of this.peers) {
            if (now - lastSeen > this.PEER_TIMEOUT) {
                this.peers.delete(name);
                this.emit('peer-left', name);
                changed = true;
            }
        }
        if (changed) this.emit('peers-changed', this.getPeerList());
    }

    getPeerList() {
        return Array.from(this.peers.keys());
    }

    getPeerCount() {
        return this.peers.size + 1;
    }
}

module.exports = HeartbeatManager;
