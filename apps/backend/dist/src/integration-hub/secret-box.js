"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const VERSION = 'v1';
function dedicatedKey() {
    const file = process.env.INTEGRATION_SECRET_KEY_FILE;
    if (file) {
        try {
            return (0, fs_1.readFileSync)(file, 'utf8').trim();
        }
        catch {
            throw new Error('INTEGRATION_SECRET_KEY_FILE is set but cannot be read');
        }
    }
    return process.env.INTEGRATION_SECRET_KEY ?? '';
}
function key() {
    const dedicated = dedicatedKey();
    const material = dedicated || process.env.JWT_SECRET || '';
    if (material.length < 16) {
        throw new Error('Set INTEGRATION_SECRET_KEY (or a JWT_SECRET of 16+ characters) before storing integration credentials');
    }
    return Buffer.from((0, crypto_1.hkdfSync)('sha256', material, 'orderrestro-integration-secrets', dedicated ? 'dedicated-key' : 'jwt-derived-key', 32));
}
function encryptSecret(plain, context) {
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key(), iv);
    cipher.setAAD(Buffer.from(context));
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [
        VERSION,
        iv.toString('base64'),
        cipher.getAuthTag().toString('base64'),
        ct.toString('base64'),
    ].join('.');
}
function decryptSecret(stored, context) {
    const [v, iv, tag, ct] = stored.split('.');
    if (v !== VERSION || !iv || !tag || !ct) {
        throw new Error('Unrecognised credential format');
    }
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(ct, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}
//# sourceMappingURL=secret-box.js.map