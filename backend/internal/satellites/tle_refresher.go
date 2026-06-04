package satellites

import (
	"bufio"
	"context"
	"embed"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/joshuaferrara/go-satellite"
	"github.com/rs/zerolog"
)

const CelestrakVisualURL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=TLE"

const (
	refreshInterval  = 24 * time.Hour
	httpFetchTimeout = 8 * time.Second
	bootFetchTimeout = 5 * time.Second
)

var backoffSchedule = []time.Duration{
	1 * time.Minute,
	5 * time.Minute,
	30 * time.Minute,
}

//go:embed tle_seed/*.tle
var embeddedSeed embed.FS

type TLERefresher struct {
	log     zerolog.Logger
	httpDo  func(*http.Request) (*http.Response, error)
	curated map[int]Sat

	cat        atomic.Pointer[Catalog]
	lastUpdate atomic.Int64
}

func NewTLERefresher(log zerolog.Logger, httpClient *http.Client) *TLERefresher {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: httpFetchTimeout}
	}
	return &TLERefresher{
		log:     log.With().Str("component", "satellites.refresher").Logger(),
		httpDo:  httpClient.Do,
		curated: CuratedNoradIDs(),
	}
}

func (r *TLERefresher) Catalog() *Catalog {
	return r.cat.Load()
}

func (r *TLERefresher) LastRefresh() time.Time {
	ns := r.lastUpdate.Load()
	if ns == 0 {
		return time.Time{}
	}
	return time.Unix(0, ns)
}

func (r *TLERefresher) Boot(ctx context.Context) error {
	seed, seedErr := r.loadEmbeddedCatalog()
	if seedErr == nil && len(seed.Entries) > 0 {
		r.cat.Store(seed)
		r.log.Info().Int("entries", len(seed.Entries)).Msg("loaded embedded TLE seed")
	} else if seedErr != nil {
		r.log.Warn().Err(seedErr).Msg("embedded TLE seed parse failed")
	}

	bootCtx, cancel := context.WithTimeout(ctx, bootFetchTimeout)
	defer cancel()

	cat, err := r.fetchAndParse(bootCtx)
	if err != nil {
		if r.cat.Load() == nil {
			return fmt.Errorf("boot tle fetch failed and no usable seed: %w", err)
		}
		r.log.Warn().Err(err).Msg("boot Celestrak fetch failed; using embedded seed")
		return nil
	}
	r.cat.Store(cat)
	r.lastUpdate.Store(time.Now().UnixNano())
	r.log.Info().Int("entries", len(cat.Entries)).Msg("Celestrak TLE fetched on boot")
	return nil
}

func (r *TLERefresher) Run(ctx context.Context) {
	r.log.Info().Dur("interval", refreshInterval).Msg("refresher started")

	failures := 0
	timer := time.NewTimer(refreshInterval)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			r.log.Info().Msg("refresher stopped")
			return
		case <-timer.C:
			cat, err := r.fetchAndParse(ctx)
			if err != nil {
				failures++
				delay := r.backoffDelay(failures)
				r.log.Warn().Err(err).Int("failures", failures).Dur("retry_in", delay).Msg("TLE refresh failed")
				timer.Reset(delay)
				continue
			}
			failures = 0
			r.cat.Store(cat)
			r.lastUpdate.Store(time.Now().UnixNano())
			r.log.Info().Int("entries", len(cat.Entries)).Msg("TLE catalog refreshed")
			timer.Reset(refreshInterval)
		}
	}
}

func (r *TLERefresher) backoffDelay(failures int) time.Duration {
	if failures <= 0 {
		return refreshInterval
	}
	if failures-1 < len(backoffSchedule) {
		return backoffSchedule[failures-1]
	}
	return refreshInterval
}

func (r *TLERefresher) fetchAndParse(ctx context.Context) (*Catalog, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, CelestrakVisualURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "text/plain")
	req.Header.Set("User-Agent", "cosmos-explorer-backend/1.0 (+https://cosmos.lavier.tech)")

	resp, err := r.httpDo(req)
	if err != nil {
		return nil, fmt.Errorf("celestrak request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("celestrak status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("celestrak read: %w", err)
	}
	cat, err := r.parseTLEStream(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("celestrak parse: %w", err)
	}
	if len(cat.Entries) == 0 {
		return nil, errors.New("celestrak returned no curated entries")
	}
	return cat, nil
}

func (r *TLERefresher) loadEmbeddedCatalog() (*Catalog, error) {
	f, err := embeddedSeed.Open("tle_seed/visual.tle")
	if err != nil {
		return nil, fmt.Errorf("open embedded seed: %w", err)
	}
	defer func() { _ = f.Close() }()
	return r.parseTLEStream(f)
}

func (r *TLERefresher) parseTLEStream(rd io.Reader) (*Catalog, error) {
	scanner := bufio.NewScanner(rd)
	scanner.Buffer(make([]byte, 0, 8192), 1024*1024)

	type record struct {
		name  string
		line1 string
		line2 string
	}
	var records []record
	var pending []string
	for scanner.Scan() {
		line := strings.TrimRight(scanner.Text(), "\r\n ")
		if strings.TrimSpace(line) == "" {
			continue
		}
		pending = append(pending, line)
		if len(pending) == 3 {
			records = append(records, record{
				name:  NormalizeTLEName(pending[0]),
				line1: pending[1],
				line2: pending[2],
			})
			pending = pending[:0]
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read TLE: %w", err)
	}

	byID := make(map[int]record, len(records))
	for _, rec := range records {
		id, ok := noradIDFromLine(rec.line1)
		if !ok {
			continue
		}
		byID[id] = rec
	}

	out := &Catalog{Entries: make([]Entry, 0, len(CuratedSats))}
	for _, want := range CuratedSats {
		rec, ok := byID[want.NoradID]
		if !ok {
			continue
		}
		entry, err := buildEntry(want, rec.line1, rec.line2)
		if err != nil {
			r.log.Warn().Int("norad", want.NoradID).Err(err).Msg("skip invalid TLE")
			continue
		}
		out.Entries = append(out.Entries, entry)
	}
	return out, nil
}

func buildEntry(s Sat, line1, line2 string) (entry Entry, err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("TLEToSat panicked: %v", rec)
		}
	}()
	sgp := satellite.TLEToSat(line1, line2, satellite.GravityWGS84)
	if sgp.ErrorStr != "" {
		return Entry{}, errors.New(sgp.ErrorStr)
	}
	return Entry{Sat: s, Sgp4Sat: sgp}, nil
}

func noradIDFromLine(line1 string) (int, bool) {
	if len(line1) < 8 {
		return 0, false
	}
	field := strings.TrimSpace(line1[2:7])
	if field == "" {
		return 0, false
	}
	id, err := strconv.Atoi(field)
	if err != nil {
		return 0, false
	}
	return id, true
}
