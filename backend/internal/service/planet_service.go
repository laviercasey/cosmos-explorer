package service

import (
	"context"
	"fmt"
	"strings"

	"cosmos/backend/internal/domain"
	"cosmos/backend/internal/store"
)

var supportedLangs = map[string]struct{}{
	"en": {},
	"ru": {},
}

func IsSupportedLang(s string) bool {
	if s == "" {
		return true
	}
	_, ok := supportedLangs[strings.ToLower(s)]
	return ok
}

type PlanetService struct {
	q *store.Queries
}

func NewPlanetService(q *store.Queries) *PlanetService {
	return &PlanetService{q: q}
}

func (s *PlanetService) List(ctx context.Context, f domain.PlanetListFilters, lang string) (domain.Page[domain.Planet], error) {
	sortField, sortDesc := parsePlanetSort(f.Sort)
	rows, err := s.q.ListPlanets(ctx, store.ListPlanetsParams{
		Types:     nilIfEmpty(f.Types),
		SortField: sortField,
		SortDesc:  sortDesc,
		Limit:     int32(f.Limit),
		Offset:    int32(f.Offset),
	})
	if err != nil {
		return domain.Page[domain.Planet]{}, fmt.Errorf("service: list planets: %w", err)
	}

	total, err := s.q.CountPlanets(ctx, nilIfEmpty(f.Types))
	if err != nil {
		return domain.Page[domain.Planet]{}, fmt.Errorf("service: count planets: %w", err)
	}

	items, err := s.buildPlanets(ctx, rows, false, lang)
	if err != nil {
		return domain.Page[domain.Planet]{}, err
	}
	return domain.Page[domain.Planet]{Items: items, Total: int(total)}, nil
}

func (s *PlanetService) Get(ctx context.Context, slug, lang string) (domain.Planet, error) {
	row, err := s.q.GetPlanetBySlug(ctx, slug)
	if err != nil {
		if isNoRows(err) {
			return domain.Planet{}, ErrNotFound
		}
		return domain.Planet{}, fmt.Errorf("service: get planet: %w", err)
	}
	items, err := s.buildPlanets(ctx, []store.PlanetRow{row}, true, lang)
	if err != nil {
		return domain.Planet{}, err
	}
	return items[0], nil
}

func shouldTranslate(lang string) bool {
	l := strings.ToLower(lang)
	return l != "" && l != "en"
}

func (s *PlanetService) buildPlanets(ctx context.Context, rows []store.PlanetRow, includeMissionDetails bool, lang string) ([]domain.Planet, error) {
	ids := make([]int64, len(rows))
	for i, r := range rows {
		ids[i] = r.ID
	}

	atmos, err := s.q.ListAtmosphereComponentsByPlanet(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("service: list atmosphere: %w", err)
	}
	moons, err := s.q.ListMoonsByPlanet(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("service: list moons: %w", err)
	}
	missions, err := s.q.ListPlanetMissionsByPlanet(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("service: list planet missions: %w", err)
	}

	atmosByPlanet := groupAtmosphere(atmos)
	moonsByPlanet := groupMoons(moons)
	missionsByPlanet := groupPlanetMissions(missions)

	planetTx := map[int64]store.PlanetTranslationRow{}
	moonTx := map[int64]store.MoonTranslationRow{}
	if shouldTranslate(lang) {
		planetTx, err = s.q.ListPlanetTranslationsByPlanets(ctx, ids, strings.ToLower(lang))
		if err != nil {
			return nil, fmt.Errorf("service: list planet translations: %w", err)
		}
		moonTx, err = s.q.ListMoonTranslationsByPlanets(ctx, ids, strings.ToLower(lang))
		if err != nil {
			return nil, fmt.Errorf("service: list moon translations: %w", err)
		}
	}

	out := make([]domain.Planet, len(rows))
	for i, r := range rows {
		p := mapPlanetRow(r, atmosByPlanet[r.ID], moonsByPlanet[r.ID], missionsByPlanet[r.ID], includeMissionDetails)
		if shouldTranslate(lang) {
			if t, ok := planetTx[r.ID]; ok {
				applyPlanetTranslation(&p, t)
			}
			if len(moonTx) > 0 {
				applyMoonTranslations(&p, moonsByPlanet[r.ID], moonTx)
			}
		}
		out[i] = p
	}
	return out, nil
}

func applyPlanetTranslation(p *domain.Planet, t store.PlanetTranslationRow) {
	if t.Name != "" {
		p.Name = t.Name
	}
	if t.Description != nil {
		p.Description = *t.Description
	}
	if t.AtmosphereNotes != nil {
		p.Atmosphere.Notes = *t.AtmosphereNotes
	}
	if len(t.Facts) > 0 {
		p.Facts = t.Facts
	}
	if len(t.SurfaceFeatures) > 0 {
		p.SurfaceFeatures = t.SurfaceFeatures
	}
}

func applyMoonTranslations(p *domain.Planet, canonicalMoons []store.MoonRow, moonTx map[int64]store.MoonTranslationRow) {
	if len(p.Moons) == 0 || len(canonicalMoons) == 0 {
		return
	}
	for i := range p.Moons {
		if i >= len(canonicalMoons) {
			break
		}
		if tr, ok := moonTx[canonicalMoons[i].ID]; ok {
			if tr.Name != "" {
				p.Moons[i].Name = tr.Name
			}
			if tr.Notes != nil {
				p.Moons[i].Description = *tr.Notes
			}
		}
	}
}

