package realtime

import (
	"context"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/rs/zerolog"
)

const hubChannelCap = 8

type Hub struct {
	log zerolog.Logger

	register   chan *client
	unregister chan *client
	broadcast  chan []byte
	stopped    chan struct{}

	stateMu       sync.RWMutex
	latestCatalog []byte
	clientCountMu sync.RWMutex
	clientCount   int
}

func NewHub(log zerolog.Logger) *Hub {
	return &Hub{
		log:        log.With().Str("component", "realtime.hub").Logger(),
		register:   make(chan *client),
		unregister: make(chan *client),
		broadcast:  make(chan []byte, hubChannelCap),
		stopped:    make(chan struct{}),
	}
}

func (h *Hub) Run(ctx context.Context) {
	clients := make(map[*client]struct{})
	defer func() {
		var wg sync.WaitGroup
		byeCtx, byeCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer byeCancel()
		for c := range clients {
			close(c.sendCh)
			cli := c
			wg.Add(1)
			go func() {
				defer wg.Done()
				<-cli.done
				cli.closeWithBye(byeCtx, ByeReasonServerShutdown, websocket.StatusGoingAway, "server shutting down")
			}()
			delete(clients, c)
		}
		wg.Wait()
		h.setClientCount(0)
		h.log.Info().Msg("hub stopped")
	}()

	for {
		select {
		case <-ctx.Done():
			return

		case c := <-h.register:
			clients[c] = struct{}{}
			h.setClientCount(len(clients))
			h.log.Debug().Int("clients", len(clients)).Msg("client registered")

		case c := <-h.unregister:
			if _, ok := clients[c]; ok {
				delete(clients, c)
				close(c.sendCh)
				h.setClientCount(len(clients))
				h.log.Debug().Int("clients", len(clients)).Msg("client unregistered")
			}

		case msg, ok := <-h.broadcast:
			if !ok {
				return
			}
			for c := range clients {
				if !c.trySend(msg) {
					delete(clients, c)
					h.log.Warn().Msg("dropping slow client")
					close(c.sendCh)
					go func(cli *client) {
						<-cli.done
						cli.closeWithBye(context.Background(), ByeReasonSlowClient, websocket.StatusPolicyViolation, "client too slow")
					}(c)
					h.setClientCount(len(clients))
				}
			}
		}
	}
}

func (h *Hub) Register(ctx context.Context, c *client) error {
	select {
	case h.register <- c:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (h *Hub) Unregister(c *client) {
	select {
	case h.unregister <- c:
	default:
	}
}

func (h *Hub) Broadcast(frame []byte) {
	select {
	case h.broadcast <- frame:
	default:
		h.log.Warn().Int("buffer", hubChannelCap).Msg("broadcast buffer full; dropping frame")
	}
}

func (h *Hub) SetCatalog(frame []byte) {
	h.stateMu.Lock()
	h.latestCatalog = frame
	h.stateMu.Unlock()
}

func (h *Hub) CatalogFrame() []byte {
	h.stateMu.RLock()
	defer h.stateMu.RUnlock()
	return h.latestCatalog
}

func (h *Hub) ClientCount() int {
	h.clientCountMu.RLock()
	defer h.clientCountMu.RUnlock()
	return h.clientCount
}

func (h *Hub) setClientCount(n int) {
	h.clientCountMu.Lock()
	h.clientCount = n
	h.clientCountMu.Unlock()
}

func NewClient(conn *websocket.Conn) *client {
	return newClient(conn)
}

func (h *Hub) RunClientWriter(ctx context.Context, c *client) {
	c.writePump(ctx)
}

func ClientDone(c *client) <-chan struct{} {
	return c.done
}
