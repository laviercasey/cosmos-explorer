package store

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPlanetRow(r rowScanner) (PlanetRow, error) {
	var p PlanetRow
	err := r.Scan(
		&p.ID, &p.Slug, &p.Name, &p.OrbitIndex, &p.Type, &p.Description,
		&p.SemiMajorAxisAU, &p.Eccentricity, &p.InclinationDeg, &p.PeriodDays, &p.OrbitalSpeedKmS,
		&p.RadiusKm, &p.MassKg, &p.MassEarths, &p.SurfaceGravityMs2, &p.EscapeVelocityKmS,
		&p.DensityGCm3, &p.ObliquityDeg, &p.RotationPeriodHours, &p.FlatteningFactor,
		&p.TempMinC, &p.TempMaxC, &p.TempAvgC, &p.Albedo,
		&p.AtmosphereSurfacePressureAtm, &p.AtmosphereHasGreenhouse, &p.AtmosphereNotes,
		&p.SurfaceFeatures, &p.Facts, &p.TotalMoonCount,
		&p.ColorHex, &p.EmissiveHex, &p.Roughness, &p.Metalness,
		&p.HasAtmosphereGlow, &p.AtmosphereColorHex, &p.AtmosphereOpacity,
		&p.HasCloudLayer, &p.CloudColorHex, &p.HasRings, &p.RingData,
		&p.VisualRadius, &p.OrbitDistance, &p.CanvasTexture,
		&p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}
