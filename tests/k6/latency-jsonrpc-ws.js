// k6 scenario: Response latency measurement over WebSocket
// - Sends N echo requests spaced by a gap and measures per-request latency
// - Records latency in a Trend metric with a configurable p95 threshold
// - Ignores notifications (no id)
// - Config via env:
//     K6_WS_URL            (default ws://localhost:9999/ws)
//     K6_WS_TIMEOUT_MS     (default 10000)
//     K6_LATENCY_REQS      (default 10)
//     K6_LATENCY_GAP_MS    (default 50)
//     K6_PAYLOAD_KB        (default 1)
//     K6_P95_MS            (default 2000)
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const P95 = Number(__ENV.K6_P95_MS || 2000);
export const ws_response_ms = new Trend("ws_resp_time_ms");

export const options = {
	vus: 1,
	iterations: 1,
	thresholds: {
		checks: ["rate==1"],
		ws_resp_time_ms: [`p(95)<${P95}`],
	},
};

export default function () {
	const url = __ENV.K6_WS_URL || "ws://localhost:9999/ws";
	const timeoutMs = Number(__ENV.K6_WS_TIMEOUT_MS || 10000);
	const N = Math.max(1, Number(__ENV.K6_LATENCY_REQS || 10));
	const gapMs = Math.max(0, Number(__ENV.K6_LATENCY_GAP_MS || 50));
	const payloadKb = Math.max(0, Number(__ENV.K6_PAYLOAD_KB || 1));
	const payload = payloadKb > 0 ? "x".repeat(payloadKb * 1024) : "";

	let sent = 0;
	let received = 0;
	const startTimes = new Map(); // id -> timestamp

	const res = ws.connect(
		url,
		{ tags: { scenario: "latency-jsonrpc" } },
		function (socket) {
			let done = false;

			socket.on("open", function () {
				// Schedule N requests at a fixed interval
				for (let i = 1; i <= N; i += 1) {
					const id = i;
					socket.setTimeout(
						function () {
							const req = {
								jsonrpc: "2.0",
								method: "echo",
								params: { idx: id, payload },
								id,
							};
							startTimes.set(String(id), Date.now());
							socket.send(JSON.stringify(req));
							sent += 1;
						},
						(i - 1) * gapMs,
					);
				}
			});

			socket.on("message", function (data) {
				if (done) return;
				try {
					const parsed = JSON.parse(data);
					const arr = Array.isArray(parsed) ? parsed : [parsed];
					for (const m of arr) {
						if (
							!m ||
							typeof m !== "object" ||
							!Object.prototype.hasOwnProperty.call(m, "id")
						)
							continue; // notification
						const idStr = String(m.id);
						if (!startTimes.has(idStr)) continue; // not ours
						const t0 = startTimes.get(idStr);
						const dt = Date.now() - t0;
						ws_response_ms.add(dt);
						// Basic invariants
						check(m, {
							"jsonrpc == 2.0": (v) => v && v.jsonrpc === "2.0",
							"has result or error": (v) =>
								v && ("result" in v || "error" in v),
						});
						received += 1;
					}
					if (received >= N) {
						check(received, { "all responses received": (c) => c >= N });
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
