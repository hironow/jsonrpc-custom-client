export type PendingBatch = { timestamp: number; requestIds: number[] };
export type MatchMode = "all" | "any";

export function matchBatchResponse(
	pendingBatches: Map<string, PendingBatch>,
	responseIds: number[],
	now: number,
	opts?: { mode?: MatchMode },
): { linkedBatchId?: string; responseTime?: number } {
	const mode: MatchMode = opts?.mode ?? "all";
	for (const [batchId, pending] of pendingBatches.entries()) {
		const allMatch = pending.requestIds.every((id) => responseIds.includes(id));
		const hasAny = responseIds.some((id) => pending.requestIds.includes(id));
		const matched = mode === "all" ? allMatch : hasAny;
		if (matched) {
			return { linkedBatchId: batchId, responseTime: now - pending.timestamp };
		}
	}
	return {};
}