func mapPlanetRow(
	r store.PlanetRow,
	atmos []store.AtmosphereComponentRow,
	moons []store.MoonRow,
	missions []store.PlanetMissionRow,
	includeMissionDetails bool,
) domain.Planet {
	composition := make([]domain.AtmosphereComponent, len(atmos))
	for i, c := range atmos {
		composition[i] = domain.AtmosphereComponent{Gas: c.Gas, Percent: c.Percent}
	}

	moonOut := make([]domain.Moon, len(moons))
	for i, m := range moons {
		moonOut[i] = domain.Moon{
			Name:           m.Name,
			RadiusKm:       m.RadiusKm,
			DistanceKm:     m.DistanceKm,
			PeriodDays:     m.PeriodDays,
			DiscoveredBy:   m.DiscoveredBy,
			DiscoveredYear: int(m.DiscoveredYear),
			Description:    m.Description,
		}
	}

	slugs := make([]string, len(missions))
	for i, m := range missions {
		slugs[i] = m.Slug
	}

	surfaceFeatures := r.SurfaceFeatures
	if surfaceFeatures == nil {
		surfaceFeatures = []string{}
	}
	facts := r.Facts
	if facts == nil {
		facts = []string{}
	}
	p := domain.Planet{
		Slug:        r.Slug,
		Name:        r.Name,
		Index:       int(r.OrbitIndex),
		Type:        r.Type,
		Description: r.Description,
		Orbital: domain.OrbitalParams{
			SemiMajorAxisAU: r.SemiMajorAxisAU,
			Eccentricity:    r.Eccentricity,
			InclinationDeg:  r.InclinationDeg,
			PeriodDays:      r.PeriodDays,
			OrbitalSpeedKmS: r.OrbitalSpeedKmS,
		},
		Physical: domain.PhysicalParams{
			RadiusKm:            r.RadiusKm,
			MassKg:              r.MassKg,
			MassEarths:          r.MassEarths,
			SurfaceGravityMs2:   r.SurfaceGravityMs2,
			EscapeVelocityKmS:   r.EscapeVelocityKmS,
			DensityGCm3:         r.DensityGCm3,
			ObliquityDeg:        r.ObliquityDeg,
			RotationPeriodHours: r.RotationPeriodHours,
			FlatteningFactor:    r.FlatteningFactor,
		},
		Thermal: domain.ThermalParams{
			TempMinC: int(r.TempMinC),
			TempMaxC: int(r.TempMaxC),
			TempAvgC: int(r.TempAvgC),
			Albedo:   r.Albedo,
		},
		Atmosphere: domain.Atmosphere{
			SurfacePressureAtm: r.AtmosphereSurfacePressureAtm,
			HasGreenhouse:      r.AtmosphereHasGreenhouse,
			Notes:              r.AtmosphereNotes,
			Composition:        composition,
		},
		Visual: domain.Visual{
			ColorHex:           r.ColorHex,
			EmissiveHex:        r.EmissiveHex,
			Roughness:          r.Roughness,
			Metalness:          r.Metalness,
			HasAtmosphereGlow:  r.HasAtmosphereGlow,
			AtmosphereColorHex: r.AtmosphereColorHex,
			AtmosphereOpacity:  r.AtmosphereOpacity,
			HasCloudLayer:      r.HasCloudLayer,
			CloudColorHex:      r.CloudColorHex,
			HasRings:           r.HasRings,
			RingData:           r.RingData,
			VisualRadius:       r.VisualRadius,
			OrbitDistance:      r.OrbitDistance,
			CanvasTexture:      r.CanvasTexture,
		},
		SurfaceFeatures: surfaceFeatures,
		Facts:           facts,
		Moons:           moonOut,
		TotalMoonCount:  int(r.TotalMoonCount),
		MissionSlugs:    slugs,
		CreatedAt:       r.CreatedAt,
		UpdatedAt:       r.UpdatedAt,
	}

	if includeMissionDetails {
		refs := make([]domain.PlanetMissionRef, len(missions))
		for i, m := range missions {
			ach := ""
			if m.Achievement != nil {
				ach = *m.Achievement
			}
			refs[i] = domain.PlanetMissionRef{
				Slug:        m.Slug,
				Name:        m.Name,
				Agency:      m.Agency,
				Year:        int(m.Year),
				Type:        m.Type,
				Achievement: ach,
			}
		}
		p.Missions = refs
	}
	return p
}

func groupAtmosphere(rows []store.AtmosphereComponentRow) map[int64][]store.AtmosphereComponentRow {
	out := make(map[int64][]store.AtmosphereComponentRow)
	for _, r := range rows {
		out[r.PlanetID] = append(out[r.PlanetID], r)
	}
	return out
}

func groupMoons(rows []store.MoonRow) map[int64][]store.MoonRow {
	out := make(map[int64][]store.MoonRow)
	for _, r := range rows {
		out[r.PlanetID] = append(out[r.PlanetID], r)
	}
	return out
}

func groupPlanetMissions(rows []store.PlanetMissionRow) map[int64][]store.PlanetMissionRow {
	out := make(map[int64][]store.PlanetMissionRow)
	for _, r := range rows {
		out[r.PlanetID] = append(out[r.PlanetID], r)
	}
	return out
}

func nilIfEmpty(s []string) []string {
	if len(s) == 0 {
		return []string{}
	}
	return s
}

func parsePlanetSort(raw string) (string, bool) {
	if raw == "" {
		return "", false
	}
	desc := false
	if raw[0] == '-' {
		desc = true
		raw = raw[1:]
	}
	return raw, desc
}
