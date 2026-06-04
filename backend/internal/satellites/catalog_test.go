package satellites

import (
	"testing"
)

func TestCuratedSats_HasCoreEntries(t *testing.T) {
	t.Parallel()
	want := map[int]string{
		25544: "ISS (ZARYA)",
		20580: "HST",
		48274: "CSS (TIANHE)",
	}
	got := CuratedNoradIDs()
	for id, name := range want {
		s, ok := got[id]
		if !ok {
			t.Errorf("missing curated NORAD %d (%s)", id, name)
			continue
		}
		if s.Name != name {
			t.Errorf("NORAD %d: name = %q, want %q", id, s.Name, name)
		}
	}
}

func TestCuratedSats_OnlyISSHighlighted(t *testing.T) {
	t.Parallel()
	count := 0
	for _, s := range CuratedSats {
		if s.Highlight {
			count++
			if s.NoradID != 25544 {
				t.Errorf("Highlight=true on NORAD %d, expected only ISS (25544)", s.NoradID)
			}
		}
	}
	if count != 1 {
		t.Errorf("got %d highlighted satellites, want exactly 1 (ISS)", count)
	}
}

func TestCuratedSats_AtLeast25(t *testing.T) {
	t.Parallel()
	if len(CuratedSats) < 25 {
		t.Errorf("CuratedSats has %d entries, want ≥ 25", len(CuratedSats))
	}
}

func TestCuratedSats_NoDuplicateNoradIDs(t *testing.T) {
	t.Parallel()
	seen := make(map[int]bool, len(CuratedSats))
	for _, s := range CuratedSats {
		if seen[s.NoradID] {
			t.Errorf("duplicate NORAD id %d", s.NoradID)
		}
		seen[s.NoradID] = true
	}
}

func TestNormalizeTLEName(t *testing.T) {
	tests := []struct {
		in, want string
	}{
		{"ISS (ZARYA)", "ISS (ZARYA)"},
		{"  HST  ", "HST"},
		{"\rTIANHE\n", "TIANHE"},
	}
	for _, tt := range tests {
		if got := NormalizeTLEName(tt.in); got != tt.want {
			t.Errorf("NormalizeTLEName(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
