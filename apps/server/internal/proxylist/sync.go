package proxylist

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	"socksproxies.com/server/internal/geoip"
	"socksproxies.com/server/internal/store"
)

type SyncConfig struct {
	SourceURL      string
	SyncInterval   time.Duration
	WebCacheTTL    time.Duration
	APICacheTTL    time.Duration
	RequestTimeout time.Duration
}

type Syncer struct {
	config SyncConfig
	store  store.ProxyListStore
	redis  *redis.Client
	geo    *geoip.Reader
	client *http.Client
}

func NewSyncer(config SyncConfig, store store.ProxyListStore, redis *redis.Client, geo *geoip.Reader) *Syncer {
	timeout := config.RequestTimeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	if config.SyncInterval <= 0 {
		config.SyncInterval = 5 * time.Minute
	}
	return &Syncer{
		config: config,
		store:  store,
		redis:  redis,
		geo:    geo,
		client: &http.Client{Timeout: timeout},
	}
}

func (s *Syncer) Start(ctx context.Context) {
	if s == nil || s.store == nil || s.config.SourceURL == "" {
		return
	}

	ticker := time.NewTicker(s.config.SyncInterval)
	defer ticker.Stop()

	if err := s.sync(ctx); err != nil {
		log.Printf("[proxylist] initial sync failed: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.sync(ctx); err != nil {
				log.Printf("[proxylist] sync failed: %v", err)
			}
		}
	}
}

func (s *Syncer) sync(ctx context.Context) error {
	// Performance: Add timeout to prevent indefinite sync operations
	syncCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	start := time.Now()

	reader, err := s.fetchCSV(syncCtx)
	if err != nil {
		return err
	}
	defer reader.Close()

	updated := 0
	processed, err := ParseCSVInBatches(reader, 5000, func(batch []store.ProxyListRecord) error {
		enriched := s.enrichRecords(batch)
		count, err := s.store.UpsertProxyListBatch(ctx, enriched)
		if err != nil {
			return err
		}
		updated += count
		return nil
	})
	if err != nil {
		return err
	}

	if err := s.store.RebuildProxyFacets(ctx); err != nil {
		return err
	}

	if s.redis != nil {
		// Performance: Invalidate cached data and update sync timestamp
		pipe := s.redis.Pipeline()
		pipe.Set(ctx, "proxylist:last_sync", time.Now().UTC().Unix(), 0)
		// Invalidate stats cache to ensure fresh data
		pipe.Del(ctx, "proxylist:stats")
		_, _ = pipe.Exec(ctx)
	}

	log.Printf("[proxylist] synced %d/%d records in %s", updated, processed, time.Since(start))
	return nil
}

func (s *Syncer) fetchCSV(ctx context.Context) (io.ReadCloser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.config.SourceURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Socks5Proxies/1.0 (+https://socks5proxies.com)")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_ = resp.Body.Close()
		return nil, fmt.Errorf("fetch csv: status %d", resp.StatusCode)
	}
	return resp.Body, nil
}

func (s *Syncer) enrichRecords(records []store.ProxyListRecord) []store.ProxyListRecord {
	if s.geo == nil {
		return records
	}

	for i := range records {
		record := &records[i]
		if record.IP == "" {
			continue
		}

		if record.CountryCode == "" || record.CountryName == "" || record.City == "" || record.Region == "" || record.ContinentCode == "" {
			cityInfo := s.geo.LookupCity(record.IP)
			if record.CountryCode == "" {
				record.CountryCode = cityInfo.CountryCode
			}
			if record.CountryName == "" {
				record.CountryName = cityInfo.CountryName
			}
			if record.City == "" {
				record.City = cityInfo.City
			}
			if record.Region == "" {
				record.Region = cityInfo.Region
			}
			if record.ContinentCode == "" {
				record.ContinentCode = cityInfo.ContinentCode
			}
		}

		if record.ASN == 0 || record.ASNName == "" || record.Org == "" {
			asnInfo := s.geo.LookupASN(record.IP)
			if record.ASN == 0 {
				record.ASN = asnInfo.Number
			}
			if record.ASNName == "" {
				record.ASNName = asnInfo.Name
			}
			if record.Org == "" {
				record.Org = asnInfo.Organization
			}
		}
	}

	return records
}
