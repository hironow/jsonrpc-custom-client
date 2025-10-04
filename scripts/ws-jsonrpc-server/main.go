package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

type rpcRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
	ID      interface{} `json:"id,omitempty"`
}

type rpcError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type rpcResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   *rpcError   `json:"error,omitempty"`
	ID      interface{} `json:"id"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for local development
		return true
	},
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}
	defer conn.Close()

	conn.SetReadLimit(1048576)
	_ = conn.SetReadDeadline(time.Time{})

	// Periodic notification stream (heartbeat)
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				notif := map[string]interface{}{
					"jsonrpc": "2.0",
					"method":  "stream.heartbeat",
					"params": map[string]interface{}{
						"t": time.Now().UnixMilli(),
					},
				}
				if err := conn.WriteJSON(notif); err != nil {
					// client likely disconnected
					return
				}
			case <-done:
				return
			}
		}
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			// client disconnected
			close(done)
			return
		}

		// Try parse as batch first
		var rawBatch []json.RawMessage
		if err := json.Unmarshal(message, &rawBatch); err == nil {
			// batch
			res := make([]rpcResponse, 0, len(rawBatch))
			for _, item := range rawBatch {
				resp, ok := handleSingle(item)
				if ok {
					res = append(res, resp)
				}
			}
			if len(res) > 0 {
				if err := conn.WriteJSON(res); err != nil {
					log.Println("write batch error:", err)
					return
				}
			}
			continue
		}

		// single
		if resp, ok := handleSingle(message); ok {
			if err := conn.WriteJSON(resp); err != nil {
				log.Println("write single error:", err)
				close(done)
				return
			}
		}
	}
}

func handleSingle(raw json.RawMessage) (rpcResponse, bool) {
	var req rpcRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		// Parse error: id MUST be null
		return rpcResponse{
			JSONRPC: "2.0",
			Error:   &rpcError{Code: -32700, Message: "Parse error"},
			ID:      nil,
		}, true
	}

	// Notifications: no id -> no response
	if req.ID == nil {
		return rpcResponse{}, false
	}

	if req.JSONRPC != "2.0" {
		return rpcResponse{
			JSONRPC: "2.0",
			Error:   &rpcError{Code: -32600, Message: "Invalid Request: jsonrpc must be '2.0'"},
			ID:      req.ID,
		}, true
	}

	switch req.Method {
	case "ping":
		// Simple pong result; echo params if needed
		return rpcResponse{
			JSONRPC: "2.0",
			Result:  map[string]interface{}{"pong": true},
			ID:      req.ID,
		}, true
	case "echo":
		// Echo back params as result
		return rpcResponse{
			JSONRPC: "2.0",
			Result:  req.Params,
			ID:      req.ID,
		}, true
	default:
		return rpcResponse{
			JSONRPC: "2.0",
			Error:   &rpcError{Code: -32601, Message: "Method not found"},
			ID:      req.ID,
		}, true
	}
}

func main() {
	addr := flag.String("addr", ":9191", "listen address (e.g. :9191)")
	path := flag.String("path", "/ws", "websocket path")
	flag.Parse()

	mux := http.NewServeMux()
	mux.HandleFunc(*path, handleWS)

	log.Printf("JSON-RPC WS server listening on ws://localhost%s%s\n", *addr, *path)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}
