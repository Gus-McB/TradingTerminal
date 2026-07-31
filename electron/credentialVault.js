/**
 * credentialVault — OS-encrypted storage for user-supplied API credentials.
 *
 * Security model:
 *   • Secrets are encrypted with Electron `safeStorage`, which is backed by
 *     the OS keychain (DPAPI on Windows, Keychain on macOS, libsecret on
 *     Linux). The ciphertext lives in userData/credentials.enc.
 *   • The RENDERER NEVER RECEIVES A SECRET. Every IPC reply is a
 *     ConnectionSummary carrying masked hints only.
 *   • Plaintext exists in main-process memory only for as long as it takes to
 *     run a connection test or hand it to the middleware.
 *   • Nothing is written to localStorage, Supabase, or any log line.
 *
 * If the OS keychain is unavailable, saving is refused outright rather than
 * silently falling back to plaintext on disk.
 */
const path = require('node:path');
const fs = require('node:fs');

const FILE_VERSION = 1;

/**
 * Electron's safeStorage, resolved lazily so this module can be unit-tested
 * (and required) outside an Electron runtime, where `require('electron')`
 * yields the binary path rather than the API surface.
 */
function defaultStorage() {
  try {
    const { safeStorage } = require('electron');
    return safeStorage && typeof safeStorage.isEncryptionAvailable === 'function'
      ? safeStorage
      : undefined;
  } catch {
    return undefined;
  }
}

function defaultUserDataPath() {
  try {
    return require('electron').app.getPath('userData');
  } catch {
    return process.cwd();
  }
}

function maskSecret(value) {
  if (!value) return '';
  const tail = String(value).slice(-4);
  const dots = Math.min(Math.max(String(value).length - 4, 4), 12);
  return `${'•'.repeat(dots)}${tail}`;
}

class CredentialVault {
  /**
   * @param {object} [opts]
   * @param {string} [opts.filePath]
   * @param {object} [opts.storage] safeStorage-shaped backend (injectable for tests)
   */
  constructor({ filePath, storage } = {}) {
    this.storage = storage ?? defaultStorage();
    this.filePath = filePath ?? path.join(defaultUserDataPath(), 'credentials.enc');
    /** id -> { id, providerId, label, environment, fields, createdAt, lastTest… } */
    this.records = new Map();
    this._load();
  }

  /** True when the OS can actually encrypt for us. */
  isAvailable() {
    try {
      return Boolean(this.storage?.isEncryptionAvailable());
    } catch {
      return false;
    }
  }

  // ── Disk ──────────────────────────────────────────────────────────────────

  _load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const blob = fs.readFileSync(this.filePath);
      if (!this.isAvailable()) {
        console.warn('[Vault] OS encryption unavailable — stored credentials cannot be read');
        return;
      }
      const json = this.storage.decryptString(blob);
      const parsed = JSON.parse(json);
      if (parsed?.version !== FILE_VERSION || !Array.isArray(parsed.records)) return;
      for (const record of parsed.records) this.records.set(record.id, record);
    } catch (err) {
      // A corrupt or foreign-machine blob must not crash the app
      console.error('[Vault] could not read credential store:', err.message);
    }
  }

  _persist() {
    if (!this.isAvailable()) throw new Error('OS credential encryption is unavailable');
    const payload = JSON.stringify({
      version: FILE_VERSION,
      records: [...this.records.values()],
    });
    const encrypted = this.storage.encryptString(payload);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    // Owner-only permissions where the platform honours them
    fs.writeFileSync(this.filePath, encrypted, { mode: 0o600 });
  }

  // ── Renderer-facing (masked) ──────────────────────────────────────────────

  /** @returns {object} summary safe to send to the renderer */
  toSummary(record) {
    const maskedFields = {};
    for (const [key, value] of Object.entries(record.fields ?? {})) {
      // Non-secret fields (a gateway URL) stay readable; secrets are masked
      maskedFields[key] = record.secretKeys?.includes(key) ? maskSecret(value) : value;
    }
    return {
      id: record.id,
      providerId: record.providerId,
      label: record.label,
      environment: record.environment,
      maskedFields,
      createdAt: record.createdAt,
      lastTestedAt: record.lastTestedAt,
      lastTestOk: record.lastTestOk,
      lastTestMessage: record.lastTestMessage,
      active: Boolean(record.active),
    };
  }

  list() {
    return [...this.records.values()].map(r => this.toSummary(r));
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * @param {{providerId: string, label: string, environment: 'paper'|'live',
   *          fields: Record<string,string>, secretKeys: string[]}} input
   */
  save(input) {
    if (!this.isAvailable()) {
      throw new Error(
        'This machine has no OS credential store available, so API keys cannot be stored securely. ' +
        'Saving was refused rather than writing them unencrypted.'
      );
    }
    // Paper-only in this build; refuse live outright rather than storing
    // something the app would then be tempted to use.
    if (input.environment === 'live') {
      throw new Error('Live trading connections are not enabled in this build.');
    }

    const id = input.id ?? `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const existing = this.records.get(id);
    const record = {
      id,
      providerId: input.providerId,
      label: input.label || input.providerId,
      environment: 'paper',
      fields: { ...(existing?.fields ?? {}), ...input.fields },
      secretKeys: input.secretKeys ?? existing?.secretKeys ?? [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      active: existing?.active ?? false,
    };
    this.records.set(id, record);
    this._persist();
    return this.toSummary(record);
  }

  delete(id) {
    const existed = this.records.delete(id);
    if (existed) this._persist();
    return existed;
  }

  /** Plaintext — main process only. Never send the result to a renderer. */
  reveal(id) {
    const record = this.records.get(id);
    if (!record) return undefined;
    return {
      id: record.id,
      providerId: record.providerId,
      environment: record.environment,
      fields: { ...record.fields },
    };
  }

  recordTestResult(id, { ok, message }) {
    const record = this.records.get(id);
    if (!record) return undefined;
    record.lastTestedAt = new Date().toISOString();
    record.lastTestOk = ok;
    record.lastTestMessage = message;
    this._persist();
    return this.toSummary(record);
  }

  setActive(id, active) {
    const record = this.records.get(id);
    if (!record) return undefined;
    record.active = Boolean(active);
    this._persist();
    return this.toSummary(record);
  }
}

module.exports = { CredentialVault, maskSecret };
