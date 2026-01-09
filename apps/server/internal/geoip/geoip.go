package geoip

import (
	"net"
	"os"

	"github.com/oschwald/geoip2-golang"
)

type Reader struct {
	db  *geoip2.Reader
	asn *geoip2.Reader
}

type CityInfo struct {
	CountryCode   string
	CountryName   string
	City          string
	Region        string
	ContinentCode string
}

type ASNInfo struct {
	Number       int
	Name         string
	Organization string
}

func Load(cityPath, asnPath string) (*Reader, error) {
	var cityReader *geoip2.Reader
	var asnReader *geoip2.Reader

	if cityPath != "" {
		if _, err := os.Stat(cityPath); err == nil {
			db, err := geoip2.Open(cityPath)
			if err != nil {
				return nil, err
			}
			cityReader = db
		}
	}

	if asnPath != "" {
		if _, err := os.Stat(asnPath); err == nil {
			db, err := geoip2.Open(asnPath)
			if err != nil {
				return nil, err
			}
			asnReader = db
		}
	}

	if cityReader == nil && asnReader == nil {
		return nil, nil
	}

	return &Reader{db: cityReader, asn: asnReader}, nil
}

func (r *Reader) LookupCountry(ip string) string {
	if r == nil || r.db == nil {
		return ""
	}
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return ""
	}
	if cityRecord, err := r.db.City(parsed); err == nil && cityRecord != nil {
		if cityRecord.Country.IsoCode != "" {
			return cityRecord.Country.IsoCode
		}
	}
	if countryRecord, err := r.db.Country(parsed); err == nil && countryRecord != nil {
		if countryRecord.Country.IsoCode != "" {
			return countryRecord.Country.IsoCode
		}
	}
	return ""
}

func (r *Reader) LookupCity(ip string) CityInfo {
	if r == nil || r.db == nil {
		return CityInfo{}
	}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		return CityInfo{}
	}

	record, err := r.db.City(parsed)
	if err != nil || record == nil {
		return CityInfo{}
	}

	info := CityInfo{
		CountryCode:   record.Country.IsoCode,
		CountryName:   record.Country.Names["en"],
		City:          record.City.Names["en"],
		ContinentCode: record.Continent.Code,
	}

	if len(record.Subdivisions) > 0 {
		info.Region = record.Subdivisions[0].Names["en"]
	}

	return info
}

func (r *Reader) LookupASN(ip string) ASNInfo {
	if r == nil || r.asn == nil {
		return ASNInfo{}
	}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		return ASNInfo{}
	}

	record, err := r.asn.ASN(parsed)
	if err != nil || record == nil {
		return ASNInfo{}
	}

	return ASNInfo{
		Number:       int(record.AutonomousSystemNumber),
		Name:         record.AutonomousSystemOrganization,
		Organization: record.AutonomousSystemOrganization,
	}
}

func (r *Reader) Close() error {
	if r == nil {
		return nil
	}
	if r.db != nil {
		_ = r.db.Close()
	}
	if r.asn != nil {
		_ = r.asn.Close()
	}
	return nil
}
