const crypto = require('crypto');

const SALT = Buffer.from('revenant-stealth-messenger-salt', 'utf8');
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100000;

let cachedKey = null;
let cachedPassword = null;

function deriveKey(password) {
    if (cachedPassword === password && cachedKey) return cachedKey;
    cachedKey = crypto.pbkdf2Sync(password, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
    cachedPassword = password;
    return cachedKey;
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function encrypt(text, password) {
    const key = deriveKey(password);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('base64'),
        data: encrypted,
        tag: authTag.toString('base64')
    };
}

function decrypt(encryptedObj, password) {
    try {
        const key = deriveKey(password);
        const iv = Buffer.from(encryptedObj.iv, 'base64');
        const authTag = Buffer.from(encryptedObj.tag, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedObj.data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        return null;
    }
}

function generateColorFromUsername(username) {
    const hash = crypto.createHash('md5').update(username).digest('hex');
    const hue1 = parseInt(hash.substring(0, 4), 16) % 360;
    const hue2 = (hue1 + 40 + (parseInt(hash.substring(4, 6), 16) % 40)) % 360;
    return {
        color1: `hsl(${hue1}, 80%, 65%)`,
        color2: `hsl(${hue2}, 90%, 55%)`
    };
}

module.exports = { hashPassword, encrypt, decrypt, generateColorFromUsername };
