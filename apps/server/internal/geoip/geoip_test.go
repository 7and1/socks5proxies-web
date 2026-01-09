package geoip

import (
	"testing"
)

func TestLoad_NonExistentFiles(t *testing.T) {
	reader, err := Load("/nonexistent/city.mmdb", "/nonexistent/asn.mmdb")
	if err != nil {
		t.Fatalf("expected nil error for non-existent files, got %v", err)
	}
	if reader != nil {
		t.Error("expected nil reader when files don't exist")
	}
}

func TestLoad_EmptyPaths(t *testing.T) {
	reader, err := Load("", "")
	if err != nil {
		t.Fatalf("expected nil error for empty paths, got %v", err)
	}
	if reader != nil {
		t.Error("expected nil reader for empty paths")
	}
}

func TestReader_LookupCountry_NilReader(t *testing.T) {
	var reader *Reader
	result := reader.LookupCountry("1.1.1.1")
	if result != "" {
		t.Errorf("expected empty string from nil reader, got %s", result)
	}
}

func TestReader_LookupCountry_NilDB(t *testing.T) {
	reader := &Reader{db: nil}
	result := reader.LookupCountry("1.1.1.1")
	if result != "" {
		t.Errorf("expected empty string from reader with nil db, got %s", result)
	}
}

func TestReader_LookupCountry_InvalidIP(t *testing.T) {
	reader := &Reader{db: nil}
	result := reader.LookupCountry("invalid-ip")
	if result != "" {
		t.Errorf("expected empty string for invalid IP, got %s", result)
	}

	result = reader.LookupCountry("")
	if result != "" {
		t.Errorf("expected empty string for empty IP, got %s", result)
	}
}

func TestReader_LookupCity_NilReader(t *testing.T) {
	var reader *Reader
	result := reader.LookupCity("1.1.1.1")
	if result != (CityInfo{}) {
		t.Errorf("expected empty CityInfo from nil reader, got %+v", result)
	}
}

func TestReader_LookupCity_NilDB(t *testing.T) {
	reader := &Reader{db: nil}
	result := reader.LookupCity("1.1.1.1")
	if result != (CityInfo{}) {
		t.Errorf("expected empty CityInfo from reader with nil db, got %+v", result)
	}
}

func TestReader_LookupCity_InvalidIP(t *testing.T) {
	reader := &Reader{db: nil}

	result := reader.LookupCity("invalid-ip")
	if result != (CityInfo{}) {
		t.Errorf("expected empty CityInfo for invalid IP, got %+v", result)
	}

	result = reader.LookupCity("")
	if result != (CityInfo{}) {
		t.Errorf("expected empty CityInfo for empty IP, got %+v", result)
	}

	result = reader.LookupCity("not.valid.ip.address")
	if result != (CityInfo{}) {
		t.Errorf("expected empty CityInfo for malformed IP, got %+v", result)
	}
}

func TestReader_LookupASN_NilReader(t *testing.T) {
	var reader *Reader
	result := reader.LookupASN("1.1.1.1")
	if result != (ASNInfo{}) {
		t.Errorf("expected empty ASNInfo from nil reader, got %+v", result)
	}
}

func TestReader_LookupASN_NilASN(t *testing.T) {
	reader := &Reader{asn: nil}
	result := reader.LookupASN("1.1.1.1")
	if result != (ASNInfo{}) {
		t.Errorf("expected empty ASNInfo from reader with nil asn, got %+v", result)
	}
}

func TestReader_LookupASN_InvalidIP(t *testing.T) {
	reader := &Reader{asn: nil}

	result := reader.LookupASN("invalid-ip")
	if result != (ASNInfo{}) {
		t.Errorf("expected empty ASNInfo for invalid IP, got %+v", result)
	}

	result = reader.LookupASN("")
	if result != (ASNInfo{}) {
		t.Errorf("expected empty ASNInfo for empty IP, got %+v", result)
	}
}

func TestReader_Close_NilReader(t *testing.T) {
	var reader *Reader
	err := reader.Close()
	if err != nil {
		t.Errorf("expected nil error when closing nil reader, got %v", err)
	}
}

func TestReader_Close_NilDBs(t *testing.T) {
	reader := &Reader{db: nil, asn: nil}
	err := reader.Close()
	if err != nil {
		t.Errorf("expected nil error when closing reader with nil dbs, got %v", err)
	}
}

func TestCityInfo_ZeroValue(t *testing.T) {
	var info CityInfo
	if info.CountryCode != "" {
		t.Error("expected empty CountryCode")
	}
	if info.CountryName != "" {
		t.Error("expected empty CountryName")
	}
	if info.City != "" {
		t.Error("expected empty City")
	}
	if info.Region != "" {
		t.Error("expected empty Region")
	}
	if info.ContinentCode != "" {
		t.Error("expected empty ContinentCode")
	}
}

func TestASNInfo_ZeroValue(t *testing.T) {
	var info ASNInfo
	if info.Number != 0 {
		t.Error("expected zero Number")
	}
	if info.Name != "" {
		t.Error("expected empty Name")
	}
	if info.Organization != "" {
		t.Error("expected empty Organization")
	}
}

func TestReader_LookupCountry_IPFormats(t *testing.T) {
	// Reader with nil db should handle all IP formats gracefully
	reader := &Reader{db: nil}

	ipv4Tests := []string{
		"127.0.0.1",
		"192.168.1.1",
		"10.0.0.1",
		"255.255.255.255",
	}

	for _, ip := range ipv4Tests {
		result := reader.LookupCountry(ip)
		if result != "" {
			t.Errorf("expected empty string for %s with nil db, got %s", ip, result)
		}
	}

	// IPv6 should also be handled gracefully
	ipv6Tests := []string{
		"::1",
		"2001:4860:4860::8888",
		"fe80::1",
	}

	for _, ip := range ipv6Tests {
		result := reader.LookupCountry(ip)
		if result != "" {
			t.Errorf("expected empty string for %s with nil db, got %s", ip, result)
		}
	}
}
