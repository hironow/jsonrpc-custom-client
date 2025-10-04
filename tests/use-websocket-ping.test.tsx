import { describe, it, expect, beforeEach, vi } from "vitest";
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

function PingHarness({ timer, wsFactory }: any) {
	const { status, connect, setDummyMode, sendPing } = useWebSocketClient({
		timer,
		wsFactory,
	});
	return (
		<div>
			<div data-testid="status">{status}</div>
			<button onClick={() => setDummyMode(false)}>noDummy</button>
			<button onClick={() => connect()}>connect</button>
			<button onClick={() => sendPing()}>ping</button>
		</div>
	);
}

describe("useWebSocketClient sendPing (JSONRPC method 'ping')", () => {
	beforeEach(() => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => "uuid-test";
	});

	it("sends a JSONRPC request with method 'ping' when connected", async () => {
		await withFakeTimers(async (timer) => {
			const sockets: FakeWS[] = [];
			const wsFactory = vi.fn(() => {
				const ws = makeWs();
				ws.send = vi.fn();
				sockets.push(ws);
				return ws as any;
			});

			render(<PingHarness timer={timer} wsFactory={wsFactory} />);

			await act(async () => {
				screen.getByText("noDummy").click();
				screen.getByText("connect").click();
			});

			// open connection
			await act(async () => {
				sockets[0].onopen && sockets[0].onopen();
			});

			expect(screen.getByTestId("status").textContent).toBe("connected");

			// send ping
			await act(async () => {
				screen.getByText("ping").click();
			});

			const sendMock = sockets[0].send as unknown as ReturnType<typeof vi.fn>;
			expect(sendMock).toHaveBeenCalledTimes(1);
			const payload = sendMock.mock.calls[0][0];
			const json = JSON.parse(payload);
			expect(json.jsonrpc).toBe("2.0");
			expect(json.method).toBe("ping");
			expect(typeof json.id).toBe("number");
		});
	});
});
