// k6 scenario: JSON‑RPC over WebSocket batch request validation
// - Sends a batch of 2 requests: ping (id:101) and echo (id:102)
// - Verifies both responses are present with jsonrpc=="2.0" and have result or error
// - Ignores notifications (no id) and closes only after both responses are received
// - Config via env: K6_WS_URL (default ws://localhost:9999/ws), K6_WS_TIMEOUT_MS (default 5000)
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
  },
};

export default function () {
  const url = __ENV.K6_WS_URL || 'ws://localhost:9999/ws';
  const timeoutMs = Number(__ENV.K6_WS_TIMEOUT_MS || 5000);

  const batch = [
    { jsonrpc: '2.0', method: 'ping', id: 101 },
    { jsonrpc: '2.0', method: 'echo', params: { x: 1 }, id: 102 },
  ];

  const res = ws.connect(url, { tags: { scenario: 'batch-jsonrpc' } }, function (socket) {
    let seen = { 101: false, 102: false };
    socket.on('open', function () {
      socket.send(JSON.stringify(batch));
    });

    socket.on('message', function (data) {
      try {
        const parsed = JSON.parse(data);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        for (const m of arr) {
          if (!m || typeof m !== 'object' || !Object.prototype.hasOwnProperty.call(m, 'id')) continue; // ignore notifications
          const id = Number(m.id);
          if (!(id in seen)) continue;
          const ok =
            m.jsonrpc === '2.0' &&
            (Object.prototype.hasOwnProperty.call(m, 'result') || Object.prototype.hasOwnProperty.call(m, 'error'));
          check(m, {
            'jsonrpc == 2.0': (v) => v && v.jsonrpc === '2.0',
            'has result or error': (v) =>
              v && (Object.prototype.hasOwnProperty.call(v, 'result') || Object.prototype.hasOwnProperty.call(v, 'error')),
          });
          seen[id] = ok;
        }
        if (seen[101] && seen[102]) {
          socket.close();
        }
      } catch (_) {
        // ignore non-JSON
      }
    });

    socket.setTimeout(function () {
      socket.close();
    }, timeoutMs);
  });

  check(res, { connected: (r) => r && r.status === 101 });
  sleep(0.1);
}

