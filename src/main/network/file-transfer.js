const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { getCustomPath } = require('../config');

// 8KB raw chunk = ~11KB after base64 + encryption + protocol wrapper
// Safely under the 65507-byte UDP datagram limit
const CHUNK_SIZE = 8192;
const TRANSFER_TIMEOUT = 60000;
const CHUNK_DELAY_MS = 30;  // ms between chunks

class FileTransfer extends EventEmitter {
    constructor(udpEngine, config) {
        super();
        this.udp = udpEngine;
        this.config = config;
        this.pendingReceives = new Map();
        this.savePath = getCustomPath('..', 'received_files');

        if (!fs.existsSync(this.savePath)) {
            fs.mkdirSync(this.savePath, { recursive: true });
        }
    }

    sendFile(filePath, password, username) {
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > 10 * 1024 * 1024) {
                this.emit('error', 'File too large (max 10MB)');
                return null;
            }

            const fileName = path.basename(filePath);
            const fileData = fs.readFileSync(filePath);
            const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
            const transferId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

            // Send file metadata first
            const meta = {
                type: 'file-meta',
                transferId,
                fileName,
                fileSize: stats.size,
                totalChunks,
                mimeType: getMimeType(fileName)
            };

            this.emit('send-start', { transferId, fileName, fileSize: stats.size, totalChunks });

            const { createMessage } = require('./protocol');
            const metaMsg = createMessage('file-meta', JSON.stringify(meta), username, password);

            try {
                this.udp.broadcast(metaMsg);
            } catch (err) {
                console.error('[Revenant] Failed to send file metadata:', err.message);
                this.emit('error', 'Failed to start file transfer');
                return null;
            }

            // Send chunks sequentially with delays
            let chunkIndex = 0;
            let errorCount = 0;

            const sendNextChunk = () => {
                if (chunkIndex >= totalChunks) {
                    this.emit('send-complete', { transferId, fileName });
                    return;
                }

                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, fileData.length);
                const chunk = fileData.slice(start, end);

                const chunkData = {
                    type: 'file-chunk',
                    transferId,
                    index: chunkIndex,
                    data: chunk.toString('base64')
                };

                const chunkMsg = createMessage('file-chunk', JSON.stringify(chunkData), username, password);

                try {
                    this.udp.broadcast(chunkMsg);
                    errorCount = 0;
                } catch (err) {
                    errorCount++;
                    console.error(`[Revenant] Chunk ${chunkIndex}/${totalChunks} send failed:`, err.message);

                    if (errorCount >= 3) {
                        this.emit('error', `Transfer failed after ${errorCount} consecutive errors`);
                        return;
                    }
                    // Retry same chunk after a longer delay
                    setTimeout(sendNextChunk, 200);
                    return;
                }

                chunkIndex++;
                this.emit('send-progress', { transferId, progress: chunkIndex / totalChunks });

                setTimeout(sendNextChunk, CHUNK_DELAY_MS);
            };

            setTimeout(sendNextChunk, 150);
            return transferId;
        } catch (err) {
            this.emit('error', err.message);
            return null;
        }
    }

    handleFileMessage(parsed) {
        if (parsed.type === 'file-meta') {
            try {
                const meta = JSON.parse(parsed.content);
                this.pendingReceives.set(meta.transferId, {
                    ...meta,
                    sender: parsed.sender,
                    chunks: new Array(meta.totalChunks).fill(null),
                    receivedCount: 0,
                    startTime: Date.now()
                });

                this.emit('receive-start', {
                    transferId: meta.transferId,
                    fileName: meta.fileName,
                    fileSize: meta.fileSize,
                    sender: parsed.sender,
                    mimeType: meta.mimeType
                });

                // Timeout cleanup
                setTimeout(() => {
                    if (this.pendingReceives.has(meta.transferId)) {
                        this.pendingReceives.delete(meta.transferId);
                    }
                }, TRANSFER_TIMEOUT);
            } catch (err) { }
        } else if (parsed.type === 'file-chunk') {
            try {
                const chunkData = JSON.parse(parsed.content);
                const transfer = this.pendingReceives.get(chunkData.transferId);
                if (!transfer) return;

                // Skip duplicate chunks
                if (transfer.chunks[chunkData.index] !== null) return;

                transfer.chunks[chunkData.index] = Buffer.from(chunkData.data, 'base64');
                transfer.receivedCount++;

                this.emit('receive-progress', {
                    transferId: chunkData.transferId,
                    progress: transfer.receivedCount / transfer.totalChunks
                });

                // All chunks received
                if (transfer.receivedCount === transfer.totalChunks) {
                    const completeFile = Buffer.concat(transfer.chunks.filter(c => c !== null));

                    // Save file
                    const saveName = `${Date.now()}_${transfer.fileName}`;
                    const savePath = path.join(this.savePath, saveName);
                    fs.writeFileSync(savePath, completeFile);

                    this.emit('receive-complete', {
                        transferId: chunkData.transferId,
                        fileName: transfer.fileName,
                        filePath: savePath,
                        fileSize: transfer.fileSize,
                        sender: transfer.sender,
                        mimeType: transfer.mimeType
                    });

                    this.pendingReceives.delete(chunkData.transferId);
                }
            } catch (err) {
                console.error('[Revenant] Error processing file chunk:', err.message);
            }
        }
    }
}

function getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const types = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
        '.mp4': 'video/mp4', '.webm': 'video/webm',
        '.pdf': 'application/pdf', '.zip': 'application/zip',
        '.txt': 'text/plain', '.json': 'application/json'
    };
    return types[ext] || 'application/octet-stream';
}

module.exports = FileTransfer;

