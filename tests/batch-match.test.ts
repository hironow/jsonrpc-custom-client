import { describe, it, expect } from "vitest";
import { matchBatchResponse } from "@/lib/batch-match";

describe("matchBatchResponse", () => {
	it("matches batch by any or all request ids and computes responseTime", () => {
		const now = 1000;
		const pending = new Map<
			string,
			{ timestamp: number; requestIds: number[] }
		>([
			["A", { timestamp: 100, requestIds: [1, 2] }],
			["B", { timestamp: 200, requestIds: [3, 4] }],
		]);

		// partial overlap (any)
		const p1 = matchBatchResponse(pending, [2], now, { mode: "any" });
		expect(p1.linkedBatchId).toBe("A");
		expect(p1.responseTime).toBe(900);

		// full overlap (all)
		const p2 = matchBatchResponse(pending, [3, 4], now, { mode: "all" });
		expect(p2.linkedBatchId).toBe("B");
		expect(p2.responseTime).toBe(800);
	});

	it("does not match in all-mode when only partial ids overlap", () => {
		const now = 500;
		const pending = new Map<
			string,
			{ timestamp: number; requestIds: number[] }
		>([["A", { timestamp: 100, requestIds: [10, 11] }]]);
		const res = matchBatchResponse(pending, [10], now, { mode: "all" });
		expect(res.linkedBatchId).toBeUndefined();
	});
});
