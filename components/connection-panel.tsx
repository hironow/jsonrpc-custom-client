"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import {
	Plug,
	PlugZap,
	AlertCircle,
	Loader2,
	TestTube,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import type { ConnectionStatus } from "@/types/connection";
import { useState, useEffect } from "react";

type ConnectionPanelProps = {
	url: string;
	status: ConnectionStatus;
	dummyMode: boolean;
	onUrlChange: (url: string) => void;
	onConnect: () => void;
	onDisconnect: () => void;
	onDummyModeChange: (enabled: boolean) => void;
	fastPingEnabled?: boolean;
	onFastPingChange?: (enabled: boolean) => void;
	fastPingIntervalMs?: number;
	onFastPingIntervalChange?: (ms: number) => void;
	onPing?: () => void;
	pingTotal?: number;
	pingMatched?: number;
	pingMissing?: number;
};

export function ConnectionPanel({
	url,
	status,
	dummyMode,
	onUrlChange,
	onConnect,
	onDisconnect,
	onDummyModeChange,
	fastPingEnabled,
	onFastPingChange,
	fastPingIntervalMs,
	onFastPingIntervalChange,
	onPing,
	pingTotal,
	pingMatched,
	pingMissing,
}: ConnectionPanelProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		if (status === "connected") {
			setIsCollapsed(true);
		}
	}, [status]);

	const getStatusConfig = () => {
		switch (status) {
			case "connected":
				return {
					badge: (
						<Badge className="bg-success text-success-foreground">
							<span className="w-2 h-2 rounded-full bg-success-foreground mr-1.5" />
							Connected
						</Badge>
					),
					icon: <PlugZap className="w-4 h-4 text-success" />,
				};
			case "connecting":
				return {
					badge: (
						<Badge className="bg-warning text-warning-foreground">
							<Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
							Connecting
						</Badge>
					),
					icon: <Loader2 className="w-4 h-4 text-warning animate-spin" />,
				};
			case "error":
				return {
					badge: (
						<Badge variant="destructive">
							<AlertCircle className="w-3 h-3 mr-1.5" />
							Error
						</Badge>
					),
					icon: <AlertCircle className="w-4 h-4 text-destructive" />,
				};
			default:
				return {
					badge: (
						<Badge variant="secondary">
							<span className="w-2 h-2 rounded-full bg-muted-foreground mr-1.5" />
							Disconnected
						</Badge>
					),
					icon: <Plug className="w-4 h-4 text-muted-foreground" />,
				};
		}
	};

	const statusConfig = getStatusConfig();

	if (isCollapsed && status === "connected") {
		return (
			<Card className="p-3 bg-card border-border">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						{statusConfig.icon}
						{statusConfig.badge}
						{dummyMode && (
							<Badge variant="outline" className="text-xs">
								<TestTube className="w-3 h-3 mr-1" />
								Dummy
							</Badge>
						)}
						{fastPingEnabled && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge
										variant="outline"
										className="text-[10px]"
										data-testid="badge-fast-ping"
									>
										<span className="w-2 h-2 rounded-full bg-primary mr-1.5 inline-block" />
										Fast Ping
									</Badge>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									Fast {fastPingIntervalMs ?? 100}ms ping is ON
								</TooltipContent>
							</Tooltip>
						)}
						{typeof pingTotal === "number" &&
							typeof pingMatched === "number" && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Badge
											variant="outline"
											className="text-[10px]"
											data-testid="badge-ping-collapsed"
										>
											Ping {pingMatched}/{pingTotal}
										</Badge>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										Ping matched/total. Missing = unanswered pings.
									</TooltipContent>
								</Tooltip>
							)}
					</div>
					<div className="flex items-center gap-2">
						<Button
							onClick={onDisconnect}
							variant="destructive"
							size="sm"
							className="flex-1 h-7 text-xs"
						>
							Disconnect
						</Button>
						<Button
							onClick={() => setIsCollapsed(false)}
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0 shrink-0"
							aria-label="Expand Connection Panel"
						>
							<ChevronDown className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<Card className="p-3 bg-card border-border">
			<div className="flex items-center justify-between mb-2">
				<h2 className="text-sm font-semibold text-foreground">Connection</h2>
				<div className="flex items-center gap-2">
					{statusConfig.badge}
					{status === "connected" && (
						<Button
							onClick={() => setIsCollapsed(true)}
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							aria-label="Collapse Connection Panel"
						>
							<ChevronUp className="w-4 h-4" />
						</Button>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border">
					<div className="flex items-center gap-1.5">
						<TestTube className="w-3 h-3 text-muted-foreground" />
						<Label
							htmlFor="dummy-mode"
							className="text-xs font-medium cursor-pointer"
						>
							Dummy Mode
						</Label>
					</div>
					<Switch
						id="dummy-mode"
						checked={dummyMode}
						onCheckedChange={onDummyModeChange}
						disabled={status === "connecting"}
					/>
				</div>

				{/* Fast Ping toggle */}
				<div className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border">
					<div className="flex items-center gap-1.5">
						<span className="w-3 h-3 rounded-full bg-primary/60" />
						<Label
							htmlFor="fast-ping"
							className="text-xs font-medium cursor-pointer"
						>
							Fast JSON-RPC Ping ({fastPingIntervalMs ?? 100}ms)
						</Label>
					</div>

					{/* One-shot JSON-RPC ping */}
					<div className="flex items-center justify-end">
						<Button
							variant="outline"
							size="sm"
							onClick={onPing}
							disabled={status !== "connected"}
							className="h-7 text-xs"
						>
							Ping
						</Button>
					</div>
					<div className="flex items-center gap-2">
						<Input
							aria-label="Fast Ping Interval (ms)"
							type="number"
							min={10}
							step={10}
							value={fastPingIntervalMs ?? 100}
							onChange={(e) => {
								const v = parseInt(e.target.value, 10);
								if (!Number.isNaN(v) && onFastPingIntervalChange) {
									onFastPingIntervalChange(Math.max(10, Math.min(60000, v)));
								}
							}}
							className="h-7 w-20 text-xs"
							disabled={status !== "connected"}
						/>
						<Switch
							id="fast-ping"
							checked={!!fastPingEnabled}
							onCheckedChange={onFastPingChange}
							disabled={status !== "connected"}
						/>
					</div>
				</div>

				{typeof pingTotal === "number" && typeof pingMatched === "number" && (
					<div
						className="flex items-center justify-between px-2"
						data-testid="ping-inline"
					>
						<div className="text-xs text-muted-foreground">Ping</div>
						<Tooltip>
							<TooltipTrigger asChild>
								<div
									className="text-xs font-mono text-foreground cursor-default"
									data-testid="ping-inline-trigger"
								>
									<span data-testid="ping-inline-matched">{pingMatched}</span>/
									<span data-testid="ping-inline-total">{pingTotal}</span>
									{typeof pingMissing === "number" && (
										<span className="ml-2" data-testid="ping-inline-missing">
											missing {pingMissing}
										</span>
									)}
								</div>
							</TooltipTrigger>
							<TooltipContent side="top">
								Ping matched/total. Missing = unanswered pings.
							</TooltipContent>
						</Tooltip>
					</div>
				)}

				{dummyMode && (
					<div className="p-2 rounded bg-primary/10 border border-primary/20">
						<p className="text-xs text-primary/90">
							Simulating JSONRPC stream with sample data
						</p>
					</div>
				)}

				<div>
					<label className="text-xs font-medium text-foreground mb-1 block">
						WebSocket URL
					</label>
					<div className="flex gap-1.5">
						<div className="relative flex-1">
							<div className="absolute left-2 top-1/2 -translate-y-1/2">
								{statusConfig.icon}
							</div>
							<Input
								value={url}
								onChange={(e) => onUrlChange(e.target.value)}
								placeholder="ws://localhost:8080"
								disabled={
									status === "connected" || status === "connecting" || dummyMode
								}
								className="pl-8 h-8 bg-input border-border text-foreground font-mono text-xs"
							/>
						</div>
					</div>
				</div>

				<div className="flex gap-1.5">
					{status === "connected" ? (
						<Button
							onClick={onDisconnect}
							variant="destructive"
							className="flex-1 h-8 text-xs"
						>
							Disconnect
						</Button>
					) : (
						<Button
							onClick={onConnect}
							disabled={status === "connecting" || (!dummyMode && !url)}
							className="flex-1 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
						>
							{status === "connecting" ? (
								<>
									<Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
									Connecting...
								</>
							) : (
								"Connect"
							)}
						</Button>
					)}
				</div>

				<div className="pt-2 border-t border-border">
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>
							<p className="text-muted-foreground text-xs">Protocol</p>
							<p className="font-mono text-foreground text-xs">JSONRPC 2.0</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Transport</p>
							<p className="font-mono text-foreground text-xs">
								{dummyMode ? "Simulated" : "WebSocket"}
							</p>
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}
