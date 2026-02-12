const { v4: uuidv4 } = require('uuid');
const { hashPassword, encrypt, decrypt } = require('./crypto');

function createMessage(type, content, username, password) {
    const roomHash = hashPassword(password);
    const payload = encrypt(JSON.stringify({
        type,
        content,
        sender: username,
        timestamp: Date.now()
    }), password);

    return {
        v: 1,
        room: roomHash,
        id: uuidv4(),
        payload
    };
}

function parseMessage(raw, password) {
    try {
        const msg = JSON.parse(raw.toString('utf8'));

        if (!msg.v || !msg.room || !msg.payload) return null;

        const roomHash = hashPassword(password);
        if (msg.room !== roomHash) return null;

        const decrypted = decrypt(msg.payload, password);
        if (!decrypted) return null;

        const inner = JSON.parse(decrypted);

        return {
            id: msg.id,
            type: inner.type,
            content: inner.content,
            sender: inner.sender,
            timestamp: inner.timestamp
        };
    } catch (err) {
        return null;
    }
}

function serialize(msgObj) {
    return Buffer.from(JSON.stringify(msgObj), 'utf8');
}

module.exports = { createMessage, parseMessage, serialize };
