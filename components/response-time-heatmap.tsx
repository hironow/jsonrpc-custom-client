"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

interface Message {
  id: string
  type: "sent" | "received"
  timestamp: Date | number
  data: any
  latency?: number
  responseTime?: number
  isBatch?: boolean
}

interface ResponseTimeHeatmapProps {
  messages: Message[]
}

interface HeatmapCell {
  method: string
  timeBucket: number
  avgLatency: number
  count: number
}

export function ResponseTimeHeatmap({ messages }: ResponseTimeHeatmapProps) {
  const calculateHeatmapData = (): HeatmapCell[] => {
    const cells: Map<string, { totalLatency: number; count: number }> = new Map()

    // Get time range
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const bucketSize = 5 * 60 * 1000 // 5 minutes

    // Process messages
    messages.forEach((msg) => {
      const latency = msg.responseTime || msg.latency
      const timestamp = msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp

      if (msg.type === "received" && latency && timestamp >= oneHourAgo) {
        const method = msg.isBatch ? "batch" : msg.data?.method || "unknown"
        const timeBucket = Math.floor(timestamp / bucketSize) * bucketSize
        const key = `${method}-${timeBucket}`

        const existing = cells.get(key) || { totalLatency: 0, count: 0 }
        cells.set(key, {
          totalLatency: existing.totalLatency + latency,
          count: existing.count + 1,
        })
      }
    })

    // Convert to array
    return Array.from(cells.entries()).map(([key, value]) => {
      const [method, timeBucket] = key.split("-")
      return {
        method,
        timeBucket: Number.parseInt(timeBucket),
        avgLatency: value.totalLatency / value.count,
        count: value.count,
      }
    })
  }

  const heatmapData = calculateHeatmapData()

  // Get unique methods and time buckets
  const methods = Array.from(new Set(heatmapData.map((cell) => cell.method))).sort()
  const timeBuckets = Array.from(new Set(heatmapData.map((cell) => cell.timeBucket))).sort((a, b) => a - b)

  // Get color based on latency
  const getColor = (latency: number): string => {
    if (latency < 50) return "bg-green-500"
    if (latency < 100) return "bg-green-400"
    if (latency < 200) return "bg-yellow-400"
    if (latency < 500) return "bg-orange-400"
    return "bg-red-500"
  }

  // Format time bucket
  const formatTimeBucket = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Get cell data
  const getCellData = (method: string, timeBucket: number): HeatmapCell | undefined => {
    return heatmapData.find((cell) => cell.method === method && cell.timeBucket === timeBucket)
  }

  if (heatmapData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Response Time Heatmap
          </CardTitle>
          <CardDescription>Visualize response times by method and time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No response data available yet. Send some requests to see the heatmap.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Response Time Heatmap
        </CardTitle>
        <CardDescription>Last hour - Response times by method and time (5-minute intervals)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Latency:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>&lt;50ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <span>100-200ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-400 rounded" />
              <span>200-500ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>&gt;500ms</span>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Time labels */}
              <div className="flex gap-1 mb-1 ml-24">
                {timeBuckets.map((bucket) => (
                  <div key={bucket} className="text-xs text-muted-foreground text-center" style={{ width: "40px" }}>
                    {formatTimeBucket(bucket)}
                  </div>
                ))}
              </div>

              {/* Method rows */}
              {methods.map((method) => (
                <div key={method} className="flex items-center gap-1 mb-1">
                  <div className="w-24 text-xs font-medium truncate" title={method}>
                    {method}
                  </div>
                  {timeBuckets.map((bucket) => {
                    const cellData = getCellData(method, bucket)
                    return (
                      <div
                        key={`${method}-${bucket}`}
                        className="relative group"
                        style={{ width: "40px", height: "32px" }}
                      >
                        {cellData ? (
                          <>
                            <div
                              className={`w-full h-full rounded ${getColor(cellData.avgLatency)} transition-opacity hover:opacity-80`}
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                                <div className="font-medium">{method}</div>
                                <div className="text-muted-foreground">{formatTimeBucket(bucket)}</div>
                                <div className="mt-1">Avg: {cellData.avgLatency.toFixed(0)}ms</div>
                                <div>Count: {cellData.count}</div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full rounded bg-muted/20" />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span>Total data points: {heatmapData.reduce((sum, cell) => sum + cell.count, 0)}</span>
            <span>Methods: {methods.length}</span>
            <span>Time range: {timeBuckets.length * 5} minutes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
