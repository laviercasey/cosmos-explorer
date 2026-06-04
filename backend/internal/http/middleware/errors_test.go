package middleware

import (
	"bytes"
	"encoding/json"
	nethttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rs/zerolog"
)

func TestRecoverer_CatchesPanicAndEmitsEnvelope(t *testing.T) {
	var buf bytes.Buffer
	base := zerolog.New(&buf)

	h := Recoverer()(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		panic("boom")
	}))

	req := httptest.NewRequest(nethttp.MethodGet, "/boom", nil)
	req = req.WithContext(base.WithContext(req.Context()))
	rr := httptest.NewRecorder()

	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Fatalf("recoverer leaked panic: %v", r)
			}
		}()
		h.ServeHTTP(rr, req)
	}()

	if rr.Code != nethttp.StatusInternalServerError {
		t.Errorf("status=%d want 500", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type=%q", ct)
	}

	var env map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &env); err != nil {
		t.Fatalf("decode envelope: %v\nbody=%s", err, rr.Body.String())
	}
	if env["data"] != nil {
		t.Errorf("data should be nil")
	}
	if env["meta"] != nil {
		t.Errorf("meta should be nil")
	}
	errObj, ok := env["error"].(map[string]any)
	if !ok {
		t.Fatalf("error not object: %v", env["error"])
	}
	if errObj["code"] != "internal_error" {
		t.Errorf("error.code=%v want internal_error", errObj["code"])
	}

	logged := buf.String()
	if !strings.Contains(logged, "handler panic") {
		t.Errorf("log should mention panic, got=%q", logged)
	}
}

func TestRecoverer_PassesThroughHealthyResponse(t *testing.T) {
	h := Recoverer()(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		w.WriteHeader(nethttp.StatusTeapot)
		_, _ = w.Write([]byte(`ok`))
	}))
	rr := httptest.NewRecorder()
	base := zerolog.Nop()
	req := httptest.NewRequest(nethttp.MethodGet, "/", nil)
	h.ServeHTTP(rr, req.WithContext(base.WithContext(req.Context())))

	if rr.Code != nethttp.StatusTeapot {
		t.Errorf("status=%d want 418", rr.Code)
	}
	if rr.Body.String() != "ok" {
		t.Errorf("body=%q want ok", rr.Body.String())
	}
}

func TestLogging_EmitsOneLinePerRequest(t *testing.T) {
	var buf bytes.Buffer
	base := zerolog.New(&buf)

	called := false
	h := Logging(base)(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		called = true
		w.WriteHeader(nethttp.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))

	req := httptest.NewRequest(nethttp.MethodGet, "/hello?q=1", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if !called {
		t.Error("inner handler was not called")
	}
	var line map[string]any

	body := strings.TrimSpace(buf.String())
	if body == "" {
		t.Fatalf("no log line emitted")
	}
	firstLine := strings.Split(body, "\n")[0]
	if err := json.Unmarshal([]byte(firstLine), &line); err != nil {
		t.Fatalf("parse log line: %v\n%s", err, firstLine)
	}
	if line["method"] != "GET" {
		t.Errorf("method=%v want GET", line["method"])
	}
	if line["path"] != "/hello" {
		t.Errorf("path=%v want /hello", line["path"])
	}
	if _, ok := line["status"]; !ok {
		t.Error("log line missing status")
	}
	if _, ok := line["duration"]; !ok {
		t.Error("log line missing duration")
	}
}

func TestCORS_DevWildcard(t *testing.T) {
	h := CORS(nil, true)(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		w.WriteHeader(nethttp.StatusOK)
	}))

	req := httptest.NewRequest(nethttp.MethodOptions, "/api/v1/planets", nil)
	req.Header.Set("Origin", "http://example.com")
	req.Header.Set("Access-Control-Request-Method", "GET")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	got := rr.Header().Get("Access-Control-Allow-Origin")
	if got != "*" && got != "http://example.com" {
		t.Errorf("Allow-Origin=%q want * or echoed origin", got)
	}
}

func TestCORS_ProdExplicitOrigin(t *testing.T) {
	h := CORS([]string{"https://cosmos.example.com"}, false)(nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		w.WriteHeader(nethttp.StatusOK)
	}))

	t.Run("allowed origin", func(t *testing.T) {
		req := httptest.NewRequest(nethttp.MethodOptions, "/api/v1/planets", nil)
		req.Header.Set("Origin", "https://cosmos.example.com")
		req.Header.Set("Access-Control-Request-Method", "GET")
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "https://cosmos.example.com" {
			t.Errorf("Allow-Origin=%q want https://cosmos.example.com", got)
		}
	})
	t.Run("disallowed origin", func(t *testing.T) {
		req := httptest.NewRequest(nethttp.MethodOptions, "/api/v1/planets", nil)
		req.Header.Set("Origin", "https://attacker.test")
		req.Header.Set("Access-Control-Request-Method", "GET")
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if got := rr.Header().Get("Access-Control-Allow-Origin"); got == "https://attacker.test" {
			t.Errorf("disallowed origin should not be echoed: got %q", got)
		}
	})
}
