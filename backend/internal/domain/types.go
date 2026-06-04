package domain

import (
	"encoding/json"
	"time"
)

type Envelope struct {
	Data  interface{}     `json:"data"`
	Meta  *PaginationMeta `json:"meta"`
	Error *APIError       `json:"error"`
}

type PaginationMeta struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

type APIError struct {
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Details []FieldError `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type Planet struct {
	Slug            string             `json:"slug"`
	Name            string             `json:"name"`
	Index           int                `json:"index"`
	Type            string             `json:"type"`
	Description     string             `json:"description"`
	Orbital         OrbitalParams      `json:"orbital"`
	Physical        PhysicalParams     `json:"physical"`
	Thermal         ThermalParams      `json:"thermal"`
	Atmosphere      Atmosphere         `json:"atmosphere"`
	Visual          Visual             `json:"visual"`
	SurfaceFeatures []string           `json:"surface_features"`
	Facts           []string           `json:"facts"`
	Moons           []Moon             `json:"moons"`
	TotalMoonCount  int                `json:"total_moon_count"`
	MissionSlugs    []string           `json:"mission_slugs"`
	Missions        []PlanetMissionRef `json:"missions,omitempty"`
	CreatedAt       time.Time          `json:"-"`
	UpdatedAt       time.Time          `json:"-"`
}

type OrbitalParams struct {
	SemiMajorAxisAU float64 `json:"semi_major_axis_au"`
	Eccentricity    float64 `json:"eccentricity"`
	InclinationDeg  float64 `json:"inclination_deg"`
	PeriodDays      float64 `json:"period_days"`
	OrbitalSpeedKmS float64 `json:"orbital_speed_km_s"`
}

type PhysicalParams struct {
	RadiusKm            float64 `json:"radius_km"`
	MassKg              float64 `json:"mass_kg"`
	MassEarths          float64 `json:"mass_earths"`
	SurfaceGravityMs2   float64 `json:"surface_gravity_m_s2"`
	EscapeVelocityKmS   float64 `json:"escape_velocity_km_s"`
	DensityGCm3         float64 `json:"density_g_cm3"`
	ObliquityDeg        float64 `json:"obliquity_deg"`
	RotationPeriodHours float64 `json:"rotation_period_hours"`
	FlatteningFactor    float64 `json:"flattening_factor"`
}

type ThermalParams struct {
	TempMinC int     `json:"temp_min_c"`
	TempMaxC int     `json:"temp_max_c"`
	TempAvgC int     `json:"temp_avg_c"`
	Albedo   float64 `json:"albedo"`
}

type Atmosphere struct {
	SurfacePressureAtm float64               `json:"surface_pressure_atm"`
	HasGreenhouse      bool                  `json:"has_greenhouse"`
	Notes              string                `json:"notes"`
	Composition        []AtmosphereComponent `json:"composition"`
}

type AtmosphereComponent struct {
	Gas     string  `json:"gas"`
	Percent float64 `json:"percent"`
}

type Visual struct {
	ColorHex           string          `json:"color_hex"`
	EmissiveHex        string          `json:"emissive_hex"`
	Roughness          float64         `json:"roughness"`
	Metalness          float64         `json:"metalness"`
	HasAtmosphereGlow  bool            `json:"has_atmosphere_glow"`
	AtmosphereColorHex *string         `json:"atmosphere_color_hex"`
	AtmosphereOpacity  float64         `json:"atmosphere_opacity"`
	HasCloudLayer      bool            `json:"has_cloud_layer"`
	CloudColorHex      *string         `json:"cloud_color_hex"`
	HasRings           bool            `json:"has_rings"`
	RingData           json.RawMessage `json:"ring_data"`
	VisualRadius       float64         `json:"visual_radius"`
	OrbitDistance      float64         `json:"orbit_distance"`
	CanvasTexture      json.RawMessage `json:"canvas_texture"`
}

type Moon struct {
	Name           string  `json:"name"`
	RadiusKm       float64 `json:"radius_km"`
	DistanceKm     float64 `json:"distance_km"`
	PeriodDays     float64 `json:"period_days"`
	DiscoveredBy   string  `json:"discovered_by"`
	DiscoveredYear int     `json:"discovered_year"`
	Description    string  `json:"description"`
}

type PlanetMissionRef struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Agency      string `json:"agency"`
	Year        int    `json:"year"`
	Type        string `json:"type"`
	Achievement string `json:"achievement"`
}

type Mission struct {
	Slug         string      `json:"slug"`
	Name         string      `json:"name"`
	Agency       string      `json:"agency"`
	Country      string      `json:"country"`
	Year         int         `json:"year"`
	EndYear      *int        `json:"end_year"`
	Destination  string      `json:"destination"`
	Type         string      `json:"type"`
	Status       string      `json:"status"`
	Description  string      `json:"description"`
	KeyFact      string      `json:"key_fact"`
	Crew         []string    `json:"crew"`
	Achievements []string    `json:"achievements"`
	PlanetSlugs  []string    `json:"planet_slugs"`
	Planets      []PlanetRef `json:"planets,omitempty"`
	Trajectory   *Trajectory `json:"trajectory,omitempty"`
}

type PlanetRef struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type Trajectory struct {
	MissionSlug  string            `json:"mission_slug"`
	MissionName  string            `json:"mission_name"`
	Agency       string            `json:"agency"`
	Year         int               `json:"year"`
	Duration     string            `json:"duration"`
	DurationRu   *string           `json:"duration_ru"`
	Crew         []string          `json:"crew"`
	MoonPos      json.RawMessage   `json:"moon_pos"`
	MoonOrbitArc float64           `json:"moon_orbit_arc"`
	SimDurationS int               `json:"sim_duration_s"`
	Waypoints    json.RawMessage   `json:"waypoints"`
	Phases       []TrajectoryPhase `json:"phases"`
}

type TrajectoryPhase struct {
	ID          string  `json:"id"`
	TStart      float64 `json:"t_start"`
	TEnd        float64 `json:"t_end"`
	Label       string  `json:"label"`
	Description string  `json:"description"`
}

type TrajectoryWaypoint struct {
	X float64
	Y float64
	Z float64
}

type PlanetListFilters struct {
	Types  []string
	Sort   string
	Limit  int
	Offset int
}

type MissionListFilters struct {
	Agencies     []string
	Decades      []string
	Destinations []string
	Types        []string
	Statuses     []string
	Sort         string
	Limit        int
	Offset       int
}

type Page[T any] struct {
	Items []T
	Total int
}
