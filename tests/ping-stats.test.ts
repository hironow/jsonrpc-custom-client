import { describe, it, expect } from "vitest";
import { computePingStats } from "@/lib/ping-stats";
import type { Message } from "@/types/message";

function msg(partial: Partial<Message>): Message {
	return {
		id: partial.id ?? Math.random().toString(36).slice(2),
		type: partial.type ?? "system",
		timestamp: partial.timestamp ?? new Date(),
		data: partial.data ?? {},
		method: partial.method,
		requestId: partial.requestId,
		responseTime: partial.responseTime,
		isPending: partial.isPending,
		isNotification: partial.isNotification,
		isBatch: partial.isBatch,
		batchSize: partial.batchSize,
		linkedMessageId: partial.linkedMessageId,
		validationErrors: partial.validationErrors,
		validationWarnings: partial.validationWarnings,
	} as Message;
}

describe("computePingStats", () => {
	it("counts matched and missing ping/pong by id", () => {
		const messages: Message[] = [
			// two ping requests (id:1, id:2)
			msg({
				type: "sent",
				method: "ping",
				data: { jsonrpc: "2.0", method: "ping", id: 1 },
				requestId: 1,
				isPending: true,
			}),
			msg({
				type: "sent",
				method: "ping",
				data: { jsonrpc: "2.0", method: "ping", id: 2 },
				requestId: 2,
				isPending: true,
			}),
			// one non-ping request
			msg({
				type: "sent",
				method: "demo",
				data: { jsonrpc: "2.0", method: "demo", id: 3 },
				requestId: 3,
				isPending: true,
			}),
			// response for id:1
			msg({
				type: "received",
				method: "response",
				data: { jsonrpc: "2.0", result: { ok: true }, id: 1 },
				requestId: 1,
			}),
			// response for non-ping id:3
			msg({
				type: "received",
				method: "response",
				data: { jsonrpc: "2.0", result: { ok: true }, id: 3 },
				requestId: 3,
			}),
			// stray response id:999 (ignored)
			msg({
				type: "received",
				method: "response",
				data: { jsonrpc: "2.0", result: { ok: true }, id: 999 },
				requestId: 999,
			}),
		];

		const stats = computePingStats(messages);
		expect(stats.totalPings).toBe(2);
		expect(stats.matched).toBe(1);
		expect(stats.missing).toBe(1);
	});
});
