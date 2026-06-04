package seed

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestSlugify(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"Mercury", "mercury"},
		{"Luna 17 / Луноход 1", "luna-17-1"},
		{"  Multiple   Spaces  ", "multiple-spaces"},
		{"Pioneer 10 & 11", "pioneer-10-11"},
		{"Apollo-11", "apollo-11"},
		{"---leading-trailing---", "leading-trailing"},
		{"numbers42here", "numbers42here"},
		{"ALL CAPS", "all-caps"},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.in, func(t *testing.T) {
			got := Slugify(tc.in)
			if got != tc.want {
				t.Errorf("Slugify(%q)=%q want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestJSToJSON_ArrayRoot(t *testing.T) {
	src := `// leading comment
/* block comment */
const PLANETS = [
  {
    name: 'Mercury', // inline comment
    type: "terrestrial",
    facts: ['one', 'two',],
  },
  {
    name: 'Venus',
    type: 'terrestrial',
  },
];
export default PLANETS;`
	out, err := jsToJSON(src, "PLANETS")
	if err != nil {
		t.Fatalf("jsToJSON: %v", err)
	}
	var got []map[string]any
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("unmarshal %q: %v", out, err)
	}
	if len(got) != 2 {
		t.Fatalf("len=%d want 2", len(got))
	}
	if got[0]["name"] != "Mercury" {
		t.Errorf("[0].name=%v want Mercury", got[0]["name"])
	}
	facts, _ := got[0]["facts"].([]any)
	if len(facts) != 2 {
		t.Errorf("facts len=%d want 2", len(facts))
	}
}

func TestJSToJSON_ObjectRoot(t *testing.T) {
	src := `const MISSION_TRAJECTORIES = {
  'Artemis 2': {
    missionName: 'Artemis 2',
    year: 2026,
    duration: '9 days 1 hour',
    crew: ['A', 'B'],
  },
  'Apollo 11': { missionName: 'Apollo 11', year: 1969 },
};`
	out, err := jsToJSON(src, "MISSION_TRAJECTORIES")
	if err != nil {
		t.Fatalf("jsToJSON: %v", err)
	}
	var got map[string]map[string]any
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("unmarshal %q: %v", out, err)
	}
	if len(got) != 2 {
		t.Fatalf("len=%d want 2", len(got))
	}
	if got["Artemis 2"]["missionName"] != "Artemis 2" {
		t.Errorf("Artemis: %v", got["Artemis 2"])
	}
}

func TestJSToJSON_MissingRoot(t *testing.T) {
	src := `const OTHER = [];`
	_, err := jsToJSON(src, "NOT_PRESENT")
	if err == nil {
		t.Fatal("expected error when root constant is absent")
	}
	if !strings.Contains(err.Error(), "NOT_PRESENT") {
		t.Errorf("error should name the missing root: %v", err)
	}
}

func TestJSToJSON_StringConcatenation(t *testing.T) {
	src := `const MESSAGES = [
  { msg: 'Hello, ' + 'world!' },
  { msg: "multi" + "line" +
    "chain" },
];`
	out, err := jsToJSON(src, "MESSAGES")
	if err != nil {
		t.Fatalf("jsToJSON: %v", err)
	}
	var got []map[string]any
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("unmarshal %q: %v", out, err)
	}
	if got[0]["msg"] != "Hello, world!" {
		t.Errorf("first=%q", got[0]["msg"])
	}
	if got[1]["msg"] != "multilinechain" {
		t.Errorf("second=%q", got[1]["msg"])
	}
}

func TestJSToJSON_PreservesURLsInsideStrings(t *testing.T) {
	src := `const X = [{ url: 'https://example.com/path' }];`
	out, err := jsToJSON(src, "X")
	if err != nil {
		t.Fatalf("jsToJSON: %v", err)
	}
	if !strings.Contains(out, "https://example.com/path") {
		t.Errorf("URL corrupted by comment strip: %q", out)
	}
}

func TestJSToJSON_TrailingCommas(t *testing.T) {
	src := `const X = [1, 2, 3,];`
	out, err := jsToJSON(src, "X")
	if err != nil {
		t.Fatalf("jsToJSON: %v", err)
	}
	var got []int
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("unmarshal %q: %v", out, err)
	}
	if len(got) != 3 {
		t.Errorf("len=%d want 3", len(got))
	}
}

