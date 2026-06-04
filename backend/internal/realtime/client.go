package realtime

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/coder/websocket"
)

const clientSendCap = 4

const writeTimeout = 5 * time.Second

type client struct {
	conn   *websocket.Conn
	sendCh chan []byte
	done   chan struct{}
}

func newClient(conn *websocket.Conn) *client {
	return &client{
		conn:   conn,
		sendCh: make(chan []byte, clientSendCap),
		done:   make(chan struct{}),
	}
}

func (c *client) trySend(frame []byte) bool {
	select {
	case c.sendCh <- frame:
		return true
	default:
		return false
	}
}

func (c *client) writePump(ctx context.Context) {
	defer close(c.done)
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-c.sendCh:
			if !ok {
				return
			}
			if err := c.writeMessage(ctx, msg); err != nil {
				return
			}
		}
	}
}

func (c *client) writeMessage(parent context.Context, msg []byte) error {
	ctx, cancel := context.WithTimeout(parent, writeTimeout)
	defer cancel()
	if err := c.conn.Write(ctx, websocket.MessageText, msg); err != nil {
		return fmt.Errorf("ws write: %w", err)
	}
	return nil
}

func (c *client) closeWithBye(parent context.Context, reason string, status websocket.StatusCode, msg string) {
	bye := NewByeFrame(reason, 5000)
	if data, err := MarshalFrame(bye); err == nil {
		ctx, cancel := context.WithTimeout(parent, writeTimeout)
		_ = c.conn.Write(ctx, websocket.MessageText, data)
		cancel()
	}
	_ = c.conn.Close(status, msg)
}

var errClosed = errors.New("client closed")
