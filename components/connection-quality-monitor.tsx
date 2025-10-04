"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Wifi, WifiOff, AlertTriangle, TrendingUp } from "lucide-react"
import { useMemo } from "react"

interface Message {
  id: string
  type: "sent" | "received" | "error" | "system"
  timestamp: Date
  data: any
  responseTime?: number
}

interface ConnectionQualityMonitorProps {
  messages: Message[]
  status: "disconnected" | "connecting" | "connected" | "error"
}

interface ConnectionEvent {
  type: "connected" | "disconnected" | "error"
  timestamp: Date
  message: string
}

export function ConnectionQualityMonitor({ messages, status }: ConnectionQualityMonitorProps) {
  const connectionStats = useMemo(() => {
    // Extract connection events from system messages
    const events: ConnectionEvent[] = messages
      .filter((msg) => msg.type === "system" || msg.type === "error")
      .map((msg) => {
        const message = msg.data?.message || ""
        let type: "connected" | "disconnected" | "error" = "disconnected"

        if (message.includes("Connected") || message.includes("activated")) {
          type = "connected"
        } else if (message.includes("error") || message.includes("Failed")) {
          type = "error"
        } else if (message.includes("closed") || message.includes("deactivated")) {
          type = "disconnected"
        }

        return {
          type,
          timestamp: msg.timestamp,
          message,
        }
      })

    // Calculate statistics
    const connectEvents = events.filter((e) => e.type === "connected")
    const disconnectEvents = events.filter((e) => e.type === "disconnected")
    const errorEvents = events.filter((e) => e.type === "error")

    // Calculate uptime
    let totalUptime = 0
    let lastConnectTime: Date | null = null

    events.forEach((event) => {
      if (event.type === "connected") {
        lastConnectTime = event.timestamp
      } else if (event.type === "disconnected" && lastConnectTime) {
        totalUptime += event.timestamp.getTime() - lastConnectTime.getTime()
        lastConnectTime = null
      }
    })

    // If currently connected, add current session time
    if (status === "connected" && lastConnectTime) {
      totalUptime += Date.now() - lastConnectTime.getTime()
    }

    // Calculate average latency from response messages
    const responseTimes = messages
      .filter((msg) => msg.type === "received" && msg.responseTime !== undefined)
      .map((msg) => msg.responseTime!)

    const avgLatency = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0

    // Calculate quality score (0-100)
    let qualityScore = 100

    // Deduct points for disconnections (max -30)
    qualityScore -= Math.min(disconnectEvents.length * 10, 30)

    // Deduct points for errors (max -30)
    qualityScore -= Math.min(errorEvents.length * 15, 30)

    // Deduct points for high latency (max -20)
    if (avgLatency > 500) {
      qualityScore -= 20
    } else if (avgLatency > 200) {
      qualityScore -= 10
    } else if (avgLatency > 100) {
      qualityScore -= 5
    }

    // Ensure score is between 0 and 100
    qualityScore = Math.max(0, Math.min(100, qualityScore))

    return {
      connectCount: connectEvents.length,
      disconnectCount: disconnectEvents.length,
      errorCount: errorEvents.length,
      totalUptime,
      avgLatency,
      qualityScore,
      recentEvents: events.slice(-5).reverse(),
    }
  }, [messages, status])

  const getQualityColor = (score: number): string => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getQualityBadge = (score: number): { label: string; variant: "default" | "secondary" | "destructive" } => {
    if (score >= 80) return { label: "Excellent", variant: "default" }
    if (score >= 60) return { label: "Good", variant: "secondary" }
    if (score >= 40) return { label: "Fair", variant: "secondary" }
    return { label: "Poor", variant: "destructive" }
  }

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const qualityBadge = getQualityBadge(connectionStats.qualityScore)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Connection Quality
        </CardTitle>
        <CardDescription>Monitor WebSocket connection health and stability</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quality Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quality Score</span>
              <Badge variant={qualityBadge.variant}>{qualityBadge.label}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={connectionStats.qualityScore} className="flex-1" />
              <span className={`text-2xl font-bold ${getQualityColor(connectionStats.qualityScore)}`}>
                {connectionStats.qualityScore}
              </span>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wifi className="w-3 h-3" />
                <span>Connections</span>
              </div>
              <div className="text-lg font-bold">{connectionStats.connectCount}</div>
            </div>

            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <WifiOff className="w-3 h-3" />
                <span>Disconnections</span>
              </div>
              <div className="text-lg font-bold">{connectionStats.disconnectCount}</div>
            </div>

            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="w-3 h-3" />
                <span>Errors</span>
              </div>
              <div className="text-lg font-bold">{connectionStats.errorCount}</div>
            </div>

            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>Avg Latency</span>
              </div>
              <div className="text-lg font-bold">{connectionStats.avgLatency.toFixed(0)}ms</div>
            </div>
          </div>

          {/* Uptime */}
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Total Uptime</div>
            <div className="text-lg font-bold">{formatUptime(connectionStats.totalUptime)}</div>
          </div>

          {/* Recent Events */}
          {connectionStats.recentEvents.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Recent Events</div>
              <div className="space-y-1">
                {connectionStats.recentEvents.map((event, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30">
                    <div className="mt-0.5">
                      {event.type === "connected" && <Wifi className="w-3 h-3 text-green-500" />}
                      {event.type === "disconnected" && <WifiOff className="w-3 h-3 text-muted-foreground" />}
                      {event.type === "error" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{event.message}</div>
                      <div className="text-[10px] text-muted-foreground">{event.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