func TestJSToJSON_UnbalancedBrackets(t *testing.T) {
	src := `const X = [1, 2, 3;`
	_, err := jsToJSON(src, "X")
	if err == nil {
		t.Fatal("expected error for unbalanced brackets")
	}
}

func TestFindMatchingClose(t *testing.T) {
	tests := []struct {
		name   string
		in     string
		open   byte
		wantIX int
		err    bool
	}{
		{"empty obj", "{}", '{', 1, false},
		{"nested obj", "{a:{b:1}}", '{', 8, false},
		{"array with string containing brace", `["}test"]`, '[', 8, false},
		{"unbalanced", "{[", '{', 0, true},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got, err := findMatchingClose(tc.in, tc.open)
			if tc.err {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected: %v", err)
			}
			if got != tc.wantIX {
				t.Errorf("got %d want %d", got, tc.wantIX)
			}
		})
	}
}

func TestReadJSArray_RealPlanets(t *testing.T) {
	path := seedDataPath(t, "planets.ts")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("planets.ts not found: %v", err)
	}

	var planets []map[string]any
	if err := ReadJSArray(path, "PLANETS", &planets); err != nil {
		t.Fatalf("ReadJSArray: %v", err)
	}
	if len(planets) != 8 {
		t.Errorf("expected 8 planets, got %d", len(planets))
	}

	for i, p := range planets {
		if _, ok := p["name"]; !ok {
			t.Errorf("planet[%d] missing name", i)
		}
		if _, ok := p["type"]; !ok {
			t.Errorf("planet[%d] missing type", i)
		}
	}
}

func TestReadJSArray_RealMissions(t *testing.T) {
	path := seedDataPath(t, "missions.ts")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("missions.ts not found: %v", err)
	}

	var missions []map[string]any
	if err := ReadJSArray(path, "MISSIONS", &missions); err != nil {
		t.Fatalf("ReadJSArray: %v", err)
	}
	if len(missions) < 50 {

		t.Errorf("expected at least 50 missions, got %d", len(missions))
	}
	for i, m := range missions {
		if _, ok := m["id"]; !ok {
			t.Errorf("mission[%d] missing id", i)
		}
	}
}

func TestReadJSArray_RealTrajectories(t *testing.T) {
	path := seedDataPath(t, "trajectories.ts")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("trajectories.ts not found: %v", err)
	}

	var trajs map[string]map[string]any
	if err := ReadJSArray(path, "MISSION_TRAJECTORIES", &trajs); err != nil {
		t.Fatalf("ReadJSArray: %v", err)
	}
	if len(trajs) == 0 {
		t.Error("expected at least one trajectory")
	}
}

func TestReadJSArray_RealPlanetTranslations(t *testing.T) {
	path := seedDataPath(t, "planetsTranslations.ts")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("planetsTranslations.ts not found: %v", err)
	}

	var translations map[string]map[string]any
	if err := ReadJSArray(path, "PLANETS_RU", &translations); err != nil {
		t.Fatalf("ReadJSArray (TS type annotation handling): %v", err)
	}
	if len(translations) != 8 {
		t.Errorf("expected 8 planet translations, got %d", len(translations))
	}
}

func TestCompositeKey(t *testing.T) {
	tests := []struct {
		name string
		year int
		want string
	}{
		{"Artemis 2", 2026, "artemis 2::2026"},
		{"  Apollo 11  ", 1969, "apollo 11::1969"},
		{"Voyager", 1977, "voyager::1977"},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := compositeKey(tc.name, tc.year); got != tc.want {
				t.Errorf("compositeKey=%q want %q", got, tc.want)
			}
		})
	}
}

func TestResolvePlanetMissionID(t *testing.T) {
	ids := map[string]int64{
		"mariner-10":       10,
		"mariner 10::1974": 10,
		"messenger":        20,
		"messenger::2004":  20,
		"pioneer-10":       30,
		"pioneer 10::1973": 30,
		"pioneer-11":       31,
		"pioneer 11::1973": 31,
	}

	tests := []struct {
		name   string
		mname  string
		year   int
		wantID int64
		ok     bool
	}{
		{"exact slug", "Mariner 10", 1974, 10, true},
		{"composite key hit", "MeSSEnger", 2004, 20, true},
		{"compound with ampersand", "Pioneer 10 & 11", 1973, 30, true},

		{"compound with slash picks first segment", "Mariner 10 / MESSENGER", 2004, 10, true},
		{"unknown", "Unknown Mission", 1999, 0, false},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got, ok := resolvePlanetMissionID(ids, tc.mname, tc.year)
			if ok != tc.ok {
				t.Fatalf("ok=%v want %v", ok, tc.ok)
			}
			if ok && got != tc.wantID {
				t.Errorf("id=%d want %d", got, tc.wantID)
			}
		})
	}
}

