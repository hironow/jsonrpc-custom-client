import { describe, it, expect } from "vitest";
import type { Message } from "@/types/message";
import { estimateMessageHeight, estimateRowSize } from "@/lib/virtual-estimate";

const baseMessage = (overrides: Partial<Message> = {}): Message => ({
	id: "m",
	type: "received",
	timestamp: new Date(),
	data: { ok: true },
	...overrides,
});

describe("estimateMessageHeight", () => {
	it("returns base height for simple message", () => {
		const m = baseMessage();
		expect(estimateMessageHeight(m)).toBe(88);
	});

	it("increases for long payloads", () => {
		const long = "x".repeat(1200);
		const m = baseMessage({ data: { s: long } });
		const h = estimateMessageHeight(m);
		expect(h).toBeGreaterThan(88);
	});

	it("caps payload-based height increase at +160px", () => {
		const veryLong = "x".repeat(20000);
		const m = baseMessage({ data: { s: veryLong } });
		const h = estimateMessageHeight(m);
		// base 88 + max 160 = 248
		expect(h).toBe(88 + 160);
	});

	it("increments batch height per 5 items beyond 5", () => {
		const m10 = baseMessage({ isBatch: true, batchSize: 10 });
		const m11 = baseMessage({ isBatch: true, batchSize: 11 });
		const h10 = estimateMessageHeight(m10);
		const h11 = estimateMessageHeight(m11);
		expect(h10).toBeGreaterThan(88);
		expect(h11).toBe(h10); // same group
		const m15 = baseMessage({ isBatch: true, batchSize: 15 });
		const h15 = estimateMessageHeight(m15);
		expect(h15).toBeGreaterThan(h11);
	});

	it("increases for large batches", () => {
		const m = baseMessage({ isBatch: true, batchSize: 17 });
		const h = estimateMessageHeight(m);
		expect(h).toBeGreaterThan(88);
	});

	it("accounts for validation issues", () => {
		const m = baseMessage({
			validationErrors: ["e1"],
			validationWarnings: ["w1"],
		});
		const h = estimateMessageHeight(m);
		expect(h).toBeGreaterThan(88);
	});
});

describe("estimateRowSize", () => {
	it("estimates header size as 28", () => {
		const size = estimateRowSize({
			type: "header",
			range: "0-1s",
			elapsedMs: 0,
		} as any);
		expect(size).toBe(28);
	});

	it("estimates message rows using message estimator", () => {
		const m = baseMessage();
		const size = estimateRowSize({ type: "message", message: m } as any);
		expect(size).toBe(88);
	});
});
