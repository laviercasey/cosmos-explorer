package satellites

import (
	"math"
	"testing"
	"time"

	"github.com/joshuaferrara/go-satellite"
)

const (
	testISSLine1 = "1 25544U 98067A   23303.55769400  .00021921  00000+0  39173-3 0  9990"
	testISSLine2 = "2 25544  51.6422 108.2604 0001167  61.4856  17.5708 15.49866432423006"
)

func TestPropagate_NilCatalog(t *testing.T) {
	t.Parallel()
	out := Propagate(nil, time.Now())
	if len(out) != 0 {
		t.Errorf("Propagate(nil) returned %d entries, want 0", len(out))
	}
}

func TestPropagate_EmptyCatalog(t *testing.T) {
	t.Parallel()
	out := Propagate(&Catalog{}, time.Now())
	if len(out) != 0 {
		t.Errorf("Propagate(empty) returned %d entries, want 0", len(out))
	}
}

func TestPropagate_KnownTLEReturnsLEOOrbit(t *testing.T) {
	t.Parallel()

	sgp := satellite.TLEToSat(testISSLine1, testISSLine2, satellite.GravityWGS84)
	if sgp.ErrorStr != "" {
		t.Fatalf("TLEToSat: %s", sgp.ErrorStr)
	}

	cat := &Catalog{Entries: []Entry{{
		Sat:     Sat{NoradID: 25544, Name: "ISS (ZARYA)"},
		Sgp4Sat: sgp,
	}}}

	now := time.Date(2023, 11, 1, 12, 0, 0, 0, time.UTC)
	positions := Propagate(cat, now)
	if len(positions) != 1 {
		t.Fatalf("Propagate returned %d positions, want 1", len(positions))
	}
	p := positions[0]

	r := math.Sqrt(p.ECEFKm[0]*p.ECEFKm[0] + p.ECEFKm[1]*p.ECEFKm[1] + p.ECEFKm[2]*p.ECEFKm[2])
	if r < 6500 || r > 7500 {
		t.Errorf("ECEF magnitude = %.1f km, want ~6800 km", r)
	}

	if p.AltKm < 250 || p.AltKm > 550 {
		t.Errorf("AltKm = %.1f, want LEO range", p.AltKm)
	}

	v := math.Sqrt(p.VelKms[0]*p.VelKms[0] + p.VelKms[1]*p.VelKms[1] + p.VelKms[2]*p.VelKms[2])
	if v < 6.5 || v > 8.5 {
		t.Errorf("Velocity magnitude = %.2f km/s, want ~7.7", v)
	}

	if p.NoradID != 25544 {
		t.Errorf("NoradID = %d, want 25544", p.NoradID)
	}
}

func TestPropagate_DifferentTimesDifferentPositions(t *testing.T) {
	t.Parallel()

	sgp := satellite.TLEToSat(testISSLine1, testISSLine2, satellite.GravityWGS84)
	if sgp.ErrorStr != "" {
		t.Fatalf("TLEToSat: %s", sgp.ErrorStr)
	}
	cat := &Catalog{Entries: []Entry{{
		Sat:     Sat{NoradID: 25544, Name: "ISS"},
		Sgp4Sat: sgp,
	}}}

	t1 := time.Date(2023, 11, 1, 12, 0, 0, 0, time.UTC)
	t2 := t1.Add(5 * time.Minute)

	p1 := Propagate(cat, t1)[0]
	p2 := Propagate(cat, t2)[0]

	dx := p2.ECEFKm[0] - p1.ECEFKm[0]
	dy := p2.ECEFKm[1] - p1.ECEFKm[1]
	dz := p2.ECEFKm[2] - p1.ECEFKm[2]
	dist := math.Sqrt(dx*dx + dy*dy + dz*dz)

	if dist < 500 {
		t.Errorf("Position barely moved in 5 min: %.0f km", dist)
	}
}

func TestGeodeticAltitude_AtSurface(t *testing.T) {
	t.Parallel()
	p := satellite.Vector3{X: earthRadiusKm, Y: 0, Z: 0}
	alt := geodeticAltitudeKm(p)
	if math.Abs(alt) > 0.1 {
		t.Errorf("Surface altitude = %.4f km, want ~0", alt)
	}
}

func TestGeodeticAltitude_LEO(t *testing.T) {
	t.Parallel()
	p := satellite.Vector3{X: earthRadiusKm + 400, Y: 0, Z: 0}
	alt := geodeticAltitudeKm(p)
	if math.Abs(alt-400) > 0.5 {
		t.Errorf("LEO altitude = %.4f km, want ~400", alt)
	}
}

func TestEciToECEF_IdentityAtZeroGMST(t *testing.T) {
	t.Parallel()
	v := satellite.Vector3{X: 1000, Y: 2000, Z: 3000}
	got := eciToECEF(v, 0)
	if got != v {
		t.Errorf("zero rotation should be identity: got %+v want %+v", got, v)
	}
}

func TestEciToECEF_PreservesMagnitude(t *testing.T) {
	t.Parallel()
	v := satellite.Vector3{X: 1000, Y: 2000, Z: 3000}
	in := math.Sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z)
	got := eciToECEF(v, 1.234)
	out := math.Sqrt(got.X*got.X + got.Y*got.Y + got.Z*got.Z)
	if math.Abs(in-out) > 1e-6 {
		t.Errorf("rotation changed magnitude: in=%f out=%f", in, out)
	}
}
