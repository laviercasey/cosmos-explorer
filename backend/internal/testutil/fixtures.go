//go:build integration

package testutil

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"cosmos/backend/internal/store"
)

func SeedMinimalDataset(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	q := store.New(pool)

	mApolloID, err := q.UpsertMission(ctx, store.UpsertMissionParams{
		Slug:         "apollo-11",
		Name:         "Apollo 11",
		Agency:       "NASA",
		Country:      "USA",
		Year:         1969,
		Destination:  "Moon",
		Type:         "crewed",
		Status:       "completed",
		Description:  "First crewed lunar landing.",
		KeyFact:      "One small step.",
		Crew:         []string{"Neil Armstrong", "Buzz Aldrin", "Michael Collins"},
		Achievements: []string{"First Moon landing"},
	})
	if err != nil {
		t.Fatalf("upsert apollo-11: %v", err)
	}

	_, err = q.UpsertMission(ctx, store.UpsertMissionParams{
		Slug:         "voyager-1",
		Name:         "Voyager 1",
		Agency:       "NASA",
		Country:      "USA",
		Year:         1977,
		Destination:  "Interstellar",
		Type:         "flyby",
		Status:       "active",
		Description:  "Interstellar probe.",
		KeyFact:      "Farthest human-made object.",
		Achievements: []string{"First Jupiter/Saturn flyby"},
	})
	if err != nil {
		t.Fatalf("upsert voyager-1: %v", err)
	}

	_, err = q.UpsertMission(ctx, store.UpsertMissionParams{
		Slug:         "luna-17",
		Name:         "Luna 17",
		Agency:       "Soviet",
		Country:      "USSR",
		Year:         1970,
		Destination:  "Moon",
		Type:         "rover",
		Status:       "completed",
		Description:  "First lunar rover mission.",
		KeyFact:      "Lunokhod 1.",
		Achievements: []string{"Первый планетоход"},
	})
	if err != nil {
		t.Fatalf("upsert luna-17: %v", err)
	}

	canvas, _ := json.Marshal(map[string]any{
		"technique": "cratered",
		"palette":   []string{"#aaa"},
	})

	earthID, err := q.UpsertPlanet(ctx, store.UpsertPlanetParams{
		Slug:                         "earth",
		Name:                         "Earth",
		OrbitIndex:                   2,
		Type:                         "terrestrial",
		Description:                  "Our blue marble.",
		SemiMajorAxisAU:              1.0,
		Eccentricity:                 0.0167,
		InclinationDeg:               0.0,
		PeriodDays:                   365.25,
		OrbitalSpeedKmS:              29.78,
		RadiusKm:                     6371,
		MassKg:                       5.972e24,
		MassEarths:                   1.0,
		SurfaceGravityMs2:            9.81,
		EscapeVelocityKmS:            11.186,
		DensityGCm3:                  5.514,
		ObliquityDeg:                 23.44,
		RotationPeriodHours:          24,
		FlatteningFactor:             0.00335,
		TempMinC:                     -88,
		TempMaxC:                     58,
		TempAvgC:                     15,
		Albedo:                       0.306,
		AtmosphereSurfacePressureAtm: 1.0,
		AtmosphereHasGreenhouse:      true,
		AtmosphereNotes:              "Life-bearing atmosphere.",
		SurfaceFeatures:              []string{"Oceans", "Continents"},
		Facts:                        []string{"Only known life-bearing planet"},
		TotalMoonCount:               1,
		ColorHex:                     "#2288ff",
		EmissiveHex:                  "#111111",
		Roughness:                    0.9,
		Metalness:                    0.0,
		HasAtmosphereGlow:            true,
		AtmosphereOpacity:            0.8,
		HasCloudLayer:                true,
		HasRings:                     false,
		RingData:                     nil,
		VisualRadius:                 1.0,
		OrbitDistance:                20,
		CanvasTexture:                canvas,
	})
	if err != nil {
		t.Fatalf("upsert earth: %v", err)
	}

	_, err = q.UpsertPlanet(ctx, store.UpsertPlanetParams{
		Slug:                         "mars",
		Name:                         "Mars",
		OrbitIndex:                   3,
		Type:                         "terrestrial",
		Description:                  "The Red Planet.",
		SemiMajorAxisAU:              1.524,
		Eccentricity:                 0.0934,
		InclinationDeg:               1.85,
		PeriodDays:                   687,
		OrbitalSpeedKmS:              24.07,
		RadiusKm:                     3389.5,
		MassKg:                       6.39e23,
		MassEarths:                   0.107,
		SurfaceGravityMs2:            3.71,
		EscapeVelocityKmS:            5.03,
		DensityGCm3:                  3.9335,
		ObliquityDeg:                 25.19,
		RotationPeriodHours:          24.6229,
		FlatteningFactor:             0.00589,
		TempMinC:                     -153,
		TempMaxC:                     20,
		TempAvgC:                     -63,
		Albedo:                       0.25,
		AtmosphereSurfacePressureAtm: 0.006,
		AtmosphereHasGreenhouse:      false,
		AtmosphereNotes:              "Thin CO2 atmosphere.",
		SurfaceFeatures:              []string{"Olympus Mons", "Valles Marineris"},
		Facts:                        []string{"Largest volcano in solar system"},
		TotalMoonCount:               2,
		ColorHex:                     "#c1440e",
		EmissiveHex:                  "#111111",
		Roughness:                    0.95,
		Metalness:                    0.0,
		HasAtmosphereGlow:            false,
		AtmosphereOpacity:            0.2,
		HasCloudLayer:                false,
		HasRings:                     false,
		RingData:                     nil,
		VisualRadius:                 0.53,
		OrbitDistance:                30,
		CanvasTexture:                canvas,
	})
	if err != nil {
		t.Fatalf("upsert mars: %v", err)
	}

	if err := q.DeletePlanetMissionsByPlanet(ctx, earthID); err != nil {
		t.Fatalf("clear pm: %v", err)
	}
	achievement := "First crewed Moon landing"
	if err := q.InsertPlanetMission(ctx, earthID, mApolloID, 0, &achievement); err != nil {
		t.Fatalf("insert pm: %v", err)
	}

	if err := q.UpsertTrajectory(ctx, store.UpsertTrajectoryParams{
		MissionID:    mApolloID,
		Duration:     "8 days",
		MoonPos:      []byte(`[5,0,0]`),
		MoonOrbitArc: 2.0,
		Waypoints:    []byte(`[[0,0,0],[1,1,1]]`),
		Phases:       []byte(`[]`),
		SimDurationS: 60,
	}); err != nil {
		t.Fatalf("upsert trajectory: %v", err)
	}
}

func TruncateAll(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
        TRUNCATE TABLE planet_missions, atmosphere_components, moons,
                       trajectories, missions, planets
        RESTART IDENTITY CASCADE
    `)
	if err != nil {
		t.Fatalf("truncate: %v", err)
	}
}
