import { expect, test } from "bun:test";
import React from "react";
import { JSDOM } from "jsdom";
import { render, renderHook, waitFor, cleanup } from "@testing-library/react";
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

test("clock advances while mounted", async () => {
	const { result } = renderHook(() => useClock(10));
	const initial = result.current;
	await waitFor(() => expect(result.current).toBeGreaterThan(initial));
	cleanup();
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
	cleanup();
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
	cleanup();
});
