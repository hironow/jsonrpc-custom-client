import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Message } from "@/types/message";

// Mock export module to capture which messages are serialized
const serializeSpy = vi.fn((msgs: Message[]) => "serialized-json");
vi.mock("@/lib/export", async () => {
	const mod = await vi.importActual<any>("@/lib/export");
	return {
		...mod,
		serializeMessages: (msgs: Message[]) => serializeSpy(msgs),
	};
});

import { MessageList } from "@/components/message-list";

function makeMsg(over: Partial<Message>): Message {
	return {
		id: (over.id as string) || Math.random().toString(36).slice(2),
		type: over.type || "received",
		timestamp: over.timestamp || new Date("2020-01-01T00:00:00.000Z"),
		data:
			over.data !== undefined
				? over.data
				: { jsonrpc: "2.0", method: "user.get", params: {}, id: 1 },
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

describe("Message export honors filtered view and safe filename", () => {
	const origCreate = document.createElement;
	const origURL = URL.createObjectURL;
	let anchor: any;

	beforeEach(() => {
		serializeSpy.mockClear();
		anchor = {
			href: "",
			download: "",
			click: vi.fn(),
		};
		vi.spyOn(document, "createElement").mockImplementation((tag: any) => {
			if (tag === "a") return anchor as any;
			return origCreate.call(document, tag);
		});
		// Polyfill if missing in JSDOM and stub
		// @ts-ignore
		if (!URL.createObjectURL) {
			// @ts-ignore
			URL.createObjectURL = () => "blob:mock";
		}
		// @ts-ignore
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock");
		// @ts-ignore
		if (!URL.revokeObjectURL) {
			// @ts-ignore
			URL.revokeObjectURL = () => {};
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("exports only filtered messages and includes method in filename", () => {
		const messages: Message[] = [
			makeMsg({
				id: "m1",
				data: { jsonrpc: "2.0", method: "user.get", id: 1 },
			}),
			makeMsg({
				id: "m2",
				data: { jsonrpc: "2.0", method: "order.list", id: 2 },
			}),
			makeMsg({
				id: "m3",
				data: { jsonrpc: "2.0", result: { ok: true }, id: 1 },
			}),
		];

		render(
			<MessageList
				messages={messages}
				autoScroll={false}
				selectedMessageId={null}
				onAutoScrollChange={() => {}}
				onClear={() => {}}
				onSelectMessage={() => {}}
				rowHeightMode="fixed"
				quickFilter={{ method: "user" }}
			/>,
		);

		// Click Export
		fireEvent.click(screen.getByRole("button", { name: "Export" }));

		// serializeMessages should be called with filtered set (only method contains 'user')
		expect(serializeSpy).toHaveBeenCalledTimes(1);
		const passed = serializeSpy.mock.calls[0][0] as Message[];
		expect(Array.isArray(passed)).toBe(true);
		expect(passed.length).toBe(1);
		expect((passed[0].data as any).method).toContain("user");

		// filename should include method segment and be .json
		expect(anchor.download).toMatch(/method-user/i);
		expect(anchor.download).toMatch(/\.json$/);
	});
});
