package proxylist

import (
	"errors"
	"strings"
	"testing"
	"time"

	"socksproxies.com/server/internal/store"
)

func TestParseCSV_Basic(t *testing.T) {
	csv := `ip;port;host;lastseen;delay;country_code;country_name;city;asn;asn_name;http;socks5
192.168.1.1;8080;proxy1.example.com;1704067200;100;US;United States;New York;12345;Example ISP;1;0
10.0.0.1;1080;;1704067200;50;DE;Germany;Berlin;67890;Another ISP;0;1`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 2 {
		t.Fatalf("expected 2 records, got %d", len(records))
	}

	r := records[0]
	if r.IP != "192.168.1.1" {
		t.Errorf("expected IP 192.168.1.1, got %s", r.IP)
	}
	if r.Port != 8080 {
		t.Errorf("expected port 8080, got %d", r.Port)
	}
	if r.Host != "proxy1.example.com" {
		t.Errorf("expected host proxy1.example.com, got %s", r.Host)
	}
	if r.CountryCode != "US" {
		t.Errorf("expected country code US, got %s", r.CountryCode)
	}
	if r.CountryName != "United States" {
		t.Errorf("expected country name United States, got %s", r.CountryName)
	}
	if r.City != "New York" {
		t.Errorf("expected city New York, got %s", r.City)
	}
	if r.ASN != 12345 {
		t.Errorf("expected ASN 12345, got %d", r.ASN)
	}
	if r.HTTP != 1 {
		t.Errorf("expected HTTP 1, got %d", r.HTTP)
	}
	if r.Socks5 != 0 {
		t.Errorf("expected Socks5 0, got %d", r.Socks5)
	}

	r2 := records[1]
	if r2.Host != "10.0.0.1" {
		t.Errorf("expected host to fallback to IP 10.0.0.1, got %s", r2.Host)
	}
	if r2.Socks5 != 1 {
		t.Errorf("expected Socks5 1, got %d", r2.Socks5)
	}
}

func TestParseCSV_IPFallbackFromHost(t *testing.T) {
	csv := `host;port;country_code
192.168.1.100;3128;CN`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}

	if records[0].IP != "192.168.1.100" {
		t.Errorf("expected IP to fallback from host, got %s", records[0].IP)
	}
}

func TestParseCSV_SkipsInvalidRows(t *testing.T) {
	csv := `ip;port;country_code
192.168.1.1;8080;US
;8080;DE
192.168.1.2;;FR
192.168.1.3;0;JP
192.168.1.4;-1;KR
valid.proxy.com;1080;CA`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 2 {
		t.Fatalf("expected 2 valid records, got %d", len(records))
	}

	if records[0].IP != "192.168.1.1" {
		t.Errorf("first record IP should be 192.168.1.1, got %s", records[0].IP)
	}
	if records[1].IP != "valid.proxy.com" {
		t.Errorf("second record IP should be valid.proxy.com, got %s", records[1].IP)
	}
}

func TestParseCSV_EmptyInput(t *testing.T) {
	csv := `ip;port;country_code`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 0 {
		t.Fatalf("expected 0 records for header-only input, got %d", len(records))
	}
}

func TestParseCSV_EmptyReader(t *testing.T) {
	_, err := ParseCSV(strings.NewReader(""))
	if err == nil {
		t.Fatal("expected error for empty input")
	}
}

func TestParseCSV_CountryCodeUppercase(t *testing.T) {
	csv := `ip;port;country_code;continent_code
192.168.1.1;8080;us;na`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if records[0].CountryCode != "US" {
		t.Errorf("expected uppercase country code US, got %s", records[0].CountryCode)
	}
	if records[0].ContinentCode != "NA" {
		t.Errorf("expected uppercase continent code NA, got %s", records[0].ContinentCode)
	}
}

func TestParseCSV_HeaderVariations(t *testing.T) {
	csv := `  IP  ; Port ;Country_Code;CITY
192.168.1.1;8080;US;New York`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}

	if records[0].IP != "192.168.1.1" {
		t.Errorf("expected IP 192.168.1.1, got %s", records[0].IP)
	}
	if records[0].City != "New York" {
		t.Errorf("expected city New York, got %s", records[0].City)
	}
}

