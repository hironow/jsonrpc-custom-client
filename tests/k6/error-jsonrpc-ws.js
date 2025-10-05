// k6 scenario: JSON‑RPC over WebSocket error response validation
// - Sends an unknown method to trigger -32601 (Method not found)
// - Verifies jsonrpc=="2.0", matching id, and an error object present
// - Ignores notifications (no id)
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

  const req = { jsonrpc: '2.0', method: 'does.not.exist', id: 201 };

  const res = ws.connect(url, { tags: { scenario: 'error-jsonrpc' } }, function (socket) {
    let done = false;
    socket.on('open', function () {
      socket.send(JSON.stringify(req));
    });

    socket.on('message', function (data) {
      if (done) return;
      try {
        const parsed = JSON.parse(data);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const resp = arr.find((m) => m && typeof m === 'object' && Number(m.id) === req.id);
        if (!resp) return; // not our response
        const ok =
          resp.jsonrpc === '2.0' &&
          Object.prototype.hasOwnProperty.call(resp, 'error') &&
          resp.error && resp.error.code === -32601;
        check(resp, {
          'jsonrpc == 2.0': (v) => v && v.jsonrpc === '2.0',
          'id matches': (v) => v && String(v.id) === String(req.id),
          'has error -32601': (v) => v && v.error && v.error.code === -32601,
        });
        done = ok;
        socket.close();
      } catch (_) {
        // ignore non-JSON
      }
    });

    socket.setTimeout(function () {
      if (!done) socket.close();
    }, timeoutMs);
  });

  check(res, { connected: (r) => r && r.status === 101 });
  sleep(0.1);
}

