package api

import "github.com/prometheus/client_golang/prometheus"

var (
	exportJobsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "export_jobs_total",
			Help: "Total number of export jobs by status.",
		},
		[]string{"status", "format"},
	)
	exportJobsInFlight = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "export_jobs_in_flight",
			Help: "Current number of running export jobs.",
		},
		[]string{"format"},
	)
	exportJobDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "export_job_duration_seconds",
			Help:    "Duration of export jobs in seconds.",
			Buckets: []float64{0.5, 1, 2, 5, 10, 30, 60, 120, 300},
		},
		[]string{"status", "format"},
	)
	exportJobSizeBytes = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "export_job_size_bytes",
			Help:    "Size of completed export artifacts in bytes.",
			Buckets: []float64{1024, 10 * 1024, 100 * 1024, 1024 * 1024, 5 * 1024 * 1024, 20 * 1024 * 1024, 100 * 1024 * 1024},
		},
		[]string{"format"},
	)
)

func init() {
	prometheus.MustRegister(exportJobsTotal, exportJobsInFlight, exportJobDuration, exportJobSizeBytes)
}
