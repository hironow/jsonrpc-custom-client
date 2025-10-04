import { describe, it, expect } from "vitest";
import type { Message } from "@/types/message";
import {
	matchesQuickFilter,
	filterMessagesByQuickFilter,
} from "@/lib/message-search";

function msg(over: Partial<Message>): Message {
	return {
		id: (over.id as string) || "m",
		type: over.type || "received",
		timestamp: over.timestamp || new Date("2020-01-01T00:00:00.000Z"),
		data:
			over.data !== undefined
				? over.data
				: { jsonrpc: "2.0", method: "x.echo", params: {}, id: 1 },
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
	};
}

describe("message quick filter", () => {
	it("matches by method (contains, case-insensitive)", () => {
		const a = msg({ method: "user.get" });
		const b = msg({ data: { jsonrpc: "2.0", method: "order.list", id: 2 } });
		expect(matchesQuickFilter(a, { method: "USER" })).toBe(true);
		expect(matchesQuickFilter(b, { method: "user" })).toBe(false);
		expect(matchesQuickFilter(b, { method: "order.li" })).toBe(true);
	});

	it("matches by id across single and batch", () => {
		const a = msg({ data: { jsonrpc: "2.0", method: "x", id: 10 } });
		const b = msg({
			isBatch: true,
			data: [
				{ jsonrpc: "2.0", method: "a", id: 5 },
				{ jsonrpc: "2.0", method: "b", id: 6 },
			],
			batchSize: 2,
		});
		const c = msg({ method: "y", requestId: 42 });
		expect(matchesQuickFilter(a, { id: 10 })).toBe(true);
		expect(matchesQuickFilter(a, { id: "10" })).toBe(true);
		expect(matchesQuickFilter(b, { id: 6 })).toBe(true);
		expect(matchesQuickFilter(b, { id: 7 })).toBe(false);
		expect(matchesQuickFilter(c, { id: 42 })).toBe(true);
	});

	it("matches by text in payload (substring, case-insensitive)", () => {
		const a = msg({
			data: {
				jsonrpc: "2.0",
				method: "item.search",
				params: { q: "Hello World" },
				id: 1,
			},
		});
		expect(matchesQuickFilter(a, { text: "hello" })).toBe(true);
		expect(matchesQuickFilter(a, { text: "WORLD" })).toBe(true);
		expect(matchesQuickFilter(a, { text: "missing" })).toBe(false);
	});

	it("filters an array with combined filters", () => {
		const list: Message[] = [
			msg({
				method: "user.get",
				data: { jsonrpc: "2.0", method: "user.get", id: 1 },
			}),
			msg({
				method: "order.list",
				data: { jsonrpc: "2.0", method: "order.list", id: 2 },
			}),
			msg({
				isBatch: true,
				data: [
					{ jsonrpc: "2.0", method: "x", id: 3 },
					{ jsonrpc: "2.0", method: "y", id: 4 },
				],
				batchSize: 2,
			}),
		];
		const out = filterMessagesByQuickFilter(list, { method: "order", id: 2 });
		expect(out.length).toBe(1);
		expect((out[0].data as any).id).toBe(2);
	});
});
