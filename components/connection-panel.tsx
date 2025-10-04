"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Plug, PlugZap, AlertCircle, Loader2, TestTube, ChevronDown, ChevronUp } from "lucide-react"
import type { ConnectionStatus } from "./websocket-client"
import { useState, useEffect } from "react"

type ConnectionPanelProps = {
  url: string
  status: ConnectionStatus
  dummyMode: boolean
  onUrlChange: (url: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onDummyModeChange: (enabled: boolean) => void
}

export function ConnectionPanel({
  url,
  status,
  dummyMode,
  onUrlChange,
  onConnect,
  onDisconnect,
  onDummyModeChange,
}: ConnectionPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (status === "connected") {
      setIsCollapsed(true)
    }
  }, [status])

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
        }
      case "connecting":
        return {
          badge: (
            <Badge className="bg-warning text-warning-foreground">
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Connecting
            </Badge>
          ),
          icon: <Loader2 className="w-4 h-4 text-warning animate-spin" />,
        }
      case "error":
        return {
          badge: (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1.5" />
              Error
            </Badge>
          ),
          icon: <AlertCircle className="w-4 h-4 text-destructive" />,
        }
      default:
        return {
          badge: (
            <Badge variant="secondary">
              <span className="w-2 h-2 rounded-full bg-muted-foreground mr-1.5" />
              Disconnected
            </Badge>
          ),
          icon: <Plug className="w-4 h-4 text-muted-foreground" />,
        }
    }
  }

  const statusConfig = getStatusConfig()

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
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onDisconnect} variant="destructive" size="sm" className="flex-1 h-7 text-xs">
              Disconnect
            </Button>
            <Button onClick={() => setIsCollapsed(false)} variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-3 bg-card border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground">Connection</h2>
        <div className="flex items-center gap-2">
          {statusConfig.badge}
          {status === "connected" && (
            <Button onClick={() => setIsCollapsed(true)} variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border">
          <div className="flex items-center gap-1.5">
            <TestTube className="w-3 h-3 text-muted-foreground" />
            <Label htmlFor="dummy-mode" className="text-xs font-medium cursor-pointer">
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

        {dummyMode && (
          <div className="p-2 rounded bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary/90">Simulating JSONRPC stream with sample data</p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">WebSocket URL</label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <div className="absolute left-2 top-1/2 -translate-y-1/2">{statusConfig.icon}</div>
              <Input
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="ws://localhost:8080"
                disabled={status === "connected" || status === "connecting" || dummyMode}
                className="pl-8 h-8 bg-input border-border text-foreground font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          {status === "connected" ? (
            <Button onClick={onDisconnect} variant="destructive" className="flex-1 h-8 text-xs">
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
              <p className="font-mono text-foreground text-xs">{dummyMode ? "Simulated" : "WebSocket"}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
