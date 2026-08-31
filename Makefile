.PHONY: build run-collector run-search-api test

build:
	go build ./...

run-collector:
	go run ./cmd/collector

run-search-api:
	go run ./cmd/search-api

test:
	go test ./...
