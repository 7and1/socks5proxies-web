-- Socks5Proxies Proxy List + Facets schema
-- Version: 002

CREATE TABLE IF NOT EXISTS socksproxies.proxy_list (
    id BIGSERIAL PRIMARY KEY,
    host TEXT NOT NULL,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    last_seen TIMESTAMPTZ,
    delay INTEGER DEFAULT 0,
    cid TEXT,
    country_code TEXT,
    country_name TEXT,
    city TEXT,
    region TEXT,
    asn INTEGER,
    asn_name TEXT,
    org TEXT,
    continent_code TEXT,
    checks_up INTEGER DEFAULT 0,
    checks_down INTEGER DEFAULT 0,
    anon INTEGER DEFAULT 0,
    http INTEGER DEFAULT 0,
    ssl INTEGER DEFAULT 0,
    socks4 INTEGER DEFAULT 0,
    socks5 INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ip, port)
);

CREATE INDEX IF NOT EXISTS idx_proxy_list_country ON socksproxies.proxy_list(country_code);
CREATE INDEX IF NOT EXISTS idx_proxy_list_port ON socksproxies.proxy_list(port);
CREATE INDEX IF NOT EXISTS idx_proxy_list_protocol ON socksproxies.proxy_list(http, ssl, socks4, socks5);
CREATE INDEX IF NOT EXISTS idx_proxy_list_anon ON socksproxies.proxy_list(anon);
CREATE INDEX IF NOT EXISTS idx_proxy_list_delay ON socksproxies.proxy_list(delay);
CREATE INDEX IF NOT EXISTS idx_proxy_list_last_seen ON socksproxies.proxy_list(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_list_city ON socksproxies.proxy_list(city);
CREATE INDEX IF NOT EXISTS idx_proxy_list_region ON socksproxies.proxy_list(region);
CREATE INDEX IF NOT EXISTS idx_proxy_list_asn ON socksproxies.proxy_list(asn);

CREATE TABLE IF NOT EXISTS socksproxies.facets (
    type TEXT NOT NULL,
    key TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    avg_delay REAL DEFAULT 0,
    metadata JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (type, key)
);

GRANT ALL ON ALL TABLES IN SCHEMA socksproxies TO postgres, anon, authenticated, service_role;
