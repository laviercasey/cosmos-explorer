package grpcsvc

import (
	"context"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	"github.com/rs/zerolog"

	cosmosv1 "cosmos/backend/gen/proto/cosmos/v1"
	"cosmos/backend/internal/service"
)

type CosmosServer struct {
	svcs *service.Services
	log  zerolog.Logger
}

func NewCosmosServer(svcs *service.Services, log zerolog.Logger) *CosmosServer {
	return &CosmosServer{svcs: svcs, log: log}
}

func (s *CosmosServer) ListPlanets(ctx context.Context, req *connect.Request[cosmosv1.ListPlanetsRequest]) (*connect.Response[cosmosv1.ListPlanetsResponse], error) {
	filters, lang, err := ParseListPlanetsFilters(req.Msg)
	if err != nil {
		return nil, err
	}
	page, err := s.svcs.Planets.List(ctx, filters, lang)
	if err != nil {
		s.log.Error().Err(err).Msg("grpcsvc: list planets")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list planets"))
	}
	planets := make([]*cosmosv1.Planet, len(page.Items))
	for i := range page.Items {
		planets[i] = mapPlanetToProto(page.Items[i], s.log)
	}
	return connect.NewResponse(&cosmosv1.ListPlanetsResponse{
		Planets: planets,
		Meta: &cosmosv1.ListResponseMeta{
			Total:  int32(page.Total),
			Limit:  int32(filters.Limit),
			Offset: int32(filters.Offset),
		},
	}), nil
}

func (s *CosmosServer) GetPlanet(ctx context.Context, req *connect.Request[cosmosv1.GetPlanetRequest]) (*connect.Response[cosmosv1.GetPlanetResponse], error) {
	slug := req.Msg.GetSlug()
	if slug == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("slug: required"))
	}
	lang := req.Msg.GetLang()
	if !service.IsSupportedLang(lang) {
		return nil, connect.NewError(connect.CodeInvalidArgument,
			errors.New("lang: unsupported language (expected 'en' or 'ru')"))
	}
	planet, err := s.svcs.Planets.Get(ctx, slug, lang)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("planet not found"))
		}
		s.log.Error().Err(err).Str("slug", slug).Msg("grpcsvc: get planet")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to load planet"))
	}
	return connect.NewResponse(&cosmosv1.GetPlanetResponse{
		Planet: mapPlanetToProto(planet, s.log),
	}), nil
}

func (s *CosmosServer) ListMissions(ctx context.Context, req *connect.Request[cosmosv1.ListMissionsRequest]) (*connect.Response[cosmosv1.ListMissionsResponse], error) {
	filters, lang, err := ParseListMissionsFilters(req.Msg)
	if err != nil {
		return nil, err
	}
	page, err := s.svcs.Missions.List(ctx, filters, lang)
	if err != nil {
		if errors.Is(err, service.ErrInvalidFilter) {
			s.log.Warn().Err(err).Msg("grpcsvc: list missions invalid filter")
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid filter value"))
		}
		s.log.Error().Err(err).Msg("grpcsvc: list missions")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list missions"))
	}
	missions := make([]*cosmosv1.Mission, len(page.Items))
	for i := range page.Items {
		missions[i] = mapMissionToProto(page.Items[i], s.log)
	}
	return connect.NewResponse(&cosmosv1.ListMissionsResponse{
		Missions: missions,
		Meta: &cosmosv1.ListResponseMeta{
			Total:  int32(page.Total),
			Limit:  int32(filters.Limit),
			Offset: int32(filters.Offset),
		},
	}), nil
}

func (s *CosmosServer) GetMission(ctx context.Context, req *connect.Request[cosmosv1.GetMissionRequest]) (*connect.Response[cosmosv1.GetMissionResponse], error) {
	slug := req.Msg.GetSlug()
	if slug == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("slug: required"))
	}
	lang := req.Msg.GetLang()
	if !service.IsSupportedLang(lang) {
		return nil, connect.NewError(connect.CodeInvalidArgument,
			errors.New("lang: unsupported language (expected 'en' or 'ru')"))
	}
	mission, err := s.svcs.Missions.Get(ctx, slug, lang)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("mission not found"))
		}
		s.log.Error().Err(err).Str("slug", slug).Msg("grpcsvc: get mission")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to load mission"))
	}

	traj, trajErr := s.svcs.Trajectories.GetByMissionSlug(ctx, slug, lang)
	switch {
	case trajErr == nil:
		t := traj
		mission.Trajectory = &t
	case errors.Is(trajErr, service.ErrTrajectoryNotFound):
	case errors.Is(trajErr, service.ErrMissionNotFound):
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("mission not found"))
	default:
		s.log.Error().Err(trajErr).Str("slug", slug).Msg("grpcsvc: get mission trajectory")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to load mission trajectory"))
	}

	return connect.NewResponse(&cosmosv1.GetMissionResponse{
		Mission: mapMissionToProto(mission, s.log),
	}), nil
}

func (s *CosmosServer) ListTrajectories(ctx context.Context, req *connect.Request[cosmosv1.ListTrajectoriesRequest]) (*connect.Response[cosmosv1.ListTrajectoriesResponse], error) {
	lang := req.Msg.GetLang()
	if !service.IsSupportedLang(lang) {
		return nil, connect.NewError(connect.CodeInvalidArgument,
			errors.New("lang: unsupported language (expected 'en' or 'ru')"))
	}
	items, err := s.svcs.Trajectories.List(ctx, lang)
	if err != nil {
		s.log.Error().Err(err).Msg("grpcsvc: list trajectories")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list trajectories"))
	}
	out := make([]*cosmosv1.Trajectory, len(items))
	for i := range items {
		out[i] = mapTrajectoryToProto(items[i], s.log)
	}
	return connect.NewResponse(&cosmosv1.ListTrajectoriesResponse{
		Trajectories: out,
	}), nil
}

func (s *CosmosServer) GetMissionTrajectory(ctx context.Context, req *connect.Request[cosmosv1.GetMissionTrajectoryRequest]) (*connect.Response[cosmosv1.GetMissionTrajectoryResponse], error) {
	slug := req.Msg.GetSlug()
	if slug == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("slug: required"))
	}
	lang := req.Msg.GetLang()
	if !service.IsSupportedLang(lang) {
		return nil, connect.NewError(connect.CodeInvalidArgument,
			errors.New("lang: unsupported language (expected 'en' or 'ru')"))
	}
	traj, err := s.svcs.Trajectories.GetByMissionSlug(ctx, slug, lang)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrMissionNotFound):
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("mission not found"))
		case errors.Is(err, service.ErrTrajectoryNotFound):
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("trajectory not available"))
		default:
			s.log.Error().Err(err).Str("slug", slug).Msg("grpcsvc: get trajectory")
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to load trajectory"))
		}
	}
	return connect.NewResponse(&cosmosv1.GetMissionTrajectoryResponse{
		Trajectory: mapTrajectoryToProto(traj, s.log),
	}), nil
}
