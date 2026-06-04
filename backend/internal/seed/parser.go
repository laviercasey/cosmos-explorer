package seed

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
)

var (
	blockComment = regexp.MustCompile(`(?s)/\*.*?\*/`)

	unquotedKey = regexp.MustCompile(`([\{\,\[]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)`)

	trailingComma = regexp.MustCompile(`,(\s*[\}\]])`)
)

func ReadJSArray(filePath, rootName string, out any) error {
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("seed: read %s: %w", filePath, err)
	}
	jsonText, err := jsToJSON(string(raw), rootName)
	if err != nil {
		return fmt.Errorf("seed: transform %s: %w", filePath, err)
	}
	dec := json.NewDecoder(strings.NewReader(jsonText))
	dec.UseNumber()
	if err := dec.Decode(out); err != nil {
		return fmt.Errorf("seed: decode %s: %w", filePath, err)
	}
	return nil
}

func jsToJSON(src, rootName string) (string, error) {

	src = blockComment.ReplaceAllString(src, "")
	src = stripLineComments(src)

	needle := "const " + rootName
	idx := strings.Index(src, needle)
	if idx < 0 {
		return "", fmt.Errorf("const %s not found", rootName)
	}
	body := src[idx+len(needle):]
	eqIdx := strings.Index(body, "=")
	if eqIdx < 0 {
		return "", fmt.Errorf("no `=` after const %s", rootName)
	}
	body = body[eqIdx+1:]

	body = strings.TrimLeft(body, " \t\r\n")
	if len(body) == 0 {
		return "", fmt.Errorf("empty literal after const %s", rootName)
	}
	open := body[0]
	if open != '[' && open != '{' {
		return "", fmt.Errorf("expected [ or { after const %s, got %q", rootName, open)
	}

	end, err := findMatchingClose(body, open)
	if err != nil {
		return "", err
	}
	literal := body[:end+1]

	literal = mergeStringConcat(literal)

	literal = singleToDouble(literal)

	literal = unquotedKey.ReplaceAllString(literal, `$1"$2"$3`)
	literal = trailingComma.ReplaceAllString(literal, `$1`)

	return literal, nil
}

func stripLineComments(src string) string {
	var b strings.Builder
	b.Grow(len(src))
	var quote byte
	i := 0
	for i < len(src) {
		c := src[i]
		if quote == 0 {
			if c == '\'' || c == '"' || c == '`' {
				quote = c
				b.WriteByte(c)
				i++
				continue
			}
			if c == '/' && i+1 < len(src) && src[i+1] == '/' {

				for i < len(src) && src[i] != '\n' {
					i++
				}
				continue
			}
			b.WriteByte(c)
			i++
			continue
		}

		if c == '\\' && i+1 < len(src) {
			b.WriteByte(c)
			b.WriteByte(src[i+1])
			i += 2
			continue
		}
		if c == quote {
			quote = 0
		}
		b.WriteByte(c)
		i++
	}
	return b.String()
}

func findMatchingClose(s string, open byte) (int, error) {
	close := byte(']')
	if open == '{' {
		close = '}'
	}
	depth := 0
	var quote byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		if quote != 0 {
			if c == '\\' && i+1 < len(s) {
				i++
				continue
			}
			if c == quote {
				quote = 0
			}
			continue
		}
		switch c {
		case '\'', '"', '`':
			quote = c
		case open:
			depth++
		case close:
			depth--
			if depth == 0 {
				return i, nil
			}
		}
	}
	return 0, fmt.Errorf("unbalanced brackets in literal")
}

func singleToDouble(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	var quote byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		if quote == '"' {
			b.WriteByte(c)
			if c == '\\' && i+1 < len(s) {
				b.WriteByte(s[i+1])
				i++
				continue
			}
			if c == '"' {
				quote = 0
			}
			continue
		}
		if quote == '\'' {
			if c == '\\' && i+1 < len(s) {
				nxt := s[i+1]
				if nxt == '\'' {

					b.WriteByte('\'')
					i++
					continue
				}
				b.WriteByte(c)
				b.WriteByte(nxt)
				i++
				continue
			}
			if c == '\'' {
				b.WriteByte('"')
				quote = 0
				continue
			}
			if c == '"' {
				b.WriteString(`\"`)
				continue
			}
			b.WriteByte(c)
			continue
		}

		if c == '\'' {
			b.WriteByte('"')
			quote = '\''
			continue
		}
		if c == '"' {
			b.WriteByte(c)
			quote = '"'
			continue
		}
		b.WriteByte(c)
	}
	return b.String()
}

func mergeStringConcat(s string) string {
	prev := ""
	cur := s
	for prev != cur {
		prev = cur
		cur = mergeStringConcatOnce(cur)
	}
	return cur
}

var concatReSingle = regexp.MustCompile(`(?s)'((?:\\.|[^\\'])*?)'\s*\+\s*'((?:\\.|[^\\'])*?)'`)

var concatReDouble = regexp.MustCompile(`(?s)"((?:\\.|[^\\"])*?)"\s*\+\s*"((?:\\.|[^\\"])*?)"`)

func mergeStringConcatOnce(s string) string {
	s = concatReSingle.ReplaceAllString(s, `'$1$2'`)
	s = concatReDouble.ReplaceAllString(s, `"$1$2"`)
	return s
}
