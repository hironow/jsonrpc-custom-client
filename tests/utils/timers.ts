import { vi } from "vitest";

export type TestTimerLike = {
	setTimeout: (fn: (...args: any[]) => void, ms?: number) => any;
	clearTimeout: (id: any) => void;
	setInterval: (fn: (...args: any[]) => void, ms?: number) => any;
	clearInterval: (id: any) => void;
	now: () => number;
};

export function makeTimer(): TestTimerLike {
	return {
		setTimeout: (fn, ms) => setTimeout(fn as any, ms),
		clearTimeout: (id) => clearTimeout(id),
		setInterval: (fn, ms) => setInterval(fn as any, ms),
		clearInterval: (id) => clearInterval(id),
		now: () => Date.now(),
	};
}

export async function withFakeTimers<T>(
	fn: (timer: TestTimerLike) => Promise<T> | T,
): Promise<T> {
	vi.useFakeTimers();
	try {
		const timer = makeTimer();
		return await fn(timer);
	} finally {
		vi.useRealTimers();
	}
}
