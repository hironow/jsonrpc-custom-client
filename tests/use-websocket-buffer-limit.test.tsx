import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";

// We import dynamically to ensure env/config don’t get cached between tests if needed
import { useWebSocketClient } from "@/hooks/use-websocket-client";

function LimitHarness({ timer }: { timer: any }) {
	const {
		messages,
		setDummyMode,
		sendMessage,
		clearMessages,
		messageBufferLimit,
		setMessageBufferLimit,
	} = useWebSocketClient({ timer });
	return (
		<div>
			<div data-testid="count">{messages.length}</div>
			<div data-testid="limit">{messageBufferLimit}</div>
			<button onClick={() => setDummyMode(true)}>dummy</button>
			<button onClick={() => sendMessage("x", {})}>send</button>
			<button onClick={() => clearMessages()}>clear</button>
			<button onClick={() => setMessageBufferLimit(3)}>set3</button>
		</div>
	);
}

describe("useWebSocketClient message buffer limit (dynamic)", () => {
	it("trims existing messages when limit is reduced", async () => {
		if (!global.crypto) {
			// @ts-ignore
			global.crypto = {} as any;
		}
		// @ts-ignore
		global.crypto.randomUUID = () => Math.random().toString(36).slice(2);

		vi.useFakeTimers();
		const timer = {
			setTimeout: (fn: any, ms?: number) => setTimeout(fn, ms),
			clearTimeout: (id: any) => clearTimeout(id),
			setInterval: (fn: any, ms?: number) => setInterval(fn, ms),
			clearInterval: (id: any) => clearInterval(id),
			now: () => Date.now(),
		};

		render(<LimitHarness timer={timer} />);

		// enable dummy mode so sendMessage pushes immediately
		await act(async () => {
			screen.getByText("dummy").click();
		});

		// push 5 messages synchronously (dummy path adds immediately)
		await act(async () => {
			for (let i = 0; i < 5; i++) screen.getByText("send").click();
		});

		expect(screen.getByTestId("count").textContent).toBe("5");

		// reduce limit to 3 and expect trimming
		await act(async () => {
			screen.getByText("set3").click();
		});

		expect(screen.getByTestId("count").textContent).toBe("3");

		// cleanup
		await act(async () => {
			screen.getByText("clear").click();
		});
		expect(screen.getByTestId("count").textContent).toBe("0");

		vi.useRealTimers();
	});
});
