import { describe, it, expect, vi, beforeEach } from "vitest";
import { withFakeTimers } from "./utils/timers";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useWebSocketClient } from "@/hooks/use-websocket-client";

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

function ReconnectProbe({ timer, wsFactory }: any) {
	const { status, connect, setDummyMode } = useWebSocketClient({
		timer,
		wsFactory,
	});
});
	return (
		<div>
			<div data-testid="status">{status}</div>
			<button onClick={() => setDummyMode(false)}>noDummy</button>
			<button onClick={() => connect()}>connect</button>
		</div>
	);
}

describe("useWebSocketClient auto-reconnect (unit)", () => {
	beforeEach(() => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";
	});

	it("reconnects with backoff after close until open succeeds", async () => {
		await withFakeTimers(async (timer) => {

		const sockets: FakeWS[] = [];
		const wsFactory = vi.fn(() => {
			const ws = makeWs();
			sockets.push(ws);
			return ws as any;
		});

			render(<ReconnectProbe timer={timer} wsFactory={wsFactory} />);

		await act(async () => {
			screen.getByText("noDummy").click();
			screen.getByText("connect").click();
		});

		// First created socket should open later on
		expect(wsFactory).toHaveBeenCalledTimes(1);

		// Simulate immediate close; hook should schedule a reconnect
		await act(async () => {
			sockets[0].onclose && sockets[0].onclose();
		});

		// advance enough for first backoff (~500ms base)
			await act(async () => {
				vi.advanceTimersByTime(600);
			});
		expect(wsFactory).toHaveBeenCalledTimes(2);

		// Simulate second socket success
		await act(async () => {
			sockets[1].onopen && sockets[1].onopen();
		});

			expect(screen.getByTestId("status").textContent).toBe("connected");
		});
	});
