import { describe, it, expect } from "vitest";
import { serializeMessages, deserializeMessages } from "@/lib/export";
import type { Message } from "@/types/message";

const makeMsg = (over: Partial<Message>): Message => ({
	id: over.id || "1",
	type: over.type || "system",
	timestamp: over.timestamp || new Date("2020-01-01T00:00:00.000Z"),
	data: over.data !== undefined ? over.data : { hello: "world" },
	method: over.method,
	requestId: over.requestId,
	responseTime: over.responseTime,
	isPending: over.isPending,
	isNotification: over.isNotification,
	isBatch: over.isBatch,
	batchSize: over.batchSize,
	linkedMessageId: over.linkedMessageId,
	validationErrors: over.validationErrors,
	validationWarnings: over.validationWarnings,
});

describe("export JSON roundtrip", () => {
	it("serializes and deserializes messages preserving fields", () => {
		const msgs: Message[] = [
			makeMsg({ id: "a", type: "system", data: { note: "hi" } }),
			makeMsg({
				id: "b",
				type: "sent",
				method: "m1",
				data: { jsonrpc: "2.0", method: "m1", params: { x: 1 }, id: 1 },
			}),
			makeMsg({
				id: "c",
				type: "received",
				data: { jsonrpc: "2.0", result: { ok: true }, id: 1 },
				responseTime: 123,
			}),
			makeMsg({ id: "d", type: "error", data: { message: "oops" } }),
		];

		const json = serializeMessages(msgs);
		expect(typeof json).toBe("string");
		expect(json).toContain('"a"');

		const round = deserializeMessages(json);
		expect(round.length).toBe(4);
		expect(round[0].id).toBe("a");
		expect(round[1].method).toBe("m1");
		expect(round[2].responseTime).toBe(123);
		expect(round[0].timestamp instanceof Date).toBe(true);
		expect(round[0].timestamp.toISOString()).toBe("2020-01-01T00:00:00.000Z");
	});
});
