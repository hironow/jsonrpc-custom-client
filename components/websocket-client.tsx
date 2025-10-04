"use client"

import { useState } from "react"
import { MessageList } from "@/components/message-list"
import { RequestForm } from "@/components/request-form"
import { ConnectionPanel } from "@/components/connection-panel"
import { MethodStatistics } from "@/components/method-statistics"
import { NotificationSidebar } from "@/components/notification-sidebar"
import { ErrorAnalysisDashboard } from "@/components/error-analysis-dashboard"
import { Activity, Zap, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponseTimeHeatmap } from "@/components/response-time-heatmap"
import { ConnectionQualityMonitor } from "@/components/connection-quality-monitor"
import { MessageDetailSidebar } from "./message-detail-sidebar"
import { findLinkedMessage } from "@/lib/message-link"
import type { ConnectionStatus } from "@/types/connection"
import type { Message } from "@/types/message"
import { useWebSocketClient } from "@/hooks/use-websocket-client"

export function WebSocketClient() {
  const { url, setUrl, status, messages, dummyMode, setDummyMode, connect, disconnect, sendMessage, sendBatchMessage, clearMessages } =
    useWebSocketClient()
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [rightSidebarTab, setRightSidebarTab] = useState<"details" | "notifications">("details")
  // connection handlers come from the hook

  // sending/clearing are provided by hook
  const clearLocal = () => {
    clearMessages()
    setSelectedMessageId(null)
  }

  const handleDummyModeToggle = (enabled: boolean) => {
    const wasConnected = status === "connected"

    if (wasConnected) {
      disconnect()
    }

    setDummyMode(enabled)

    if (wasConnected) {
      setTimeout(() => {
        connect()
      }, 500)
    }
  }

  // lifecycle managed by hook

  const selectedMessage = selectedMessageId ? messages.find((m) => m.id === selectedMessageId) : null

  const linkedMessage = selectedMessage ? (findLinkedMessage(messages, selectedMessage as any) as Message | null) : null

  const notifications = messages.filter((m) => m.isNotification)

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <h1 className="text-sm font-bold text-foreground">JSONRPC WebSocket</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={rightSidebarTab === "notifications" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setRightSidebarTab("notifications")}
              >
                <Bell className="w-3 h-3 mr-1" />
                <span className="text-xs">Notifications</span>
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3.5">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{messages.length}</span>
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

                <TabsContent value="connection" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0">
                  <ConnectionPanel
                    url={url}
                    status={status}
                    dummyMode={dummyMode}
                    onUrlChange={setUrl}
                    onConnect={connect}
                    onDisconnect={disconnect}
                    onDummyModeChange={handleDummyModeToggle}
                  />
                  <RequestForm disabled={status !== "connected"} onSend={sendMessage} onSendBatch={sendBatchMessage} />
                </TabsContent>

                <TabsContent value="statistics" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0">
                  <MethodStatistics messages={messages} />
                  <ErrorAnalysisDashboard messages={messages} />
                </TabsContent>

                <TabsContent value="performance" className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-0">
                  <ResponseTimeHeatmap messages={messages} />
                  <ConnectionQualityMonitor messages={messages} status={status} />
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
              />
            </div>

            <div className="flex flex-col min-h-0">
              <Tabs
                value={rightSidebarTab}
                onValueChange={(v) => setRightSidebarTab(v as "details" | "notifications")}
                className="flex flex-col h-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="details" className="text-xs">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="text-xs">
                    Notifications
                    {notifications.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3.5">
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
                      onSelectLinked={() => linkedMessage && setSelectedMessageId(linkedMessage.id)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full border border-border rounded-lg bg-card">
                      <p className="text-sm text-muted-foreground">Select a message to view details</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notifications" className="flex-1 min-h-0 mt-0">
                  <NotificationSidebar
                    notifications={notifications}
                    selectedNotificationId={selectedMessageId}
                    onSelectNotification={(id) => {
                      setSelectedMessageId(id)
                      setRightSidebarTab("details")
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
  )
}