func TestNullableStrings(t *testing.T) {
	if got := nullableStrings(nil); got != nil {
		t.Errorf("nil -> %v want nil", got)
	}
	if got := nullableStrings([]string{}); got != nil {
		t.Errorf("empty -> %v want nil", got)
	}
	got := nullableStrings([]string{"a"})
	if len(got) != 1 || got[0] != "a" {
		t.Errorf("[a] -> %v", got)
	}
}

func TestStringPtr(t *testing.T) {
	if stringPtr("") != nil {
		t.Error(`stringPtr("") should be nil`)
	}
	s := "hello"
	p := stringPtr(s)
	if p == nil || *p != s {
		t.Errorf("stringPtr(%q)=%v", s, p)
	}
}

func TestRemarshalCanvas(t *testing.T) {
	in := json.RawMessage(`{"technique":"cratered","palette":["#a","#b"],"noiseScale":6.0,"craterDensity":0.7}`)
	out, err := remarshalCanvas(in)
	if err != nil {
		t.Fatalf("remarshalCanvas: %v", err)
	}
	s := string(out)
	for _, k := range []string{"technique", "noise_scale", "crater_density", "palette"} {
		if !strings.Contains(s, k) {
			t.Errorf("missing key %q in %s", k, s)
		}
	}

	if strings.Contains(s, "noiseScale") || strings.Contains(s, "craterDensity") {
		t.Errorf("camelCase leaked: %s", s)
	}
}

func TestRemarshalCanvas_Empty(t *testing.T) {
	if _, err := remarshalCanvas(nil); err == nil {
		t.Error("expected error for empty canvas")
	}
	if _, err := remarshalCanvas(json.RawMessage(`null`)); err == nil {
		t.Error("expected error for null canvas")
	}
}

func TestRemarshalRing(t *testing.T) {
	t.Run("null input", func(t *testing.T) {
		out, err := remarshalRing(json.RawMessage(`null`))
		if err != nil {
			t.Fatal(err)
		}
		if out != nil {
			t.Errorf("null -> %s, want nil", out)
		}
	})
	t.Run("empty input", func(t *testing.T) {
		out, err := remarshalRing(nil)
		if err != nil {
			t.Fatal(err)
		}
		if out != nil {
			t.Errorf("empty -> %s, want nil", out)
		}
	})
	t.Run("valid ring", func(t *testing.T) {
		in := json.RawMessage(`{"innerRadiusScale":1.2,"outerRadiusScale":2.0,"bands":[{"color":"#aaa","start":0,"end":1,"opacity":0.5}]}`)
		out, err := remarshalRing(in)
		if err != nil {
			t.Fatal(err)
		}
		s := string(out)
		for _, k := range []string{"inner_radius_scale", "outer_radius_scale", "bands", "color"} {
			if !strings.Contains(s, k) {
				t.Errorf("missing %s: %s", k, s)
			}
		}
		if strings.Contains(s, "innerRadiusScale") {
			t.Errorf("camelCase leaked: %s", s)
		}
	})
}

func TestStripLineComments_InsideStringPreserved(t *testing.T) {
	in := `{ url: "http://a.test/b", name: "x" // trailing
}`
	out := stripLineComments(in)
	if !strings.Contains(out, "http://a.test/b") {
		t.Errorf("url eaten: %q", out)
	}
	if strings.Contains(out, "// trailing") {
		t.Errorf("trailing comment not stripped: %q", out)
	}
}

func TestSingleToDouble(t *testing.T) {
	in := `{ a: 'hello', b: "world" }`
	got := singleToDouble(in)
	if !strings.Contains(got, `"hello"`) {
		t.Errorf("single not converted: %q", got)
	}
	if !strings.Contains(got, `"world"`) {
		t.Errorf("double mangled: %q", got)
	}
}

func seedDataPath(t *testing.T, parts ...string) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	backendDir := filepath.Dir(filepath.Dir(filepath.Dir(thisFile)))
	args := append([]string{backendDir, "seed", "data"}, parts...)
	return filepath.Join(args...)
}
