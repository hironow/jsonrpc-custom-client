"use client"

import { WebSocketClient } from "@/components/websocket-client"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <WebSocketClient />
    </main>
  )
}
