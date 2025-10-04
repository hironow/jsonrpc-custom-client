import { describe, it, expect } from "vitest";
import { pushWithLimit } from "@/lib/message-buffer";
// Will be added TDD-style
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { trimToLimit } from "@/lib/message-buffer";
import type { Message } from "@/types/message";

const base = (): Message => ({
	id: Math.random().toString(36).slice(2),
	type: "system",
	timestamp: new Date(),
	data: {},
});

describe("pushWithLimit", () => {
	it("trims from the front when exceeding limit", () => {
		const limit = 3;
		let arr: Message[] = [];
		arr = pushWithLimit(arr, { ...base(), id: "a" }, limit);
		arr = pushWithLimit(arr, { ...base(), id: "b" }, limit);
		arr = pushWithLimit(arr, { ...base(), id: "c" }, limit);
		arr = pushWithLimit(arr, { ...base(), id: "d" }, limit);
		expect(arr.map((m) => m.id)).toEqual(["b", "c", "d"]);
	});

	it("prefers keeping pending messages when trimming", () => {
		const limit = 2;
		const p1: Message = { ...base(), id: "p1", isPending: true };
		const n1: Message = { ...base(), id: "n1" };
		const n2: Message = { ...base(), id: "n2" };
		let arr = pushWithLimit([], p1, limit);
		arr = pushWithLimit(arr, n1, limit);
		arr = pushWithLimit(arr, n2, limit);
		// Should keep pending (p1) and the newest (n2), dropping n1
		expect(arr.map((m) => m.id)).toEqual(["p1", "n2"]);
	});
});

describe("trimToLimit", () => {
	it("trims array to the limit from the front", () => {
		const limit = 2;
		const a: Message = { ...base(), id: "a" };
		const b: Message = { ...base(), id: "b" };
		const c: Message = { ...base(), id: "c" };
		const arr = [a, b, c];
		const trimmed = trimToLimit(arr, limit);
		expect(trimmed.map((m) => m.id)).toEqual(["b", "c"]);
	});

	it("prefers keeping pending messages when trimming existing array", () => {
		const limit = 2;
		const p1: Message = { ...base(), id: "p1", isPending: true };
		const n1: Message = { ...base(), id: "n1" };
		const n2: Message = { ...base(), id: "n2" };
		const arr = [p1, n1, n2];
		const trimmed = trimToLimit(arr, limit);
		expect(trimmed.map((m) => m.id)).toEqual(["p1", "n2"]);
	});
});
