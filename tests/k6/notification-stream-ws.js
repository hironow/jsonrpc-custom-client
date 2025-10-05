// k6 scenario: WebSocket notification stream (no request)
// - Verifies at least one notification with method 'stream.heartbeat' arrives
// - Ignores responses (with id), focuses on notifications (no id)
// - Config via env: K6_WS_URL (default ws://localhost:9999/ws), K6_WS_TIMEOUT_MS (default 5000)
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
	const timeoutMs = Number(__ENV.K6_WS_TIMEOUT_MS || 5000);

	const res = ws.connect(
		url,
		{ tags: { scenario: "notification-stream" } },
		function (socket) {
			let got = false;

			socket.on("message", function (data) {
				if (got) return;
				try {
					const parsed = JSON.parse(data);
					const arr = Array.isArray(parsed) ? parsed : [parsed];
					const notif = arr.find(
						(m) =>
							m &&
							typeof m === "object" &&
							!Object.prototype.hasOwnProperty.call(m, "id") &&
							m.method === "stream.heartbeat",
					);
					if (!notif) return;
					check(notif, {
						"heartbeat notification": (v) =>
							v && v.method === "stream.heartbeat",
					});
					got = true;
					socket.close();
				} catch (_) {
					// ignore non-JSON
				}
			});

			socket.setTimeout(function () {
				if (!got) socket.close();
			}, timeoutMs);
		},
	);

	check(res, { connected: (r) => r && r.status === 101 });
	sleep(0.1);
}
