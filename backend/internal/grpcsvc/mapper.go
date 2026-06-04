package grpcsvc

import (
	"bytes"
	"encoding/json"

	"github.com/rs/zerolog"

	cosmosv1 "cosmos/backend/gen/proto/cosmos/v1"
	"cosmos/backend/internal/domain"
)

var jsonNull = []byte("null")

func isNullRaw(raw json.RawMessage) bool {
	return len(raw) == 0 || bytes.Equal(bytes.TrimSpace(raw), jsonNull)
}

func mapPlanetToProto(p domain.Planet, log zerolog.Logger) *cosmosv1.Planet {
	return &cosmosv1.Planet{
		Slug:        p.Slug,
		Name:        p.Name,
		Index:       int32(p.Index),
		Type:        p.Type,
		Description: p.Description,
		Orbital: &cosmosv1.OrbitalParams{
			SemiMajorAxisAu: p.Orbital.SemiMajorAxisAU,
			Eccentricity:    p.Orbital.Eccentricity,
			InclinationDeg:  p.Orbital.InclinationDeg,
			PeriodDays:      p.Orbital.PeriodDays,
			OrbitalSpeedKmS: p.Orbital.OrbitalSpeedKmS,
		},
		Physical: &cosmosv1.PhysicalParams{
			RadiusKm:            p.Physical.RadiusKm,
			MassKg:              p.Physical.MassKg,
			MassEarths:          p.Physical.MassEarths,
			SurfaceGravityMS2:   p.Physical.SurfaceGravityMs2,
			EscapeVelocityKmS:   p.Physical.EscapeVelocityKmS,
			DensityGCm3:         p.Physical.DensityGCm3,
			ObliquityDeg:        p.Physical.ObliquityDeg,
			RotationPeriodHours: p.Physical.RotationPeriodHours,
			FlatteningFactor:    p.Physical.FlatteningFactor,
		},
		Thermal: &cosmosv1.ThermalParams{
			TempMinC: int32(p.Thermal.TempMinC),
			TempMaxC: int32(p.Thermal.TempMaxC),
			TempAvgC: int32(p.Thermal.TempAvgC),
			Albedo:   p.Thermal.Albedo,
		},
		Atmosphere:      mapAtmosphereToProto(p.Atmosphere),
		Visual:          mapVisualToProto(p.Visual, p.Slug, log),
		SurfaceFeatures: dupStrings(p.SurfaceFeatures),
		Facts:           dupStrings(p.Facts),
		Moons:           mapMoonsToProto(p.Moons),
		TotalMoonCount:  int32(p.TotalMoonCount),
		MissionSlugs:    dupStrings(p.MissionSlugs),
		Missions:        mapPlanetMissionRefsToProto(p.Missions),
	}
}

func mapAtmosphereToProto(a domain.Atmosphere) *cosmosv1.Atmosphere {
	comp := make([]*cosmosv1.AtmosphereComponent, len(a.Composition))
	for i, c := range a.Composition {
		comp[i] = &cosmosv1.AtmosphereComponent{
			Gas:     c.Gas,
			Percent: c.Percent,
		}
	}
	return &cosmosv1.Atmosphere{
		SurfacePressureAtm: a.SurfacePressureAtm,
		HasGreenhouse:      a.HasGreenhouse,
		Notes:              a.Notes,
		Composition:        comp,
	}
}

func mapVisualToProto(v domain.Visual, planetSlug string, log zerolog.Logger) *cosmosv1.Visual {
	out := &cosmosv1.Visual{
		ColorHex:           v.ColorHex,
		EmissiveHex:        v.EmissiveHex,
		Roughness:          v.Roughness,
		Metalness:          v.Metalness,
		HasAtmosphereGlow:  v.HasAtmosphereGlow,
		AtmosphereColorHex: cloneStringPtr(v.AtmosphereColorHex),
		AtmosphereOpacity:  v.AtmosphereOpacity,
		HasCloudLayer:      v.HasCloudLayer,
		CloudColorHex:      cloneStringPtr(v.CloudColorHex),
		HasRings:           v.HasRings,
		VisualRadius:       v.VisualRadius,
		OrbitDistance:      v.OrbitDistance,
	}
	out.RingData = parseRingData(v.RingData, planetSlug, log)
	out.CanvasTexture = parseCanvasTexture(v.CanvasTexture, planetSlug, log)
	return out
}

