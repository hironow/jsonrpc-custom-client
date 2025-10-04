import { describe, it, expect } from "vitest";
import type { Message } from "@/types/message";
import {
	trimToLimitWithOptions,
	pushWithLimitWithOptions,
} from "@/lib/message-buffer";

const base = (overrides: Partial<Message> = {}): Message => ({
	id: Math.random().toString(36).slice(2),
	type: "system",
	timestamp: new Date(),
	data: {},
	...overrides,
});

describe("message buffer strategy options", () => {
	it("drops pending when preferPending=false", () => {
		const limit = 2;
		const p1 = base({ id: "p1", isPending: true });
		const n1 = base({ id: "n1" });
		const n2 = base({ id: "n2" });
		const trimmed = trimToLimitWithOptions([p1, n1, n2], limit, {
			preferPending: false,
		});
		expect(trimmed.map((m) => m.id)).toEqual(["n1", "n2"]);
	});

	it("prefers keeping batch messages when preferBatches=true", () => {
		const limit = 2;
		const b = base({ id: "b", isBatch: true, batchSize: 3 });
		const n1 = base({ id: "n1" });
		const n2 = base({ id: "n2" });
		const trimmed = trimToLimitWithOptions([b, n1, n2], limit, {
			preferBatches: true,
		});
		// should drop n1 first, keeping batch b and newest n2
		expect(trimmed.map((m) => m.id)).toEqual(["b", "n2"]);
	});

	it("forced drop respects chunk size without violating limit", () => {
		const limit = 2;
		const messages = [
			base({ id: "p1", isPending: true }),
			base({ id: "p2", isPending: true }),
			base({ id: "b1", isBatch: true, batchSize: 10 }),
			base({ id: "x1" }),
			base({ id: "x2" }),
			base({ id: "x3" }),
		];
		// prefer both pending and batches; overflow will be resolved by forced drops in chunk size 3
		const trimmed = trimToLimitWithOptions(messages, limit, {
			preferPending: true,
			preferBatches: true,
			dropChunkSize: 3,
		});
		expect(trimmed.length).toBe(2);
		// Forced drop removes from the very front among preferred when necessary
		expect(trimmed.map((m) => m.id)).toEqual(["p2", "b1"]);
	});

	it("pushWithLimitWithOptions applies same policy when adding", () => {
		const limit = 3;
		let arr: Message[] = [];
		arr = pushWithLimitWithOptions(
			arr,
			base({ id: "b", isBatch: true }),
			limit,
			{ preferBatches: true },
		);
		arr = pushWithLimitWithOptions(arr, base({ id: "n1" }), limit, {
			preferBatches: true,
		});
		arr = pushWithLimitWithOptions(arr, base({ id: "n2" }), limit, {
			preferBatches: true,
		});
		arr = pushWithLimitWithOptions(arr, base({ id: "n3" }), limit, {
			preferBatches: true,
		});
		// should drop n1 to keep batch 'b' and latest n2,n3
		expect(arr.map((m) => m.id)).toEqual(["b", "n2", "n3"]);
	});
});
