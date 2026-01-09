-- Socks5Proxies PostgreSQL Migration
-- Schema: socksproxies
-- Version: 001

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS socksproxies;

-- Create proxies table
CREATE TABLE IF NOT EXISTS socksproxies.proxies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    protocol TEXT NOT NULL CHECK (protocol IN ('socks5', 'socks4', 'http', 'https')),
    country TEXT,
    anonymity TEXT CHECK (anonymity IN ('elite', 'anonymous', 'transparent', 'unknown')),
    last_status BOOLEAN NOT NULL DEFAULT false,
    last_latency INTEGER,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(address, protocol)
);

-- Create checks table
CREATE TABLE IF NOT EXISTS socksproxies.checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proxy_id UUID NOT NULL REFERENCES socksproxies.proxies(id) ON DELETE CASCADE,
    status BOOLEAN NOT NULL,
    latency INTEGER,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    ip TEXT,
    country TEXT,
    anonymity TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_proxies_last_checked ON socksproxies.proxies(last_checked DESC NULLS LAST) WHERE last_status = true;
CREATE INDEX IF NOT EXISTS idx_proxies_country ON socksproxies.proxies(country) WHERE last_status = true;
CREATE INDEX IF NOT EXISTS idx_proxies_protocol ON socksproxies.proxies(protocol) WHERE last_status = true;
CREATE INDEX IF NOT EXISTS idx_proxies_address_protocol ON socksproxies.proxies(address, protocol);
CREATE INDEX IF NOT EXISTS idx_checks_proxy_id ON socksproxies.checks(proxy_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_status ON socksproxies.checks(status) WHERE status = true;
CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON socksproxies.checks(checked_at DESC);

-- Auto-update trigger function
CREATE OR REPLACE FUNCTION socksproxies.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_proxies_timestamp ON socksproxies.proxies;
CREATE TRIGGER update_proxies_timestamp
    BEFORE UPDATE ON socksproxies.proxies
    FOR EACH ROW
    EXECUTE FUNCTION socksproxies.update_timestamp();

-- Grant permissions
GRANT USAGE ON SCHEMA socksproxies TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA socksproxies TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA socksproxies TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA socksproxies TO postgres, anon, authenticated, service_role;

-- Create a view for active proxies (convenience)
CREATE OR REPLACE VIEW socksproxies.active_proxies AS
SELECT
    id,
    address,
    protocol,
    country,
    anonymity,
    last_status,
    last_latency,
    last_checked,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - last_checked))/60 AS minutes_since_check
FROM socksproxies.proxies
WHERE last_status = true
ORDER BY last_checked DESC NULLS LAST;
