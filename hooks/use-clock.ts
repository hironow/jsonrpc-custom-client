import { useEffect, useState } from "react";

// Read wall-clock time in the shell; rendering consumes a state value.
export function useClock(intervalMs = 1000): number {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(interval);
	}, [intervalMs]);
	return now;
}
