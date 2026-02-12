const dgram = require('dgram');
const { EventEmitter } = require('events');
const { serialize } = require('./protocol');

class UDPEngine extends EventEmitter {
    constructor(port) {
        super();
        this.port = port;
        this.socket = null;
        this.bound = false;
    }

    start() {
        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            this.socket.on('error', (err) => {
                // Log but don't re-emit to avoid uncaught exception dialogs
                console.error('[Revenant] UDP socket error:', err.message);
                if (!this.bound) reject(err);
            });

            this.socket.on('message', (msg, rinfo) => {
                this.emit('raw-message', msg, rinfo);
            });

            this.socket.bind(this.port, () => {
                this.bound = true;
                this.socket.setBroadcast(true);
                this.emit('ready');
                resolve();
            });
        });
    }

    broadcast(messageObj) {
        if (!this.socket || !this.bound) return;
        const data = serialize(messageObj);
        this.socket.send(data, 0, data.length, this.port, '255.255.255.255', (err) => {
            if (err) console.error('[Revenant] Broadcast error:', err.message);
        });
    }

    // Synchronous-style broadcast that throws on error (for file transfer try/catch)
    broadcastSafe(messageObj) {
        if (!this.socket || !this.bound) throw new Error('UDP socket not ready');
        const data = serialize(messageObj);
        return new Promise((resolve, reject) => {
            this.socket.send(data, 0, data.length, this.port, '255.255.255.255', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    stop() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.bound = false;
        }
    }
}

module.exports = UDPEngine;

