-- Socks5Proxies Proxy List additional indexes
-- Version: 003

CREATE INDEX IF NOT EXISTS idx_proxy_list_protocol_country ON socksproxies.proxy_list(socks5, country_code, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_list_country_port ON socksproxies.proxy_list(country_code, port, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_list_asn_country ON socksproxies.proxy_list(asn, country_code);
