package domain

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestEnvelope_EncodesNulls(t *testing.T) {
	tests := []struct {
		name string
		env  Envelope
		want map[string]any
	}{
		{
			name: "success without meta",
			env:  Envelope{Data: map[string]string{"slug": "mars"}, Meta: nil, Error: nil},
			want: map[string]any{
				"data":  map[string]any{"slug": "mars"},
				"meta":  nil,
				"error": nil,
			},
		},
		{
			name: "success with meta",
			env: Envelope{
				Data: []int{1, 2},
				Meta: &PaginationMeta{Total: 3, Limit: 20, Offset: 0},
			},
			want: map[string]any{
				"data":  []any{float64(1), float64(2)},
				"meta":  map[string]any{"total": float64(3), "limit": float64(20), "offset": float64(0)},
				"error": nil,
			},
		},
		{
			name: "error path",
			env: Envelope{
				Error: &APIError{Code: "not_found", Message: "planet 'pluto' does not exist"},
			},
			want: map[string]any{
				"data": nil,
				"meta": nil,
				"error": map[string]any{
					"code":    "not_found",
					"message": "planet 'pluto' does not exist",
				},
			},
		},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			raw, err := json.Marshal(tc.env)
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}
			var got map[string]any
			if err := json.Unmarshal(raw, &got); err != nil {
				t.Fatalf("unmarshal: %v", err)
			}

			for _, k := range []string{"data", "meta", "error"} {
				if _, ok := got[k]; !ok {
					t.Errorf("key %q missing from envelope: %s", k, raw)
				}
			}
			wantJSON, _ := json.Marshal(tc.want)
			gotJSON, _ := json.Marshal(got)
			if !bytes.Equal(wantJSON, gotJSON) {
				t.Errorf("mismatch:\n got=%s\nwant=%s", gotJSON, wantJSON)
			}
		})
	}
}

func TestAPIError_DetailsOmitEmpty(t *testing.T) {
	e := APIError{Code: "bad_request", Message: "oops"}
	raw, _ := json.Marshal(e)
	if strings.Contains(string(raw), "details") {
		t.Errorf("empty details should be omitted: %s", raw)
	}

	withDetails := APIError{
		Code:    "validation_failed",
		Message: "invalid",
		Details: []FieldError{{Field: "limit", Message: "out of range"}},
	}
	raw2, _ := json.Marshal(withDetails)
	if !strings.Contains(string(raw2), "details") {
		t.Errorf("details should appear: %s", raw2)
	}
	if !strings.Contains(string(raw2), `"field":"limit"`) {
		t.Errorf("field name should appear: %s", raw2)
	}
}

func TestPlanetJSONFieldNames(t *testing.T) {
	p := Planet{
		Slug:        "mars",
		Name:        "Mars",
		Type:        "terrestrial",
		Description: "Red Planet",
	}
	raw, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	required := []string{
		`"slug"`, `"name"`, `"index"`, `"type"`,
		`"orbital"`, `"physical"`, `"thermal"`,
		`"atmosphere"`, `"visual"`,
		`"surface_features"`, `"facts"`,
		`"moons"`, `"total_moon_count"`, `"mission_slugs"`,
	}
	s := string(raw)
	for _, k := range required {
		if !strings.Contains(s, k) {
			t.Errorf("planet JSON missing %s", k)
		}
	}
	forbidden := []string{`"surfaceFeatures"`, `"missionSlugs"`, `"totalMoonCount"`}
	for _, k := range forbidden {
		if strings.Contains(s, k) {
			t.Errorf("planet JSON leaked camelCase %s", k)
		}
	}
}

func TestMissionJSONFieldNames(t *testing.T) {
	endYear := 1972
	m := Mission{
		Slug:    "apollo-11",
		Year:    1969,
		EndYear: &endYear,
		Crew:    []string{"Neil Armstrong"},
	}
	raw, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	s := string(raw)
	for _, k := range []string{
		`"slug"`, `"year"`, `"end_year"`, `"crew"`,
		`"achievements"`, `"planet_slugs"`, `"key_fact"`,
	} {
		if !strings.Contains(s, k) {
			t.Errorf("mission JSON missing %s", k)
		}
	}
	if !strings.Contains(s, `"end_year":1972`) {
		t.Errorf("end_year should marshal pointer-int: %s", s)
	}

	m2 := Mission{Slug: "voyager-1", Year: 1977}
	raw2, _ := json.Marshal(m2)
	if !strings.Contains(string(raw2), `"end_year":null`) {
		t.Errorf("end_year=nil should marshal as null: %s", raw2)
	}
}

func TestTrajectoryJSONShape(t *testing.T) {
	tr := Trajectory{
		MissionSlug:  "artemis-2",
		MissionName:  "Artemis 2",
		Year:         2026,
		SimDurationS: 60,
		Crew:         []string{"Reid Wiseman"},
		Waypoints:    []byte(`[[0,0.1,1.1]]`),
		MoonPos:      []byte(`[5.5,0,2]`),
		Phases: []TrajectoryPhase{
			{ID: "leo", TStart: 0, TEnd: 0.26, Label: "Launch", Description: "Launch phase."},
		},
	}
	raw, err := json.Marshal(tr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	s := string(raw)
	for _, k := range []string{
		`"mission_slug":"artemis-2"`,
		`"moon_pos":[5.5,0,2]`,
		`"waypoints":[[0,0.1,1.1]]`,
		`"sim_duration_s":60`,
		`"phases":`,
		`"id":"leo"`,
		`"t_start":0`,
		`"t_end":0.26`,
		`"label":"Launch"`,
		`"description":"Launch phase."`,
	} {
		if !strings.Contains(s, k) {
			t.Errorf("trajectory JSON missing %s\nfull=%s", k, s)
		}
	}
}

func TestTrajectoryPhase_JSONFieldNames(t *testing.T) {
	ph := TrajectoryPhase{
		ID:          "leo",
		TStart:      0,
		TEnd:        0.26,
		Label:       "Launch",
		Description: "Launch phase.",
	}
	raw, err := json.Marshal(ph)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	s := string(raw)
	for _, k := range []string{
		`"id":"leo"`,
		`"t_start":0`,
		`"t_end":0.26`,
		`"label":"Launch"`,
		`"description":"Launch phase."`,
	} {
		if !strings.Contains(s, k) {
			t.Errorf("phase JSON missing %s: %s", k, s)
		}
	}
}

func TestPagePayload(t *testing.T) {

	p := Page[Planet]{
		Items: []Planet{{Slug: "earth"}},
		Total: 1,
	}
	if p.Total != 1 || len(p.Items) != 1 || p.Items[0].Slug != "earth" {
		t.Errorf("Page payload unexpected: %+v", p)
	}
}
