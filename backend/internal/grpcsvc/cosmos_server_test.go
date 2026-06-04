package grpcsvc

import (
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/rs/zerolog"

	cosmosv1 "cosmos/backend/gen/proto/cosmos/v1"
	"cosmos/backend/internal/domain"
)

func discardLogger() zerolog.Logger {
	return zerolog.New(io.Discard).Level(zerolog.Disabled)
}

func TestParseListPlanetsFilters_Defaults(t *testing.T) {
	req := &cosmosv1.ListPlanetsRequest{}
	f, lang, err := ParseListPlanetsFilters(req)
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	if f.Limit != defaultLimit {
		t.Errorf("limit=%d want %d", f.Limit, defaultLimit)
	}
	if f.Offset != 0 {
		t.Errorf("offset=%d want 0", f.Offset)
	}
	if lang != "" {
		t.Errorf("lang=%q want empty", lang)
	}
}

func TestParseListPlanetsFilters_ValidationErrors(t *testing.T) {
	cases := []struct {
		name    string
		req     *cosmosv1.ListPlanetsRequest
		wantMsg string
	}{
		{
			name:    "limit too large",
			req:     &cosmosv1.ListPlanetsRequest{Limit: 999},
			wantMsg: "limit",
		},
		{
			name:    "negative offset",
			req:     &cosmosv1.ListPlanetsRequest{Offset: -1},
			wantMsg: "offset",
		},
		{
			name:    "bad sort",
			req:     &cosmosv1.ListPlanetsRequest{Sort: "-unknown"},
			wantMsg: "sort",
		},
		{
			name:    "bad lang",
			req:     &cosmosv1.ListPlanetsRequest{Lang: "fr"},
			wantMsg: "lang",
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := ParseListPlanetsFilters(tc.req)
			if err == nil {
				t.Fatalf("expected error")
			}
			var ce *connect.Error
			if !errors.As(err, &ce) {
				t.Fatalf("not a connect.Error: %v", err)
			}
			if ce.Code() != connect.CodeInvalidArgument {
				t.Errorf("code=%v want InvalidArgument", ce.Code())
			}
			if !strings.Contains(ce.Message(), tc.wantMsg) {
				t.Errorf("message=%q must contain %q", ce.Message(), tc.wantMsg)
			}
		})
	}
}

