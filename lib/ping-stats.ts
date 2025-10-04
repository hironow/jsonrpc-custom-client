import type { Message } from "@/types/message";

export type PingStats = {
	totalPings: number;
	matched: number;
	missing: number;
};

export function computePingStats(messages: Message[]): PingStats {
	const pingIds = new Set<number>();
	const respondedIds = new Set<number>();

	for (const m of messages) {
		if (
			m.type === "sent" &&
			m.method === "ping" &&
			typeof m.requestId === "number"
		) {
			pingIds.add(m.requestId);
		}
	}

	for (const m of messages) {
		if (m.type === "received" && typeof m.requestId === "number") {
			// Any response with matching id counts as a pong for our ping
			if (pingIds.has(m.requestId)) {
				respondedIds.add(m.requestId);
			}
		}
	}

	const matched = respondedIds.size;
	const totalPings = pingIds.size;
	const missing = totalPings - matched;
	return { totalPings, matched, missing };
}
