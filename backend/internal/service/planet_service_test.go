package service

import (
	"encoding/json"
	"testing"

	"cosmos/backend/internal/store"
)

func TestParsePlanetSort(t *testing.T) {
	tests := []struct {
		raw       string
		wantField string
		wantDesc  bool
	}{
		{"", "", false},
		{"index", "index", false},
		{"-index", "index", true},
		{"name", "name", false},
		{"-name", "name", true},
		{"radius_km", "radius_km", false},
		{"-semi_major_axis_au", "semi_major_axis_au", true},
	}
	for _, tc := range tests {
		tc := tc
		t.Run("sort="+tc.raw, func(t *testing.T) {
			f, d := parsePlanetSort(tc.raw)
			if f != tc.wantField || d != tc.wantDesc {
				t.Errorf("got (%q,%v) want (%q,%v)", f, d, tc.wantField, tc.wantDesc)
			}
		})
	}
}

func TestNilIfEmpty(t *testing.T) {
	if got := nilIfEmpty(nil); len(got) != 0 {
		t.Errorf("nil -> %v, want empty", got)
	}
	if got := nilIfEmpty([]string{}); len(got) != 0 {
		t.Errorf("empty -> %v, want empty", got)
	}
	got := nilIfEmpty([]string{"a", "b"})
	if len(got) != 2 || got[0] != "a" {
		t.Errorf("[a b] -> %v", got)
	}
}

func TestGroupHelpers(t *testing.T) {
	atmos := []store.AtmosphereComponentRow{
		{PlanetID: 1, Gas: "N2", Percent: 78},
		{PlanetID: 1, Gas: "O2", Percent: 21},
		{PlanetID: 2, Gas: "CO2", Percent: 96},
	}
	gotAtmos := groupAtmosphere(atmos)
	if len(gotAtmos) != 2 {
		t.Fatalf("groupAtmosphere len=%d want 2", len(gotAtmos))
	}
	if len(gotAtmos[1]) != 2 {
		t.Errorf("planet 1 has %d rows, want 2", len(gotAtmos[1]))
	}
	if len(gotAtmos[2]) != 1 {
		t.Errorf("planet 2 has %d rows, want 1", len(gotAtmos[2]))
	}

	moons := []store.MoonRow{
		{PlanetID: 3, Name: "Moon"},
		{PlanetID: 4, Name: "Phobos"},
		{PlanetID: 4, Name: "Deimos"},
	}
	gotMoons := groupMoons(moons)
	if len(gotMoons[4]) != 2 {
		t.Errorf("mars moons=%d want 2", len(gotMoons[4]))
	}

	pms := []store.PlanetMissionRow{
		{PlanetID: 5, Slug: "apollo-11"},
		{PlanetID: 5, Slug: "apollo-12"},
	}
	gotPms := groupPlanetMissions(pms)
	if len(gotPms[5]) != 2 {
		t.Errorf("pm count=%d want 2", len(gotPms[5]))
	}
}

func TestMapPlanetRow_Shape(t *testing.T) {
	row := store.PlanetRow{
		ID:                           1,
		Slug:                         "mercury",
		Name:                         "Mercury",
		OrbitIndex:                   0,
		Type:                         "terrestrial",
		Description:                  "smallest",
		SemiMajorAxisAU:              0.387,
		Eccentricity:                 0.2056,
		InclinationDeg:               7.0,
		PeriodDays:                   87.97,
		OrbitalSpeedKmS:              47.36,
		RadiusKm:                     2439.7,
		MassKg:                       3.301e23,
		MassEarths:                   0.055,
		SurfaceGravityMs2:            3.7,
		EscapeVelocityKmS:            4.25,
		DensityGCm3:                  5.427,
		ObliquityDeg:                 0.034,
		RotationPeriodHours:          1407.6,
		FlatteningFactor:             0.0,
		TempMinC:                     -180,
		TempMaxC:                     430,
		TempAvgC:                     167,
		Albedo:                       0.088,
		AtmosphereSurfacePressureAtm: 0,
		AtmosphereHasGreenhouse:      false,
		AtmosphereNotes:              "exosphere",
		SurfaceFeatures:              []string{"feat-1"},
		Facts:                        []string{"f-1", "f-2"},
		TotalMoonCount:               0,
		ColorHex:                     "#a8a8a8",
		EmissiveHex:                  "#111111",
		Roughness:                    0.95,
		Metalness:                    0.1,
		HasAtmosphereGlow:            false,
		AtmosphereOpacity:            0,
		HasCloudLayer:                false,
		HasRings:                     false,
		RingData:                     json.RawMessage(`null`),
		VisualRadius:                 0.38,
		OrbitDistance:                9,
		CanvasTexture:                json.RawMessage(`{"technique":"cratered"}`),
	}
	atmos := []store.AtmosphereComponentRow{
		{Gas: "Oxygen", Percent: 42},
		{Gas: "Sodium", Percent: 29},
	}
	moons := []store.MoonRow{}
	achievement := "Ach 1"
	missions := []store.PlanetMissionRow{
		{Slug: "mariner-10", Name: "Mariner 10", Agency: "NASA", Year: 1974, Type: "flyby", Achievement: &achievement},
		{Slug: "messenger", Name: "MESSENGER", Agency: "NASA", Year: 2004, Type: "orbiter", Achievement: nil},
	}

	p := mapPlanetRow(row, atmos, moons, missions, false)
	if p.Slug != "mercury" {
		t.Errorf("Slug=%q", p.Slug)
	}
	if p.Index != 0 {
		t.Errorf("Index=%d", p.Index)
	}
	if len(p.Atmosphere.Composition) != 2 {
		t.Errorf("composition len=%d want 2", len(p.Atmosphere.Composition))
	}
	if p.Atmosphere.Composition[0].Gas != "Oxygen" || p.Atmosphere.Composition[0].Percent != 42 {
		t.Errorf("first gas=%+v", p.Atmosphere.Composition[0])
	}
	if len(p.MissionSlugs) != 2 || p.MissionSlugs[0] != "mariner-10" {
		t.Errorf("MissionSlugs=%v", p.MissionSlugs)
	}
	if p.Missions != nil {
		t.Error("Missions should be nil when includeMissionDetails=false")
	}
	if p.Visual.ColorHex != "#a8a8a8" {
		t.Errorf("ColorHex=%q", p.Visual.ColorHex)
	}
	if p.Thermal.TempMaxC != 430 {
		t.Errorf("TempMaxC=%d", p.Thermal.TempMaxC)
	}

	p2 := mapPlanetRow(row, atmos, moons, missions, true)
	if len(p2.Missions) != 2 {
		t.Fatalf("Missions len=%d want 2", len(p2.Missions))
	}
	if p2.Missions[0].Achievement != "Ach 1" {
		t.Errorf("Missions[0].Achievement=%q", p2.Missions[0].Achievement)
	}
	if p2.Missions[1].Achievement != "" {
		t.Errorf("nil Achievement should map to empty string, got %q", p2.Missions[1].Achievement)
	}
}