func TestParseListMissionsFilters_DecadeRegex(t *testing.T) {
	cases := []struct {
		name    string
		decades []string
		wantErr bool
	}{
		{"valid 1960s", []string{"1960s"}, false},
		{"valid mixed", []string{"1960s", "2000s"}, false},
		{"upper-case S", []string{"1960S"}, false},
		{"missing s suffix", []string{"1960"}, true},
		{"non-numeric", []string{"abcds"}, true},
		{"wrong length", []string{"197s"}, true},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			req := &cosmosv1.ListMissionsRequest{Decades: tc.decades, Limit: 10}
			_, _, err := ParseListMissionsFilters(req)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestParseListMissionsFilters_LimitBounds(t *testing.T) {
	req := &cosmosv1.ListMissionsRequest{Limit: 201}
	_, _, err := ParseListMissionsFilters(req)
	if err == nil {
		t.Fatal("expected limit-too-large error")
	}
}

func TestParseListMissionsFilters_TrimsAndStrips(t *testing.T) {
	req := &cosmosv1.ListMissionsRequest{
		Agencies: []string{" NASA ", "", " ESA"},
		Limit:    20,
	}
	f, _, err := ParseListMissionsFilters(req)
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	if len(f.Agencies) != 2 || f.Agencies[0] != "NASA" || f.Agencies[1] != "ESA" {
		t.Errorf("agencies=%v want [NASA ESA]", f.Agencies)
	}
}

func TestMapPlanetToProto_NestedShape(t *testing.T) {
	atmoColor := "#cccccc"
	p := domain.Planet{
		Slug:        "saturn",
		Name:        "Saturn",
		Index:       6,
		Type:        "gas-giant",
		Description: "Ringed planet",
		Orbital: domain.OrbitalParams{
			SemiMajorAxisAU: 9.58,
			Eccentricity:    0.056,
			InclinationDeg:  2.49,
			PeriodDays:      10759.22,
			OrbitalSpeedKmS: 9.68,
		},
		Physical: domain.PhysicalParams{
			RadiusKm:            58232,
			MassKg:              5.683e26,
			MassEarths:          95.16,
			SurfaceGravityMs2:   10.44,
			EscapeVelocityKmS:   35.5,
			DensityGCm3:         0.687,
			ObliquityDeg:        26.73,
			RotationPeriodHours: 10.7,
			FlatteningFactor:    0.09796,
		},
		Thermal: domain.ThermalParams{
			TempMinC: -185,
			TempMaxC: -122,
			TempAvgC: -139,
			Albedo:   0.342,
		},
		Atmosphere: domain.Atmosphere{
			SurfacePressureAtm: 1.4,
			HasGreenhouse:      false,
			Notes:              "H2/He",
			Composition: []domain.AtmosphereComponent{
				{Gas: "H2", Percent: 96.3},
			},
		},
		Visual: domain.Visual{
			ColorHex:           "#e3c878",
			EmissiveHex:        "#000000",
			Roughness:          0.85,
			Metalness:          0.1,
			HasAtmosphereGlow:  true,
			AtmosphereColorHex: &atmoColor,
			AtmosphereOpacity:  0.4,
			HasRings:           true,
			RingData:           []byte(`{"inner_radius_scale":1.2,"outer_radius_scale":2.4,"bands":[{"color":"#aaa","start":1.2,"end":1.5,"opacity":0.6}]}`),
			VisualRadius:       1.5,
			OrbitDistance:      95,
			CanvasTexture:      []byte(`{"technique":"banded","palette":["#aaa","#bbb"],"noise_scale":0.5,"crater_density":0}`),
		},
		SurfaceFeatures: []string{"Rings"},
		Facts:           []string{"82 moons"},
		Moons: []domain.Moon{
			{Name: "Titan", RadiusKm: 2575, DiscoveredYear: 1655},
		},
		TotalMoonCount: 82,
		MissionSlugs:   []string{"cassini"},
	}
	out := mapPlanetToProto(p, discardLogger())
	if out.GetSlug() != "saturn" {
		t.Errorf("slug=%q", out.GetSlug())
	}
	if out.GetOrbital().GetSemiMajorAxisAu() != 9.58 {
		t.Errorf("semi_major_axis=%v", out.GetOrbital().GetSemiMajorAxisAu())
	}
	if out.GetPhysical().GetSurfaceGravityMS2() != 10.44 {
		t.Errorf("surface_gravity=%v", out.GetPhysical().GetSurfaceGravityMS2())
	}
	if out.GetThermal().GetTempMinC() != -185 {
		t.Errorf("temp_min_c=%v", out.GetThermal().GetTempMinC())
	}
	if v := out.GetVisual(); v == nil || v.GetRingData() == nil {
		t.Fatalf("ring_data should be parsed: %+v", out.GetVisual())
	}
	rd := out.GetVisual().GetRingData()
	if rd.GetInnerRadiusScale() != 1.2 || rd.GetOuterRadiusScale() != 2.4 {
		t.Errorf("ring scales=(%v,%v)", rd.GetInnerRadiusScale(), rd.GetOuterRadiusScale())
	}
	if len(rd.GetBands()) != 1 || rd.GetBands()[0].GetColor() != "#aaa" {
		t.Errorf("bands=%+v", rd.GetBands())
	}
	ct := out.GetVisual().GetCanvasTexture()
	if ct == nil || ct.GetTechnique() != "banded" {
		t.Errorf("canvas=%+v", ct)
	}
	if len(ct.GetPalette()) != 2 {
		t.Errorf("palette len=%d", len(ct.GetPalette()))
	}
	if out.GetVisual().GetAtmosphereColorHex() != "#cccccc" {
		t.Errorf("atmosphereColorHex=%q", out.GetVisual().GetAtmosphereColorHex())
	}
}

func TestMapPlanetToProto_BadRingDataLogsAndSkips(t *testing.T) {
	p := domain.Planet{
		Slug: "earth",
		Visual: domain.Visual{
			RingData:      []byte(`{ this is not json }`),
			CanvasTexture: nil,
		},
	}
	out := mapPlanetToProto(p, discardLogger())
	if out.GetVisual().GetRingData() != nil {
		t.Error("bad ring_data should map to nil, not panic")
	}
	if out.GetVisual().GetCanvasTexture() != nil {
		t.Error("nil canvas_texture should remain nil")
	}
}

func TestMapPlanetToProto_NullJSONFields(t *testing.T) {
	p := domain.Planet{
		Slug: "earth",
		Visual: domain.Visual{
			RingData:      json.RawMessage("null"),
			CanvasTexture: json.RawMessage("null"),
		},
	}
	out := mapPlanetToProto(p, discardLogger())
	if out.GetVisual().GetRingData() != nil {
		t.Error("null ring_data should map to nil")
	}
	if out.GetVisual().GetCanvasTexture() != nil {
		t.Error("null canvas_texture should map to nil")
	}
}

func TestMapMissionToProto_EndYearAndTrajectory(t *testing.T) {
	endYear := 1971
	ru := "9 суток"
	traj := domain.Trajectory{
		MissionSlug:  "apollo-11",
		MissionName:  "Apollo 11",
		Agency:       "NASA",
		Year:         1969,
		Duration:     "8 days",
		DurationRu:   &ru,
		Crew:         []string{"NA"},
		MoonPos:      json.RawMessage(`[5,0,2]`),
		MoonOrbitArc: 2.0,
		SimDurationS: 60,
		Waypoints:    json.RawMessage(`[[0,0,0],[1,2,3]]`),
		Phases: []domain.TrajectoryPhase{
			{ID: "leo", Label: "Launch", TStart: 0, TEnd: 0.1, Description: "boost"},
		},
	}
	m := domain.Mission{
		Slug:       "apollo-11",
		Name:       "Apollo 11",
		Year:       1969,
		EndYear:    &endYear,
		Trajectory: &traj,
	}
	out := mapMissionToProto(m, discardLogger())
	if out.GetEndYear() != 1971 {
		t.Errorf("end_year=%v", out.GetEndYear())
	}
	if out.GetTrajectory() == nil {
		t.Fatal("trajectory should be inlined")
	}
	if out.GetTrajectory().GetSimDurationS() != 60 {
		t.Errorf("sim_duration_s=%v", out.GetTrajectory().GetSimDurationS())
	}
	mp := out.GetTrajectory().GetMoonPos()
	if mp == nil || mp.GetX() != 5 || mp.GetY() != 0 || mp.GetZ() != 2 {
		t.Errorf("moon_pos=%+v", mp)
	}
	wps := out.GetTrajectory().GetWaypoints()
	if len(wps) != 2 || wps[1].GetX() != 1 || wps[1].GetY() != 2 || wps[1].GetZ() != 3 {
		t.Errorf("waypoints=%+v", wps)
	}
	phases := out.GetTrajectory().GetPhases()
	if len(phases) != 1 || phases[0].GetLabel() != "Launch" {
		t.Errorf("phases=%+v", phases)
	}
	if out.GetTrajectory().GetDurationRu() != ru {
		t.Errorf("duration_ru=%q", out.GetTrajectory().GetDurationRu())
	}
}

func TestMapMissionToProto_NoTrajectory(t *testing.T) {
	m := domain.Mission{Slug: "voyager-1", Year: 1977}
	out := mapMissionToProto(m, discardLogger())
	if out.GetTrajectory() != nil {
		t.Error("trajectory should be nil for missions without one")
	}
	if out.GetEndYear() != 0 {
		t.Errorf("end_year=%v want 0 zero-default", out.GetEndYear())
	}
}

func TestMapTrajectoryToProto_NilJSONFields(t *testing.T) {
	tr := domain.Trajectory{
		MissionSlug:  "a",
		MissionName:  "A",
		MoonPos:      nil,
		Waypoints:    nil,
		Phases:       nil,
		SimDurationS: 30,
	}
	out := mapTrajectoryToProto(tr, discardLogger())
	if out.GetMoonPos() != nil {
		t.Error("nil moon_pos should map to nil")
	}
	if out.GetWaypoints() != nil {
		t.Error("nil waypoints should map to nil")
	}
	if out.GetPhases() != nil {
		t.Error("nil phases should map to nil")
	}
}
