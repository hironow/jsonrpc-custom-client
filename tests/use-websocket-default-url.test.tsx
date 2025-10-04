import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { useWebSocketClient } from "@/hooks/use-websocket-client";

function UrlProbe() {
	const { url } = useWebSocketClient();
	return <div data-testid="ws-url">{url}</div>;
}

const DEFAULT_FALLBACK = "ws://localhost:8080";

describe("useWebSocketClient default URL from env", () => {
	const envBackup = { ...process.env };

	beforeEach(() => {
		// Ensure clean JSDOM + env for each case
		for (const k in process.env) {
			if (k.startsWith("NEXT_PUBLIC_WS_URL_DEFAULT"))
				delete (process.env as any)[k];
		}
	});

	afterEach(() => {
		process.env = { ...envBackup };
	});

	it("reads NEXT_PUBLIC_WS_URL_DEFAULT when present", () => {
		process.env.NEXT_PUBLIC_WS_URL_DEFAULT = "ws://env.example:9001";
		render(<UrlProbe />);
		expect(screen.getByTestId("ws-url").textContent).toBe(
			"ws://env.example:9001",
		);
	});

	it("falls back to ws://localhost:8080 when env missing", () => {
		render(<UrlProbe />);
		expect(screen.getByTestId("ws-url").textContent).toBe(DEFAULT_FALLBACK);
	});
});
