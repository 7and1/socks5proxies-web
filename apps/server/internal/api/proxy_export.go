package api

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"socksproxies.com/server/internal/config"
	"socksproxies.com/server/internal/store"
)

const (
	exportDefaultLimit    = 5000
	exportMaxTotal        = 100000
	exportDefaultPageSize = 5000
	exportMaxPageSize     = 5000
	jobTimeout            = 15 * time.Minute
)

type exportOptions struct {
	Format     string
	Filters    store.ProxyListFilters
	TotalLimit int
	PageSize   int
	Offset     int
	Stream     bool
	Async      bool
}

type ExportJobStatus string

const (
	exportJobQueued    ExportJobStatus = "queued"
	exportJobRunning   ExportJobStatus = "running"
	exportJobCompleted ExportJobStatus = "completed"
	exportJobFailed    ExportJobStatus = "failed"
	exportJobExpired   ExportJobStatus = "expired"
)

type ExportJob struct {
	ID        string                 `json:"id"`
	Status    ExportJobStatus        `json:"status"`
	Format    string                 `json:"format"`
	Filters   store.ProxyListFilters `json:"filters"`
	Limit     int                    `json:"limit"`
	Offset    int                    `json:"offset"`
	PageSize  int                    `json:"page_size"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
	ExpiresAt time.Time              `json:"expires_at"`
	Processed int                    `json:"processed"`
	SizeBytes int64                  `json:"size_bytes,omitempty"`
	Error     string                 `json:"error,omitempty"`
	FilePath  string                 `json:"-"`
}

type ExportManager struct {
	store store.ProxyListStore
	redis *redis.Client
	dir   string
	ttl   time.Duration
	mu    sync.Mutex
	jobs  map[string]ExportJob
}

func NewExportManager(cfg config.Config, store store.ProxyListStore, redis *redis.Client) *ExportManager {
	if store == nil {
		return nil
	}
	dir := cfg.ExportDir
	if dir == "" {
		dir = "./data/exports"
	}
	_ = os.MkdirAll(dir, 0o755)

	return &ExportManager{
		store: store,
		redis: redis,
		dir:   dir,
		ttl:   cfg.ExportJobTTL,
		jobs:  make(map[string]ExportJob),
	}
}

func (m *ExportManager) CreateJob(ctx context.Context, format string, filters store.ProxyListFilters, limit, offset, pageSize int) (*ExportJob, error) {
	if m == nil {
		return nil, errors.New("export manager unavailable")
	}
	if !isExportFormatSupported(format) {
		return nil, fmt.Errorf("unsupported export format: %s", format)
	}

	jobID, err := newExportJobID()
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = exportDefaultLimit
	}
	if pageSize <= 0 {
		pageSize = exportDefaultPageSize
	}
	if pageSize > exportMaxPageSize {
		pageSize = exportMaxPageSize
	}
	if limit > exportMaxTotal {
		limit = exportMaxTotal
	}
	if filters.Limit <= 0 {
		filters.Limit = pageSize
	}
	filters.Offset = offset

	now := time.Now().UTC()
	job := &ExportJob{
		ID:        jobID,
		Status:    exportJobQueued,
		Format:    format,
		Filters:   filters,
		Limit:     limit,
		Offset:    offset,
		PageSize:  pageSize,
		CreatedAt: now,
		UpdatedAt: now,
		ExpiresAt: now.Add(m.ttl),
		FilePath:  filepath.Join(m.dir, fmt.Sprintf("proxy-export-%s.%s", jobID, format)),
	}

	if err := m.saveJob(ctx, job); err != nil {
		return nil, err
	}

	exportJobsTotal.WithLabelValues(string(exportJobQueued), format).Inc()

	go m.runJob(job)

	return job, nil
}

func (m *ExportManager) GetJob(ctx context.Context, id string) (*ExportJob, error) {
	if m == nil {
		return nil, errors.New("export manager unavailable")
	}
	if id == "" {
		return nil, errors.New("missing job id")
	}

	if m.redis != nil {
		key := exportJobKey(id)
		raw, err := m.redis.Get(ctx, key).Result()
		if err != nil || raw == "" {
			return nil, os.ErrNotExist
		}
		var job ExportJob
		if err := json.Unmarshal([]byte(raw), &job); err != nil {
			return nil, err
		}
		if job.FilePath == "" {
			job.FilePath = filepath.Join(m.dir, fmt.Sprintf("proxy-export-%s.%s", job.ID, job.Format))
		}
		if job.ExpiresAt.Before(time.Now().UTC()) {
			_ = m.redis.Del(ctx, key).Err()
			cleanupExportFile(job.FilePath)
			job.Status = exportJobExpired
			return &job, os.ErrNotExist
		}
		return &job, nil
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	job, ok := m.jobs[id]
	if !ok {
		return nil, os.ErrNotExist
	}
	if job.ExpiresAt.Before(time.Now().UTC()) {
		delete(m.jobs, id)
		cleanupExportFile(job.FilePath)
		job.Status = exportJobExpired
		return nil, os.ErrNotExist
	}
	copy := job
	return &copy, nil
}

func (m *ExportManager) runJob(job *ExportJob) {
	if job == nil {
		return
	}
	start := time.Now()
	exportJobsInFlight.WithLabelValues(job.Format).Inc()
	defer exportJobsInFlight.WithLabelValues(job.Format).Dec()

	ctx, cancel := context.WithTimeout(context.Background(), jobTimeout)
	defer cancel()

	job.Status = exportJobRunning
	job.UpdatedAt = time.Now().UTC()
	_ = m.saveJob(ctx, job)

	file, err := os.Create(job.FilePath)
	if err != nil {
		m.failJob(ctx, job, err)
		return
	}

	buffered := bufio.NewWriter(file)
	written, err := exportProxyList(ctx, buffered, m.store, job.Format, job.Filters, job.Limit, job.PageSize, func() error {
		return buffered.Flush()
	})
	if flushErr := buffered.Flush(); flushErr != nil && err == nil {
		err = flushErr
	}
	if closeErr := file.Close(); closeErr != nil && err == nil {
		err = closeErr
	}

	if err != nil {
		m.failJob(ctx, job, err)
		cleanupExportFile(job.FilePath)
		exportJobsTotal.WithLabelValues(string(exportJobFailed), job.Format).Inc()
		exportJobDuration.WithLabelValues(string(exportJobFailed), job.Format).Observe(time.Since(start).Seconds())
		return
	}

	info, statErr := os.Stat(job.FilePath)
	if statErr == nil {
		job.SizeBytes = info.Size()
	}
	job.Processed = written
	job.Status = exportJobCompleted
	job.UpdatedAt = time.Now().UTC()
	_ = m.saveJob(ctx, job)

	m.scheduleCleanup(job)

	exportJobsTotal.WithLabelValues(string(exportJobCompleted), job.Format).Inc()
	exportJobDuration.WithLabelValues(string(exportJobCompleted), job.Format).Observe(time.Since(start).Seconds())
	if job.SizeBytes > 0 {
		exportJobSizeBytes.WithLabelValues(job.Format).Observe(float64(job.SizeBytes))
	}
}

func (m *ExportManager) failJob(ctx context.Context, job *ExportJob, err error) {
	job.Status = exportJobFailed
	job.Error = err.Error()
	job.UpdatedAt = time.Now().UTC()
	_ = m.saveJob(ctx, job)
	m.scheduleCleanup(job)
}

func (m *ExportManager) saveJob(ctx context.Context, job *ExportJob) error {
	if m.redis != nil {
		key := exportJobKey(job.ID)
		payload, err := json.Marshal(job)
		if err != nil {
			return err
		}
		return m.redis.Set(ctx, key, payload, m.ttl).Err()
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.jobs[job.ID] = *job
	return nil
}

func (m *ExportManager) deleteJob(ctx context.Context, id string) error {
	if m.redis != nil {
		return m.redis.Del(ctx, exportJobKey(id)).Err()
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.jobs, id)
	return nil
}

func (m *ExportManager) scheduleCleanup(job *ExportJob) {
	if m == nil || job == nil {
		return
	}
	ttl := time.Until(job.ExpiresAt)
	if ttl <= 0 {
		ttl = time.Hour
	}
	time.AfterFunc(ttl, func() {
		cleanupExportFile(job.FilePath)
		_ = m.deleteJob(context.Background(), job.ID)
	})
}

func (h *Handler) CreateExportJob(c *gin.Context) {
	if h.proxyStore == nil {
		RespondError(c, http.StatusServiceUnavailable, "PROXYLIST_UNAVAILABLE", "proxy list not configured", nil)
		return
	}
	if h.exportManager == nil {
		RespondError(c, http.StatusServiceUnavailable, "EXPORT_UNAVAILABLE", "export jobs unavailable", nil)
		return
	}

	req := struct {
		Format    string `json:"format"`
		Country   string `json:"country"`
		Protocol  string `json:"protocol"`
		Port      int    `json:"port"`
		Anonymity string `json:"anonymity"`
		City      string `json:"city"`
		Region    string `json:"region"`
		ASN       int    `json:"asn"`
		Limit     int    `json:"limit"`
		Offset    int    `json:"offset"`
		PageSize  int    `json:"page_size"`
	}{
		Format: c.Query("format"),
	}

	_ = c.ShouldBindJSON(&req)
	if req.Format == "" {
		req.Format = strings.ToLower(strings.TrimPrefix(c.Param("format"), "."))
	}
	if req.Country == "" {
		req.Country = c.Query("country")
	}
	if req.Protocol == "" {
		req.Protocol = c.Query("protocol")
	}
	if req.Port == 0 {
		req.Port = parsePort(c.Query("port"))
	}
	if req.Anonymity == "" {
		req.Anonymity = c.Query("anonymity")
	}
	if req.City == "" {
		req.City = c.Query("city")
	}
	if req.Region == "" {
		req.Region = c.Query("region")
	}
	if req.ASN == 0 {
		req.ASN = parseASN(c.Query("asn"))
	}
	if req.Limit == 0 {
		req.Limit = parseLimit(c.Query("limit"), exportDefaultLimit, exportMaxTotal)
	}
	if req.PageSize == 0 {
		req.PageSize = parseLimit(c.Query("page_size"), exportDefaultPageSize, exportMaxPageSize)
	}

	filters := store.ProxyListFilters{
		CountryCode: sanitizeCountry(req.Country),
		Protocol:    sanitizeProtocol(req.Protocol),
		Port:        req.Port,
		Anonymity:   sanitizeAnonymity(req.Anonymity),
		City:        sanitizeLabel(req.City),
		Region:      sanitizeLabel(req.Region),
		ASN:         req.ASN,
		Limit:       req.PageSize,
		Offset:      req.Offset,
	}

	job, err := h.exportManager.CreateJob(c.Request.Context(), strings.ToLower(req.Format), filters, req.Limit, req.Offset, req.PageSize)
	if err != nil {
		RespondError(c, http.StatusBadRequest, "EXPORT_JOB_ERROR", err.Error(), nil)
		return
	}

	statusURL := fmt.Sprintf("/api/proxies/export/jobs/%s", job.ID)
	downloadURL := fmt.Sprintf("/api/proxies/export/jobs/%s/download", job.ID)
	c.Header("Location", statusURL)
	c.JSON(http.StatusAccepted, gin.H{
		"data": job,
		"links": gin.H{
			"status":   statusURL,
			"download": downloadURL,
		},
	})
}

func (h *Handler) GetExportJob(c *gin.Context) {
	if h.exportManager == nil {
		RespondError(c, http.StatusServiceUnavailable, "EXPORT_UNAVAILABLE", "export jobs unavailable", nil)
		return
	}
	jobID := strings.TrimSpace(c.Param("id"))
	job, err := h.exportManager.GetJob(c.Request.Context(), jobID)
	if err != nil {
		RespondError(c, http.StatusNotFound, "EXPORT_JOB_NOT_FOUND", "export job not found", nil)
		return
	}

	response := gin.H{"data": job}
	if job.Status == exportJobCompleted {
		response["links"] = gin.H{
			"download": fmt.Sprintf("/api/proxies/export/jobs/%s/download", job.ID),
		}
	}
	c.JSON(http.StatusOK, response)
}

func (h *Handler) DownloadExportJob(c *gin.Context) {
	if h.exportManager == nil {
		RespondError(c, http.StatusServiceUnavailable, "EXPORT_UNAVAILABLE", "export jobs unavailable", nil)
		return
	}
	jobID := strings.TrimSpace(c.Param("id"))
	job, err := h.exportManager.GetJob(c.Request.Context(), jobID)
	if err != nil {
		RespondError(c, http.StatusNotFound, "EXPORT_JOB_NOT_FOUND", "export job not found", nil)
		return
	}
	if job.Status != exportJobCompleted {
		RespondError(c, http.StatusConflict, "EXPORT_JOB_NOT_READY", "export job is not ready", nil)
		return
	}
	if job.FilePath == "" {
		RespondError(c, http.StatusNotFound, "EXPORT_FILE_NOT_FOUND", "export file not found", nil)
		return
	}

	filename := filepath.Base(job.FilePath)
	c.Header("Cache-Control", "private, max-age=60")
	c.FileAttachment(job.FilePath, filename)
}

func parseExportOptions(c *gin.Context, format string) exportOptions {
	pageSize := parseLimit(c.Query("page_size"), exportDefaultPageSize, exportMaxPageSize)
	totalLimit := parseLimit(c.Query("limit"), exportDefaultLimit, exportMaxTotal)
	offset := parseOffset(c.Query("offset"))
	page := parseLimit(c.Query("page"), 0, 1_000_000)
	if page > 1 {
		offset = (page - 1) * pageSize
	}

	filters := buildProxyListFiltersForExport(c, pageSize, offset)

	return exportOptions{
		Format:     format,
		Filters:    filters,
		TotalLimit: totalLimit,
		PageSize:   pageSize,
		Offset:     offset,
		Stream:     parseBool(c.Query("stream")),
		Async:      parseBool(c.Query("async")),
	}
}

func buildProxyListFiltersForExport(c *gin.Context, limit, offset int) store.ProxyListFilters {
	return store.ProxyListFilters{
		CountryCode: sanitizeCountry(c.Query("country")),
		Protocol:    sanitizeProtocol(c.Query("protocol")),
		Port:        parsePort(c.Query("port")),
		Anonymity:   sanitizeAnonymity(c.Query("anonymity")),
		City:        sanitizeLabel(c.Query("city")),
		Region:      sanitizeLabel(c.Query("region")),
		ASN:         parseASN(c.Query("asn")),
		Limit:       limit,
		Offset:      offset,
	}
}

func parseBool(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func isExportFormatSupported(format string) bool {
	switch format {
	case "txt", "text", "list", "csv", "json", "clash", "surfshark":
		return true
	default:
		return false
	}
}

func exportProxyList(ctx context.Context, writer io.Writer, store store.ProxyListStore, format string, filters store.ProxyListFilters, totalLimit, pageSize int, flush func() error) (int, error) {
	if store == nil {
		return 0, errors.New("proxy list store unavailable")
	}
	if totalLimit <= 0 {
		return 0, nil
	}

	format = strings.ToLower(strings.TrimPrefix(format, "."))
	if !isExportFormatSupported(format) {
		return 0, fmt.Errorf("unsupported export format: %s", format)
	}

	processed := 0
	remaining := totalLimit
	offset := filters.Offset
	index := 0
	firstJSON := true

	var csvWriter *csv.Writer
	if format == "csv" {
		csvWriter = csv.NewWriter(writer)
		if err := csvWriter.Write([]string{
			"ip",
			"port",
			"country_code",
			"country_name",
			"city",
			"region",
			"asn",
			"asn_name",
			"org",
			"protocols",
			"anonymity",
			"uptime",
			"delay_ms",
			"last_seen",
		}); err != nil {
			return processed, err
		}
		csvWriter.Flush()
		if err := csvWriter.Error(); err != nil {
			return processed, err
		}
	}

	if format == "json" {
		if _, err := writer.Write([]byte(`{"data":[`)); err != nil {
			return processed, err
		}
	}

	if format == "clash" {
		if _, err := writer.Write([]byte("proxies:\n")); err != nil {
			return processed, err
		}
	}

	for remaining > 0 {
		select {
		case <-ctx.Done():
			return processed, ctx.Err()
		default:
		}

		batchLimit := pageSize
		if remaining < batchLimit {
			batchLimit = remaining
		}
		filters.Limit = batchLimit
		filters.Offset = offset

		records, _, err := store.ListProxyList(ctx, filters)
		if err != nil {
			return processed, err
		}
		if len(records) == 0 {
			break
		}

		for _, record := range records {
			item := transformProxyRecord(record)
			switch format {
			case "txt", "text", "list":
				if _, err := fmt.Fprintf(writer, "%s:%d\n", item.IP, item.Port); err != nil {
					return processed, err
				}
			case "csv":
				recordRow := []string{
					item.IP,
					strconv.Itoa(item.Port),
					item.CountryCode,
					item.CountryName,
					item.City,
					item.Region,
					intToString(item.ASN),
					item.ASNName,
					item.Org,
					strings.Join(item.Protocols, "|"),
					item.AnonymityLevel,
					strconv.Itoa(item.Uptime),
					strconv.Itoa(item.Delay),
					item.LastSeen,
				}
				if err := csvWriter.Write(recordRow); err != nil {
					return processed, err
				}
			case "json":
				encoded, err := json.Marshal(item)
				if err != nil {
					return processed, err
				}
				if !firstJSON {
					if _, err := writer.Write([]byte(",")); err != nil {
						return processed, err
					}
				}
				firstJSON = false
				if _, err := writer.Write(encoded); err != nil {
					return processed, err
				}
			case "clash":
				proxyType, tls := preferredProxyType(item)
				name := fmt.Sprintf("proxy-%d-%s", index+1, item.IP)
				if _, err := fmt.Fprintf(writer, "  - name: \"%s\"\n", name); err != nil {
					return processed, err
				}
				if _, err := fmt.Fprintf(writer, "    type: %s\n", proxyType); err != nil {
					return processed, err
				}
				if _, err := fmt.Fprintf(writer, "    server: %s\n", item.IP); err != nil {
					return processed, err
				}
				if _, err := fmt.Fprintf(writer, "    port: %d\n", item.Port); err != nil {
					return processed, err
				}
				if tls {
					if _, err := writer.Write([]byte("    tls: true\n")); err != nil {
						return processed, err
					}
				}
			case "surfshark":
				scheme := preferredProxyScheme(item)
				if _, err := fmt.Fprintf(writer, "%s://%s:%d\n", scheme, item.IP, item.Port); err != nil {
					return processed, err
				}
			}
			processed++
			index++
		}

		if format == "csv" {
			csvWriter.Flush()
			if err := csvWriter.Error(); err != nil {
				return processed, err
			}
		}

		if flush != nil {
			if err := flush(); err != nil {
				return processed, err
			}
		}

		offset += len(records)
		remaining -= len(records)
		if len(records) < batchLimit {
			break
		}
	}

	if format == "json" {
		if _, err := writer.Write([]byte(`]}`)); err != nil {
			return processed, err
		}
	}

	if format == "csv" {
		csvWriter.Flush()
		if err := csvWriter.Error(); err != nil {
			return processed, err
		}
	}

	return processed, nil
}

func newExportJobID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func exportJobKey(id string) string {
	return "proxylist:export:job:" + id
}

func cleanupExportFile(path string) {
	if path == "" {
		return
	}
	_ = os.Remove(path)
}

func respondExportJobAccepted(c *gin.Context, job *ExportJob) {
	statusURL := fmt.Sprintf("/api/proxies/export/jobs/%s", job.ID)
	downloadURL := fmt.Sprintf("/api/proxies/export/jobs/%s/download", job.ID)
	c.Header("Location", statusURL)
	c.JSON(http.StatusAccepted, gin.H{
		"data": job,
		"links": gin.H{
			"status":   statusURL,
			"download": downloadURL,
		},
	})
}

func streamExportResponse(c *gin.Context, store store.ProxyListStore, opts exportOptions) {
	filename := fmt.Sprintf("proxy-export-%s.%s", time.Now().UTC().Format("2006-01-02"), opts.Format)
	if opts.Filters.Protocol != "" {
		filename = fmt.Sprintf("proxy-export-%s-%s.%s", opts.Filters.Protocol, time.Now().UTC().Format("2006-01-02"), opts.Format)
	}

	setExportHeaders(c, opts.Format, filename)
	flusher, _ := c.Writer.(http.Flusher)

	_, err := exportProxyList(c.Request.Context(), c.Writer, store, opts.Format, opts.Filters, opts.TotalLimit, opts.PageSize, func() error {
		if flusher != nil {
			flusher.Flush()
		}
		return nil
	})
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "EXPORT_ERROR", "failed to stream export", nil)
		return
	}
}

func setExportHeaders(c *gin.Context, format string, filename string) {
	format = strings.ToLower(strings.TrimPrefix(format, "."))
	contentType := "text/plain; charset=utf-8"
	if format == "csv" {
		contentType = "text/csv; charset=utf-8"
	} else if format == "json" {
		contentType = "application/json; charset=utf-8"
	} else if format == "clash" {
		contentType = "text/yaml; charset=utf-8"
	}
	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Cache-Control", "no-store")
}
