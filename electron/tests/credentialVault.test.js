import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

/**
 * The vault's security guarantees are what these tests protect:
 *   • nothing readable is written to disk
 *   • the renderer-facing summary never contains a secret
 *   • saving is refused outright when the OS keychain is missing
 *   • live-trading connections cannot be stored in this build
 */

// Reversible stand-in for the OS keychain so we can assert on the bytes
const fakeSafeStorage = {
    available: true,
    isEncryptionAvailable: () => fakeSafeStorage.available,
    encryptString: (s) => Buffer.from(`ENC:${Buffer.from(s).toString('base64')}`),
    decryptString: (b) => {
        const raw = b.toString();
        if (!raw.startsWith('ENC:')) throw new Error('not encrypted by this store');
        return Buffer.from(raw.slice(4), 'base64').toString();
    },
};

const { CredentialVault, maskSecret } = await import('../credentialVault.js');

let filePath;
/** The crypto backend is injected, so no Electron runtime is needed here. */
function newVault() {
    return new CredentialVault({ filePath, storage: fakeSafeStorage });
}

beforeEach(() => {
    fakeSafeStorage.available = true;
    filePath = path.join(os.tmpdir(), `vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}.enc`);
});

const ALPACA = {
    providerId: 'alpaca',
    label: 'Alpaca paper',
    environment: 'paper',
    fields: { apiKeyId: 'PKTESTKEY1234ABCD', secretKey: 'supersecretvalue9876' },
    secretKeys: ['apiKeyId', 'secretKey'],
};

describe('maskSecret', () => {
    it('keeps only the last four characters', () => {
        expect(maskSecret('supersecretvalue9876')).toMatch(/•+9876$/);
        expect(maskSecret('supersecretvalue9876')).not.toContain('supersecret');
    });

    it('handles short and empty values safely', () => {
        expect(maskSecret('')).toBe('');
        expect(maskSecret('abcd')).toMatch(/•+abcd$/);
    });
});

describe('CredentialVault', () => {
    it('never exposes secrets in the renderer-facing summary', () => {
        const vault = newVault();
        const summary = vault.save(ALPACA);

        const asText = JSON.stringify(summary);
        expect(asText).not.toContain('supersecretvalue9876');
        expect(asText).not.toContain('PKTESTKEY1234ABCD');
        expect(summary.maskedFields.secretKey).toMatch(/•+9876$/);
        expect(summary.environment).toBe('paper');
    });

    it('writes nothing readable to disk', () => {
        const vault = newVault();
        vault.save(ALPACA);

        const onDisk = fs.readFileSync(filePath).toString();
        expect(onDisk).not.toContain('supersecretvalue9876');
        expect(onDisk).not.toContain('PKTESTKEY1234ABCD');
        expect(onDisk.startsWith('ENC:')).toBe(true);
    });

    it('round-trips through the encrypted file', () => {
        const first = newVault();
        const saved = first.save(ALPACA);

        const reopened = newVault();
        const list = reopened.list();
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe(saved.id);
        // Plaintext is recoverable in-process for connection tests only
        expect(reopened.reveal(saved.id).fields.secretKey).toBe('supersecretvalue9876');
    });

    it('refuses to save when the OS keychain is unavailable', () => {
        fakeSafeStorage.available = false;
        const vault = newVault();
        expect(() => vault.save(ALPACA)).toThrow(/no OS credential store/i);
        expect(fs.existsSync(filePath)).toBe(false);
    });

    it('refuses live-trading connections in this build', () => {
        const vault = newVault();
        expect(() => vault.save({ ...ALPACA, environment: 'live' }))
            .toThrow(/live trading .* not enabled/i);
    });

    it('records test results and deletes cleanly', () => {
        const vault = newVault();
        const saved = vault.save(ALPACA);

        const tested = vault.recordTestResult(saved.id, { ok: true, message: 'Connected' });
        expect(tested.lastTestOk).toBe(true);
        expect(tested.lastTestMessage).toBe('Connected');

        expect(vault.delete(saved.id)).toBe(true);
        expect(vault.list()).toHaveLength(0);
        expect(newVault().list()).toHaveLength(0);
    });

    it('leaves non-secret fields readable (gateway URLs are not secrets)', () => {
        const vault = newVault();
        const summary = vault.save({
            providerId: 'ibkr',
            label: 'IBKR gateway',
            environment: 'paper',
            fields: { gatewayUrl: 'https://localhost:5000/v1/api' },
            secretKeys: [],
        });
        expect(summary.maskedFields.gatewayUrl).toBe('https://localhost:5000/v1/api');
    });
});
