import { describe, it, expect } from "vitest";
import { validateJsonRpcMessage } from "@/lib/jsonrpc-validator";

describe("validateJsonRpcMessage - request", () => {
	it("accepts valid request with id, method, params", () => {
		const req = { jsonrpc: "2.0", method: "sum", params: [1, 2], id: 1 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
		expect(res.errors).toEqual([]);
	});

	it("accepts id as string or null", () => {
		const r1 = validateJsonRpcMessage(
			{ jsonrpc: "2.0", method: "m", id: "abc" },
			"request",
		);
		const r2 = validateJsonRpcMessage(
			{ jsonrpc: "2.0", method: "m", id: null },
			"request",
		);
		expect(r1.isValid).toBe(true);
		expect(r2.isValid).toBe(true);
	});

	it("accepts dotted method names and nested params", () => {
		const req = {
			jsonrpc: "2.0",
			method: "a.b.c",
			params: { a: { b: [1, { c: true }] } },
			id: 7,
		};
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
	});

	it("accepts id as float number", () => {
		const req = { jsonrpc: "2.0", method: "m", id: 3.14 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
	});

	it("accepts negative numeric id", () => {
		const req = { jsonrpc: "2.0", method: "m", id: -123 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
	});

	it("accepts very long string id", () => {
		const longId = "a".repeat(5000);
		const res = validateJsonRpcMessage(
			{ jsonrpc: "2.0", method: "m", id: longId },
			"request",
		);
		expect(res.isValid).toBe(true);
	});

	it("accepts empty string id", () => {
		const res = validateJsonRpcMessage(
			{ jsonrpc: "2.0", method: "m", id: "" },
			"request",
		);
		expect(res.isValid).toBe(true);
	});

	it("rejects id boolean", () => {
		const req: any = { jsonrpc: "2.0", method: "m", id: false };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(false);
	});

	it("allows extra fields in request", () => {
		const req: any = {
			jsonrpc: "2.0",
			method: "m",
			id: 1,
			extra: { foo: "bar" },
		};
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
	});

	it("notification warning is only for missing id, not id:null", () => {
		const withNull = validateJsonRpcMessage(
			{ jsonrpc: "2.0", method: "m", id: null },
			"request",
		);
		expect(withNull.warnings.length).toBe(0);

		const missing = validateJsonRpcMessage(
			{ jsonrpc: "2.0", method: "m" },
			"request",
		);
		expect(missing.warnings.length).toBeGreaterThan(0);
	});

	it("warns when notification (no id)", () => {
		const req = { jsonrpc: "2.0", method: "ping" };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
		expect(res.warnings.length).toBeGreaterThan(0);
	});

	it("rejects when missing method", () => {
		const req: any = { jsonrpc: "2.0", id: 1 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(false);
		expect(
			res.errors.some((e) => e.includes('Missing required "method"')),
		).toBe(true);
	});

	it("rejects when method is not string", () => {
		const req: any = { jsonrpc: "2.0", method: 42, id: 1 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(false);
	});

	it("rejects when params is neither array nor object", () => {
		const req: any = { jsonrpc: "2.0", method: "sum", params: "bad", id: 1 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(false);
	});

	it("rejects invalid jsonrpc value", () => {
		const req: any = { jsonrpc: "1.0", method: "sum", id: 1 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(false);
		expect(res.errors.some((e) => e.includes("jsonrpc"))).toBe(true);
	});
});

describe("validateJsonRpcMessage - response", () => {
	it("accepts valid result response", () => {
		const resp = { jsonrpc: "2.0", result: { ok: true }, id: 1 };
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(true);
	});

	it("rejects response without id", () => {
		const resp: any = { jsonrpc: "2.0", result: { ok: true } };
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(false);
		expect(res.errors.some((e) => e.includes('Missing required "id"'))).toBe(
			true,
		);
	});

	it("rejects response having both result and error", () => {
		const resp = {
			jsonrpc: "2.0",
			result: {},
			error: { code: -1, message: "x" },
			id: 1,
		} as any;
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(false);
	});

	it("rejects malformed error object", () => {
		const resp1 = {
			jsonrpc: "2.0",
			error: { code: "not-number", message: "x" },
			id: 1,
		} as any;
		const res1 = validateJsonRpcMessage(resp1, "response");
		expect(res1.isValid).toBe(false);

		const resp2 = {
			jsonrpc: "2.0",
			error: { code: -1, message: 42 },
			id: 1,
		} as any;
		const res2 = validateJsonRpcMessage(resp2, "response");
		expect(res2.isValid).toBe(false);
	});

	it("allows error.data of any type", () => {
		const resp = {
			jsonrpc: "2.0",
			error: { code: -1, message: "x", data: { any: ["thing"] } },
			id: 1,
		} as any;
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(true);
	});

	it("allows error.data of primitive types (string/number/boolean/null)", () => {
		const resStr = validateJsonRpcMessage(
			{ jsonrpc: "2.0", error: { code: 1, message: "m", data: "s" }, id: "a" },
			"response",
		);
		const resNum = validateJsonRpcMessage(
			{ jsonrpc: "2.0", error: { code: 1, message: "m", data: 42 }, id: "a" },
			"response",
		);
		const resBool = validateJsonRpcMessage(
			{
				jsonrpc: "2.0",
				error: { code: 1, message: "m", data: false },
				id: "a",
			},
			"response",
		);
		const resNull = validateJsonRpcMessage(
			{ jsonrpc: "2.0", error: { code: 1, message: "m", data: null }, id: "a" },
			"response",
		);
		expect(
			resStr.isValid && resNum.isValid && resBool.isValid && resNull.isValid,
		).toBe(true);
	});

	it("rejects non-integer error.code", () => {
		const resp = {
			jsonrpc: "2.0",
			error: { code: 1.5, message: "float not allowed" },
			id: 1,
		} as any;
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(false);
		expect(res.errors.some((e) => e.includes("error.code"))).toBe(true);
	});

	it("rejects response with neither result nor error", () => {
		const resp: any = { jsonrpc: "2.0", id: 1 };
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(false);
	});

	it("accepts response batch with mixed result and error items", () => {
		const batch = [
			{ jsonrpc: "2.0", result: { ok: true }, id: 1 },
			{ jsonrpc: "2.0", error: { code: -1, message: "oops" }, id: 2 },
		];
		const res = validateJsonRpcMessage(batch, "response");
		expect(res.isValid).toBe(true);
	});

	it("warns when error.code is in reserved server error range (-32099..-32000)", () => {
		const resp = {
			jsonrpc: "2.0",
			error: { code: -32010, message: "impl-defined" },
			id: 1,
		} as any;
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(true);
		expect(res.warnings.some((w) => w.toLowerCase().includes("reserved"))).toBe(
			true,
		);
	});

	it("warns when error.code is reserved pre-defined code (e.g., -32601) regardless of message", () => {
		const resp = {
			jsonrpc: "2.0",
			error: { code: -32601, message: "custom text" },
			id: 1,
		} as any;
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(true);
		expect(res.warnings.some((w) => w.toLowerCase().includes("reserved"))).toBe(
			true,
		);
	});

	it("rejects invalid jsonrpc in response", () => {
		const resp: any = { jsonrpc: "1.0", result: {}, id: 1 };
		const res = validateJsonRpcMessage(resp, "response");
		expect(res.isValid).toBe(false);
	});
});

describe("validateJsonRpcMessage - batch", () => {
	it("aggregates errors across batch items", () => {
		const batch = [
			{ jsonrpc: "2.0", method: "ok", id: 1 },
			{ jsonrpc: "2.0", result: {}, id: 1 },
			{ jsonrpc: "2.0", error: { code: -1, message: "x" }, id: 2 },
		];
		const res = validateJsonRpcMessage(batch, "request");
		// Second item is a response-like shape when validating as request, should error
		expect(res.isValid).toBe(false);
		expect(res.errors.length).toBeGreaterThan(0);
	});

	it("allows mixed notifications and requests in batch (valid overall)", () => {
		const batch = [
			{ jsonrpc: "2.0", method: "note" },
			{ jsonrpc: "2.0", method: "run", params: [], id: "x" },
			{ jsonrpc: "2.0", method: "sum", params: { a: 1, b: 2 }, id: 99 },
		];
		const res = validateJsonRpcMessage(batch, "request");
		expect(res.isValid).toBe(true);
		// At least one warning for the notification
		expect(res.warnings.length).toBeGreaterThan(0);
	});

	it("batch allows duplicate ids (spec permits) but validates shapes", () => {
		const batch = [
			{ jsonrpc: "2.0", method: "m", id: 1 },
			{ jsonrpc: "2.0", method: "n", id: 1 },
		];
		const res = validateJsonRpcMessage(batch, "request");
		expect(res.isValid).toBe(true);
	});

	it("batch aggregates item errors with index contexts", () => {
		const batch: any[] = [
			{ jsonrpc: "2.0", method: "m", id: 1 },
			{ jsonrpc: "2.0", method: "bad", params: "not-object-nor-array", id: 2 },
		];
		const res = validateJsonRpcMessage(batch, "request");
		expect(res.isValid).toBe(false);
		// Ensure it annotates with item index
		expect(res.errors.some((e) => e.startsWith("[Item 1]"))).toBe(true);
	});

	it("batch with invalid jsonrpc on some items reports indexed errors", () => {
		const batch: any[] = [
			{ jsonrpc: "1.0", method: "m", id: 1 },
			{ jsonrpc: "2.0", method: "n", id: 2 },
		];
		const res = validateJsonRpcMessage(batch, "request");
		expect(res.isValid).toBe(false);
		expect(res.errors.some((e) => e.startsWith("[Item 0]"))).toBe(true);
	});

	it("deeply nested params allowed in batch", () => {
		const batch = [
			{
				jsonrpc: "2.0",
				method: "calc",
				params: { x: [1, { y: { z: [true, null, { a: "b" }] } }] },
				id: "deep",
			},
		];
		const res = validateJsonRpcMessage(batch, "request");
		expect(res.isValid).toBe(true);
	});

	it("accepts very large params array", () => {
		const params = Array.from({ length: 2000 }, (_, i) => i);
		const req = { jsonrpc: "2.0", method: "bulk", params, id: 1 };
		const res = validateJsonRpcMessage(req, "request");
		expect(res.isValid).toBe(true);
	});

	it("rejects empty batch", () => {
		const res = validateJsonRpcMessage([], "request");
		expect(res.isValid).toBe(false);
	});

	it("collects warnings for notifications in batch", () => {
		const batch = [
			{ jsonrpc: "2.0", method: "note" },
			{ jsonrpc: "2.0", method: "sum", id: 1 },
		];
		const res = validateJsonRpcMessage(batch, "request");
		expect(res.isValid).toBe(true);
		expect(res.warnings.length).toBeGreaterThan(0);
	});
});
