package service

import (
	"errors"
	"strings"
	"testing"

	"cosmos/backend/internal/domain"
	"cosmos/backend/internal/store"
)

func TestDecadeRange(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		wantLo  int32
		wantHi  int32
		wantErr bool
	}{
		{"1960s", "1960s", 1960, 1969, false},
		{"1970s case-insensitive", "1970S", 1970, 1979, false},
		{"with whitespace", "  2000s  ", 2000, 2009, false},
		{"missing suffix", "1960", 0, 0, true},
		{"wrong suffix", "1960z", 0, 0, true},
		{"non-aligned year", "1965s", 0, 0, true},
		{"non-numeric prefix", "abcds", 0, 0, true},
		{"wrong length", "197s", 0, 0, true},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			lo, hi, err := decadeRange(tc.in)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error for %q", tc.in)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if lo != tc.wantLo || hi != tc.wantHi {
				t.Errorf("got (%d,%d) want (%d,%d)", lo, hi, tc.wantLo, tc.wantHi)
			}
		})
	}
}

func TestParseSort(t *testing.T) {
	tests := []struct {
		raw       string
		wantField string
		wantDesc  bool
	}{
		{"year", "year", false},
		{"-year", "year", true},
		{"name", "name", false},
		{"-agency", "agency", true},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.raw, func(t *testing.T) {
			f, d := parseSort(tc.raw)
			if f != tc.wantField {
				t.Errorf("field=%q want %q", f, tc.wantField)
			}
			if d != tc.wantDesc {
				t.Errorf("desc=%v want %v", d, tc.wantDesc)
			}
		})
	}
}

func TestMissionService_BuildListParams_Defaults(t *testing.T) {
	s := &MissionService{}
	f := domain.MissionListFilters{Limit: 20, Offset: 0}
	p, err := s.buildListParams(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.SortField != "year" {
		t.Errorf("default sortField=%q want year", p.SortField)
	}
	if !p.SortDesc {
		t.Error("default sort should be descending")
	}
	if len(p.YearFrom) != 0 || len(p.YearTo) != 0 {
		t.Error("no decades should yield empty year arrays")
	}
}

func TestMissionService_BuildListParams_Filters(t *testing.T) {
	s := &MissionService{}
	f := domain.MissionListFilters{
		Agencies:     []string{"NASA", "ESA"},
		Decades:      []string{"1960s", "1970s"},
		Destinations: []string{"Moon"},
		Types:        []string{"flyby"},
		Statuses:     []string{"completed"},
		Sort:         "-name",
		Limit:        5,
		Offset:       10,
	}
	p, err := s.buildListParams(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.SortField != "name" || !p.SortDesc {
		t.Errorf("sort=%q desc=%v want name true", p.SortField, p.SortDesc)
	}
	if len(p.YearFrom) != 2 || len(p.YearTo) != 2 {
		t.Fatalf("year ranges len=%d/%d want 2/2", len(p.YearFrom), len(p.YearTo))
	}
	if p.YearFrom[0] != 1960 || p.YearTo[0] != 1969 {
		t.Errorf("first range=[%d,%d] want [1960,1969]", p.YearFrom[0], p.YearTo[0])
	}
	if p.YearFrom[1] != 1970 || p.YearTo[1] != 1979 {
		t.Errorf("second range=[%d,%d] want [1970,1979]", p.YearFrom[1], p.YearTo[1])
	}
	if p.Limit != 5 || p.Offset != 10 {
		t.Errorf("limit/offset=%d/%d want 5/10", p.Limit, p.Offset)
	}
	if len(p.Agencies) != 2 || p.Agencies[0] != "NASA" {
		t.Errorf("agencies=%v", p.Agencies)
	}
}

func TestMissionService_BuildListParams_InvalidDecade(t *testing.T) {
	s := &MissionService{}
	f := domain.MissionListFilters{
		Decades: []string{"bogus"},
		Limit:   10, Offset: 0,
	}
	_, err := s.buildListParams(f)
	if err == nil {
		t.Fatal("expected error for bogus decade")
	}
	if !errors.Is(err, ErrInvalidFilter) {
		t.Errorf("error chain missing ErrInvalidFilter: %v", err)
	}
}

func TestMapMissionRow(t *testing.T) {
	endYear := int32(1971)
	row := store.MissionRow{
		ID:           42,
		Slug:         "luna-17",
		Name:         "Luna 17",
		Agency:       "Soviet",
		Country:      "USSR",
		Year:         1970,
		EndYear:      &endYear,
		Destination:  "Moon",
		Type:         "rover",
		Status:       "completed",
		Description:  "First lunar rover",
		KeyFact:      "Луноход 1",
		Crew:         nil,
		Achievements: []string{"ach1", "ach2"},
	}
	refs := []domain.PlanetRef{{Slug: "earth", Name: "Earth"}}
	slugs := []string{"earth"}
	m := mapMissionRow(row, slugs, refs, nil)

	if m.Slug != "luna-17" {
		t.Errorf("Slug=%q", m.Slug)
	}
	if m.Year != 1970 {
		t.Errorf("Year=%d", m.Year)
	}
	if m.EndYear == nil || *m.EndYear != 1971 {
		t.Errorf("EndYear=%v want pointer to 1971", m.EndYear)
	}
	if len(m.Achievements) != 2 || m.Achievements[1] != "ach2" {
		t.Errorf("Achievements=%v", m.Achievements)
	}
	if len(m.Planets) != 1 || m.Planets[0].Slug != "earth" {
		t.Errorf("Planets=%v", m.Planets)
	}
	if m.Trajectory != nil {
		t.Errorf("Trajectory should be nil")
	}
}

func TestMapMissionRow_NilEndYear(t *testing.T) {
	row := store.MissionRow{Slug: "voyager-1", Year: 1977}
	m := mapMissionRow(row, nil, nil, nil)
	if m.EndYear != nil {
		t.Errorf("EndYear=%v want nil", m.EndYear)
	}
}

func TestErrInvalidFilterMessage(t *testing.T) {
	if !strings.Contains(ErrInvalidFilter.Error(), "invalid") {
		t.Errorf("ErrInvalidFilter.Error()=%q", ErrInvalidFilter.Error())
	}
}
