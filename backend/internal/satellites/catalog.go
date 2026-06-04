package satellites

import (
	"strings"

	"github.com/joshuaferrara/go-satellite"
)

type Sat struct {
	NoradID   int
	Name      string
	ColorHint string
	Highlight bool
}

var CuratedSats = []Sat{
	{NoradID: 25544, Name: "ISS (ZARYA)", ColorHint: "#44aaff", Highlight: true},
	{NoradID: 20580, Name: "HST", ColorHint: "#ffd966", Highlight: false},
	{NoradID: 48274, Name: "CSS (TIANHE)", ColorHint: "#ff7799", Highlight: false},
	{NoradID: 49271, Name: "COSMOS 1408 DEB", ColorHint: "#bbbbbb", Highlight: false},
	{NoradID: 22220, Name: "SL-16 R/B", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 39177, Name: "COSMOS 2487", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 28737, Name: "COSMOS 2406", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 27386, Name: "ENVISAT", ColorHint: "#88dd88", Highlight: false},
	{NoradID: 11144, Name: "SL-8 R/B", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 28646, Name: "LACROSSE 5", ColorHint: "#dddd88", Highlight: false},
	{NoradID: 21422, Name: "COSMOS 2123 R/B", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 19046, Name: "COSMOS 1933", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 18187, Name: "COSMOS 1844", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 14222, Name: "COSMOS 1455", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 15945, Name: "COSMOS 1626", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 16882, Name: "COSMOS 1697", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 50001, Name: "ISS DEB (SREP)", ColorHint: "#bbbbbb", Highlight: false},
	{NoradID: 33591, Name: "NOAA 19", ColorHint: "#88dd88", Highlight: false},
	{NoradID: 28654, Name: "NOAA 18", ColorHint: "#88dd88", Highlight: false},
	{NoradID: 25338, Name: "NOAA 15", ColorHint: "#88dd88", Highlight: false},
	{NoradID: 40069, Name: "METEOR-M 2", ColorHint: "#88dd88", Highlight: false},
	{NoradID: 23405, Name: "SL-16 R/B (2)", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 24298, Name: "COSMOS 2333 R/B", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 13154, Name: "COSMOS 1346 R/B", ColorHint: "#aaccee", Highlight: false},
	{NoradID: 41442, Name: "ASTRO H DEB", ColorHint: "#bbbbbb", Highlight: false},
}

func CuratedNoradIDs() map[int]Sat {
	out := make(map[int]Sat, len(CuratedSats))
	for _, s := range CuratedSats {
		out[s.NoradID] = s
	}
	return out
}

type Entry struct {
	Sat     Sat
	Sgp4Sat satellite.Satellite
}

type Catalog struct {
	Entries []Entry
}

func NormalizeTLEName(line string) string {
	return strings.TrimSpace(line)
}
