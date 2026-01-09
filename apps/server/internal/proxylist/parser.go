package proxylist

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"socksproxies.com/server/internal/store"
)

func ParseCSV(reader io.Reader) ([]store.ProxyListRecord, error) {
	records := make([]store.ProxyListRecord, 0, 1024)
	_, err := ParseCSVInBatches(reader, 2000, func(batch []store.ProxyListRecord) error {
		records = append(records, batch...)
		return nil
	})
	return records, err
}

func ParseCSVInBatches(
	reader io.Reader,
	batchSize int,
	handler func([]store.ProxyListRecord) error,
) (int, error) {
	if batchSize <= 0 {
		batchSize = 2000
	}

	csvReader := csv.NewReader(reader)
	csvReader.Comma = ';'
	csvReader.FieldsPerRecord = -1

	headers, err := csvReader.Read()
	if err != nil {
		return 0, fmt.Errorf("read headers: %w", err)
	}

	headerIndex := map[string]int{}
	for idx, header := range headers {
		headerIndex[strings.TrimSpace(strings.ToLower(header))] = idx
	}

	get := func(row []string, key string) string {
		idx, ok := headerIndex[key]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	records := make([]store.ProxyListRecord, 0, batchSize)
	now := time.Now().UTC()
	processed := 0

	for {
		row, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return processed, fmt.Errorf("read row: %w", err)
		}

		ip := get(row, "ip")
		host := get(row, "host")
		if ip == "" {
			ip = host
		}

		port := parseInt(get(row, "port"))
		if ip == "" || port <= 0 {
			continue
		}

		lastSeen := parseLastSeen(get(row, "lastseen"), now)
		if lastSeen.IsZero() {
			lastSeen = now
		}

		record := store.ProxyListRecord{
			Host:          fallback(host, ip),
			IP:            ip,
			Port:          port,
			LastSeen:      lastSeen,
			Delay:         parseInt(get(row, "delay")),
			CID:           get(row, "cid"),
			CountryCode:   strings.ToUpper(get(row, "country_code")),
			CountryName:   get(row, "country_name"),
			City:          get(row, "city"),
			Region:        get(row, "region"),
			ASN:           parseInt(get(row, "asn")),
			ASNName:       get(row, "asn_name"),
			Org:           get(row, "org"),
			ContinentCode: strings.ToUpper(get(row, "continent_code")),
			ChecksUp:      parseInt(get(row, "checks_up")),
			ChecksDown:    parseInt(get(row, "checks_down")),
			Anon:          parseInt(get(row, "anon")),
			HTTP:          parseInt(get(row, "http")),
			SSL:           parseInt(get(row, "ssl")),
			Socks4:        parseInt(get(row, "socks4")),
			Socks5:        parseInt(get(row, "socks5")),
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		records = append(records, record)
		processed++

		if len(records) >= batchSize {
			if err := handler(records); err != nil {
				return processed, err
			}
			records = records[:0]
		}
	}

	if len(records) > 0 {
		if err := handler(records); err != nil {
			return processed, err
		}
	}

	return processed, nil
}

func parseInt(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return value
}

func parseLastSeen(raw string, now time.Time) time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}
	}

	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value <= 0 {
		return time.Time{}
	}

	switch {
	case value > 1_000_000_000_000:
		return time.UnixMilli(value).UTC()
	case value > 1_000_000_000:
		return time.Unix(value, 0).UTC()
	default:
		return now.Add(-time.Duration(value) * time.Second)
	}
}

func fallback(primary, secondary string) string {
	if primary != "" {
		return primary
	}
	return secondary
}
