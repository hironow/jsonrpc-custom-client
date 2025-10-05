// k6 scenario: Large batch JSON‑RPC over WebSocket
// - Sends a configurable large batch of requests (echo + ping)
// - Verifies all responses are received (ignoring notifications)
// - Config via env:
//     K6_WS_URL           (default ws://localhost:9999/ws)
//     K6_WS_TIMEOUT_MS    (default 10000)
//     K6_BATCH_SIZE       (default 50)
//     K6_PAYLOAD_KB       (default 1)
import ws from "k6/ws";
import { check, sleep } from "k6";

export const options = {
	vus: 1,
	iterations: 1,
	thresholds: {
		checks: ["rate==1"],
	},
};

export default function () {
	const url = __ENV.K6_WS_URL || "ws://localhost:9999/ws";
	const timeoutMs = Number(__ENV.K6_WS_TIMEOUT_MS || 10000);
	const batchSize = Math.max(1, Number(__ENV.K6_BATCH_SIZE || 50));
	const payloadKb = Math.max(0, Number(__ENV.K6_PAYLOAD_KB || 1));
	const payload = payloadKb > 0 ? "x".repeat(payloadKb * 1024) : "";

	// Build batch: mix echo (with payload) and ping
	const batch = [];
	for (let i = 1; i <= batchSize; i += 1) {
		const id = i;
		if (i % 5 === 0) {
			batch.push({ jsonrpc: "2.0", method: "ping", id });
		} else {
			batch.push({
				jsonrpc: "2.0",
				method: "echo",
				params: { idx: i, payload },
				id,
			});
		}
	}

	const expected = new Set(batch.map((r) => String(r.id)));
	const seen = new Set();

	const res = ws.connect(
		url,
		{ tags: { scenario: "large-batch-jsonrpc" } },
		function (socket) {
			let done = false;

			socket.on("open", function () {
				socket.send(JSON.stringify(batch));
			});

			socket.on("message", function (data) {
				if (done) return;
				try {
					const parsed = JSON.parse(data);
					const arr = Array.isArray(parsed) ? parsed : [parsed];
					for (const m of arr) {
						// Ignore notifications (no id)
						if (
							!m ||
							typeof m !== "object" ||
							!Object.prototype.hasOwnProperty.call(m, "id")
						)
							continue;
						const idStr = String(m.id);
						if (!expected.has(idStr)) continue; // ignore unrelated
						// Basic invariants for JSON-RPC response
						check(m, {
							"jsonrpc == 2.0": (v) => v && v.jsonrpc === "2.0",
							"has result or error": (v) =>
								v && ("result" in v || "error" in v),
						});
						seen.add(idStr);
					}
					if (seen.size === expected.size) {
						// Aggregate completion check
						check(seen, {
							"all responses received": (s) => s && s.size === expected.size,
						});
						done = true;
						socket.close();
					}
				} catch (_) {
					// ignore non-JSON
				}
			});

			socket.setTimeout(function () {
				if (!done) socket.close();
			}, timeoutMs);
		},
	);

	check(res, { connected: (r) => r && r.status === 101 });

	sleep(0.1);
}
