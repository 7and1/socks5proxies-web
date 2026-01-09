# Build stage
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /bin/server ./cmd/server

# Production stage - Alpine for SQLite file system access
FROM alpine:3.20

# Install ca-certificates for HTTPS and wget for healthcheck
RUN apk add --no-cache ca-certificates wget

# Create non-root user
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -D appuser

# Create data directory
RUN mkdir -p /data && chown appuser:appgroup /data

# Copy binary from builder
COPY --from=builder /bin/server /bin/server

ENV PORT=8080
ENV GIN_MODE=release

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/api/health || exit 1

USER appuser:appgroup

ENTRYPOINT ["/bin/server"]
