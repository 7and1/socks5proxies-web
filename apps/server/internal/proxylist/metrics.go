package proxylist

import "github.com/prometheus/client_golang/prometheus"

var (
	proxylistPurgeTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "proxylist_purged_total",
			Help: "Total number of proxy list rows purged during retention cleanup.",
		},
	)
	proxylistPurgeLast = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "proxylist_purged_last",
			Help: "Number of proxy list rows purged in the most recent cleanup.",
		},
	)
)

func init() {
	prometheus.MustRegister(proxylistPurgeTotal, proxylistPurgeLast)
}

func recordPurge(count int) {
	proxylistPurgeLast.Set(float64(count))
	if count > 0 {
		proxylistPurgeTotal.Add(float64(count))
	}
}
