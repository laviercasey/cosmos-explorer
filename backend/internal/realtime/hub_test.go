package realtime

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/rs/zerolog"
)

func helperWSPair(t *testing.T) (clientConn *websocket.Conn, server *httptest.Server, srvConn chan *websocket.Conn) {
	t.Helper()
	srvConn = make(chan *websocket.Conn, 1)
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			t.Errorf("accept: %v", err)
			return
		}
		srvConn <- c
		<-r.Context().Done()
	}))

	wsURL := "ws" + server.URL[len("http"):]
	c, _, err := websocket.Dial(context.Background(), wsURL, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	clientConn = c
	return clientConn, server, srvConn
}

func TestHub_RegisterAndBroadcast(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan struct{})
	go func() {
		hub.Run(ctx)
		close(done)
	}()

	clientConn, srv, srvConnCh := helperWSPair(t)
	defer srv.Close()

	srvConn := <-srvConnCh
	c := NewClient(srvConn)

	if err := hub.Register(ctx, c); err != nil {
		t.Fatalf("register: %v", err)
	}

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) && hub.ClientCount() == 0 {
		time.Sleep(5 * time.Millisecond)
	}
	if hub.ClientCount() != 1 {
		t.Fatalf("ClientCount = %d, want 1", hub.ClientCount())
	}

	pumpDone := make(chan struct{})
	go func() {
		hub.RunClientWriter(ctx, c)
		close(pumpDone)
	}()

	hub.Broadcast([]byte(`{"hello":"world"}`))

	readCtx, readCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer readCancel()
	_, data, err := clientConn.Read(readCtx)
	if err != nil {
		t.Fatalf("client read: %v", err)
	}
	if string(data) != `{"hello":"world"}` {
		t.Errorf("got %q, want hello world", data)
	}

	hub.Unregister(c)
	_ = clientConn.Close(websocket.StatusNormalClosure, "")
	cancel()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("hub.Run didn't exit")
	}
	select {
	case <-pumpDone:
	case <-time.After(2 * time.Second):
		t.Fatal("writePump didn't exit")
	}
}

func TestHub_SlowClientDropped(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)

	clientConn, srv, srvConnCh := helperWSPair(t)
	defer srv.Close()
	defer func() { _ = clientConn.Close(websocket.StatusNormalClosure, "") }()

	srvConn := <-srvConnCh
	c := NewClient(srvConn)
	if err := hub.Register(ctx, c); err != nil {
		t.Fatalf("register: %v", err)
	}

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) && hub.ClientCount() == 0 {
		time.Sleep(5 * time.Millisecond)
	}

	for i := 0; i < clientSendCap+1; i++ {
		hub.Broadcast([]byte("frame"))
	}

	dropDeadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(dropDeadline) && hub.ClientCount() != 0 {
		time.Sleep(10 * time.Millisecond)
	}
	if hub.ClientCount() != 0 {
		t.Fatalf("expected slow client to be dropped (ClientCount=0), got %d", hub.ClientCount())
	}
}

func TestHub_ContextCancelStops(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		hub.Run(ctx)
		close(done)
	}()

	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("hub.Run didn't exit on ctx cancel")
	}
}

func TestHub_BroadcastNonBlocking(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)

	doneCh := make(chan struct{})
	go func() {
		for i := 0; i < hubChannelCap*4; i++ {
			hub.Broadcast([]byte("x"))
		}
		close(doneCh)
	}()
	select {
	case <-doneCh:
	case <-time.After(time.Second):
		t.Fatal("Broadcast blocked when buffer full")
	}
}

func TestHub_ConcurrentRegisterBroadcast(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			t.Errorf("accept: %v", err)
			return
		}
		<-r.Context().Done()
		_ = c.CloseNow()
	}))
	defer srv.Close()

	wsURL := "ws" + srv.URL[len("http"):]
	const N = 5
	var wg sync.WaitGroup
	clients := make([]*websocket.Conn, 0, N)
	var clientsMu sync.Mutex

	for i := 0; i < N; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c, _, err := websocket.Dial(ctx, wsURL, nil)
			if err != nil {
				t.Errorf("dial: %v", err)
				return
			}
			clientsMu.Lock()
			clients = append(clients, c)
			clientsMu.Unlock()

			cl := NewClient(c)
			if err := hub.Register(ctx, cl); err != nil {
				t.Errorf("register: %v", err)
				return
			}
			go hub.RunClientWriter(ctx, cl)
		}()
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 50; i++ {
			hub.Broadcast([]byte("bcast"))
			time.Sleep(time.Millisecond)
		}
	}()

	wg.Wait()

	clientsMu.Lock()
	for _, c := range clients {
		_ = c.Close(websocket.StatusNormalClosure, "")
	}
	clientsMu.Unlock()
}

func TestHub_CatalogStorage(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)

	if got := hub.CatalogFrame(); got != nil {
		t.Errorf("expected nil initial catalog, got %v", got)
	}
	hub.SetCatalog([]byte("catalog-frame"))
	if got := hub.CatalogFrame(); string(got) != "catalog-frame" {
		t.Errorf("got %q, want catalog-frame", got)
	}
}

func TestHub_UnregisterNoop(t *testing.T) {
	t.Parallel()
	logger := zerolog.Nop()
	hub := NewHub(logger)
	c := &client{sendCh: make(chan []byte, 1), done: make(chan struct{})}
	hub.Unregister(c)
}

func TestNewClient_TrySendCap(t *testing.T) {
	t.Parallel()
	c := &client{sendCh: make(chan []byte, clientSendCap), done: make(chan struct{})}
	for i := 0; i < clientSendCap; i++ {
		if !c.trySend([]byte("frame")) {
			t.Fatalf("trySend returned false at i=%d before cap", i)
		}
	}
	if c.trySend([]byte("overflow")) {
		t.Fatal("trySend should return false when full")
	}
}
