package service

import (
	"errors"

	"github.com/jackc/pgx/v5"

	"cosmos/backend/internal/store"
)

var ErrNotFound = errors.New("service: not found")

type Services struct {
	Planets      *PlanetService
	Missions     *MissionService
	Trajectories *TrajectoryService
}

func New(q *store.Queries) *Services {
	return &Services{
		Planets:      NewPlanetService(q),
		Missions:     NewMissionService(q),
		Trajectories: NewTrajectoryService(q),
	}
}

func isNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
