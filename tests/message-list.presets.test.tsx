import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Message } from "@/types/message";
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

function getAllTabText(): string {
	const allTab = screen.getByRole("tab", { name: /^All/ });
	return allTab.textContent || "";
}

describe("MessageList quick filter presets (UI)", () => {
	let messages: Message[];

	beforeEach(() => {
		// 1) sent request with method user.get and id:1
		const m1 = makeMsg({
			id: "m1",
			type: "sent",
			method: "user.get",
			data: { jsonrpc: "2.0", method: "user.get", params: {}, id: 1 },
		});
		// 2) received response to id:1
		const m2 = makeMsg({
			id: "m2",
			type: "received",
			data: { jsonrpc: "2.0", result: { ok: true }, id: 1 },
		});
		// 3) error response id:2
		const m3 = makeMsg({
			id: "m3",
			type: "received",
			data: {
				jsonrpc: "2.0",
				error: { code: -32601, message: "Method not found" },
				id: 2,
			},
		});
		// 4) another method
		const m4 = makeMsg({
			id: "m4",
			type: "received",
			data: { jsonrpc: "2.0", method: "order.list", params: {}, id: 3 },
		});
		messages = [m1, m2, m3, m4];
	});

	it("applies presets and updates totals (All count)", () => {
		render(
			<MessageList
				messages={messages}
				autoScroll={false}
				selectedMessageId={null}
				onAutoScrollChange={() => {}}
				onClear={() => {}}
				onSelectMessage={() => {}}
				rowHeightMode="fixed"
			/>,
		);

		// Initial totals (All) should reflect all messages
		expect(getAllTabText()).toMatch(/All\s*4/);

		// Click method preset (contains 'user')
		fireEvent.click(screen.getByRole("button", { name: /Method:user/ }));
		expect(getAllTabText()).toMatch(/All\s*1/);

		// Click ID preset (exact match on any id in payload)
		fireEvent.click(screen.getByRole("button", { name: /ID:1/ }));
		expect(getAllTabText()).toMatch(/All\s*2/);

		// Click Text preset (substring 'error' in payload JSON)
		fireEvent.click(screen.getByRole("button", { name: /Text:error/ }));
		expect(getAllTabText()).toMatch(/All\s*1/);

		// Clear preset restores totals
		fireEvent.click(screen.getByRole("button", { name: /Reset Preset/ }));
		expect(getAllTabText()).toMatch(/All\s*4/);
	});
});
