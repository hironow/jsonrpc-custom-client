import { describe, it, expect, beforeEach } from "vitest";
import type { Message } from "@/types/message";
import {
	processIncomingMessage,
	type PendingRequest,
} from "@/lib/ws-message-processor";

type Added = { msg: Omit<Message, "id" | "timestamp">; id?: string };

describe("processIncomingMessage", () => {
	let messages: Message[];
	let added: Added[];
	let pendingRequests: Map<number, PendingRequest>;
	let pendingBatches: Map<string, { timestamp: number; requestIds: number[] }>;

	const addMessage = (msg: Omit<Message, "id" | "timestamp">, id?: string) => {
		// Mirror hook behavior minimally: push the object for assertions
		added.push({ msg, id });
		// Simulate messages array growth for tests that rely on setMessages side-effects
		const m: Message = {
			...(msg as any),
			id: id ?? "gen-" + (messages.length + 1),
			timestamp: new Date(),
		};
		messages.push(m);
	};

	const setMessages = (updater: (prev: Message[]) => Message[]) => {
		messages = updater(messages);
	};

	beforeEach(() => {
		messages = [];
		added = [];
		pendingRequests = new Map();
		pendingBatches = new Map();
	});

	it("marks notification (no id, has method)", () => {
		const data = {
			jsonrpc: "2.0",
			method: "stream.heartbeat",
			params: { t: 1 },
		};
		processIncomingMessage(data, {
			now: 1000,
			uuid: () => "uuid-1",
			addMessage,
			setMessages,
			pendingRequests,
			pendingBatches,
		});

		expect(added.length).toBe(1);
		const m = added[0].msg as any;
		expect(m.type).toBe("received");
		expect(m.method).toBe("stream.heartbeat");
		expect(m.isNotification).toBe(true);
		expect(m.data).toEqual(data);
	});

	it("links pending single response and clears pendingRequests", () => {
		// Seed a pending sent message in the list
		messages.push({
			id: "sent-1",
			type: "sent",
			timestamp: new Date(0),
			data: { jsonrpc: "2.0", method: "ping", params: {}, id: 1 },
			isPending: true,
		} as Message);
		pendingRequests.set(1, { timestamp: 900, messageId: "sent-1" });

		const data = { jsonrpc: "2.0", result: { ok: true }, id: 1 };
		processIncomingMessage(data, {
			now: 1000,
			uuid: () => "uuid-2",
			addMessage,
			setMessages,
			pendingRequests,
			pendingBatches,
		});

		// Added a received response
		expect(added.length).toBe(1);
		const m = added[0].msg as any;
		expect(m.type).toBe("received");
		expect(m.method).toBe("response");
		expect(m.requestId).toBe(1);
		expect(m.responseTime).toBe(100);
		// Pending cleared and message flagged as not pending
		expect(pendingRequests.has(1)).toBe(false);
		const updated = messages.find((x) => x.id === "sent-1")!;
		expect(updated.isPending).toBe(false);
	});

	it("handles batch response and links to batch request", () => {
		// Seed a pending batch request
		messages.push({
			id: "batch-1",
			type: "sent",
			timestamp: new Date(0),
			data: [
				{ jsonrpc: "2.0", method: "a", params: {}, id: 1 },
				{ jsonrpc: "2.0", method: "b", params: {}, id: 2 },
			],
			method: "batch.request",
			isBatch: true,
			batchSize: 2,
			isPending: true,
		} as any);
		pendingBatches.set("batch-1", { timestamp: 500, requestIds: [1, 2] });

		const batch = [
			{ jsonrpc: "2.0", id: 1, result: { ok: true } },
			{ jsonrpc: "2.0", id: 2, result: { ok: true } },
		];
		processIncomingMessage(batch, {
			now: 1500,
			uuid: () => "resp-1",
			addMessage,
			setMessages,
			pendingRequests,
			pendingBatches,
		});

		// One added message describing the batch response
		expect(added.length).toBe(1);
		const m = added[0].msg as any;
		expect(m.type).toBe("received");
		expect(m.method).toBe("batch.response");
		expect(m.isBatch).toBe(true);
		expect(m.batchSize).toBe(2);
		expect(m.responseTime).toBe(1000);
		expect(m.linkedMessageId).toBe("batch-1");
		// Pending batch cleared and request updated (isPending false and linked id set)
		expect(pendingBatches.has("batch-1")).toBe(false);
		const updated = messages.find((x) => x.id === "batch-1")!;
		expect(updated.isPending).toBe(false);
		expect(updated.linkedMessageId).toBe("resp-1");
	});

	it("handles batch notifications (array of items without id, with method)", () => {
		const batch = [
			{ jsonrpc: "2.0", method: "stream.a", params: { t: 1 } },
			{ jsonrpc: "2.0", method: "stream.b", params: { t: 2 } },
		];
		processIncomingMessage(batch, {
			now: 0,
			uuid: () => "uuid-n",
			addMessage,
			setMessages,
			pendingRequests,
			pendingBatches,
		});

		expect(added.length).toBe(1);
		const m = added[0].msg as any;
		expect(m.type).toBe("received");
		expect(m.method).toBe("batch.notification");
		expect(m.isBatch).toBe(true);
		expect(m.isNotification).toBe(true);
		expect(m.batchSize).toBe(2);
	});

	it("labels error without id as response (not notification)", () => {
		const data = { jsonrpc: "2.0", error: { code: -32000, message: "oops" } };
		processIncomingMessage(data, {
			now: 42,
			uuid: () => "uuid-err",
			addMessage,
			setMessages,
			pendingRequests,
			pendingBatches,
		});
		expect(added.length).toBe(1);
		const m = added[0].msg as any;
		expect(m.method).toBe("response");
		expect(m.isNotification).toBeFalsy();
	});
});
