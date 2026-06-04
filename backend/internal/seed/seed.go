package seed

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cosmos/backend/internal/store"
)

type Seeder struct {
	pool                    *pgxpool.Pool
	planetsFile             string
	missionsFile            string
	trajsFile               string
	translationsFile        string
	missionTranslationsFile string
}

func NewSeeder(pool *pgxpool.Pool, srcDir string) *Seeder {
	s := &Seeder{pool: pool}
	flatPlanets := filepath.Join(srcDir, "planets.ts")
	if _, err := os.Stat(flatPlanets); err == nil {
		s.planetsFile = flatPlanets
		s.missionsFile = filepath.Join(srcDir, "missions.ts")
		s.trajsFile = filepath.Join(srcDir, "trajectories.ts")
		s.translationsFile = filepath.Join(srcDir, "planetsTranslations.ts")
		s.missionTranslationsFile = filepath.Join(srcDir, "mission_translations_en.json")
		return s
	}

	s.planetsFile = filepath.Join(srcDir, "planet", "model", "planets.ts")
	s.missionsFile = filepath.Join(srcDir, "mission", "model", "missions.ts")
	s.trajsFile = filepath.Join(srcDir, "mission", "model", "trajectories.ts")
	if _, err := os.Stat(s.planetsFile); err != nil {
		s.planetsFile = filepath.Join(srcDir, "planet", "model", "planets.js")
		s.missionsFile = filepath.Join(srcDir, "mission", "model", "missions.js")
		s.trajsFile = filepath.Join(srcDir, "mission", "model", "trajectories.js")
	}
	s.translationsFile = filepath.Join(srcDir, "..", "shared", "i18n", "planetsTranslations.ts")
	s.missionTranslationsFile = filepath.Join(srcDir, "mission_translations_en.json")
	return s
}