type ringDataJSON struct {
	InnerRadiusScale float64        `json:"inner_radius_scale"`
	OuterRadiusScale float64        `json:"outer_radius_scale"`
	Bands            []ringBandJSON `json:"bands"`
}

type ringBandJSON struct {
	Color   string  `json:"color"`
	Start   float64 `json:"start"`
	End     float64 `json:"end"`
	Opacity float64 `json:"opacity"`
}

func parseRingData(raw json.RawMessage, planetSlug string, log zerolog.Logger) *cosmosv1.RingData {
	if isNullRaw(raw) {
		return nil
	}
	var rd ringDataJSON
	if err := json.Unmarshal(raw, &rd); err != nil {
		log.Warn().Err(err).Str("planet", planetSlug).Msg("grpcsvc: parse ring_data failed")
		return nil
	}
	bands := make([]*cosmosv1.RingBand, len(rd.Bands))
	for i, b := range rd.Bands {
		bands[i] = &cosmosv1.RingBand{
			Color:   b.Color,
			Start:   b.Start,
			End:     b.End,
			Opacity: b.Opacity,
		}
	}
	return &cosmosv1.RingData{
		InnerRadiusScale: rd.InnerRadiusScale,
		OuterRadiusScale: rd.OuterRadiusScale,
		Bands:            bands,
	}
}

type canvasTextureJSON struct {
	Technique     string   `json:"technique"`
	Palette       []string `json:"palette"`
	NoiseScale    float64  `json:"noise_scale"`
	CraterDensity float64  `json:"crater_density"`
	CloudDensity  *float64 `json:"cloud_density,omitempty"`
	StormCount    *int32   `json:"storm_count,omitempty"`
	BandCount     *int32   `json:"band_count,omitempty"`
}

func parseCanvasTexture(raw json.RawMessage, planetSlug string, log zerolog.Logger) *cosmosv1.CanvasTexture {
	if isNullRaw(raw) {
		return nil
	}
	var ct canvasTextureJSON
	if err := json.Unmarshal(raw, &ct); err != nil {
		log.Warn().Err(err).Str("planet", planetSlug).Msg("grpcsvc: parse canvas_texture failed")
		return nil
	}
	return &cosmosv1.CanvasTexture{
		Technique:     ct.Technique,
		Palette:       dupStrings(ct.Palette),
		NoiseScale:    ct.NoiseScale,
		CraterDensity: ct.CraterDensity,
		CloudDensity:  ct.CloudDensity,
		StormCount:    ct.StormCount,
		BandCount:     ct.BandCount,
	}
}

func mapMoonsToProto(moons []domain.Moon) []*cosmosv1.Moon {
	out := make([]*cosmosv1.Moon, len(moons))
	for i, m := range moons {
		out[i] = &cosmosv1.Moon{
			Name:           m.Name,
			RadiusKm:       m.RadiusKm,
			DistanceKm:     m.DistanceKm,
			PeriodDays:     m.PeriodDays,
			DiscoveredBy:   m.DiscoveredBy,
			DiscoveredYear: int32(m.DiscoveredYear),
			Description:    m.Description,
		}
	}
	return out
}

func mapPlanetMissionRefsToProto(refs []domain.PlanetMissionRef) []*cosmosv1.PlanetMissionRef {
	if refs == nil {
		return nil
	}
	out := make([]*cosmosv1.PlanetMissionRef, len(refs))
	for i, r := range refs {
		out[i] = &cosmosv1.PlanetMissionRef{
			Slug:        r.Slug,
			Name:        r.Name,
			Agency:      r.Agency,
			Year:        int32(r.Year),
			Type:        r.Type,
			Achievement: r.Achievement,
		}
	}
	return out
}

func mapMissionToProto(m domain.Mission, log zerolog.Logger) *cosmosv1.Mission {
	out := &cosmosv1.Mission{
		Slug:         m.Slug,
		Name:         m.Name,
		Agency:       m.Agency,
		Country:      m.Country,
		Year:         int32(m.Year),
		Destination:  m.Destination,
		Type:         m.Type,
		Status:       m.Status,
		Description:  m.Description,
		KeyFact:      m.KeyFact,
		Crew:         dupStrings(m.Crew),
		Achievements: dupStrings(m.Achievements),
		PlanetSlugs:  dupStrings(m.PlanetSlugs),
		Planets:      mapPlanetRefsToProto(m.Planets),
	}
	if m.EndYear != nil {
		v := int32(*m.EndYear)
		out.EndYear = &v
	}
	if m.Trajectory != nil {
		out.Trajectory = mapTrajectoryToProto(*m.Trajectory, log)
	}
	return out
}

