# Multi-stage build for Go WS JSONRPC server targeting Cloud Run

FROM golang:1.21-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server .

FROM gcr.io/distroless/static-debian12
ENV PORT=8080
EXPOSE 8080
COPY --from=builder /out/server /server
USER 65532:65532
ENTRYPOINT ["/server"]
