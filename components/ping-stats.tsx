"use client";

import { Card } from "@/components/ui/card";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import type { Message } from "@/types/message";
import { computePingStats } from "@/lib/ping-stats";

export function PingStats({ messages }: { messages: Message[] }) {
	const stats = computePingStats(messages);
	return (
		<Card className="p-3 bg-card border-border">
			<h3 className="text-sm font-semibold text-foreground mb-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="cursor-help">Ping / Pong</span>
					</TooltipTrigger>
					<TooltipContent side="top">
						Ping matched/total. Missing = unanswered pings.
					</TooltipContent>
				</Tooltip>
			</h3>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div>
					<p className="text-muted-foreground">Pings</p>
					<p className="font-mono text-foreground">{stats.totalPings}</p>
				</div>
				<div>
					<p className="text-muted-foreground">Matched</p>
					<p className="font-mono text-foreground">{stats.matched}</p>
				</div>
				<div>
					<p className="text-muted-foreground">Missing</p>
					<p className="font-mono text-foreground">{stats.missing}</p>
				</div>
			</div>
		</Card>
	);
}
