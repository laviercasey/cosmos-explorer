package satellites

import (
	"math"
	"time"

	"github.com/joshuaferrara/go-satellite"
)

type SatPosition struct {
	NoradID int
	Name    string
	ECEFKm  [3]float64
	VelKms  [3]float64
	AltKm   float64
}

const (
	earthRadiusKm   = 6378.137
	earthFlattening = 1.0 / 298.257223563
)

func Propagate(catalog *Catalog, now time.Time) []SatPosition {
	if catalog == nil || len(catalog.Entries) == 0 {
		return []SatPosition{}
	}
	now = now.UTC()
	year := now.Year()
	month := int(now.Month())
	day := now.Day()
	hour := now.Hour()
	minute := now.Minute()
	second := now.Second()

	gmst := satellite.GSTimeFromDate(year, month, day, hour, minute, second)

	out := make([]SatPosition, 0, len(catalog.Entries))
	for i := range catalog.Entries {
		e := &catalog.Entries[i]
		pos, vel := satellite.Propagate(e.Sgp4Sat, year, month, day, hour, minute, second)

		ecefPos := eciToECEF(pos, gmst)
		ecefVel := eciToECEF(vel, gmst)
		altKm := geodeticAltitudeKm(ecefPos)

		out = append(out, SatPosition{
			NoradID: e.Sat.NoradID,
			Name:    e.Sat.Name,
			ECEFKm:  [3]float64{ecefPos.X, ecefPos.Y, ecefPos.Z},
			VelKms:  [3]float64{ecefVel.X, ecefVel.Y, ecefVel.Z},
			AltKm:   altKm,
		})
	}
	return out
}

func eciToECEF(v satellite.Vector3, gmst float64) satellite.Vector3 {
	cosG := math.Cos(gmst)
	sinG := math.Sin(gmst)
	return satellite.Vector3{
		X: cosG*v.X + sinG*v.Y,
		Y: -sinG*v.X + cosG*v.Y,
		Z: v.Z,
	}
}

func geodeticAltitudeKm(p satellite.Vector3) float64 {
	a := earthRadiusKm
	f := earthFlattening
	b := a * (1 - f)
	e2 := f * (2 - f)

	r := math.Hypot(p.X, p.Y)
	z := p.Z

	lat := math.Atan2(z, r*(1-e2))
	var alt float64
	for i := 0; i < 4; i++ {
		sinLat := math.Sin(lat)
		n := a / math.Sqrt(1-e2*sinLat*sinLat)
		alt = r/math.Cos(lat) - n
		lat = math.Atan2(z, r*(1-e2*n/(n+alt)))
	}

	if r < 1e-3 {
		alt = math.Abs(z) - b
	}
	return alt
}
