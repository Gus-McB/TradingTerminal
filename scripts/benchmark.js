#!/usr/bin/env node
'use strict';

/**
 * TradingTerminal Baseline Performance Benchmark
 *
 * Uses ONLY Node.js built-in APIs — no third-party packages — so it can run
 * standalone against any middleware instance.
 *
 * Connects to the middleware's Socket.IO endpoint and measures:
 *   1. Connection & subscribe latency
 *   2. Message throughput (msgs/sec, by type)
 *   3. Inter-message delivery jitter (p50/p95/p99)
 *   4. JSON parse time per message (nanoseconds)
 *   5. MEASURED order execution path vs 10 ms target — real orders are
 *      submitted through middleware -> ZMQ -> C++ engine paper matcher, with
 *      hop timestamps embedded in each message envelope
 *   6. System health (memory, errors, dropped pings)
 *
 * Usage:
 *   node scripts/benchmark.js [duration_seconds] [order_count]
 *
 * Prerequisites:
 *   Engine:      engine\build\Release\trading-engine.exe
 *   Middleware:  npm start -w middleware
 */

// ── Requires nothing outside Node.js built-ins ────────────────────────────────
const { performance } = require('perf_hooks');
const http = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const DURATION_S   = parseInt(process.argv[2] || '30', 10);
const ORDER_COUNT  = parseInt(process.argv[3] || '300', 10);
const ORDER_SPACING_MS = 20;
const MW_HOST      = process.env.MW_HOST || 'localhost';
const MW_PORT      = parseInt(process.env.MW_PORT || '3000', 10);
const MW_HTTP      = `http://${MW_HOST}:${MW_PORT}`;
const WS_URL       = `ws://${MW_HOST}:${MW_PORT}/socket.io/?EIO=4&transport=websocket`;
const SYMBOLS      = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD'];
const FIRST_MSG_TIMEOUT_MS = 8000;

// ── High-res timing ───────────────────────────────────────────────────────────
function nowMs()  { return performance.now(); }
function hrtNs()  { return Number(process.hrtime.bigint()); }
// System-clock-anchored µs epoch (comparable across processes to ~1 ms)
const EPOCH_OFFSET_US = Date.now() * 1000 - performance.now() * 1000;
function nowEpochUs() { return EPOCH_OFFSET_US + performance.now() * 1000; }

