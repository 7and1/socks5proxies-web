.PHONY: help deploy build down logs restart validate clean test test-web test-server build-web build-server lint-web lint-server ci obs-up obs-down obs-logs

# Default target
.DEFAULT_GOAL := help

# Project name
PROJECT_NAME := socksproxies

# Docker compose command
COMPOSE := docker-compose

## help: Show this help message
help:
	@echo "$(PROJECT_NAME) - Deployment Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

## deploy: Build and start all containers
deploy:
	@echo "Building and starting containers..."
	$(COMPOSE) up -d --build
	@echo "Waiting for services to be healthy..."
	@sleep 5
	$(COMPOSE) ps

## obs-up: Start observability stack (Prometheus/Grafana/OTel)
obs-up:
	@echo "Starting observability stack..."
	$(COMPOSE) -f deploy/monitoring/docker-compose.observability.yml up -d

## obs-down: Stop observability stack
obs-down:
	@echo "Stopping observability stack..."
	$(COMPOSE) -f deploy/monitoring/docker-compose.observability.yml down

## obs-logs: Tail observability logs
obs-logs:
	$(COMPOSE) -f deploy/monitoring/docker-compose.observability.yml logs -f

## build: Build containers without starting
build:
	@echo "Building containers..."
	$(COMPOSE) build

## up: Start containers (without rebuild)
up:
	@echo "Starting containers..."
	$(COMPOSE) up -d

## down: Stop and remove all containers
down:
	@echo "Stopping containers..."
	$(COMPOSE) down

## restart: Restart all containers
restart:
	@echo "Restarting containers..."
	$(COMPOSE) restart

## logs: Show logs from all containers
logs:
	$(COMPOSE) logs -f

## logs-api: Show API container logs
logs-api:
	$(COMPOSE) logs -f api

## logs-web: Show web container logs
logs-web:
	$(COMPOSE) logs -f web

## logs-redis: Show Redis container logs
logs-redis:
	$(COMPOSE) logs -f redis

## ps: Show running containers
ps:
	$(COMPOSE) ps

## validate: Validate Docker configuration
validate:
	@echo "Validating docker-compose.yml..."
	docker-compose config > /dev/null
	@echo "Configuration is valid."

## shell-api: Open shell in API container
shell-api:
	docker exec -it socksproxies-api sh

## shell-web: Open shell in web container
shell-web:
	docker exec -it socksproxies-web sh

## shell-redis: Open redis-cli
shell-redis:
	docker exec -it socksproxies-redis redis-cli

## clean: Stop containers and remove build cache (SAFE - preserves volumes)
clean:
	@echo "Stopping containers (volumes preserved)..."
	$(COMPOSE) down
	docker builder prune -f
	@echo "Clean complete. Data volumes preserved in ./data/"

## health: Check health of all services
health:
	@echo "Checking service health..."
	@echo "API Health:"
	@curl -s http://localhost:8080/api/health || echo "API not responding"
	@echo ""
	@echo "Web Health:"
	@curl -s http://localhost:3000/api/health || echo "Web not responding"
	@echo ""
	@$(COMPOSE) ps

## test: Run all tests
test: test-web test-server
	@echo "All tests completed."

## test-web: Run frontend tests
test-web:
	@echo "Running frontend tests..."
	cd apps/web && npm run test

## test-server: Run backend tests
test-server:
	@echo "Running backend tests..."
	cd apps/server && go test ./...

## build-web: Build frontend for production
build-web:
	@echo "Building frontend..."
	cd apps/web && npm run build

## build-server: Build backend binary
build-server:
	@echo "Building backend..."
	cd apps/server && go build -o bin/server ./cmd/server

## lint-web: Lint frontend code
lint-web:
	@echo "Linting frontend..."
	cd apps/web && npm run lint

## lint-server: Lint backend code
lint-server:
	@echo "Linting backend..."
	cd apps/server && go vet ./...

## ci: Run CI checks (build, test, lint)
ci: build-web build-server test-web test-server lint-web lint-server
	@echo "CI checks passed."
