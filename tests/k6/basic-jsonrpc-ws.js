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
					const parsed = JSON.parse(data);
					const arr = Array.isArray(parsed) ? parsed : [parsed];
					// Find a response (has id). Ignore notifications (no id).
					const resp = arr.find(
						(m) =>
							m &&
							typeof m === "object" &&
							Object.prototype.hasOwnProperty.call(m, "id"),
					);
					if (!resp) return; // not a response; keep waiting
					const ok =
						resp.jsonrpc === "2.0" &&
						String(resp.id) === String(request.id) &&
						(Object.prototype.hasOwnProperty.call(resp, "result") ||
							Object.prototype.hasOwnProperty.call(resp, "error"));
					check(resp, {
						"jsonrpc == 2.0": (m) => m && m.jsonrpc === "2.0",
						"id matches": (m) => m && String(m.id) === String(request.id),
						"has result or error": (m) =>
							m &&
							(Object.prototype.hasOwnProperty.call(m, "result") ||
								Object.prototype.hasOwnProperty.call(m, "error")),
					});
					gotResponse = ok;
					// Close only after we saw the matching response
					socket.close();
				} catch (e) {
					// ignore non-JSON messages
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
