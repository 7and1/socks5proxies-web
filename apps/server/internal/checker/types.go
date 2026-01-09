package checker

import "time"

type ProxyTarget struct {
	Address  string
	Protocol string
	Username string
	Password string
}

type ProxyResult struct {
	IP        string `json:"ip"`
	Port      string `json:"port"`
	Protocol  string `json:"protocol"`
	Status    bool   `json:"status"`
	Latency   int64  `json:"latency"`
	Country   string `json:"country"`
	Anonymity string `json:"anonymity"`
	CheckedAt string `json:"checkedAt"`
	Error     string `json:"error,omitempty"`
}

func (r ProxyResult) WithCheckedAt() ProxyResult {
	if r.CheckedAt == "" {
		r.CheckedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return r
}
