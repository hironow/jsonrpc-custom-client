"use client";

import { useState } from "react";
import { MessageList } from "@/components/message-list";
import { RequestForm } from "@/components/request-form";
import { ConnectionPanel } from "@/components/connection-panel";
import { MethodStatistics } from "@/components/method-statistics";
import { NotificationSidebar } from "@/components/notification-sidebar";
import { ErrorAnalysisDashboard } from "@/components/error-analysis-dashboard";
import { Activity, Zap, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponseTimeHeatmap } from "@/components/response-time-heatmap";
import { ConnectionQualityMonitor } from "@/components/connection-quality-monitor";
import { MessageDetailSidebar } from "./message-detail-sidebar";
import { PingStats } from "@/components/ping-stats";
import { computePingStats } from "@/lib/ping-stats";
import { findLinkedMessage } from "@/lib/message-link";
import type { ConnectionStatus } from "@/types/connection";
import type { Message } from "@/types/message";
import { useWebSocketClient } from "@/hooks/use-websocket-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function WebSocketClient() {
	const {
		url,
		setUrl,
		status,
		messages,
		dummyMode,
		setDummyMode,
		connect,
		disconnect,
		sendMessage,
		sendBatchMessage,
		clearMessages,
		messageBufferLimit,
		setMessageBufferLimit,
		bufferPreferPending,
		setBufferPreferPending,
		bufferPreferBatches,
		setBufferPreferBatches,
		bufferDropChunkSize,
		setBufferDropChunkSize,
		fastPingEnabled,
		setFastPingEnabled,
		fastPingIntervalMs,
		setFastPingIntervalMs,
		sendPing,
	} = useWebSocketClient();
	const [autoScroll, setAutoScroll] = useState(true);
	const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
		null,
	);
	const [rightSidebarTab, setRightSidebarTab] = useState<
		"details" | "notifications"
	>("details");
	const [rowHeightMode, setRowHeightMode] = useState<"fixed" | "heuristic">(
		"heuristic",
	);
	// connection handlers come from the hook

	// sending/clearing are provided by hook
	const clearLocal = () => {
		clearMessages();
		setSelectedMessageId(null);
	};

	const handleDummyModeToggle = (enabled: boolean) => {
		const wasConnected = status === "connected";

		if (wasConnected) {
			disconnect();
		}

		setDummyMode(enabled);

		if (wasConnected) {
			setTimeout(() => {
				connect();
			}, 500);
		}
	};

	// lifecycle managed by hook

	const selectedMessage = selectedMessageId
		? messages.find((m) => m.id === selectedMessageId)
		: null;

	const linkedMessage = selectedMessage
		? (findLinkedMessage(messages, selectedMessage as any) as Message | null)
		: null;

	const notifications = messages.filter((m) => m.isNotification);
	const pingStats = computePingStats(messages);

	return (
		<div className="flex flex-col h-screen bg-background">
			<header className="border-b border-border bg-card">
				<div className="container mx-auto px-3 py-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10">
								<Zap className="w-3 h-3 text-primary" />
							</div>
							<h1 className="text-sm font-bold text-foreground">
								JSONRPC WebSocket
							</h1>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant={
									rightSidebarTab === "notifications" ? "default" : "ghost"
								}
								size="sm"
								className="h-7 px-2"
								onClick={() => setRightSidebarTab("notifications")}
							>
								<Bell className="w-3 h-3 mr-1" />
								<span className="text-xs">Notifications</span>
								{notifications.length > 0 && (
									<Badge
										variant="secondary"
										className="ml-1 text-[9px] px-1 py-0 h-3.5"
									>
										{notifications.length}
									</Badge>
								)}
							</Button>
							<div className="flex items-center gap-1">
								<Activity className="w-3 h-3 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									{messages.length}
								</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			<div className="flex-1 min-h-0 overflow-hidden">
				<div className="container mx-auto px-3 py-2 h-full">
					<div className="grid gap-2 h-full grid-cols-[420px_1fr_400px]">
						<div className="flex flex-col min-h-0">
							<Tabs defaultValue="connection" className="flex flex-col h-full">
								<TabsList className="grid w-full grid-cols-3 mb-2">
									<TabsTrigger value="connection" className="text-xs">
										Connection
									</TabsTrigger>
									<TabsTrigger value="statistics" className="text-xs">
										Statistics
									</TabsTrigger>
									<TabsTrigger value="performance" className="text-xs">
										Performance
									</TabsTrigger>
								</TabsList>

								<TabsContent
									value="connection"
									className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0"
								>
									<ConnectionPanel
										url={url}
										status={status}
										dummyMode={dummyMode}
										onUrlChange={setUrl}
										onConnect={connect}
										onDisconnect={disconnect}
										onDummyModeChange={handleDummyModeToggle}
										fastPingEnabled={fastPingEnabled}
										onFastPingChange={setFastPingEnabled}
										fastPingIntervalMs={fastPingIntervalMs}
										onFastPingIntervalChange={setFastPingIntervalMs}
										onPing={sendPing}
										pingTotal={pingStats.totalPings}
										pingMatched={pingStats.matched}
										pingMissing={pingStats.missing}
									/>
									<RequestForm
										disabled={status !== "connected"}
										onSend={sendMessage}
										onSendBatch={sendBatchMessage}
									/>
								</TabsContent>

								<TabsContent
									value="statistics"
									className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0"
								>
									<MethodStatistics messages={messages} />
									<ErrorAnalysisDashboard messages={messages} />
								</TabsContent>

								<TabsContent
									value="performance"
									className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0"
								>
									<Card className="p-3 bg-card border-border">
										<h3 className="text-sm font-semibold text-foreground mb-2">
											Settings
										</h3>
										<div className="grid grid-cols-2 gap-2 items-center">
											<Label htmlFor="buffer-limit" className="text-xs">
												Message Buffer Limit
											</Label>
											<Input
												id="buffer-limit"
												type="number"
												min={100}
												step={100}
												value={messageBufferLimit}
												onChange={(e) => {
													const v = parseInt(e.target.value, 10);
													if (!Number.isNaN(v)) {
														const clamped = Math.max(100, v);
														setMessageBufferLimit(clamped);
													}
												}}
												className="h-8 text-xs"
											/>
											<Label htmlFor="prefer-pending" className="text-xs">
												Prefer Pending
											</Label>
											<div className="flex items-center justify-end">
												<Switch
													id="prefer-pending"
													checked={bufferPreferPending}
													onCheckedChange={setBufferPreferPending}
												/>
											</div>
											<Label htmlFor="prefer-batches" className="text-xs">
												Prefer Batches
											</Label>
											<div className="flex items-center justify-end">
												<Switch
													id="prefer-batches"
													checked={bufferPreferBatches}
													onCheckedChange={setBufferPreferBatches}
												/>
											</div>
											<Label htmlFor="drop-chunk" className="text-xs">
												Drop Chunk Size
											</Label>
											<Input
												id="drop-chunk"
												type="number"
												min={1}
												step={1}
												value={bufferDropChunkSize}
												onChange={(e) => {
													const v = parseInt(e.target.value, 10);
													if (!Number.isNaN(v))
														setBufferDropChunkSize(Math.max(1, v));
												}}
												className="h-8 text-xs"
											/>
											<Label htmlFor="row-height" className="text-xs">
												Row Height Estimate
											</Label>
											<select
												id="row-height"
												className="h-8 text-xs bg-input border border-border rounded px-2"
												value={rowHeightMode}
												onChange={(e) =>
													setRowHeightMode(e.target.value as any)
												}
											>
												<option value="heuristic">Heuristic</option>
												<option value="fixed">Fixed (88px)</option>
											</select>
										</div>
										<p className="text-[11px] text-muted-foreground mt-1">
											Default comes from NEXT_PUBLIC_MESSAGE_BUFFER_LIMIT.
											Lowering trims immediately.
										</p>
									</Card>
									<PingStats messages={messages} />
									<ResponseTimeHeatmap messages={messages} />
									<ConnectionQualityMonitor
										messages={messages}
										status={status}
									/>
								</TabsContent>
							</Tabs>
						</div>

						<div className="min-h-0">
							<MessageList
								messages={messages}
								autoScroll={autoScroll}
								selectedMessageId={selectedMessageId}
								onAutoScrollChange={setAutoScroll}
								onClear={clearLocal}
								onSelectMessage={setSelectedMessageId}
								rowHeightMode={rowHeightMode}
							/>
						</div>

						<div className="flex flex-col min-h-0">
							<Tabs
								value={rightSidebarTab}
								onValueChange={(v) =>
									setRightSidebarTab(v as "details" | "notifications")
								}
								className="flex flex-col h-full"
							>
								<TabsList className="grid w-full grid-cols-2 mb-2">
									<TabsTrigger value="details" className="text-xs">
										Details
									</TabsTrigger>
									<TabsTrigger value="notifications" className="text-xs">
										Notifications
										{notifications.length > 0 && (
											<Badge
												variant="secondary"
												className="ml-1 text-[9px] px-1 py-0 h-3.5"
											>
												{notifications.length}
											</Badge>
										)}
									</TabsTrigger>
								</TabsList>

								<TabsContent value="details" className="flex-1 min-h-0 mt-0">
									{selectedMessage ? (
										<MessageDetailSidebar
											message={selectedMessage}
											onClose={() => setSelectedMessageId(null)}
											linkedMessage={linkedMessage}
										/>
									) : (
										<div className="flex items-center justify-center h-full border border-border rounded-lg bg-card">
											<p className="text-sm text-muted-foreground">
												Select a message to view details
											</p>
										</div>
									)}
								</TabsContent>

								<TabsContent
									value="notifications"
									className="flex-1 min-h-0 mt-0"
								>
									<NotificationSidebar
										notifications={notifications}
										selectedNotificationId={selectedMessageId}
										onSelectNotification={(id) => {
											setSelectedMessageId(id);
											setRightSidebarTab("details");
										}}
										onClose={() => {}}
									/>
								</TabsContent>
							</Tabs>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
