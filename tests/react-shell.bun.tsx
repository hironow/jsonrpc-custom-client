import { afterEach, expect, test } from "bun:test";
import React from "react";
import { JSDOM } from "jsdom";
import {
	fireEvent,
	render,
	renderHook,
	waitFor,
	cleanup,
} from "@testing-library/react";
import { useMessageRows } from "../hooks/use-message-rows";
import { useClock } from "../hooks/use-clock";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	navigator: dom.window.navigator,
	HTMLElement: dom.window.HTMLElement,
	IS_REACT_ACT_ENVIRONMENT: true,
});

const geometry = Object.getOwnPropertyDescriptors(
	dom.window.HTMLElement.prototype,
);
afterEach(() => {
	cleanup();
	Object.defineProperty(
		dom.window.HTMLElement.prototype,
		"offsetHeight",
		geometry.offsetHeight,
	);
	Object.defineProperty(
		dom.window.HTMLElement.prototype,
		"offsetWidth",
		geometry.offsetWidth,
	);
	if (geometry.scrollTo)
		Object.defineProperty(
			dom.window.HTMLElement.prototype,
			"scrollTo",
			geometry.scrollTo,
		);
	else Reflect.deleteProperty(dom.window.HTMLElement.prototype, "scrollTo");
});

test("clock advances while mounted", async () => {
	const { result } = renderHook(() => useClock(10));
	const initial = result.current;
	await waitFor(() => expect(result.current).toBeGreaterThan(initial));
});

test("virtual row snapshot follows changes in message count", () => {
	const { result, rerender } = renderHook(
		({ count }) =>
			useMessageRows({
				count,
				getScrollElement: () => null,
				estimateSize: () => 88,
			}),
		{ initialProps: { count: 3 } },
	);
	expect(result.current.totalSize).toBe(264);
	rerender({ count: 1 });
	expect(result.current.totalSize).toBe(88);
});

test("an initially connected panel starts collapsed", async () => {
	const { ConnectionPanel } = await import("../components/connection-panel");
	const view = render(
		React.createElement(ConnectionPanel, {
			url: "ws://localhost:9999/ws",
			status: "connected",
			dummyMode: false,
			onUrlChange: () => {},
			onConnect: () => {},
			onDisconnect: () => {},
			onDummyModeChange: () => {},
		}),
	);
	expect(
		view.getByRole("button", { name: "Expand Connection Panel" }),
	).toBeTruthy();
});

test("filtering visible virtual rows keeps the message list mounted", async () => {
	const { MessageList } = await import("../components/message-list");
	const { TooltipProvider } = await import("../components/ui/tooltip");
	// JSDOM has no layout engine; supply its external geometry in this unit test.
	Object.defineProperty(dom.window.HTMLElement.prototype, "offsetHeight", {
		configurable: true,
		get: () => 400,
	});
	Object.defineProperty(dom.window.HTMLElement.prototype, "offsetWidth", {
		configurable: true,
		get: () => 600,
	});
	dom.window.HTMLElement.prototype.scrollTo = function (
		options?: ScrollToOptions | number,
		y?: number,
	) {
		this.scrollTop =
			typeof options === "object" ? (options.top ?? 0) : (y ?? 0);
	};
	const messages = ["user.get", "order.list"].map((method, index) => ({
		id: String(index),
		type: "received" as const,
		timestamp: new Date("2026-10-11T00:00:00Z"),
		data: { jsonrpc: "2.0", method, id: index },
		method,
	}));
	const view = render(
		<TooltipProvider>
			<MessageList
				messages={messages}
				autoScroll={false}
				selectedMessageId={null}
				onAutoScrollChange={() => {}}
				onClear={() => {}}
				onSelectMessage={() => {}}
				rowHeightMode="fixed"
			/>
		</TooltipProvider>,
	);
	fireEvent.click(view.getByRole("button", { name: "Method:user" }));
	expect(view.getByRole("tab", { name: /^All/ }).textContent).toMatch(
		/All\s*1/,
	);
	cleanup();
});