func mapPlanetRefsToProto(refs []domain.PlanetRef) []*cosmosv1.PlanetRef {
	if refs == nil {
		return nil
	}
	out := make([]*cosmosv1.PlanetRef, len(refs))
	for i, r := range refs {
		out[i] = &cosmosv1.PlanetRef{Slug: r.Slug, Name: r.Name}
	}
	return out
}

func mapTrajectoryToProto(t domain.Trajectory, log zerolog.Logger) *cosmosv1.Trajectory {
	out := &cosmosv1.Trajectory{
		MissionSlug:  t.MissionSlug,
		MissionName:  t.MissionName,
		Agency:       t.Agency,
		Year:         int32(t.Year),
		Duration:     t.Duration,
		DurationRu:   cloneStringPtr(t.DurationRu),
		Crew:         dupStrings(t.Crew),
		MoonOrbitArc: t.MoonOrbitArc,
		SimDurationS: int32(t.SimDurationS),
	}
	out.MoonPos = parseTrajectoryWaypoint(t.MoonPos, t.MissionSlug, "moon_pos", log)
	out.Waypoints = parseTrajectoryWaypointList(t.Waypoints, t.MissionSlug, log)
	out.Phases = mapPhasesToProto(t.Phases)
	return out
}

func parseTrajectoryWaypoint(raw json.RawMessage, missionSlug, field string, log zerolog.Logger) *cosmosv1.TrajectoryWaypoint {
	if isNullRaw(raw) {
		return nil
	}
	var arr []float64
	if err := json.Unmarshal(raw, &arr); err != nil {
		log.Warn().Err(err).Str("mission", missionSlug).Str("field", field).
			Msg("grpcsvc: parse trajectory waypoint failed")
		return nil
	}
	if len(arr) != 3 {
		log.Warn().Int("length", len(arr)).Str("mission", missionSlug).Str("field", field).
			Msg("grpcsvc: trajectory waypoint must have exactly 3 elements")
		return nil
	}
	return &cosmosv1.TrajectoryWaypoint{X: arr[0], Y: arr[1], Z: arr[2]}
}

func parseTrajectoryWaypointList(raw json.RawMessage, missionSlug string, log zerolog.Logger) []*cosmosv1.TrajectoryWaypoint {
	if isNullRaw(raw) {
		return nil
	}
	var arr [][]float64
	if err := json.Unmarshal(raw, &arr); err != nil {
		log.Warn().Err(err).Str("mission", missionSlug).
			Msg("grpcsvc: parse trajectory waypoints failed")
		return nil
	}
	out := make([]*cosmosv1.TrajectoryWaypoint, 0, len(arr))
	for i, w := range arr {
		if len(w) != 3 {
			log.Warn().Int("index", i).Int("length", len(w)).Str("mission", missionSlug).
				Msg("grpcsvc: trajectory waypoint must have exactly 3 elements; skipping")
			continue
		}
		out = append(out, &cosmosv1.TrajectoryWaypoint{X: w[0], Y: w[1], Z: w[2]})
	}
	return out
}

func mapPhasesToProto(phases []domain.TrajectoryPhase) []*cosmosv1.TrajectoryPhase {
	if phases == nil {
		return nil
	}
	out := make([]*cosmosv1.TrajectoryPhase, len(phases))
	for i, p := range phases {
		out[i] = &cosmosv1.TrajectoryPhase{
			Id:          p.ID,
			Label:       p.Label,
			TStart:      p.TStart,
			TEnd:        p.TEnd,
			Description: p.Description,
		}
	}
	return out
}

func cloneStringPtr(s *string) *string {
	if s == nil {
		return nil
	}
	v := *s
	return &v
}

func dupStrings(in []string) []string {
	if in == nil {
		return nil
	}
	out := make([]string, len(in))
	copy(out, in)
	return out
}
