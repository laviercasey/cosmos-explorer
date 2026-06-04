package realtime

import (
	"encoding/json"
	"time"
)

const FrameVersion = 1

const (
	FrameTypeTick    = "tick"
	FrameTypeCatalog = "catalog"
	FrameTypeBye     = "bye"
	FrameTypePing    = "ping"
)

const (
	ByeReasonServerShutdown = "server_shutdown"
	ByeReasonSlowClient     = "slow_client"
)

type SatPosition struct {
	ID     int        `json:"id"`
	Name   string     `json:"name"`
	ECEFKm [3]float64 `json:"ecef_km"`
	VelKms [3]float64 `json:"vel_kms"`
	AltKm  float64    `json:"alt_km"`
}

type SatCatalogEntry struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	ColorHint string `json:"color_hint"`
	Highlight bool   `json:"highlight"`
}

type TickFrame struct {
	V          int           `json:"v"`
	Type       string        `json:"type"`
	Seq        uint64        `json:"seq"`
	TS         string        `json:"ts"`
	EpochMs    int64         `json:"epoch_ms"`
	Satellites []SatPosition `json:"satellites"`
}

type CatalogFrame struct {
	V          int               `json:"v"`
	Type       string            `json:"type"`
	Satellites []SatCatalogEntry `json:"satellites"`
}

type ByeFrame struct {
	V            int    `json:"v"`
	Type         string `json:"type"`
	Reason       string `json:"reason"`
	RetryAfterMs int    `json:"retry_after_ms"`
}

type PingFrame struct {
	V    int    `json:"v"`
	Type string `json:"type"`
	TS   string `json:"ts"`
}

func NewTickFrame(seq uint64, now time.Time, sats []SatPosition) TickFrame {
	if sats == nil {
		sats = []SatPosition{}
	}
	return TickFrame{
		V:          FrameVersion,
		Type:       FrameTypeTick,
		Seq:        seq,
		TS:         now.UTC().Format(time.RFC3339Nano),
		EpochMs:    now.UnixMilli(),
		Satellites: sats,
	}
}

func NewCatalogFrame(entries []SatCatalogEntry) CatalogFrame {
	if entries == nil {
		entries = []SatCatalogEntry{}
	}
	return CatalogFrame{
		V:          FrameVersion,
		Type:       FrameTypeCatalog,
		Satellites: entries,
	}
}

func NewByeFrame(reason string, retryAfterMs int) ByeFrame {
	return ByeFrame{
		V:            FrameVersion,
		Type:         FrameTypeBye,
		Reason:       reason,
		RetryAfterMs: retryAfterMs,
	}
}

func NewPingFrame(now time.Time) PingFrame {
	return PingFrame{
		V:    FrameVersion,
		Type: FrameTypePing,
		TS:   now.UTC().Format(time.RFC3339Nano),
	}
}

func MarshalFrame(v any) ([]byte, error) {
	return json.Marshal(v)
}
