package proxylist

import (
	"bufio"
	"context"
	"os"
	"strings"

	"socksproxies.com/server/internal/checker"
	"socksproxies.com/server/internal/store"
)

func SeedFromFile(ctx context.Context, st store.Storer, path string, defaultProtocol string) (int, error) {
	if path == "" || st == nil {
		return 0, nil
	}

	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	count := 0
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parsed, err := checker.ParseProxyLine(line, defaultProtocol)
		if err != nil {
			continue
		}
		_, _ = st.UpsertProxy(ctx, store.ProxyRecord{Address: parsed.Address, Protocol: parsed.Protocol})
		count++
	}

	return count, scanner.Err()
}
