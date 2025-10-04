import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useWebSocketClient } from "@/hooks/use-websocket-client";
import { withFakeTimers } from "./utils/timers";

type FakeWS = {
	onopen: (() => void) | null;
	onmessage: ((ev: any) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
	readyState: number;
	send: (s: string) => void;
	close: () => void;
};

function makeWs(): FakeWS {
	return {
		onopen: null,
		onmessage: null,
		onerror: null,
		onclose: null,
		readyState: 1,
		send: () => {},
		close: () => {},
	};
}

function ReconnectProbe({ timer, wsFactory, reconnect }: any) {
	const { status, connect, setDummyMode, disconnect } = useWebSocketClient({
		timer,
		wsFactory,
		reconnect,
	});
	return (
		<div>
			<div data-testid="status">{status}</div>
			<button onClick={() => setDummyMode(false)}>noDummy</button>
			<button onClick={() => connect()}>connect</button>
			<button onClick={() => disconnect()}>disconnect</button>
		</div>
	);
}

describe("useWebSocketClient reconnect policy", () => {
	beforeEach(() => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";
	});

	it("applies jitter and max cap to backoff schedule", async () => {
		await withFakeTimers(async (timer) => {
			const sockets: FakeWS[] = [];
			const wsFactory = vi.fn(() => {
				const ws = makeWs();
				sockets.push(ws);
				return ws as any;
			});

			const jitter = vi.fn((delayMs: number) => delayMs + 100); // add +100ms
			const reconnect = { baseMs: 200, maxMs: 450, jitter };
			render(
				<ReconnectProbe
					timer={timer}
					wsFactory={wsFactory}
					reconnect={reconnect}
				/>,
			);

			await act(async () => {
				screen.getByText("noDummy").click();
				screen.getByText("connect").click();
			});

			// First close schedules attempt #0: base 200 -> jitter +100 => 300ms (below cap)
			await act(async () => {
				sockets[0].onclose && sockets[0].onclose();
			});

			await act(async () => {
				vi.advanceTimersByTime(299);
			});
			expect(wsFactory).toHaveBeenCalledTimes(1);

			await act(async () => {
				vi.advanceTimersByTime(1);
			});
			expect(wsFactory).toHaveBeenCalledTimes(2);

			// Second close schedules attempt #1: base 400 -> jitter +100 => 500ms -> cap to 450ms
			await act(async () => {
				sockets[1].onclose && sockets[1].onclose();
			});

			await act(async () => {
				vi.advanceTimersByTime(449);
			});
			expect(wsFactory).toHaveBeenCalledTimes(2);

			await act(async () => {
				vi.advanceTimersByTime(1);
			});
			expect(wsFactory).toHaveBeenCalledTimes(3);
		});
	});

	it("disconnect cancels any scheduled reconnect", async () => {
		await withFakeTimers(async (timer) => {
			const sockets: FakeWS[] = [];
			const wsFactory = vi.fn(() => {
				const ws = makeWs();
				sockets.push(ws);
				return ws as any;
			});

			const reconnect = { baseMs: 200, maxMs: 450 };
			render(
				<ReconnectProbe
					timer={timer}
					wsFactory={wsFactory}
					reconnect={reconnect}
				/>,
			);

			await act(async () => {
				screen.getByText("noDummy").click();
				screen.getByText("connect").click();
			});

			// Close to schedule a reconnect, then immediately disconnect
			await act(async () => {
				sockets[0].onclose && sockets[0].onclose();
			});

			await act(async () => {
				screen.getByText("disconnect").click();
			});

			// Advance well beyond any backoff, factory should not be called again
			await act(async () => {
				vi.advanceTimersByTime(2000);
			});
			expect(wsFactory).toHaveBeenCalledTimes(1);
		});
	});
});
