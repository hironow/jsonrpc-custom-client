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
		readyState: 1, // OPEN
		send: () => {},
		close: () => {},
	};
}

function FastPingHarness({ timer, wsFactory }: any) {
	const { status, connect, setDummyMode, fastPingEnabled, setFastPingEnabled } =
		useWebSocketClient({ timer, wsFactory });
	return (
		<div>
			<div data-testid="status">{status}</div>
			<div data-testid="ping">{fastPingEnabled ? "on" : "off"}</div>
			<button onClick={() => setDummyMode(false)}>noDummy</button>
			<button onClick={() => connect()}>connect</button>
			<button onClick={() => setFastPingEnabled(true)}>pingOn</button>
			<button onClick={() => setFastPingEnabled(false)}>pingOff</button>
		</div>
	);
}

describe("useWebSocketClient fast ping toggle", () => {
	beforeEach(() => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";
	});

	it("sends ping every 100ms when enabled and stops when disabled", async () => {
		await withFakeTimers(async (timer) => {
			const sockets: FakeWS[] = [];
			const wsFactory = vi.fn(() => {
				const ws = makeWs();
				// spy on send
				ws.send = vi.fn();
				sockets.push(ws);
				return ws as any;
			});

			render(<FastPingHarness timer={timer} wsFactory={wsFactory} />);

			await act(async () => {
				screen.getByText("noDummy").click();
				screen.getByText("connect").click();
			});

			expect(wsFactory).toHaveBeenCalledTimes(1);

			// simulate open to reach connected state
			await act(async () => {
				sockets[0].onopen && sockets[0].onopen();
			});

			expect(screen.getByTestId("status").textContent).toBe("connected");
			expect(screen.getByTestId("ping").textContent).toBe("off");

			// enable fast ping
			await act(async () => {
				screen.getByText("pingOn").click();
			});

			// advance 350ms => expect ~3 sends
			await act(async () => {
				vi.advanceTimersByTime(350);
			});

			const sendMock = sockets[0].send as unknown as ReturnType<typeof vi.fn>;
			expect(sendMock.mock.calls.length).toBeGreaterThanOrEqual(3);
			const countAfterOn = sendMock.mock.calls.length;

			// turn off and ensure it stops increasing
			await act(async () => {
				screen.getByText("pingOff").click();
			});

			await act(async () => {
				vi.advanceTimersByTime(300);
			});

			expect(sendMock.mock.calls.length).toBe(countAfterOn);
		});
	});
});