func TestParseCSVInBatches_BatchProcessing(t *testing.T) {
	var sb strings.Builder
	sb.WriteString("ip;port;country_code\n")
	for i := 0; i < 150; i++ {
		sb.WriteString("192.168.1.1;8080;US\n")
	}

	batchCount := 0
	totalRecords := 0

	processed, err := ParseCSVInBatches(strings.NewReader(sb.String()), 50, func(batch []store.ProxyListRecord) error {
		batchCount++
		totalRecords += len(batch)
		return nil
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if processed != 150 {
		t.Errorf("expected 150 processed, got %d", processed)
	}
	if batchCount != 3 {
		t.Errorf("expected 3 batches, got %d", batchCount)
	}
	if totalRecords != 150 {
		t.Errorf("expected 150 total records, got %d", totalRecords)
	}
}

func TestParseCSVInBatches_HandlerError(t *testing.T) {
	csv := `ip;port;country_code
192.168.1.1;8080;US
192.168.1.2;8080;DE`

	testErr := errors.New("handler failed")
	_, err := ParseCSVInBatches(strings.NewReader(csv), 1, func(batch []store.ProxyListRecord) error {
		return testErr
	})

	if err == nil {
		t.Fatal("expected error from handler")
	}
	if !errors.Is(err, testErr) {
		t.Errorf("expected testErr, got %v", err)
	}
}

func TestParseCSVInBatches_DefaultBatchSize(t *testing.T) {
	csv := `ip;port;country_code
192.168.1.1;8080;US`

	processed, err := ParseCSVInBatches(strings.NewReader(csv), 0, func(batch []store.ProxyListRecord) error {
		return nil
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if processed != 1 {
		t.Errorf("expected 1 processed, got %d", processed)
	}
}

func TestParseCSVInBatches_NegativeBatchSize(t *testing.T) {
	csv := `ip;port;country_code
192.168.1.1;8080;US`

	processed, err := ParseCSVInBatches(strings.NewReader(csv), -10, func(batch []store.ProxyListRecord) error {
		return nil
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if processed != 1 {
		t.Errorf("expected 1 processed, got %d", processed)
	}
}

func TestParseInt(t *testing.T) {
	cases := []struct {
		input    string
		expected int
	}{
		{"123", 123},
		{"0", 0},
		{"", 0},
		{"   456   ", 456},
		{"abc", 0},
		{"-10", -10},
	}

	for _, tc := range cases {
		result := parseInt(tc.input)
		if result != tc.expected {
			t.Errorf("parseInt(%q) = %d, expected %d", tc.input, result, tc.expected)
		}
	}
}

func TestParseLastSeen_UnixSeconds(t *testing.T) {
	now := time.Now().UTC()
	ts := int64(1704067200)

	result := parseLastSeen("1704067200", now)

	expected := time.Unix(ts, 0).UTC()
	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestParseLastSeen_UnixMilliseconds(t *testing.T) {
	now := time.Now().UTC()
	ts := int64(1704067200000)

	result := parseLastSeen("1704067200000", now)

	expected := time.UnixMilli(ts).UTC()
	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestParseLastSeen_RelativeSeconds(t *testing.T) {
	now := time.Now().UTC()

	result := parseLastSeen("300", now)

	expected := now.Add(-300 * time.Second)
	diff := result.Sub(expected)
	if diff < -time.Second || diff > time.Second {
		t.Errorf("expected ~%v, got %v (diff: %v)", expected, result, diff)
	}
}

func TestParseLastSeen_Empty(t *testing.T) {
	now := time.Now().UTC()

	result := parseLastSeen("", now)

	if !result.IsZero() {
		t.Errorf("expected zero time for empty input, got %v", result)
	}
}

func TestParseLastSeen_Invalid(t *testing.T) {
	now := time.Now().UTC()

	cases := []string{"abc", "-1", "0", "invalid"}
	for _, tc := range cases {
		result := parseLastSeen(tc, now)
		if !result.IsZero() {
			t.Errorf("parseLastSeen(%q) should return zero time, got %v", tc, result)
		}
	}
}

func TestFallback(t *testing.T) {
	cases := []struct {
		primary   string
		secondary string
		expected  string
	}{
		{"primary", "secondary", "primary"},
		{"", "secondary", "secondary"},
		{"", "", ""},
		{"value", "", "value"},
	}

	for _, tc := range cases {
		result := fallback(tc.primary, tc.secondary)
		if result != tc.expected {
			t.Errorf("fallback(%q, %q) = %q, expected %q", tc.primary, tc.secondary, result, tc.expected)
		}
	}
}

func TestParseCSV_AllFields(t *testing.T) {
	csv := `ip;port;host;lastseen;delay;cid;country_code;country_name;city;region;asn;asn_name;org;continent_code;checks_up;checks_down;anon;http;ssl;socks4;socks5
192.168.1.1;8080;proxy.example.com;1704067200;100;cid123;US;United States;New York;New York State;12345;Example ISP;Example Org;NA;100;5;4;1;1;0;1`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}

	r := records[0]
	if r.IP != "192.168.1.1" {
		t.Errorf("IP: expected 192.168.1.1, got %s", r.IP)
	}
	if r.Port != 8080 {
		t.Errorf("Port: expected 8080, got %d", r.Port)
	}
	if r.Host != "proxy.example.com" {
		t.Errorf("Host: expected proxy.example.com, got %s", r.Host)
	}
	if r.Delay != 100 {
		t.Errorf("Delay: expected 100, got %d", r.Delay)
	}
	if r.CID != "cid123" {
		t.Errorf("CID: expected cid123, got %s", r.CID)
	}
	if r.CountryCode != "US" {
		t.Errorf("CountryCode: expected US, got %s", r.CountryCode)
	}
	if r.CountryName != "United States" {
		t.Errorf("CountryName: expected United States, got %s", r.CountryName)
	}
	if r.City != "New York" {
		t.Errorf("City: expected New York, got %s", r.City)
	}
	if r.Region != "New York State" {
		t.Errorf("Region: expected New York State, got %s", r.Region)
	}
	if r.ASN != 12345 {
		t.Errorf("ASN: expected 12345, got %d", r.ASN)
	}
	if r.ASNName != "Example ISP" {
		t.Errorf("ASNName: expected Example ISP, got %s", r.ASNName)
	}
	if r.Org != "Example Org" {
		t.Errorf("Org: expected Example Org, got %s", r.Org)
	}
	if r.ContinentCode != "NA" {
		t.Errorf("ContinentCode: expected NA, got %s", r.ContinentCode)
	}
	if r.ChecksUp != 100 {
		t.Errorf("ChecksUp: expected 100, got %d", r.ChecksUp)
	}
	if r.ChecksDown != 5 {
		t.Errorf("ChecksDown: expected 5, got %d", r.ChecksDown)
	}
	if r.Anon != 4 {
		t.Errorf("Anon: expected 4, got %d", r.Anon)
	}
	if r.HTTP != 1 {
		t.Errorf("HTTP: expected 1, got %d", r.HTTP)
	}
	if r.SSL != 1 {
		t.Errorf("SSL: expected 1, got %d", r.SSL)
	}
	if r.Socks4 != 0 {
		t.Errorf("Socks4: expected 0, got %d", r.Socks4)
	}
	if r.Socks5 != 1 {
		t.Errorf("Socks5: expected 1, got %d", r.Socks5)
	}
}

func TestParseCSV_MissingFields(t *testing.T) {
	csv := `ip;port
192.168.1.1;8080`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}

	r := records[0]
	if r.CountryCode != "" {
		t.Errorf("expected empty country code, got %s", r.CountryCode)
	}
	if r.ASN != 0 {
		t.Errorf("expected zero ASN, got %d", r.ASN)
	}
}

func TestParseCSV_ExtraFields(t *testing.T) {
	csv := `ip;port;country_code;extra_field;another_field
192.168.1.1;8080;US;extra1;extra2`

	records, err := ParseCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}

	if records[0].IP != "192.168.1.1" {
		t.Errorf("expected IP 192.168.1.1, got %s", records[0].IP)
	}
}
