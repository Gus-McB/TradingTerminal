/**
 * Provider adapters — verify user credentials against each broker/data API.
 *
 * These run in the middleware (never the renderer) and only ever talk to
 * PAPER/sandbox endpoints in this build. Credentials arrive in memory and are
 * never written to disk or logged.
 */
const crypto = require('node:crypto');
const https = require('node:https');
const { URL } = require('node:url');

const TIMEOUT_MS = 10_000;

/** Endpoints reachable in this build. Live URLs are intentionally absent. */
const PAPER_ENDPOINTS = {
  alpaca:  'https://paper-api.alpaca.markets',
  binance: 'https://testnet.binance.vision',
  ibkr:    'https://localhost:5000/v1/api',
};

function isLoopback(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

/**
 * GET that tolerates the self-signed certificate the IBKR gateway serves.
 * TLS verification is only relaxed for loopback addresses — never the internet.
 */
function getLoopbackTls(urlString, headers = {}) {
  return new Promise((resolve, reject) => {
    if (!isLoopback(urlString)) {
      reject(new Error('refusing to relax TLS for a non-loopback host'));
      return;
    }
    const req = https.get(
      urlString,
      { headers, rejectUnauthorized: false, timeout: TIMEOUT_MS },
      (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('gateway timed out')); });
    req.on('error', reject);
  });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: res.status, ok: res.ok, json, text };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Alpaca ──────────────────────────────────────────────────────────────────

async function testAlpaca(fields) {
  const { apiKeyId, secretKey } = fields;
  if (!apiKeyId || !secretKey) {
    return { ok: false, message: 'API Key ID and Secret Key are both required' };
  }

  const res = await fetchJson(`${PAPER_ENDPOINTS.alpaca}/v2/account`, {
    headers: {
      'APCA-API-KEY-ID': apiKeyId,
      'APCA-API-SECRET-KEY': secretKey,
    },
  });

  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: 'Alpaca rejected these credentials (check they are PAPER keys)' };
  }
  if (!res.ok) {
    return { ok: false, message: `Alpaca returned HTTP ${res.status}` };
  }

  const acct = res.json ?? {};
  return {
    ok: true,
    message: 'Connected to Alpaca paper account',
    details: {
      accountNumber: String(acct.account_number ?? '—'),
      status: String(acct.status ?? '—'),
      buyingPower: String(acct.buying_power ?? '—'),
      currency: String(acct.currency ?? 'USD'),
    },
  };
}

// ─── Binance (spot testnet) ──────────────────────────────────────────────────

async function testBinance(fields) {
  const { apiKey, secretKey } = fields;
  if (!apiKey || !secretKey) {
    return { ok: false, message: 'API Key and Secret Key are both required' };
  }

  // Signed endpoint: query string is HMAC-SHA256'd with the secret
  const query = `timestamp=${Date.now()}&recvWindow=5000`;
  const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

  const res = await fetchJson(
    `${PAPER_ENDPOINTS.binance}/api/v3/account?${query}&signature=${signature}`,
    { headers: { 'X-MBX-APIKEY': apiKey } },
  );

  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: 'Binance rejected these credentials' };
  }
  if (res.status === 400 && res.json?.code === -1022) {
    return { ok: false, message: 'Signature rejected — check the Secret Key was pasted correctly' };
  }
  if (!res.ok) {
    return { ok: false, message: `Binance testnet returned HTTP ${res.status}${res.json?.msg ? `: ${res.json.msg}` : ''}` };
  }

  const acct = res.json ?? {};
  const funded = (acct.balances ?? []).filter(b => Number(b.free) > 0).length;
  return {
    ok: true,
    message: 'Connected to Binance Spot Testnet',
    details: {
      canTrade: String(acct.canTrade ?? '—'),
      accountType: String(acct.accountType ?? '—'),
      fundedAssets: String(funded),
    },
  };
}

// ─── Interactive Brokers (Client Portal Gateway) ─────────────────────────────

async function testIbkr(fields) {
  const base = (fields.gatewayUrl || PAPER_ENDPOINTS.ibkr).replace(/\/+$/, '');

  let res;
  try {
    res = isLoopback(base)
      ? await getLoopbackTls(`${base}/iserver/auth/status`)
      : await fetchJson(`${base}/iserver/auth/status`).then(r => ({ status: r.status, body: r.text }));
  } catch (err) {
    return {
      ok: false,
      message:
        `Could not reach the IBKR gateway at ${base} (${err.message}). ` +
        'Start the Client Portal Gateway and log in with a PAPER account first.',
    };
  }

  if (res.status === 401) {
    return { ok: false, message: 'Gateway is running but not logged in — complete the browser login, then retest' };
  }
  if (res.status !== 200) {
    return { ok: false, message: `Gateway returned HTTP ${res.status}` };
  }

  let status = {};
  try { status = JSON.parse(res.body); } catch { /* non-JSON body */ }

  if (status.authenticated === false) {
    return { ok: false, message: 'Gateway reachable but the session is not authenticated — log in and retest' };
  }

  return {
    ok: true,
    message: 'IBKR gateway reachable and authenticated',
    details: {
      authenticated: String(status.authenticated ?? '—'),
      connected: String(status.connected ?? '—'),
      competing: String(status.competing ?? 'false'),
    },
  };
}

// ─── Registry ────────────────────────────────────────────────────────────────

const ADAPTERS = {
  alpaca:  testAlpaca,
  binance: testBinance,
  ibkr:    testIbkr,
};

/**
 * Verify one connection's credentials.
 * @returns {Promise<{ok: boolean, message: string, details?: object}>}
 */
async function testConnection(providerId, fields) {
  const adapter = ADAPTERS[providerId];
  if (!adapter) return { ok: false, message: `Unknown provider: ${providerId}` };
  try {
    return await adapter(fields ?? {});
  } catch (err) {
    // Never echo the credentials back in an error
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
}

module.exports = { testConnection, PAPER_ENDPOINTS, ADAPTERS };