// ── Statistics ────────────────────────────────────────────────────────────────
function computeStats(arr) {
  if (!arr.length) return null;
  const sorted = Float64Array.from(arr).sort();
  const n      = sorted.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += sorted[i];
  const mean = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) sq += (sorted[i] - mean) ** 2;
  const pct = (p) => sorted[Math.max(0, Math.ceil(p / 100 * n) - 1)];
  return {
    n, mean, stddev: Math.sqrt(sq / n),
    min: sorted[0], max: sorted[n - 1],
    p50: pct(50), p90: pct(90), p95: pct(95), p99: pct(99), p999: pct(99.9),
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────
const W   = 66;
const SEP = '═'.repeat(W);
const LN  = '─'.repeat(W);

function hdr(t) {
  console.log(`\n${SEP}`);
  console.log(`  ${t}`);
  console.log(SEP);
}
function row(label, val, unit = '', tag = '') {
  const l = `${label}:`.padEnd(26);
  const v = (typeof val === 'number'
    ? (Number.isInteger(val) ? val.toString() : val.toFixed(val < 10 ? 3 : 1))
    : String(val)).padStart(10);
  console.log(`  ${l} ${v}  ${unit}  ${tag}`);
}
function statRows(s, unit, dp = 3) {
  if (!s) { console.log('  No data collected.'); return; }
  const fmt = v => v.toFixed(dp).padStart(10);
  [['min', s.min], ['p50', s.p50], ['p90', s.p90], ['p95', s.p95],
   ['p99', s.p99], ['p99.9', s.p999], ['max', s.max]].forEach(([k, v]) =>
    console.log(`  ${(k + ':').padEnd(26)} ${fmt(v)}  ${unit}`));
  console.log(`  ${LN.slice(0, 40)}`);
  console.log(`  ${'mean:'.padEnd(26)} ${fmt(s.mean)}  ${unit}`);
  console.log(`  ${'stddev:'.padEnd(26)} ${fmt(s.stddev)}  ${unit}`);
  console.log(`  ${'samples:'.padEnd(26)} ${s.n.toString().padStart(10)}  msgs`);
}

function drawBar(elapsed, total, msgs, rate) {
  const p      = Math.min(100, (elapsed / total) * 100);
  const filled = Math.round(p / 5);
  const b      = '█'.repeat(filled) + '░'.repeat(20 - filled);
  process.stdout.write(
    `\r  [${b}] ${p.toFixed(0).padStart(3)}%` +
    ` | Msgs: ${msgs.toLocaleString().padStart(7)}` +
    ` | Rate: ${rate.toFixed(0).padStart(5)}/s `,
  );
}

// ── Health-check the middleware ────────────────────────────────────────────────
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${MW_HTTP}/api/health`, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ ok: res.statusCode === 200, body }));
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${SEP}`);
  console.log('  TradingTerminal — Baseline Performance Benchmark');
  console.log(`  Duration: ${DURATION_S}s   Middleware: ${MW_HTTP}`);
  console.log(SEP);

  // ── Pre-flight: middleware health ─────────────────────────────────────────────
  process.stdout.write('\n  Checking middleware health...');
  const health = await checkHealth();
  if (!health.ok) {
    console.log(' FAILED\n');
    console.error(`  [!] Middleware not reachable at ${MW_HTTP}`);
    console.error('      Start it with:  npm start -w middleware');
    console.error(`      Error: ${health.error || health.body}\n`);
    process.exit(1);
  }
  console.log(' OK');
  console.log(`  Connecting WebSocket to ${WS_URL}...`);

  // ── Accumulators ──────────────────────────────────────────────────────────────
  const interMsgMs  = [];   // ms between consecutive messages (all types)
  const parseNs     = [];   // ns to JSON.parse each Socket.IO payload
  const subToFirstMs = {};  // ms from subscribe → first msg per symbol
  const counts = {
    'orderbook:snapshot': 0,
    'orderbook:update':   0,
    'ticker:update':      0,
    'kline:update':       0,
    'kline:history':      0,
    other: 0,
    pong: 0,
    errors: 0,
  };

  let connectMs       = 0;
  let subscribeMs     = 0;
  let firstMsgMs      = 0;
  let lastMsgAt       = 0;
  let totalMsgs       = 0;
  let pingsSent       = 0;
  let pongsReceived   = 0;
  let wsState         = 'connecting'; // connecting → engine-open → sio-connected → subscribed
  let subscribeTimeouts = {};
  let orderUpdateHandler = null;      // installed during the order benchmark phase

  // ── WebSocket connection (built-in Node.js 22) ────────────────────────────────
  const t0 = nowMs();
  const ws = new WebSocket(WS_URL);
  let pingInterval;
  let progressInterval;
  let doneTimer;
  let firstMsgTimer;

  // Keeps the socket (and Engine.IO keepalive) open so the order benchmark
  // phase can run after the market-data window
  function cleanup() {
    clearInterval(progressInterval);
    clearTimeout(doneTimer);
    clearTimeout(firstMsgTimer);
    Object.values(subscribeTimeouts).forEach(clearTimeout);
  }

  function finalClose() {
    clearInterval(pingInterval);
    if (ws.readyState === WebSocket.OPEN) ws.close();
  }

  const runDone = new Promise((resolve) => {
    ws.addEventListener('open', () => {
      connectMs = nowMs() - t0;
      wsState = 'engine-connected';
      // Engine.IO sends '0{...}' open packet first; wait for it before doing anything
    });

    ws.addEventListener('message', ({ data }) => {
      const raw = typeof data === 'string' ? data : data.toString();

      // ── Engine.IO packet dispatch ──────────────────────────────────────────
      const eType = raw[0];

      if (eType === '0') {
        // Engine.IO open — extract pingInterval, start keepalive, send SIO connect
        let info = {};
        try { info = JSON.parse(raw.slice(1)); } catch { /**/ }
        const piMs = info.pingInterval || 25000;
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('2');   // Engine.IO ping
            pingsSent++;
          }
        }, piMs);
        ws.send('40');      // Socket.IO connect to default namespace
        wsState = 'engine-open';
        return;
      }

      if (eType === '3') { // Engine.IO pong
        pongsReceived++;
        counts.pong++;
        return;
      }

      if (eType === '2') { // Engine.IO ping from server (shouldn't happen often)
        ws.send('3');
        return;
      }

      if (eType !== '4') return; // not a Socket.IO message frame

      // ── Socket.IO packet ────────────────────────────────────────────────────
      const sType = raw[1];

      if (sType === '0') {
        // Socket.IO namespace connect ack — subscribe to all symbols
        wsState = 'sio-connected';
        subscribeMs = nowMs() - t0;
        for (const sym of SYMBOLS) {
          subscribeTimeouts[sym] = setTimeout(() => {
            delete subscribeTimeouts[sym];
          }, FIRST_MSG_TIMEOUT_MS);
          ws.send(`42["subscribe","${sym}"]`);
        }
        wsState = 'subscribed';

        // Start progress bar
        const startMs = nowMs();
        progressInterval = setInterval(() => {
          const elapsed = (nowMs() - startMs) / 1000;
          drawBar(elapsed, DURATION_S, totalMsgs, elapsed > 0 ? totalMsgs / elapsed : 0);
        }, 250);

        // Stop after DURATION_S
        doneTimer = setTimeout(() => {
          cleanup();
          resolve();
        }, DURATION_S * 1000);

        // Timeout if no data arrives
        firstMsgTimer = setTimeout(() => {
          if (!firstMsgMs) {
            cleanup();
            console.log('\n\n  [!] No messages received within 8 seconds.');
            console.log('      Check that the middleware has an active data source:');
            console.log('      - Binance bridge: requires internet connection');
            console.log('      - Engine bridge:  requires trading-engine.exe running\n');
            resolve();
          }
        }, FIRST_MSG_TIMEOUT_MS);
        return;
      }

      if (sType !== '2') return; // only handle events

      // ── Socket.IO event ────────────────────────────────────────────────────
      const now = nowMs();

      // Parse timing
      const p0 = hrtNs();
      let eventName, payload;
      try {
        [eventName, payload] = JSON.parse(raw.slice(2));
      } catch {
        counts.errors++;
        return;
      }
      parseNs.push(hrtNs() - p0);

      if (eventName === 'order:update') {
        if (orderUpdateHandler) orderUpdateHandler(payload);
        return;
      }

      // First-message tracking
      if (!firstMsgMs) {
        firstMsgMs = now - t0;
        clearTimeout(firstMsgTimer);
      }

      // Inter-message interval
      if (lastMsgAt > 0) {
        const interval = now - lastMsgAt;
        if (interval > 0 && interval < 5000) interMsgMs.push(interval);
      }
      lastMsgAt = now;

      // Per-symbol first-message latency
      if (payload && payload.symbol && subscribeTimeouts[payload.symbol]) {
        clearTimeout(subscribeTimeouts[payload.symbol]);
        delete subscribeTimeouts[payload.symbol];
        subToFirstMs[payload.symbol] = now - subscribeMs;
      }

      // Count by type
      if (eventName in counts) counts[eventName]++;
      else counts.other++;

      totalMsgs++;
    });

    ws.addEventListener('error', (err) => {
      counts.errors++;
      if (wsState === 'connecting') {
        cleanup();
        console.error(`\n  [!] WebSocket connection failed: ${err.message || 'unknown'}`);
        console.error(`      Is the middleware running at ${MW_HTTP}?\n`);
        resolve();
      }
    });

    ws.addEventListener('close', ({ code }) => {
      if (wsState !== 'subscribed') {
        cleanup();
        console.error(`\n  [!] WebSocket closed unexpectedly (code ${code})`);
        resolve();
      }
    });
  });

  await runDone;
  process.stdout.write('\n');

  // ── Order benchmark phase (real orders through middleware → engine) ──────────
  function runOrderBenchmark() {
    return new Promise((resolve) => {
      if (ws.readyState !== WebSocket.OPEN) { resolve(null); return; }

      console.log(`\n  Submitting ${ORDER_COUNT} MARKET orders (${ORDER_SPACING_MS} ms apart)...`);

      const pending = new Map();  // clientOrderId -> submit time (ms)
      const results = {
        submitted: 0, replies: 0, statuses: {},
        rttMs: [], uiToMwMs: [], mwToEngineMs: [], engineMs: [], engineToMwMs: [],
        zmqRoundTripMs: [], serverTotalMs: [],
      };
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(sender);
        clearTimeout(guard);
        orderUpdateHandler = null;
        process.stdout.write('\n');
        resolve(results);
      };

      orderUpdateHandler = (p) => {
        const submitAt = pending.get(p.clientOrderId);
        if (submitAt === undefined) return;   // resting-order follow-up or foreign order
        pending.delete(p.clientOrderId);

        results.replies++;
        results.statuses[p.status] = (results.statuses[p.status] || 0) + 1;
        results.rttMs.push(nowMs() - submitAt);

        const L = p.latency || {};
        if (L.uiToMwUs != null)     results.uiToMwMs.push(L.uiToMwUs / 1000);
        if (L.mwToEngineUs != null) results.mwToEngineMs.push(L.mwToEngineUs / 1000);
        if (L.engineUs != null)     results.engineMs.push(L.engineUs / 1000);
        if (L.engineToMwUs != null) results.engineToMwMs.push(L.engineToMwUs / 1000);
        if (L.zmqRoundTripUs != null) results.zmqRoundTripMs.push(L.zmqRoundTripUs / 1000);
        if (L.serverTotalUs != null) results.serverTotalMs.push(L.serverTotalUs / 1000);

        if (results.replies % 50 === 0) {
          process.stdout.write(`\r  Replies: ${results.replies}/${ORDER_COUNT}`);
        }
        if (results.replies >= ORDER_COUNT) finish();
      };

      const sender = setInterval(() => {
        if (results.submitted >= ORDER_COUNT) { clearInterval(sender); return; }
        const i = results.submitted;
        const clientOrderId = `bench-${Date.now()}-${i}`;
        pending.set(clientOrderId, nowMs());
        ws.send(`42["order:submit",${JSON.stringify({
          clientOrderId,
          symbol: SYMBOLS[i % SYMBOLS.length],
          side: i % 2 === 0 ? 'BUY' : 'SELL',
          type: 'MARKET',
          quantity: 0.01,
          tsUiSubmitUs: nowEpochUs(),
        })}]`);
        results.submitted++;
      }, ORDER_SPACING_MS);

      // Give stragglers time after the last submit
      const guard = setTimeout(finish, ORDER_COUNT * ORDER_SPACING_MS + 8000);
    });
  }

  const orderResults = await runOrderBenchmark();
  finalClose();

  // ── Compute final stats ───────────────────────────────────────────────────────
  const sInterMsg = computeStats(interMsgMs);
  const sParse    = computeStats(parseNs);

  const durationS = lastMsgAt > 0
    ? (lastMsgAt - (t0 + subscribeMs)) / 1000
    : DURATION_S;
  const rate = durationS > 0 ? totalMsgs / durationS : 0;

  // ── Section 1: Connection & subscribe latency ─────────────────────────────────
  hdr('1.  CONNECTION & SUBSCRIBE LATENCY');
  row('WebSocket connect', connectMs, 'ms');
  row('Socket.IO handshake', subscribeMs - connectMs, 'ms');
  row('Total to subscribed', subscribeMs, 'ms');
  row('First message received', firstMsgMs || 0, 'ms', firstMsgMs ? 'after subscribe' : 'N/A');
  if (Object.keys(subToFirstMs).length) {
    console.log('\n  Per-symbol first message (ms after subscribe):');
    for (const sym of SYMBOLS) {
      const v = subToFirstMs[sym];
      console.log(`    ${sym.padEnd(10)} ${v !== undefined ? v.toFixed(1) : 'N/A'} ms`);
    }
  }

  // ── Section 2: Throughput ─────────────────────────────────────────────────────
  hdr('2.  MESSAGE THROUGHPUT');
  row('Total messages', totalMsgs, 'msgs');
  row('Measured duration', durationS, 's');
  row('Average rate', rate, 'msg/s');
  console.log('\n  By event type:');
  const typeOrder = ['orderbook:snapshot', 'orderbook:update', 'ticker:update', 'kline:update', 'kline:history'];
  for (const t of typeOrder) {
    if (counts[t] > 0) {
      const pct = totalMsgs ? `  (${(counts[t] / totalMsgs * 100).toFixed(1)}%)` : '';
      console.log(`    ${t.padEnd(22)} ${String(counts[t]).padStart(8)}${pct}`);
    }
  }
  if (counts.other > 0)
    console.log(`    ${'(other)'.padEnd(22)} ${String(counts.other).padStart(8)}`);

  // ── Section 3: Delivery jitter ────────────────────────────────────────────────
  hdr('3.  INTER-MESSAGE DELIVERY INTERVAL  (all event types)');
  console.log('  Measures time between consecutive messages — low stddev = steady stream.\n');
  statRows(sInterMsg, 'ms', 3);

  // ── Section 4: JSON parse time ────────────────────────────────────────────────
  hdr('4.  JSON PARSE TIME  (per message, nanoseconds)');
  console.log('  Time to JSON.parse the Socket.IO event payload in the client.\n');
  statRows(sParse, 'ns', 0);

  // ── Section 5: MEASURED order execution path ──────────────────────────────────
  hdr('5.  MEASURED ORDER EXECUTION PATH  (vs 10 ms target)');

  if (!orderResults || orderResults.replies === 0) {
    console.log('\n  [!] No order replies received.');
    console.log('      The order path requires the C++ engine:');
    console.log('        engine\\build\\Release\\trading-engine.exe');
    console.log(`      Submitted: ${orderResults ? orderResults.submitted : 0}, replies: 0\n`);
  } else {
    const r = orderResults;
    console.log(`\n  Orders submitted: ${r.submitted}   Replies: ${r.replies}` +
      `   Lost: ${r.submitted - r.replies}`);
    console.log('  Statuses: ' + Object.entries(r.statuses)
      .map(([k, v]) => `${k}=${v}`).join('  '));

    const hops = [
      // Cross-process hops carry ~1 ms clock-anchor uncertainty; the
      // single-clock rows (engine matching, ZMQ round trip) are exact.
      ['UI → middleware (Socket.IO)*',  computeStats(r.uiToMwMs)],
      ['Middleware → engine (ZMQ)*',    computeStats(r.mwToEngineMs)],
      ['Engine matching (C++)',         computeStats(r.engineMs)],
      ['Engine → middleware (ZMQ)*',    computeStats(r.engineToMwMs)],
      ['ZMQ round trip incl. engine',   computeStats(r.zmqRoundTripMs)],
    ];

    const c0 = 34, c1 = 9, c2 = 9, c3 = 9;
    console.log();
    console.log(`  ${'Hop (all MEASURED)'.padEnd(c0)} ${'p50 ms'.padStart(c1)} ${'p95 ms'.padStart(c2)} ${'p99 ms'.padStart(c3)}`);
    console.log(`  ${LN.slice(0, c0 + c1 + c2 + c3 + 4)}`);
    for (const [desc, s] of hops) {
      if (!s) continue;
      console.log(`  ${desc.padEnd(c0)} ${s.p50.toFixed(3).padStart(c1)} ${s.p95.toFixed(3).padStart(c2)} ${s.p99.toFixed(3).padStart(c3)}`);
    }

    const sServer = computeStats(r.serverTotalMs);
    const sRtt    = computeStats(r.rttMs);
    console.log(`  ${LN.slice(0, c0 + c1 + c2 + c3 + 4)}`);
    if (sServer) {
      console.log(`  ${'Submit → mw reply (one-way+)'.padEnd(c0)} ${sServer.p50.toFixed(3).padStart(c1)} ${sServer.p95.toFixed(3).padStart(c2)} ${sServer.p99.toFixed(3).padStart(c3)}`);
    }
    console.log(`  ${'FULL ROUND TRIP (client)'.padEnd(c0)} ${sRtt.p50.toFixed(3).padStart(c1)} ${sRtt.p95.toFixed(3).padStart(c2)} ${sRtt.p99.toFixed(3).padStart(c3)}`);
    console.log(`  ${'Target'.padEnd(c0)} ${'10.000'.padStart(c1)} ${'10.000'.padStart(c2)} ${'10.000'.padStart(c3)}`);

    const p50ok = sRtt.p50 < 10, p99ok = sRtt.p99 < 10;
    console.log();
    console.log(`  p50: ${sRtt.p50.toFixed(3)} ms  ${p50ok ? '✓ PASS' : '✗ FAIL'}   (headroom ${(10 - sRtt.p50).toFixed(3)} ms)`);
    console.log(`  p99: ${sRtt.p99.toFixed(3)} ms  ${p99ok ? '✓ PASS' : '✗ FAIL'}   (headroom ${(10 - sRtt.p99).toFixed(3)} ms)`);
    console.log();
    console.log('  Notes:');
    console.log('  - Hop timings come from timestamps embedded in each order envelope');
    console.log('    (ts_ui_submit → ts_mw_in → ts_mw_out → ts_engine_in → ts_engine_done).');
    console.log('  - Rows marked * compare clocks across processes (~1 ms uncertainty).');
    console.log('  - Full round trip = order submitted to order:update received, in this client.');
  }

  // ── Section 6: System health ───────────────────────────────────────────────────
  hdr('6.  SYSTEM HEALTH');
  const mem = process.memoryUsage();
  row('Pings sent / pongs received', `${pingsSent} / ${pongsReceived}`, '',
    pingsSent === pongsReceived ? '✓ no dropped pings' : '⚠ dropped pings');
  row('Parse errors', counts.errors, '', counts.errors === 0 ? '✓ clean' : '⚠ investigate');
  row('Process RSS', mem.rss / 1024 / 1024, 'MB');
  row('Heap used', mem.heapUsed / 1024 / 1024, 'MB');

  if (!totalMsgs) {
    console.log('\n  [!] No data messages received during the benchmark window.');
  } else {
    console.log(`\n  [✓] ${totalMsgs.toLocaleString()} messages processed in ${durationS.toFixed(1)}s.\n`);
  }

  console.log(`${SEP}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n  [FATAL]', err.message, '\n');
  process.exit(1);
});
