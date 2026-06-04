package realtime

import (
	"encoding/json"
	"testing"
	"time"
)

func TestFrameVersionConstant(t *testing.T) {
	if FrameVersion != 1 {
		t.Fatalf("FrameVersion should be 1, got %d", FrameVersion)
	}
}

func TestNewTickFrame_RoundTrip(t *testing.T) {
	now := time.Date(2026, 5, 8, 12, 34, 56, 0, time.UTC)
	sats := []SatPosition{
		{ID: 25544, Name: "ISS (ZARYA)", ECEFKm: [3]float64{4567.123, -1234.567, 4321.987}, VelKms: [3]float64{-3.456, 5.678, -1.234}, AltKm: 421.7},
	}
	frame := NewTickFrame(42, now, sats)

	data, err := json.Marshal(frame)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var got TickFrame
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if got.V != FrameVersion {
		t.Errorf("V = %d, want %d", got.V, FrameVersion)
	}
	if got.Type != FrameTypeTick {
		t.Errorf("Type = %q, want %q", got.Type, FrameTypeTick)
	}
	if got.Seq != 42 {
		t.Errorf("Seq = %d, want 42", got.Seq)
	}
	if got.EpochMs != now.UnixMilli() {
		t.Errorf("EpochMs = %d, want %d", got.EpochMs, now.UnixMilli())
	}
	if len(got.Satellites) != 1 {
		t.Fatalf("len(Satellites) = %d, want 1", len(got.Satellites))
	}
	if got.Satellites[0].ID != 25544 {
		t.Errorf("Satellites[0].ID = %d, want 25544", got.Satellites[0].ID)
	}
}

func TestNewTickFrame_NilSats(t *testing.T) {
	frame := NewTickFrame(1, time.Now(), nil)
	if frame.Satellites == nil {
		t.Fatal("expected empty slice, got nil — JSON would emit null")
	}
	data, _ := json.Marshal(frame)
	if !contains(data, []byte(`"satellites":[]`)) {
		t.Errorf("expected empty satellites array, got: %s", data)
	}
}

func TestNewCatalogFrame_RoundTrip(t *testing.T) {
	entries := []SatCatalogEntry{
		{ID: 25544, Name: "ISS (ZARYA)", ColorHint: "#44aaff", Highlight: true},
		{ID: 20580, Name: "HST", ColorHint: "#ffd966", Highlight: false},
	}
	frame := NewCatalogFrame(entries)

	data, err := json.Marshal(frame)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var got CatalogFrame
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if got.V != FrameVersion {
		t.Errorf("V = %d, want %d", got.V, FrameVersion)
	}
	if got.Type != FrameTypeCatalog {
		t.Errorf("Type = %q, want %q", got.Type, FrameTypeCatalog)
	}
	if len(got.Satellites) != 2 {
		t.Fatalf("len = %d, want 2", len(got.Satellites))
	}
	if !got.Satellites[0].Highlight {
		t.Error("expected ISS Highlight=true")
	}
}

func TestNewByeFrame(t *testing.T) {
	frame := NewByeFrame(ByeReasonServerShutdown, 5000)
	data, err := json.Marshal(frame)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var got ByeFrame
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if got.Reason != ByeReasonServerShutdown {
		t.Errorf("Reason = %q, want %q", got.Reason, ByeReasonServerShutdown)
	}
	if got.RetryAfterMs != 5000 {
		t.Errorf("RetryAfterMs = %d, want 5000", got.RetryAfterMs)
	}
}

func TestNewPingFrame(t *testing.T) {
	now := time.Date(2026, 5, 8, 12, 0, 0, 0, time.UTC)
	frame := NewPingFrame(now)
	if frame.Type != FrameTypePing {
		t.Errorf("Type = %q, want ping", frame.Type)
	}
	if frame.V != FrameVersion {
		t.Errorf("V = %d, want %d", frame.V, FrameVersion)
	}
}

func TestMarshalFrame(t *testing.T) {
	frame := NewByeFrame("test", 1000)
	data, err := MarshalFrame(frame)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("empty marshal output")
	}
}

func contains(haystack, needle []byte) bool {
	if len(needle) > len(haystack) {
		return false
	}
	for i := 0; i+len(needle) <= len(haystack); i++ {
		match := true
		for j := range needle {
			if haystack[i+j] != needle[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
