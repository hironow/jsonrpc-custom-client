"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Code2, Plus, X, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { z } from "zod";

type RequestFormProps = {
	disabled: boolean;
	onSend: (method: string, params: any) => void;
	onSendBatch?: (requests: Array<{ method: string; params: any }>) => void;
};

type BatchRequest = {
	id: string;
	method: string;
	params: string;
	paramsError: string;
};

export function RequestForm({
	disabled,
	onSend,
	onSendBatch,
}: RequestFormProps) {
	const [method, setMethod] = useState("");
	const [params, setParams] = useState("{}");
	const [paramsError, setParamsError] = useState("");
	const [methodError, setMethodError] = useState("");
	const [batchMode, setBatchMode] = useState(false);
	const [batchRequests, setBatchRequests] = useState<BatchRequest[]>([
		{ id: crypto.randomUUID(), method: "", params: "{}", paramsError: "" },
	]);

	const singleSchema = z.object({
		method: z.string().min(1, "Method is required"),
		params: z
			.any()
			.refine((v) => Array.isArray(v) || (!!v && typeof v === "object"), {
				message: "Params must be object or array",
			}),
	});

	const handleSend = () => {
		setMethodError("");
		setParamsError("");
		let parsed: any;
		try {
			parsed = JSON.parse(params);
		} catch (error) {
			setParamsError("Invalid JSON format");
			return;
		}
		const res = singleSchema.safeParse({ method, params: parsed });
		if (!res.success) {
			const msg = res.error.errors[0]?.message || "Invalid";
			if (msg.includes("Method")) setMethodError(msg);
			else setParamsError(msg);
			return;
		}
		onSend(method, parsed);
	};

	const handleSendBatch = () => {
		if (!onSendBatch) return;

		const requests: Array<{ method: string; params: any }> = [];
		let hasError = false;

		const updatedRequests = batchRequests.map((req) => {
			try {
				const parsedParams = JSON.parse(req.params);
				const res = singleSchema.safeParse({
					method: req.method,
					params: parsedParams,
				});
				if (!res.success) {
					hasError = true;
					const msg = res.error.errors[0]?.message || "Invalid";
					// Reuse paramsError field for surfacing either error (minimal UI change)
					return { ...req, paramsError: msg };
				}
				requests.push({ method: req.method, params: parsedParams });
				return { ...req, paramsError: "" };
			} catch (error) {
				hasError = true;
				return { ...req, paramsError: "Invalid JSON format" };
			}
		});

		setBatchRequests(updatedRequests);

		if (!hasError && requests.length > 0) {
			onSendBatch(requests);
		}
	};

	const handleParamsChange = (value: string) => {
		setParams(value);
		setParamsError("");
		setMethodError("");
	};

	const formatJSON = () => {
		try {
			const parsed = JSON.parse(params);
			setParams(JSON.stringify(parsed, null, 2));
			setParamsError("");
		} catch (error) {
			setParamsError("Invalid JSON format");
		}
	};

	const addBatchRequest = () => {
		setBatchRequests([
			...batchRequests,
			{ id: crypto.randomUUID(), method: "", params: "{}", paramsError: "" },
		]);
	};

	const removeBatchRequest = (id: string) => {
		if (batchRequests.length > 1) {
			setBatchRequests(batchRequests.filter((req) => req.id !== id));
		}
	};

	const updateBatchRequest = (
		id: string,
		field: "method" | "params",
		value: string,
	) => {
		setBatchRequests(
			batchRequests.map((req) =>
				req.id === id ? { ...req, [field]: value, paramsError: "" } : req,
			),
		);
	};

	const formatBatchJSON = (id: string) => {
		const req = batchRequests.find((r) => r.id === id);
		if (!req) return;

		try {
			const parsed = JSON.parse(req.params);
			updateBatchRequest(id, "params", JSON.stringify(parsed, null, 2));
		} catch (error) {
			setBatchRequests(
				batchRequests.map((r) =>
					r.id === id ? { ...r, paramsError: "Invalid JSON format" } : r,
				),
			);
		}
	};

	return (
		<Card className="p-2 bg-card border-border flex-1">
			<div className="flex items-center justify-between mb-1.5">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-foreground">Request</h2>
					{batchMode && (
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-400"
						>
							<Layers className="w-2.5 h-2.5 mr-0.5" />
							Batch
						</Badge>
					)}
				</div>
				<Code2 className="w-3 h-3 text-muted-foreground" />
			</div>

			<div className="flex items-center gap-2 mb-2 p-1.5 bg-muted/50 rounded">
				<Switch
					id="batch-mode"
					checked={batchMode}
					onCheckedChange={setBatchMode}
					disabled={disabled}
				/>
				<Label
					htmlFor="batch-mode"
					className="text-xs text-muted-foreground cursor-pointer"
				>
					Batch Mode
				</Label>
			</div>

			{!batchMode ? (
				<div className="space-y-1.5">
					<div>
						<label className="text-xs font-medium text-foreground mb-0.5 block">
							Method
						</label>
						<Input
							value={method}
							onChange={(e) => setMethod(e.target.value)}
							placeholder="e.g., getUser, sendMessage"
							disabled={disabled}
							className="h-8 bg-input border-border text-foreground font-mono text-xs"
						/>
						{methodError && (
							<p className="text-xs text-destructive mt-1">{methodError}</p>
						)}
					</div>

					<div>
						<div className="flex items-center justify-between mb-0.5">
							<label className="text-xs font-medium text-foreground">
								Parameters (JSON)
							</label>
							<Button
								variant="ghost"
								size="sm"
								onClick={formatJSON}
								disabled={disabled}
								className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
							>
								Format
							</Button>
						</div>
						<Textarea
							value={params}
							onChange={(e) => handleParamsChange(e.target.value)}
							placeholder='{"key": "value"}'
							disabled={disabled}
							className="bg-input border-border text-foreground font-mono text-xs min-h-[60px] resize-none"
						/>
						{paramsError && (
							<p className="text-xs text-destructive mt-1">{paramsError}</p>
						)}
					</div>

					<Button
						onClick={handleSend}
						disabled={disabled || !method}
						className="w-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
					>
						<Send className="w-3 h-3 mr-1.5" />
						Send Request
					</Button>
				</div>
			) : (
				<div className="space-y-1.5">
					<div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
						{batchRequests.map((req, index) => (
							<Card key={req.id} className="p-1.5 bg-muted/30 border-border">
								<div className="flex items-center justify-between mb-1">
									<span className="text-[10px] font-medium text-muted-foreground">
										Request #{index + 1}
									</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => removeBatchRequest(req.id)}
										disabled={disabled || batchRequests.length === 1}
										className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
									>
										<X className="w-3 h-3" />
									</Button>
								</div>

								<div className="space-y-1">
									<Input
										value={req.method}
										onChange={(e) =>
											updateBatchRequest(req.id, "method", e.target.value)
										}
										placeholder="Method"
										disabled={disabled}
										className="h-7 bg-input border-border text-foreground font-mono text-xs"
									/>

									<div>
										<div className="flex items-center justify-between mb-0.5">
											<label className="text-[10px] text-muted-foreground">
												Params
											</label>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => formatBatchJSON(req.id)}
												disabled={disabled}
												className="h-5 text-[10px] text-muted-foreground hover:text-foreground px-1"
											>
												Format
											</Button>
										</div>
										<Textarea
											value={req.params}
											onChange={(e) =>
												updateBatchRequest(req.id, "params", e.target.value)
											}
											placeholder="{}"
											disabled={disabled}
											className="bg-input border-border text-foreground font-mono text-[10px] min-h-[50px] resize-none"
										/>
										{req.paramsError && (
											<p className="text-[10px] text-destructive mt-0.5">
												{req.paramsError}
											</p>
										)}
									</div>
								</div>
							</Card>
						))}
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={addBatchRequest}
						disabled={disabled}
						className="w-full h-7 text-xs border-dashed bg-transparent"
					>
						<Plus className="w-3 h-3 mr-1" />
						Add Request
					</Button>

					<Button
						onClick={handleSendBatch}
						disabled={disabled || batchRequests.every((r) => !r.method)}
						className="w-full h-8 text-xs bg-purple-600 text-white hover:bg-purple-700"
					>
						<Layers className="w-3 h-3 mr-1.5" />
						Send Batch ({batchRequests.length})
					</Button>
				</div>
			)}
		</Card>
	);
}
