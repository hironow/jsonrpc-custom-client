// k6 scenario: JSON‑RPC over WebSocket basic "ping" validation
// - Connects to a WebSocket endpoint from env `K6_WS_URL` (default ws://localhost:9999/ws)
// - Sends a single JSON‑RPC request: { jsonrpc: "2.0", method: "ping", id: 1 }
// - Verifies the response has jsonrpc=="2.0", the same id, and either result or error
// - Honors optional timeout via `K6_WS_TIMEOUT_MS` (default 5000ms)
// - Threshold enforces all checks pass once (rate==1)
import ws from "k6/ws";
import { check, sleep } from "k6";

// Usage:
//  K6_WS_URL=ws://localhost:9999/ws k6 run tests/k6/basic-jsonrpc-ws.js
// or via just: `just k6` / `just k6 ws_url="wss://your-server/ws"`

export const options = {
	vus: 1,
	iterations: 1,
	thresholds: {
		checks: ["rate==1"],
	},
};

export default function () {
	const url = __ENV.K6_WS_URL || "ws://localhost:9999/ws";
	const request = { jsonrpc: "2.0", method: "ping", id: 1 };
	const timeoutMs = Number(__ENV.K6_WS_TIMEOUT_MS || 5000);

	const res = ws.connect(
		url,
		{ tags: { scenario: "basic-jsonrpc-ping" } },
		function (socket) {
			let gotResponse = false;
			socket.on("open", function () {
				socket.send(JSON.stringify(request));
			});

			socket.on("message", function (data) {
				try {
					const msg = JSON.parse(data);
					// Accept single-object or array; validate jsonrpc, id, and result|error
					const first = Array.isArray(msg) ? msg[0] : msg;
					const ok =
						first &&
						first.jsonrpc === "2.0" &&
						String(first.id) === String(request.id) &&
						(Object.prototype.hasOwnProperty.call(first, "result") ||
							Object.prototype.hasOwnProperty.call(first, "error"));
					check(first, {
						"jsonrpc == 2.0": (m) => m && m.jsonrpc === "2.0",
						"id matches": (m) => m && String(m.id) === String(request.id),
						"has result or error": (m) =>
							m &&
							(Object.prototype.hasOwnProperty.call(m, "result") ||
								Object.prototype.hasOwnProperty.call(m, "error")),
					});
					gotResponse = ok;
				} catch (e) {
					// ignore non-JSON messages
				} finally {
					socket.close();
				}
			});

			socket.on("error", function () {
				// Let k6 report via failed checks
			});

			socket.setTimeout(function () {
				if (!gotResponse) {
					socket.close();
				}
			}, timeoutMs);
		},
	);

	check(res, {
		connected: (r) => r && r.status === 101,
	});

	sleep(0.1);
}
