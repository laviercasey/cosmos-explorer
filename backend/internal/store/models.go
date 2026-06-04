package store

import (
	"encoding/json"
	"time"
)

type PlanetRow struct {
	ID                           int64
	Slug                         string
	Name                         string
	OrbitIndex                   int32
	Type                         string
	Description                  string
	SemiMajorAxisAU              float64
	Eccentricity                 float64
	InclinationDeg               float64
	PeriodDays                   float64
	OrbitalSpeedKmS              float64
	RadiusKm                     float64
	MassKg                       float64
	MassEarths                   float64
	SurfaceGravityMs2            float64
	EscapeVelocityKmS            float64
	DensityGCm3                  float64
	ObliquityDeg                 float64
	RotationPeriodHours          float64
	FlatteningFactor             float64
	TempMinC                     int32
	TempMaxC                     int32
	TempAvgC                     int32
	Albedo                       float64
	AtmosphereSurfacePressureAtm float64
	AtmosphereHasGreenhouse      bool
	AtmosphereNotes              string
	SurfaceFeatures              []string
	Facts                        []string
	TotalMoonCount               int32
	ColorHex                     string
	EmissiveHex                  string
	Roughness                    float64
	Metalness                    float64
	HasAtmosphereGlow            bool
	AtmosphereColorHex           *string
	AtmosphereOpacity            float64
	HasCloudLayer                bool
	CloudColorHex                *string
	HasRings                     bool
	RingData                     json.RawMessage
	VisualRadius                 float64
	OrbitDistance                float64
	CanvasTexture                json.RawMessage
	CreatedAt                    time.Time
	UpdatedAt                    time.Time
}

type AtmosphereComponentRow struct {
	PlanetID int64
	Position int32
	Gas      string
	Percent  float64
}

type MoonRow struct {
	ID             int64
	PlanetID       int64
	Position       int32
	Name           string
	RadiusKm       float64
	DistanceKm     float64
	PeriodDays     float64
	DiscoveredBy   string
	DiscoveredYear int32
	Description    string
}

type PlanetMissionRow struct {
	PlanetID    int64
	Position    int32
	Achievement *string
	Slug        string
	Name        string
	Agency      string
	Year        int32
	Type        string
}

type MissionRow struct {
	ID           int64
	Slug         string
	Name         string
	Agency       string
	Country      string
	Year         int32
	EndYear      *int32
	Destination  string
	Type         string
	Status       string
	Description  string
	KeyFact      string
	Crew         []string
	Achievements []string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type MissionPlanetRow struct {
	Slug string
	Name string
}

type MissionTranslationRow struct {
	MissionID    int64
	Lang         string
	Description  *string
	KeyFact      *string
	Achievements []string
}

type MissionPlanetBatchRow struct {
	MissionID int64
	Slug      string
}

type TrajectoryRow struct {
	ID           int64
	MissionID    int64
	Duration     string
	DurationRu   *string
	MoonPos      json.RawMessage
	MoonOrbitArc float64
	Waypoints    json.RawMessage
	Phases       json.RawMessage
	SimDurationS int32
	MissionSlug  string
	MissionName  string
	Agency       string
	Year         int32
	Crew         []string
}
