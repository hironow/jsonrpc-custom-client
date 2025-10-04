"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/types/message";

type NotificationSidebarProps = {
	notifications: Message[];
	selectedNotificationId: string | null;
	onSelectNotification: (id: string) => void;
	onClose: () => void;
};

export function NotificationSidebar({
	notifications,
	selectedNotificationId,
	onSelectNotification,
	onClose,
}: NotificationSidebarProps) {
	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const getNotificationPreview = (notification: Message) => {
		if (typeof notification.data !== "object") return "Notification";

		const data = notification.data;
		if (data.method) {
			return data.method;
		}
		if (data.params) {
			return "Notification with params";
		}
		return "Notification";
	};

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-2 border-b">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Bell className="w-4 h-4 text-blue-400" />
						<CardTitle className="text-sm">Notifications</CardTitle>
						<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
							{notifications.length}
						</Badge>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={onClose}
					>
						<X className="w-3 h-3" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-2 min-h-0">
				<ScrollArea className="h-full">
					<div className="space-y-1">
						{notifications.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground text-xs">
								No notifications yet
							</div>
						) : (
							notifications.map((notification) => (
								<Card
									key={notification.id}
									className={`cursor-pointer transition-all border-l-2 border-l-blue-500 ${
										selectedNotificationId === notification.id
											? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/50"
											: "bg-card/50 hover:bg-card"
									}`}
									onClick={() => onSelectNotification(notification.id)}
								>
									<div className="p-2">
										<div className="flex items-start gap-2">
											<Bell className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1 mb-0.5">
													<span className="text-[10px] font-medium text-foreground truncate">
														{getNotificationPreview(notification)}
													</span>
												</div>
												<span className="text-[9px] text-muted-foreground font-mono">
													{formatTime(notification.timestamp)}
												</span>
											</div>
										</div>
									</div>
								</Card>
							))
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