func (s *Seeder) Run(ctx context.Context) error {
	var planets []rawPlanet
	if err := ReadJSArray(s.planetsFile, "PLANETS", &planets); err != nil {
		return fmt.Errorf("seed: planets parse: %w", err)
	}
	var missions []rawMission
	if err := ReadJSArray(s.missionsFile, "MISSIONS", &missions); err != nil {
		return fmt.Errorf("seed: missions parse: %w", err)
	}
	var trajs map[string]rawTrajectory
	if err := ReadJSArray(s.trajsFile, "MISSION_TRAJECTORIES", &trajs); err != nil {
		return fmt.Errorf("seed: trajectories parse: %w", err)
	}

	var translations map[string]rawPlanetTranslation
	if s.translationsFile != "" {
		if _, statErr := os.Stat(s.translationsFile); statErr == nil {
			if err := ReadJSArray(s.translationsFile, "PLANETS_RU", &translations); err != nil {
				return fmt.Errorf("seed: planet translations parse: %w", err)
			}
		} else {
			_, _ = os.Stderr.WriteString(fmt.Sprintf(
				"seed: INFO planet translations file %q not found — skipping RU seed\n",
				s.translationsFile,
			))
		}
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("seed: begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()
	q := store.NewWithTx(tx)

	missionIDBySlug, err := s.seedMissions(ctx, q, missions)
	if err != nil {
		return err
	}
	if err := s.seedPlanets(ctx, q, planets, missionIDBySlug); err != nil {
		return err
	}
	if err := s.seedTrajectories(ctx, q, trajs, missionIDBySlug); err != nil {
		return err
	}
	if len(translations) > 0 {
		if err := s.seedPlanetTranslations(ctx, q, translations); err != nil {
			return err
		}
	}

	if s.missionTranslationsFile != "" {
		if _, statErr := os.Stat(s.missionTranslationsFile); statErr == nil {
			missionTx, err := readMissionTranslations(s.missionTranslationsFile)
			if err != nil {
				return fmt.Errorf("seed: mission translations parse: %w", err)
			}
			if err := s.seedMissionTranslations(ctx, q, missionTx); err != nil {
				return err
			}
		} else {
			_, _ = os.Stderr.WriteString(fmt.Sprintf(
				"seed: INFO mission translations file %q not found — skipping EN seed\n",
				s.missionTranslationsFile,
			))
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("seed: commit: %w", err)
	}
	return nil
}

type rawMissionTranslation struct {
	Slug         string   `json:"slug"`
	Description  string   `json:"description"`
	KeyFact      string   `json:"key_fact"`
	Achievements []string `json:"achievements"`
}

func readMissionTranslations(path string) ([]rawMissionTranslation, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	var out []rawMissionTranslation
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&out); err != nil {
		return nil, fmt.Errorf("decode %s: %w", path, err)
	}
	return out, nil
}

func (s *Seeder) seedMissionTranslations(ctx context.Context, q *store.Queries, in []rawMissionTranslation) error {
	const lang = "en"
	for _, e := range in {
		missionID, err := q.GetMissionIDBySlug(ctx, e.Slug)
		if err != nil {
			_, _ = os.Stderr.WriteString(fmt.Sprintf(
				"seed: WARN mission translation for slug %q skipped: mission not found (%v)\n",
				e.Slug, err,
			))
			continue
		}
		var description, keyFact *string
		if e.Description != "" {
			v := e.Description
			description = &v
		}
		if e.KeyFact != "" {
			v := e.KeyFact
			keyFact = &v
		}
		achievements := e.Achievements
		if achievements == nil {
			achievements = []string{}
		}
		if err := q.UpsertMissionTranslation(ctx, store.UpsertMissionTranslationParams{
			MissionID:    missionID,
			Lang:         lang,
			Description:  description,
			KeyFact:      keyFact,
			Achievements: achievements,
		}); err != nil {
			return fmt.Errorf("seed: upsert mission translation for %q: %w", e.Slug, err)
		}
	}
	return nil
}

type rawPlanetTranslation struct {
	Name             string               `json:"name"`
	Description      string               `json:"description"`
	Facts            []string             `json:"facts"`
	SurfaceFeatures  []string             `json:"surfaceFeatures"`
	AtmosphereNotes  string               `json:"atmosphereNotes"`
	MoonDescriptions map[string]string    `json:"moonDescriptions"`
	Moons            []rawMoonTranslation `json:"moons"`
}

type rawMoonTranslation struct {
	Name  string `json:"name"`
	Notes string `json:"notes"`
}

func (s *Seeder) seedPlanetTranslations(ctx context.Context, q *store.Queries, in map[string]rawPlanetTranslation) error {
	const lang = "ru"
	for engName, ru := range in {
		planetID, err := q.LookupPlanetIDByName(ctx, engName)
		if err != nil {
			_, _ = os.Stderr.WriteString(fmt.Sprintf(
				"seed: WARN translation for planet %q not applied: planet not found (%v)\n",
				engName, err,
			))
			continue
		}

		var description, atmosphereNotes *string
		if ru.Description != "" {
			v := ru.Description
			description = &v
		}
		if ru.AtmosphereNotes != "" {
			v := ru.AtmosphereNotes
			atmosphereNotes = &v
		}
		name := ru.Name
		if name == "" {
			name = engName
		}

		if err := q.UpsertPlanetTranslation(ctx, store.UpsertPlanetTranslationParams{
			PlanetID:        planetID,
			Lang:            lang,
			Name:            name,
			Description:     description,
			AtmosphereNotes: atmosphereNotes,
			Facts:           ru.Facts,
			SurfaceFeatures: ru.SurfaceFeatures,
		}); err != nil {
			return fmt.Errorf("seed: upsert planet translation for %q: %w", engName, err)
		}

		for moonEngName, ruNotes := range ru.MoonDescriptions {
			moonID, err := q.LookupMoonIDByPlanetAndName(ctx, planetID, moonEngName)
			if err != nil {
				_, _ = os.Stderr.WriteString(fmt.Sprintf(
					"seed: WARN moon translation for %q/%q skipped: moon not found (%v)\n",
					engName, moonEngName, err,
				))
				continue
			}
			notes := ruNotes
			notesPtr := &notes
			if err := q.UpsertMoonTranslation(ctx, store.UpsertMoonTranslationParams{
				MoonID: moonID,
				Lang:   lang,
				Name:   moonEngName,
				Notes:  notesPtr,
			}); err != nil {
				return fmt.Errorf("seed: upsert moon translation for %q/%q: %w", engName, moonEngName, err)
			}
		}
	}
	return nil
}

func (s *Seeder) seedMissions(ctx context.Context, q *store.Queries, in []rawMission) (map[string]int64, error) {
	out := make(map[string]int64, len(in))
	for _, m := range in {
		slug := strings.TrimSpace(m.ID)
		if slug == "" {
			slug = Slugify(m.Name)
		}
		crew := nullableStrings(m.Crew)
		var endYear *int32
		if m.EndYear != nil {
			v := int32(*m.EndYear)
			endYear = &v
		}
		id, err := q.UpsertMission(ctx, store.UpsertMissionParams{
			Slug:         slug,
			Name:         m.Name,
			Agency:       m.Agency,
			Country:      m.Country,
			Year:         int32(m.Year),
			EndYear:      endYear,
			Destination:  m.Destination,
			Type:         m.Type,
			Status:       m.Status,
			Description:  m.Description,
			KeyFact:      m.KeyFact,
			Crew:         crew,
			Achievements: m.Achievements,
		})
		if err != nil {
			return nil, fmt.Errorf("seed: mission %q: %w", slug, err)
		}
		out[slug] = id

		out[compositeKey(m.Name, m.Year)] = id
	}
	return out, nil
}

func compositeKey(name string, year int) string {
	return fmt.Sprintf("%s::%d", strings.ToLower(strings.TrimSpace(name)), year)
}

func (s *Seeder) seedPlanets(ctx context.Context, q *store.Queries, in []rawPlanet, missionIDBySlug map[string]int64) error {
	for _, p := range in {
		slug := Slugify(p.Name)
		canvasJSON, err := remarshalCanvas(p.CanvasTexture)
		if err != nil {
			return fmt.Errorf("seed: planet %q canvas: %w", slug, err)
		}
		ringJSON, err := remarshalRing(p.RingData)
		if err != nil {
			return fmt.Errorf("seed: planet %q ring: %w", slug, err)
		}
		id, err := q.UpsertPlanet(ctx, store.UpsertPlanetParams{
			Slug:                         slug,
			Name:                         p.Name,
			OrbitIndex:                   int32(p.Index),
			Type:                         p.Type,
			Description:                  p.Description,
			SemiMajorAxisAU:              p.SemiMajorAxisAU,
			Eccentricity:                 p.Eccentricity,
			InclinationDeg:               p.InclinationDeg,
			PeriodDays:                   p.PeriodDays,
			OrbitalSpeedKmS:              p.OrbitalSpeedKmS,
			RadiusKm:                     p.RadiusKm,
			MassKg:                       p.MassKg,
			MassEarths:                   p.MassEarths,
			SurfaceGravityMs2:            p.SurfaceGravityMs2,
			EscapeVelocityKmS:            p.EscapeVelocityKmS,
			DensityGCm3:                  p.DensityGCm3,
			ObliquityDeg:                 p.ObliquityDeg,
			RotationPeriodHours:          p.RotationPeriodHours,
			FlatteningFactor:             p.FlatteningFactor,
			TempMinC:                     int32(p.TempMinC),
			TempMaxC:                     int32(p.TempMaxC),
			TempAvgC:                     int32(p.TempAvgC),
			Albedo:                       p.Albedo,
			AtmosphereSurfacePressureAtm: p.Atmosphere.SurfacePressureAtm,
			AtmosphereHasGreenhouse:      p.Atmosphere.HasGreenhouse,
			AtmosphereNotes:              p.Atmosphere.Notes,
			SurfaceFeatures:              p.SurfaceFeatures,
			Facts:                        p.Facts,
			TotalMoonCount:               int32(p.TotalMoonCount),
			ColorHex:                     p.ColorHex,
			EmissiveHex:                  p.EmissiveHex,
			Roughness:                    p.Roughness,
			Metalness:                    p.Metalness,
			HasAtmosphereGlow:            p.HasAtmosphereGlow,
			AtmosphereColorHex:           stringPtr(p.AtmosphereColorHex),
			AtmosphereOpacity:            p.AtmosphereOpacity,
			HasCloudLayer:                p.HasCloudLayer,
			CloudColorHex:                stringPtr(p.CloudColorHex),
			HasRings:                     p.HasRings,
			RingData:                     ringJSON,
			VisualRadius:                 p.VisualRadius,
			OrbitDistance:                p.OrbitDistance,
			CanvasTexture:                canvasJSON,
		})
		if err != nil {
			return fmt.Errorf("seed: planet %q: %w", slug, err)
		}

		if err := q.DeleteAtmosphereComponentsByPlanet(ctx, id); err != nil {
			return fmt.Errorf("seed: clear atmosphere %q: %w", slug, err)
		}
		for i, c := range p.Atmosphere.Composition {
			if err := q.InsertAtmosphereComponent(ctx, id, int32(i), c.Gas, c.Percent); err != nil {
				return fmt.Errorf("seed: atmosphere %q #%d: %w", slug, i, err)
			}
		}

		if err := q.DeleteMoonsByPlanet(ctx, id); err != nil {
			return fmt.Errorf("seed: clear moons %q: %w", slug, err)
		}
		for i, m := range p.Moons {
			if err := q.InsertMoon(ctx, store.InsertMoonParams{
				PlanetID:       id,
				Position:       int32(i),
				Name:           m.Name,
				RadiusKm:       m.RadiusKm,
				DistanceKm:     m.DistanceKm,
				PeriodDays:     m.PeriodDays,
				DiscoveredBy:   m.DiscoveredBy,
				DiscoveredYear: int32(m.DiscoveredYear),
				Description:    m.Description,
			}); err != nil {
				return fmt.Errorf("seed: moon %q/%s: %w", slug, m.Name, err)
			}
		}

		if err := q.DeletePlanetMissionsByPlanet(ctx, id); err != nil {
			return fmt.Errorf("seed: clear planet_missions %q: %w", slug, err)
		}
		for i, m := range p.Missions {
			missionID, ok := resolvePlanetMissionID(missionIDBySlug, m.Name, m.Year)
			if !ok {

				_, _ = os.Stderr.WriteString(fmt.Sprintf(
					"seed: WARN planet %q references unknown mission %q (year %d) — skipped\n",
					slug, m.Name, m.Year,
				))
				continue
			}
			var achievement *string
			if m.Achievement != "" {
				a := m.Achievement
				achievement = &a
			}
			if err := q.InsertPlanetMission(ctx, id, missionID, int32(i), achievement); err != nil {
				return fmt.Errorf("seed: planet_mission %q/%s: %w", slug, m.Name, err)
			}
		}
	}
	return nil
}

func (s *Seeder) seedTrajectories(ctx context.Context, q *store.Queries, in map[string]rawTrajectory, missionIDBySlug map[string]int64) error {
	for name, t := range in {
		missionID, ok := resolvePlanetMissionID(missionIDBySlug, t.MissionName, t.Year)
		if !ok {
			if id, hit := missionIDBySlug[Slugify(name)]; hit {
				missionID = id
				ok = true
			}
		}
		if !ok {
			_, _ = os.Stderr.WriteString(fmt.Sprintf(
				"seed: WARN trajectory %q references unknown mission %q (year %d) — skipped\n",
				name, t.MissionName, t.Year,
			))
			continue
		}

		moonPosJSON, err := json.Marshal(t.MoonPos)
		if err != nil {
			return fmt.Errorf("seed: trajectory %q moon_pos: %w", name, err)
		}
		waypointsJSON, err := json.Marshal(t.Waypoints)
		if err != nil {
			return fmt.Errorf("seed: trajectory %q waypoints: %w", name, err)
		}

		phases := make([]map[string]any, len(t.Phases))
		for i, p := range t.Phases {
			phase := map[string]any{
				"id":       p.ID,
				"label":    p.Label,
				"label_ru": p.LabelRu,
			}
			if len(p.T) == 2 {
				phase["t_start"] = p.T[0]
				phase["t_end"] = p.T[1]
			}
			if p.Description != "" {
				phase["description"] = p.Description
			}
			if p.DescriptionRu != "" {
				phase["description_ru"] = p.DescriptionRu
			}
			phases[i] = phase
		}
		phasesJSON, err := json.Marshal(phases)
		if err != nil {
			return fmt.Errorf("seed: trajectory %q phases: %w", name, err)
		}

		var durationRu *string
		if t.DurationRu != "" {
			v := t.DurationRu
			durationRu = &v
		}
		if err := q.UpsertTrajectory(ctx, store.UpsertTrajectoryParams{
			MissionID:    missionID,
			Duration:     t.Duration,
			DurationRu:   durationRu,
			MoonPos:      moonPosJSON,
			MoonOrbitArc: t.MoonOrbitArc,
			Waypoints:    waypointsJSON,
			Phases:       phasesJSON,
			SimDurationS: int32(t.SimDuration),
		}); err != nil {
			return fmt.Errorf("seed: trajectory %q: %w", name, err)
		}
	}
	return nil
}

type rawPlanet struct {
	Name                string             `json:"name"`
	Index               int                `json:"index"`
	Type                string             `json:"type"`
	Description         string             `json:"description"`
	SemiMajorAxisAU     float64            `json:"semiMajorAxisAU"`
	Eccentricity        float64            `json:"eccentricity"`
	InclinationDeg      float64            `json:"inclinationDeg"`
	PeriodDays          float64            `json:"periodDays"`
	OrbitalSpeedKmS     float64            `json:"orbitalSpeedKmS"`
	RadiusKm            float64            `json:"radiusKm"`
	MassKg              float64            `json:"massKg"`
	MassEarths          float64            `json:"massEarths"`
	SurfaceGravityMs2   float64            `json:"surfaceGravityMs2"`
	EscapeVelocityKmS   float64            `json:"escapeVelocityKmS"`
	DensityGCm3         float64            `json:"densityGCm3"`
	ObliquityDeg        float64            `json:"obliquityDeg"`
	RotationPeriodHours float64            `json:"rotationPeriodHours"`
	FlatteningFactor    float64            `json:"flatteningFactor"`
	Atmosphere          rawAtmosphere      `json:"atmosphere"`
	TempMinC            int                `json:"tempMinC"`
	TempMaxC            int                `json:"tempMaxC"`
	TempAvgC            int                `json:"tempAvgC"`
	Albedo              float64            `json:"albedo"`
	SurfaceFeatures     []string           `json:"surfaceFeatures"`
	Moons               []rawMoon          `json:"moons"`
	TotalMoonCount      int                `json:"totalMoonCount"`
	Missions            []rawPlanetMission `json:"missions"`
	Facts               []string           `json:"facts"`
	ColorHex            string             `json:"colorHex"`
	EmissiveHex         string             `json:"emissiveHex"`
	Roughness           float64            `json:"roughness"`
	Metalness           float64            `json:"metalness"`
	HasAtmosphereGlow   bool               `json:"hasAtmosphereGlow"`
	AtmosphereColorHex  string             `json:"atmosphereColorHex"`
	AtmosphereOpacity   float64            `json:"atmosphereOpacity"`
	HasCloudLayer       bool               `json:"hasCloudLayer"`
	CloudColorHex       string             `json:"cloudColorHex"`
	HasRings            bool               `json:"hasRings"`
	RingData            json.RawMessage    `json:"ringData"`
	VisualRadius        float64            `json:"visualRadius"`
	OrbitDistance       float64            `json:"orbitDistance"`
	CanvasTexture       json.RawMessage    `json:"canvasTexture"`
}

type rawAtmosphere struct {
	Composition        []rawComposition `json:"composition"`
	SurfacePressureAtm float64          `json:"surfacePressureAtm"`
	HasGreenhouse      bool             `json:"hasGreenhouse"`
	Notes              string           `json:"notes"`
}

type rawComposition struct {
	Gas     string  `json:"gas"`
	Percent float64 `json:"percent"`
}

type rawMoon struct {
	Name           string  `json:"name"`
	RadiusKm       float64 `json:"radiusKm"`
	DistanceKm     float64 `json:"distanceKm"`
	PeriodDays     float64 `json:"periodDays"`
	DiscoveredBy   string  `json:"discoveredBy"`
	DiscoveredYear int     `json:"discoveredYear"`
	Description    string  `json:"description"`
}

type rawPlanetMission struct {
	Name        string `json:"name"`
	Agency      string `json:"agency"`
	Year        int    `json:"year"`
	Type        string `json:"type"`
	Achievement string `json:"achievement"`
}

type rawMission struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Agency       string   `json:"agency"`
	Country      string   `json:"country"`
	Year         int      `json:"year"`
	EndYear      *int     `json:"endYear"`
	Destination  string   `json:"destination"`
	Type         string   `json:"type"`
	Status       string   `json:"status"`
	Description  string   `json:"description"`
	KeyFact      string   `json:"keyFact"`
	Crew         []string `json:"crew"`
	Achievements []string `json:"achievements"`
}

type rawTrajectory struct {
	MissionName  string      `json:"missionName"`
	Agency       string      `json:"agency"`
	Year         int         `json:"year"`
	Duration     string      `json:"duration"`
	DurationRu   string      `json:"durationRu"`
	Crew         []string    `json:"crew"`
	MoonPos      []float64   `json:"moonPos"`
	MoonOrbitArc float64     `json:"moonOrbitArc"`
	Waypoints    [][]float64 `json:"waypoints"`
	SimDuration  int         `json:"simDuration"`
	Phases       []rawPhase  `json:"phases"`
}

type rawPhase struct {
	ID            string    `json:"id"`
	Label         string    `json:"label"`
	LabelRu       string    `json:"labelRu"`
	T             []float64 `json:"t"`
	Description   string    `json:"description"`
	DescriptionRu string    `json:"descriptionRu"`
}

var slugReplaceRe = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = slugReplaceRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func resolvePlanetMissionID(ids map[string]int64, name string, year int) (int64, bool) {
	if id, ok := ids[compositeKey(name, year)]; ok {
		return id, true
	}
	if id, ok := ids[Slugify(name)]; ok {
		return id, true
	}

	for _, sep := range []string{"&", "/"} {
		for _, part := range strings.Split(name, sep) {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if id, ok := ids[compositeKey(part, year)]; ok {
				return id, true
			}
			if id, ok := ids[Slugify(part)]; ok {
				return id, true
			}
		}
	}
	return 0, false
}

func nullableStrings(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	return in
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func remarshalCanvas(in json.RawMessage) ([]byte, error) {
	if len(in) == 0 || string(in) == "null" {
		return nil, errors.New("canvasTexture is required")
	}
	var raw struct {
		Technique     string   `json:"technique"`
		Palette       []string `json:"palette"`
		NoiseScale    float64  `json:"noiseScale"`
		CraterDensity float64  `json:"craterDensity"`
	}
	if err := json.Unmarshal(in, &raw); err != nil {
		return nil, err
	}
	out := map[string]any{
		"technique":      raw.Technique,
		"palette":        raw.Palette,
		"noise_scale":    raw.NoiseScale,
		"crater_density": raw.CraterDensity,
	}
	return json.Marshal(out)
}

func remarshalRing(in json.RawMessage) ([]byte, error) {
	if len(in) == 0 || string(in) == "null" {
		return nil, nil
	}
	var raw struct {
		InnerRadiusScale float64 `json:"innerRadiusScale"`
		OuterRadiusScale float64 `json:"outerRadiusScale"`
		Bands            []struct {
			Color   string  `json:"color"`
			Start   float64 `json:"start"`
			End     float64 `json:"end"`
			Opacity float64 `json:"opacity"`
		} `json:"bands"`
	}
	if err := json.Unmarshal(in, &raw); err != nil {
		return nil, err
	}
	bands := make([]map[string]any, len(raw.Bands))
	for i, b := range raw.Bands {
		bands[i] = map[string]any{
			"color":   b.Color,
			"start":   b.Start,
			"end":     b.End,
			"opacity": b.Opacity,
		}
	}
	out := map[string]any{
		"inner_radius_scale": raw.InnerRadiusScale,
		"outer_radius_scale": raw.OuterRadiusScale,
		"bands":              bands,
	}
	return json.Marshal(out)
}
