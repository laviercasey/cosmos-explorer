package satellites

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func newTestRefresher(rt http.RoundTripper) *TLERefresher {
	client := &http.Client{Transport: rt}
	return NewTLERefresher(zerolog.Nop(), client)
}

const sampleVisualTLE = `ISS (ZARYA)
1 25544U 98067A   23303.55769400  .00021921  00000+0  39173-3 0  9990
2 25544  51.6422 108.2604 0001167  61.4856  17.5708 15.49866432423006
HST
1 20580U 90037B   23303.55769400  .00002879  00000+0  13234-3 0  9994
2 20580  28.4683  21.6502 0002648 152.2861 207.8195 15.10923264600000
NOT-IN-CURATED
1 99999U 99999A   23303.55769400  .00000100  00000+0  10000-4 0  9999
2 99999  98.0000  90.0000 0001000  85.0000 275.0000 14.40000000200000
`

func TestParseTLEStream_FiltersToCurated(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("should not call")
	}))

	cat, err := r.parseTLEStream(strings.NewReader(sampleVisualTLE))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}

	gotIDs := make(map[int]bool)
	for _, e := range cat.Entries {
		gotIDs[e.Sat.NoradID] = true
	}
	if !gotIDs[25544] {
		t.Error("expected ISS (25544) in catalog")
	}
	if !gotIDs[20580] {
		t.Error("expected HST (20580) in catalog")
	}
	if gotIDs[99999] {
		t.Error("NOT-IN-CURATED (99999) leaked through filter")
	}
	if len(cat.Entries) != 2 {
		t.Errorf("len = %d, want 2", len(cat.Entries))
	}
}

func TestParseTLEStream_OrderMatchesCurated(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("nope")
	}))
	reordered := `HST
1 20580U 90037B   23303.55769400  .00002879  00000+0  13234-3 0  9994
2 20580  28.4683  21.6502 0002648 152.2861 207.8195 15.10923264600000
ISS (ZARYA)
1 25544U 98067A   23303.55769400  .00021921  00000+0  39173-3 0  9990
2 25544  51.6422 108.2604 0001167  61.4856  17.5708 15.49866432423006
`
	cat, err := r.parseTLEStream(strings.NewReader(reordered))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(cat.Entries) != 2 {
		t.Fatalf("len = %d, want 2", len(cat.Entries))
	}
	if cat.Entries[0].Sat.NoradID != 25544 {
		t.Errorf("first = %d, want 25544 (ISS)", cat.Entries[0].Sat.NoradID)
	}
	if cat.Entries[1].Sat.NoradID != 20580 {
		t.Errorf("second = %d, want 20580 (HST)", cat.Entries[1].Sat.NoradID)
	}
}

func TestNoradIDFromLine(t *testing.T) {
	tests := []struct {
		name string
		line string
		want int
		ok   bool
	}{
		{"ISS", "1 25544U 98067A   23303.55769400  .00021921  00000+0  39173-3 0  9990", 25544, true},
		{"HST", "1 20580U 90037B   23303.55769400  .00002879  00000+0  13234-3 0  9994", 20580, true},
		{"too short", "1 99", 0, false},
		{"empty", "", 0, false},
		{"non-numeric", "1 abcdeU 98067A", 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := noradIDFromLine(tt.line)
			if ok != tt.ok || got != tt.want {
				t.Errorf("got (%d, %v), want (%d, %v)", got, ok, tt.want, tt.ok)
			}
		})
	}
}

func TestBackoffSchedule(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(nil)
	tests := []struct {
		failures int
		want     time.Duration
	}{
		{0, refreshInterval},
		{1, 1 * time.Minute},
		{2, 5 * time.Minute},
		{3, 30 * time.Minute},
		{4, refreshInterval},
		{99, refreshInterval},
	}
	for _, tt := range tests {
		got := r.backoffDelay(tt.failures)
		if got != tt.want {
			t.Errorf("backoffDelay(%d) = %v, want %v", tt.failures, got, tt.want)
		}
	}
}

func TestBoot_UsesEmbeddedSeedWhenFetchFails(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("network down")
	}))
	if err := r.Boot(context.Background()); err != nil {
		t.Fatalf("Boot should succeed using seed: %v", err)
	}
	cat := r.Catalog()
	if cat == nil || len(cat.Entries) == 0 {
		t.Fatalf("expected non-empty catalog from embedded seed, got %v", cat)
	}
}

func TestBoot_UsesNetworkOnSuccess(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.String() != CelestrakVisualURL {
			t.Errorf("unexpected URL %q", req.URL.String())
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(sampleVisualTLE)),
			Header:     http.Header{},
		}, nil
	}))
	if err := r.Boot(context.Background()); err != nil {
		t.Fatalf("Boot: %v", err)
	}
	cat := r.Catalog()
	if cat == nil {
		t.Fatal("nil catalog")
	}
	if len(cat.Entries) != 2 {
		t.Errorf("len = %d, want 2 (ISS + HST from sample)", len(cat.Entries))
	}
	if r.LastRefresh().IsZero() {
		t.Error("LastRefresh should be set after successful boot fetch")
	}
}

func TestFetchAndParse_HTTPError(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusServiceUnavailable,
			Body:       io.NopCloser(strings.NewReader("")),
			Header:     http.Header{},
		}, nil
	}))
	_, err := r.fetchAndParse(context.Background())
	if err == nil {
		t.Fatal("expected error on 503")
	}
}

func TestFetchAndParse_EmptyResponse(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader("")),
			Header:     http.Header{},
		}, nil
	}))
	_, err := r.fetchAndParse(context.Background())
	if err == nil {
		t.Fatal("expected error on empty TLE response")
	}
}

func TestEmbeddedSeedLoads(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(nil)
	cat, err := r.loadEmbeddedCatalog()
	if err != nil {
		t.Fatalf("loadEmbeddedCatalog: %v", err)
	}
	if cat == nil || len(cat.Entries) == 0 {
		t.Fatal("embedded seed produced empty catalog")
	}
	hasISS := false
	for _, e := range cat.Entries {
		if e.Sat.NoradID == 25544 {
			hasISS = true
			break
		}
	}
	if !hasISS {
		t.Error("embedded seed missing ISS (25544)")
	}
}

func TestRun_StopsOnContextCancel(t *testing.T) {
	t.Parallel()
	r := newTestRefresher(roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("never called")
	}))
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		r.Run(ctx)
		close(done)
	}()

	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return after ctx cancel")
	}
}
