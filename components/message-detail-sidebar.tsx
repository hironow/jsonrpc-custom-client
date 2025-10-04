"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	X,
	Copy,
	Check,
	ArrowUp,
	ArrowDown,
	Info,
	Zap,
	Loader2,
	Bell,
	Layers,
	AlertCircle,
	AlertTriangle,
} from "lucide-react";
import type { Message } from "@/types/message";
import { escapeHtml } from "@/lib/html-escape";
import { highlightEscapedJson } from "@/lib/json-highlight";

type MessageDetailSidebarProps = {
	message: Message;
	onClose: () => void;
	linkedMessage?: Message | null;
};

export function MessageDetailSidebar({
	message,
	onClose,
	linkedMessage,
}: MessageDetailSidebarProps) {
	const [copied, setCopied] = useState<string | null>(null);

	const requestMessage = message.type === "sent" ? message : linkedMessage;
	const responseMessage = message.type === "received" ? message : linkedMessage;

	const latency = responseMessage?.responseTime;

	const isBatchMessage = message.isBatch && Array.isArray(message.data);

	const batchPairs: Array<{
		request: any;
		response?: any;
		index: number;
	}> = [];

	if (isBatchMessage) {
		let batchRequests: any[] = [];
		let batchResponses: any[] = [];

		if (message.type === "sent") {
			// Current message is the batch request
			batchRequests = Array.isArray(message.data) ? message.data : [];
			batchResponses =
				linkedMessage && Array.isArray(linkedMessage.data)
					? linkedMessage.data
					: [];
		} else {
			// Current message is the batch response
			batchRequests =
				linkedMessage && Array.isArray(linkedMessage.data)
					? linkedMessage.data
					: [];
			batchResponses = Array.isArray(message.data) ? message.data : [];
		}

		batchRequests.forEach((req: any, index: number) => {
			// Find matching response by ID (handle both number and string IDs)
			const response = batchResponses.find((res: any) => {
				// Convert both to strings for comparison to handle type mismatches
				const reqId = req.id !== undefined ? String(req.id) : undefined;
				const resId = res.id !== undefined ? String(res.id) : undefined;
				return reqId !== undefined && reqId === resId;
			});

			batchPairs.push({
				request: req,
				response,
				index,
			});
		});
	}

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			fractionalSecondDigits: 3,
		});
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const copyToClipboard = async (data: any, id: string) => {
		const text =
			typeof data === "string" ? data : JSON.stringify(data, null, 2);
		await navigator.clipboard.writeText(text);
		setCopied(id);
		setTimeout(() => setCopied(null), 2000);
	};

	const renderJsonWithHighlight = (data: any) => {
		const jsonStr = JSON.stringify(data, null, 2);

		// Escape only HTML-significant characters to mitigate XSS while preserving quotes for highlighting
		const safe = escapeHtml(jsonStr);

		const highlighted = highlightEscapedJson(safe);

		return (
			<pre
				className="text-xs font-mono leading-relaxed"
				dangerouslySetInnerHTML={{ __html: highlighted }}
			/>
		);
	};

	const renderData = (data: any, type: Message["type"]) => {
		if (type === "system") {
			return <p className="text-sm text-muted-foreground">{data.message}</p>;
		}

		if (typeof data === "object") {
			return (
				<div className="bg-black/60 p-3 rounded border border-border/50 overflow-x-auto">
					{renderJsonWithHighlight(data)}
				</div>
			);
		}

		return (
			<pre className="text-xs font-mono bg-black/60 p-3 rounded border border-border/50 overflow-x-auto whitespace-pre-wrap break-all">
				{data}
			</pre>
		);
	};

	const getLatencyColor = (ms: number) => {
		if (ms < 100) return "text-green-400";
		if (ms < 500) return "text-yellow-400";
		return "text-red-400";
	};

	const renderValidationResults = (msg: Message) => {
		if (!msg.validationErrors && !msg.validationWarnings) return null;

		return (
			<div className="space-y-2">
				{msg.validationErrors && msg.validationErrors.length > 0 && (
					<div className="bg-red-500/10 border border-red-500/30 rounded p-2">
						<div className="flex items-center gap-2 mb-2">
							<AlertCircle className="w-4 h-4 text-red-400" />
							<span className="text-xs font-semibold text-red-400">
								Spec Validation Errors ({msg.validationErrors.length})
							</span>
						</div>
						<ul className="space-y-1">
							{msg.validationErrors.map((error, idx) => (
								<li key={idx} className="text-xs text-red-300 pl-4">
									• {error}
								</li>
							))}
						</ul>
					</div>
				)}
				{msg.validationWarnings && msg.validationWarnings.length > 0 && (
					<div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
						<div className="flex items-center gap-2 mb-2">
							<AlertTriangle className="w-4 h-4 text-yellow-400" />
							<span className="text-xs font-semibold text-yellow-400">
								Spec Warnings ({msg.validationWarnings.length})
							</span>
						</div>
						<ul className="space-y-1">
							{msg.validationWarnings.map((warning, idx) => (
								<li key={idx} className="text-xs text-yellow-300 pl-4">
									• {warning}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		);
	};

	const renderBatchPairs = () => {
		if (!isBatchMessage) return null;

		return (
			<div className="space-y-6">
				{batchPairs.map((pair) => {
					const { request, response, index } = pair;
					const isNotification =
						request.id === undefined && request.method !== undefined;
					const hasError = response?.error !== undefined;
					const hasResponse = response !== undefined;

					return (
						<div
							key={index}
							className="border border-border rounded-lg overflow-hidden"
						>
							{/* Pair Header */}
							<div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-xs font-mono text-muted-foreground font-semibold">
										#{index + 1}
									</span>
									{isNotification && (
										<Badge
											variant="secondary"
											className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs"
										>
											<Bell className="w-3 h-3 mr-1" />
											Notification
										</Badge>
									)}
								</div>
							</div>

							{/* Request Section */}
							<div className="p-4 border-b border-border">
								<div className="flex items-center gap-2 mb-3">
									<ArrowUp className="w-4 h-4 text-muted-foreground" />
									<Badge
										variant="secondary"
										className="bg-primary/20 text-primary border-primary/30 text-xs"
									>
										Request
									</Badge>
								</div>
								<div className="space-y-2 mb-3">
									{request.method && (
										<div className="flex items-center gap-2 text-xs">
											<span className="text-muted-foreground font-medium">
												Method:
											</span>
											<span className="font-mono text-blue-400 font-semibold">
												{request.method}
											</span>
										</div>
									)}
									{request.id !== undefined && (
										<div className="flex items-center gap-2 text-xs">
											<span className="text-muted-foreground font-medium">
												ID:
											</span>
											<span className="font-mono text-foreground">
												#{request.id}
											</span>
										</div>
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => copyToClipboard(request, `batch-req-${index}`)}
									className="w-full mb-3 h-7 text-xs"
								>
									{copied === `batch-req-${index}` ? (
										<>
											<Check className="w-3 h-3 mr-1" />
											Copied!
										</>
									) : (
										<>
											<Copy className="w-3 h-3 mr-1" />
											Copy Request
										</>
									)}
								</Button>
								{request.params !== undefined ? (
									<div>
										<h4 className="text-xs font-semibold text-foreground mb-1.5">
											Parameters
										</h4>
										{renderData(request.params, "sent")}
									</div>
								) : (
									renderData(request, "sent")
								)}
							</div>

							{/* Response Section */}
							{hasResponse ? (
								<>
									{/* Latency indicator */}
									{latency !== undefined && (
										<div className="py-2 px-4 bg-muted/30 border-b border-border flex items-center gap-3">
											<Zap className={`w-4 h-4 ${getLatencyColor(latency)}`} />
											<div>
												<div className="text-[10px] text-muted-foreground font-medium">
													Response Time
												</div>
												<div
													className={`text-sm font-bold font-mono ${getLatencyColor(latency)}`}
												>
													{latency}
													<span className="text-xs ml-1">ms</span>
												</div>
											</div>
										</div>
									)}

									<div className="p-4">
										<div className="flex items-center gap-2 mb-3">
											<ArrowDown className="w-4 h-4 text-muted-foreground" />
											<Badge
												variant="secondary"
												className={
													hasError
														? "bg-destructive/20 text-destructive border-destructive/30 text-xs"
														: "bg-success/20 text-success border-success/30 text-xs"
												}
											>
												{hasError ? "Error" : "Response"}
											</Badge>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												copyToClipboard(response, `batch-res-${index}`)
											}
											className="w-full mb-3 h-7 text-xs"
										>
											{copied === `batch-res-${index}` ? (
												<>
													<Check className="w-3 h-3 mr-1" />
													Copied!
												</>
											) : (
												<>
													<Copy className="w-3 h-3 mr-1" />
													Copy Response
												</>
											)}
										</Button>
										{response.result !== undefined ? (
											<div>
												<h4 className="text-xs font-semibold text-foreground mb-1.5">
													Result
												</h4>
												{renderData(response.result, "received")}
											</div>
										) : response.error !== undefined ? (
											<div>
												<h4 className="text-xs font-semibold text-destructive mb-1.5">
													Error
												</h4>
												{renderData(response.error, "error")}
											</div>
										) : (
											renderData(response, "received")
										)}
									</div>
								</>
							) : isNotification ? (
								<div className="p-4 flex flex-col items-center justify-center bg-muted/20 text-center">
									<Bell className="w-6 h-6 text-muted-foreground mb-2" />
									<p className="text-xs text-muted-foreground">
										No response expected for notification
									</p>
								</div>
							) : (
								<div className="p-4 flex flex-col items-center justify-center bg-muted/20 text-center">
									<Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-2" />
									<p className="text-xs text-muted-foreground">
										Waiting for response...
									</p>
								</div>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	const renderWaitingForResponse = () => {
		return (
			<div className="flex flex-col h-full items-center justify-center p-6 bg-muted/20">
				<Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
				<p className="text-sm font-medium text-foreground mb-1">
					Waiting for Response...
				</p>
				<p className="text-xs text-muted-foreground text-center">
					The response will appear here when it arrives
				</p>
			</div>
		);
	};

	const renderNoRequest = () => {
		return (
			<div className="flex flex-col h-full items-center justify-center p-6 bg-muted/20">
				<Bell className="w-8 h-8 text-muted-foreground mb-3" />
				<p className="text-sm font-medium text-foreground mb-1">No Request</p>
				<p className="text-xs text-muted-foreground text-center">
					This is a notification or event message
					<br />
					sent without a corresponding request
				</p>
			</div>
		);
	};

	if (isBatchMessage) {
		return (
			<Card className="flex flex-col h-full bg-card overflow-hidden">
				<div className="p-3 border-b border-border flex-shrink-0 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Layers className="w-4 h-4 text-purple-400" />
						<h2 className="text-sm font-semibold text-foreground">
							Batch Message Details
						</h2>
						<Badge
							variant="secondary"
							className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs"
						>
							{batchPairs.length} {batchPairs.length === 1 ? "item" : "items"}
						</Badge>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto p-4">
					<div className="space-y-2 mb-4 pb-4 border-b border-border">
						<div className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground">Time:</span>
							<span className="font-mono text-foreground">
								{formatTime(message.timestamp)}
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground">Date:</span>
							<span className="text-foreground">
								{formatDate(message.timestamp)}
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground">Type:</span>
							<Badge
								variant="secondary"
								className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs"
							>
								Batch {message.type === "sent" ? "Request" : "Response"}
							</Badge>
						</div>
					</div>

					{renderValidationResults(message)}
					{(message.validationErrors || message.validationWarnings) && (
						<div className="mb-4" />
					)}

					{renderBatchPairs()}
				</div>
			</Card>
		);
	}

	return (
		<Card className="flex flex-col h-full bg-card overflow-hidden">
			<div className="p-3 border-b border-border flex-shrink-0 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-foreground">
					Message Details
				</h2>
				<Button
					variant="ghost"
					size="sm"
					onClick={onClose}
					className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
				>
					<X className="w-4 h-4" />
				</Button>
			</div>

			{message.type === "sent" && linkedMessage ? (
				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="p-4 border-b border-border">
						<div className="flex items-center gap-2 mb-3">
							<ArrowUp className="w-4 h-4 text-muted-foreground" />
							<Badge
								variant="secondary"
								className="bg-primary/20 text-primary border-primary/30 text-xs"
							>
								Request
							</Badge>
						</div>
						<div className="space-y-2 mb-3">
							<div className="flex items-center gap-2 text-xs">
								<span className="text-muted-foreground">Time:</span>
								<span className="font-mono text-foreground">
									{formatTime(requestMessage!.timestamp)}
								</span>
							</div>
							{requestMessage!.method && (
								<div className="flex items-center gap-2 text-xs">
									<span className="text-muted-foreground">Method:</span>
									<span className="font-mono text-blue-400 font-semibold">
										{requestMessage!.method}
									</span>
								</div>
							)}
						</div>
						{renderValidationResults(requestMessage!)}
						{(requestMessage!.validationErrors ||
							requestMessage!.validationWarnings) && <div className="mb-3" />}
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyToClipboard(requestMessage!.data, "request")}
							className="w-full mb-3 h-7 text-xs"
						>
							{copied === "request" ? (
								<>
									<Check className="w-3 h-3 mr-1" />
									Copied!
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" />
									Copy JSON
								</>
							)}
						</Button>
						{renderData(requestMessage!.data, requestMessage!.type)}
					</div>

					{latency !== undefined && (
						<div className="py-3 px-4 bg-muted/30 border-b border-border flex items-center gap-3">
							<Zap className={`w-5 h-5 ${getLatencyColor(latency)}`} />
							<div>
								<div className="text-[10px] text-muted-foreground font-medium">
									Response Time
								</div>
								<div
									className={`text-lg font-bold font-mono ${getLatencyColor(latency)}`}
								>
									{latency}
									<span className="text-xs ml-1">ms</span>
								</div>
							</div>
						</div>
					)}

					<div className="p-4">
						<div className="flex items-center gap-2 mb-3">
							<ArrowDown className="w-4 h-4 text-muted-foreground" />
							<Badge
								variant="secondary"
								className="bg-success/20 text-success border-success/30 text-xs"
							>
								Response
							</Badge>
						</div>
						<div className="space-y-2 mb-3">
							<div className="flex items-center gap-2 text-xs">
								<span className="text-muted-foreground">Time:</span>
								<span className="font-mono text-foreground">
									{formatTime(responseMessage!.timestamp)}
								</span>
							</div>
						</div>
						{renderValidationResults(responseMessage!)}
						{(responseMessage!.validationErrors ||
							responseMessage!.validationWarnings) && <div className="mb-3" />}
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyToClipboard(responseMessage!.data, "response")}
							className="w-full mb-3 h-7 text-xs"
						>
							{copied === "response" ? (
								<>
									<Check className="w-3 h-3 mr-1" />
									Copied!
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" />
									Copy JSON
								</>
							)}
						</Button>
						{renderData(responseMessage!.data, responseMessage!.type)}
					</div>
				</div>
			) : message.type === "sent" && !linkedMessage ? (
				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="p-4 border-b border-border">
						<div className="flex items-center gap-2 mb-3">
							<ArrowUp className="w-4 h-4 text-muted-foreground" />
							<Badge
								variant="secondary"
								className="bg-primary/20 text-primary border-primary/30 text-xs"
							>
								Request
							</Badge>
						</div>
						<div className="space-y-2 mb-3">
							<div className="flex items-center gap-2 text-xs">
								<span className="text-muted-foreground">Time:</span>
								<span className="font-mono text-foreground">
									{formatTime(message.timestamp)}
								</span>
							</div>
							{message.method && (
								<div className="flex items-center gap-2 text-xs">
									<span className="text-muted-foreground">Method:</span>
									<span className="font-mono text-blue-400 font-semibold">
										{message.method}
									</span>
								</div>
							)}
						</div>
						{renderValidationResults(message)}
						{(message.validationErrors || message.validationWarnings) && (
							<div className="mb-3" />
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyToClipboard(message.data, "request")}
							className="w-full mb-3 h-7 text-xs"
						>
							{copied === "request" ? (
								<>
									<Check className="w-3 h-3 mr-1" />
									Copied!
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" />
									Copy JSON
								</>
							)}
						</Button>
						{renderData(message.data, message.type)}
					</div>
					<div className="p-4">{renderWaitingForResponse()}</div>
				</div>
			) : message.type === "received" && linkedMessage ? (
				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="p-4 border-b border-border">
						<div className="flex items-center gap-2 mb-3">
							<ArrowUp className="w-4 h-4 text-muted-foreground" />
							<Badge
								variant="secondary"
								className="bg-primary/20 text-primary border-primary/30 text-xs"
							>
								Request
							</Badge>
						</div>
						<div className="space-y-2 mb-3">
							<div className="flex items-center gap-2 text-xs">
								<span className="text-muted-foreground">Time:</span>
								<span className="font-mono text-foreground">
									{formatTime(linkedMessage.timestamp)}
								</span>
							</div>
							{linkedMessage.method && (
								<div className="flex items-center gap-2 text-xs">
									<span className="text-muted-foreground">Method:</span>
									<span className="font-mono text-blue-400 font-semibold">
										{linkedMessage.method}
									</span>
								</div>
							)}
						</div>
						{renderValidationResults(linkedMessage)}
						{(linkedMessage.validationErrors ||
							linkedMessage.validationWarnings) && <div className="mb-3" />}
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyToClipboard(linkedMessage.data, "request")}
							className="w-full mb-3 h-7 text-xs"
						>
							{copied === "request" ? (
								<>
									<Check className="w-3 h-3 mr-1" />
									Copied!
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" />
									Copy JSON
								</>
							)}
						</Button>
						{renderData(linkedMessage.data, linkedMessage.type)}
					</div>

					{latency !== undefined && (
						<div className="py-3 px-4 bg-muted/30 border-b border-border flex items-center gap-3">
							<Zap className={`w-5 h-5 ${getLatencyColor(latency)}`} />
							<div>
								<div className="text-[10px] text-muted-foreground font-medium">
									Response Time
								</div>
								<div
									className={`text-lg font-bold font-mono ${getLatencyColor(latency)}`}
								>
									{latency}
									<span className="text-xs ml-1">ms</span>
								</div>
							</div>
						</div>
					)}

					<div className="p-4">
						<div className="flex items-center gap-2 mb-3">
							<ArrowDown className="w-4 h-4 text-muted-foreground" />
							<Badge
								variant="secondary"
								className="bg-success/20 text-success border-success/30 text-xs"
							>
								Response
							</Badge>
						</div>
						<div className="space-y-2 mb-3">
							<div className="flex items-center gap-2 text-xs">
								<span className="text-muted-foreground">Time:</span>
								<span className="font-mono text-foreground">
									{formatTime(message.timestamp)}
								</span>
							</div>
						</div>
						{renderValidationResults(message)}
						{(message.validationErrors || message.validationWarnings) && (
							<div className="mb-3" />
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyToClipboard(message.data, "response")}
							className="w-full mb-3 h-7 text-xs"
						>
							{copied === "response" ? (
								<>
									<Check className="w-3 h-3 mr-1" />
									Copied!
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" />
									Copy JSON
								</>
							)}
						</Button>
						{renderData(message.data, message.type)}
					</div>
				</div>
			) : message.type === "received" && !linkedMessage ? (
				<div className="flex-1 min-h-0 overflow-y-auto">
					<div className="p-4 border-b border-border">{renderNoRequest()}</div>
					<div className="p-4">
						<div className="flex items-center gap-2 mb-3">
							<ArrowDown className="w-4 h-4 text-muted-foreground" />
							<Badge
								variant="secondary"
								className="bg-success/20 text-success border-success/30 text-xs"
							>
								Response
							</Badge>
						</div>
						<div className="space-y-2 mb-3">
							<div className="flex items-center gap-2 text-xs">
								<span className="text-muted-foreground">Time:</span>
								<span className="font-mono text-foreground">
									{formatTime(message.timestamp)}
								</span>
							</div>
						</div>
						{renderValidationResults(message)}
						{(message.validationErrors || message.validationWarnings) && (
							<div className="mb-3" />
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => copyToClipboard(message.data, "response")}
							className="w-full mb-3 h-7 text-xs"
						>
							{copied === "response" ? (
								<>
									<Check className="w-3 h-3 mr-1" />
									Copied!
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" />
									Copy JSON
								</>
							)}
						</Button>
						{renderData(message.data, message.type)}
					</div>
				</div>
			) : (
				<div className="flex-1 min-h-0 overflow-y-auto p-4">
					<div className="flex items-center gap-2 mb-3">
						<Info className="w-4 h-4 text-muted-foreground" />
						<Badge variant="secondary" className="text-xs">
							{message.type === "system" ? "System" : "Error"}
						</Badge>
					</div>
					<div className="space-y-2 mb-3">
						<div className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground">Time:</span>
							<span className="font-mono text-foreground">
								{formatTime(message.timestamp)}
							</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => copyToClipboard(message.data, "message")}
						className="w-full mb-3 h-7 text-xs"
					>
						{copied === "message" ? (
							<>
								<Check className="w-3 h-3 mr-1" />
								Copied!
							</>
						) : (
							<>
								<Copy className="w-3 h-3 mr-1" />
								Copy JSON
							</>
						)}
					</Button>
					{renderData(message.data, message.type)}
				</div>
			)}
		</Card>
	);
}
