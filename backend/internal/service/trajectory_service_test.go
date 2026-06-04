package service

import (
	"encoding/json"
	"errors"
	"testing"

	"cosmos/backend/internal/store"
)

func TestTrajectorySentinels_Distinct(t *testing.T) {
	if errors.Is(ErrMissionNotFound, ErrTrajectoryNotFound) {
		t.Error("ErrMissionNotFound should not equal ErrTrajectoryNotFound")
	}
	if ErrMissionNotFound.Error() == "" {
		t.Error("ErrMissionNotFound.Error() empty")
	}
	if ErrTrajectoryNotFound.Error() == "" {
		t.Error("ErrTrajectoryNotFound.Error() empty")
	}
}

func TestMapTrajectoryRow(t *testing.T) {
	ru := "9 суток"
	row := store.TrajectoryRow{
		ID:           10,
		MissionID:    2,
		MissionSlug:  "artemis-2",
		MissionName:  "Artemis 2",
		Agency:       "NASA",
		Year:         2026,
		Crew:         []string{"Reid Wiseman"},
		Duration:     "9 days 1 hour",
		DurationRu:   &ru,
		MoonPos:      json.RawMessage(`[5.5, 0, 2.0]`),
		MoonOrbitArc: 2.08,
		Waypoints:    json.RawMessage(`[[0,0.1,1.1]]`),
		Phases:       json.RawMessage(`[]`),
		SimDurationS: 60,
	}
	tr := mapTrajectoryRow(row)
	if tr.MissionSlug != "artemis-2" {
		t.Errorf("MissionSlug=%q", tr.MissionSlug)
	}
	if tr.Year != 2026 {
		t.Errorf("Year=%d", tr.Year)
	}
	if tr.SimDurationS != 60 {
		t.Errorf("SimDurationS=%d", tr.SimDurationS)
	}
	if string(tr.MoonPos) != `[5.5, 0, 2.0]` {
		t.Errorf("MoonPos passthrough failed: %s", tr.MoonPos)
	}
	if tr.DurationRu == nil || *tr.DurationRu != ru {
		t.Errorf("DurationRu=%v want %q", tr.DurationRu, ru)
	}
}

func TestLocalizePhases_Canonical(t *testing.T) {
	raw := json.RawMessage(`[
		{"id":"leo","t_start":0,"t_end":0.26,"label":"Launch","label_ru":"Запуск","description":"Launch phase.","description_ru":"Фаза запуска."}
	]`)
	phases, err := localizePhases(raw, "")
	if err != nil {
		t.Fatalf("localizePhases err: %v", err)
	}
	if len(phases) != 1 {
		t.Fatalf("len(phases)=%d", len(phases))
	}
	if phases[0].Label != "Launch" {
		t.Errorf("label=%q want Launch", phases[0].Label)
	}
	if phases[0].Description != "Launch phase." {
		t.Errorf("description=%q want English", phases[0].Description)
	}
	if phases[0].ID != "leo" {
		t.Errorf("id=%q want leo", phases[0].ID)
	}
	if phases[0].TStart != 0 || phases[0].TEnd != 0.26 {
		t.Errorf("t_start/t_end=(%v,%v) want (0,0.26)", phases[0].TStart, phases[0].TEnd)
	}
}

func TestLocalizePhases_Russian(t *testing.T) {
	raw := json.RawMessage(`[
		{"id":"leo","t_start":0,"t_end":0.26,"label":"Launch","label_ru":"Запуск","description":"Launch phase.","description_ru":"Фаза запуска."}
	]`)
	phases, err := localizePhases(raw, "ru")
	if err != nil {
		t.Fatalf("localizePhases err: %v", err)
	}
	if phases[0].Label != "Запуск" {
		t.Errorf("label=%q want Запуск", phases[0].Label)
	}
	if phases[0].Description != "Фаза запуска." {
		t.Errorf("description=%q want Russian", phases[0].Description)
	}
}

func TestLocalizePhases_EnglishExplicit(t *testing.T) {
	raw := json.RawMessage(`[
		{"id":"leo","t_start":0,"t_end":0.26,"label":"Launch","label_ru":"Запуск","description":"Launch phase.","description_ru":"Фаза запуска."}
	]`)
	phases, err := localizePhases(raw, "en")
	if err != nil {
		t.Fatalf("localizePhases err: %v", err)
	}
	if phases[0].Label != "Launch" {
		t.Errorf("label=%q want Launch", phases[0].Label)
	}
}

func TestLocalizePhases_EmptyPassthrough(t *testing.T) {
	out, err := localizePhases(nil, "ru")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if out != nil {
		t.Errorf("expected nil slice, got len=%d", len(out))
	}
}

func TestLocalizePhases_JSONWireShape(t *testing.T) {
	raw := json.RawMessage(`[
		{"id":"leo","t_start":0,"t_end":0.26,"label":"Launch","description":"Launch phase."}
	]`)
	phases, err := localizePhases(raw, "")
	if err != nil {
		t.Fatalf("localizePhases err: %v", err)
	}
	encoded, err := json.Marshal(phases)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded []map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded[0]["id"] != "leo" {
		t.Errorf("id=%v want leo", decoded[0]["id"])
	}
	if _, ok := decoded[0]["t_start"]; !ok {
		t.Errorf("t_start missing")
	}
	if _, ok := decoded[0]["t_end"]; !ok {
		t.Errorf("t_end missing")
	}
	if decoded[0]["label"] != "Launch" {
		t.Errorf("label=%v want Launch", decoded[0]["label"])
	}
	if decoded[0]["description"] != "Launch phase." {
		t.Errorf("description=%v want 'Launch phase.'", decoded[0]["description"])
	}
}

func TestServiceErrNotFound(t *testing.T) {
	if ErrNotFound.Error() == "" {
		t.Error("ErrNotFound.Error() empty")
	}
}
