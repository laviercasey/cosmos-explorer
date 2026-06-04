#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const stats = { files: 0, comments: 0, perFile: {} };

function isKeepLineComment(text) {
  const t = text.trim();
  if (t.startsWith('//go:')) return true;
  if (t.startsWith('// Code generated')) return true;
  if (t.startsWith('//Code generated')) return true;
  if (t.startsWith('// @ts-nocheck')) return true;
  if (t.startsWith('///')) return true;
  if (t.startsWith('// @ts-expect-error')) return false;
  if (t.startsWith('// @ts-ignore')) return false;
  return false;
}

function isKeepBlockComment(text) {
  const t = text.trim();
  if (t.startsWith('/* eslint-disable')) return true;
  if (t.startsWith('/* eslint-enable')) return true;
  if (t.startsWith('/* @ts-nocheck')) return true;
  return false;
}

function stripGoLikeComments(src, opts = {}) {
  const { rawBacktick = true, supportSingleQuoteRune = true } = opts;
  const out = [];
  let i = 0;
  let removed = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : '';
    if (c === '"') {
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) { i += 2; continue; }
        if (src[i] === '"') { i++; break; }
        if (src[i] === '\n') { break; }
        i++;
      }
      out.push(src.slice(start, i));
      continue;
    }
    if (rawBacktick && c === '`') {
      const start = i;
      i++;
      while (i < n && src[i] !== '`') i++;
      if (i < n) i++;
      out.push(src.slice(start, i));
      continue;
    }
    if (supportSingleQuoteRune && c === "'") {
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) { i += 2; continue; }
        if (src[i] === "'") { i++; break; }
        if (src[i] === '\n') break;
        i++;
      }
      out.push(src.slice(start, i));
      continue;
    }
    if (c === '/' && c2 === '/') {
      const lineStart = i;
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      const text = src.slice(lineStart, j);
      if (isKeepLineComment(text)) {
        out.push(text);
        i = j;
        continue;
      }
      removed++;
      let backStart = out.length === 0 ? 0 : -1;
      let trimmedOut = false;
      const joined = out.join('');
      let k = joined.length - 1;
      let onlyWS = true;
      while (k >= 0) {
        const ch = joined[k];
        if (ch === '\n') { break; }
        if (ch !== ' ' && ch !== '\t') { onlyWS = false; break; }
        k--;
      }
      if (onlyWS) {
        if (k >= 0 && joined[k] === '\n') {
          const trimmed = joined.slice(0, k + 1);
          out.length = 0;
          out.push(trimmed);
          trimmedOut = true;
        } else if (k < 0) {
          out.length = 0;
          trimmedOut = true;
        }
      }
      if (j < n && src[j] === '\n') {
        if (trimmedOut) {
          i = j + 1;
        } else {
          i = j;
        }
      } else {
        i = j;
      }
      continue;
    }
    if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < n - 1 && !(src[j] === '*' && src[j + 1] === '/')) j++;
      const end = Math.min(j + 2, n);
      const text = src.slice(i, end);
      if (isKeepBlockComment(text)) {
        out.push(text);
        i = end;
        continue;
      }
      removed++;
      const joined = out.join('');
      let k = joined.length - 1;
      let onlyWS = true;
      while (k >= 0) {
        const ch = joined[k];
        if (ch === '\n') break;
        if (ch !== ' ' && ch !== '\t') { onlyWS = false; break; }
        k--;
      }
      let trimmedOut = false;
      if (onlyWS && !text.includes('\n')) {
        if (k >= 0 && joined[k] === '\n') {
          out.length = 0;
          out.push(joined.slice(0, k + 1));
          trimmedOut = true;
        } else if (k < 0) {
          out.length = 0;
          trimmedOut = true;
        }
        if (end < n && src[end] === '\n') {
          i = trimmedOut ? end + 1 : end;
        } else {
          i = end;
        }
      } else if (onlyWS && text.includes('\n')) {
        if (k >= 0 && joined[k] === '\n') {
          out.length = 0;
          out.push(joined.slice(0, k + 1));
          trimmedOut = true;
        } else if (k < 0) {
          out.length = 0;
          trimmedOut = true;
        }
        if (end < n && src[end] === '\n') {
          i = trimmedOut ? end + 1 : end;
        } else {
          i = end;
        }
      } else {
        i = end;
      }
      continue;
    }
    out.push(c);
    i++;
  }
  return { output: out.join(''), removed };
}

function stripGo(src) {
  return stripGoLikeComments(src, { rawBacktick: true, supportSingleQuoteRune: true });
}

function stripTSWithTokenizer(src) {
  return stripTokenized(src, { isTS: true });
}

function stripJSWithTokenizer(src) {
  return stripTokenized(src, { isTS: true });
}

function stripTokenized(src, { isTS }) {
  const out = [];
  let i = 0;
  let removed = 0;
  const n = src.length;
  let inJSX = 0;

  let prev = '';
  function isRegexPos() {
    let k = out.length - 1;
    let last = '';
    let joined = out.join('');
    let p = joined.length - 1;
    while (p >= 0 && /[ \t]/.test(joined[p])) p--;
    if (p < 0) return true;
    last = joined[p];
    if (/[a-zA-Z0-9_)\]]/.test(last)) {
      let q = p;
      while (q >= 0 && /[a-zA-Z0-9_$]/.test(joined[q])) q--;
      const word = joined.slice(q + 1, p + 1);
      const keywordsBeforeRegex = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'throw', 'new', 'yield', 'await', 'case', 'do', 'else']);
      if (keywordsBeforeRegex.has(word)) return true;
      return false;
    }
    return true;
  }

  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : '';

    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) { i += 2; continue; }
        if (src[i] === quote) { i++; break; }
        if (src[i] === '\n') break;
        i++;
      }
      out.push(src.slice(start, i));
      continue;
    }

    if (c === '`') {
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) { i += 2; continue; }
        if (src[i] === '`') { i++; break; }
        if (src[i] === '$' && src[i + 1] === '{') {
          let depth = 1;
          i += 2;
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) i++;
          }
          if (i < n) i++;
          continue;
        }
        i++;
      }
      out.push(src.slice(start, i));
      continue;
    }

    if (c === '/' && c2 === '/') {
      const lineStart = i;
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      const text = src.slice(lineStart, j);
      if (isKeepLineComment(text)) {
        out.push(text);
        i = j;
        continue;
      }
      removed++;
      const joined = out.join('');
      let k = joined.length - 1;
      let onlyWS = true;
      while (k >= 0) {
        const ch = joined[k];
        if (ch === '\n') break;
        if (ch !== ' ' && ch !== '\t') { onlyWS = false; break; }
        k--;
      }
      let trimmedOut = false;
      if (onlyWS) {
        if (k >= 0 && joined[k] === '\n') {
          out.length = 0;
          out.push(joined.slice(0, k + 1));
          trimmedOut = true;
        } else if (k < 0) {
          out.length = 0;
          trimmedOut = true;
        }
      }
      if (j < n && src[j] === '\n') {
        i = trimmedOut ? j + 1 : j;
      } else {
        i = j;
      }
      continue;
    }

    if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < n - 1 && !(src[j] === '*' && src[j + 1] === '/')) j++;
      const end = Math.min(j + 2, n);
      const text = src.slice(i, end);
      if (isKeepBlockComment(text)) {
        out.push(text);
        i = end;
        continue;
      }
      removed++;
      const joined = out.join('');
      let k = joined.length - 1;
      let onlyWS = true;
      while (k >= 0) {
        const ch = joined[k];
        if (ch === '\n') break;
        if (ch !== ' ' && ch !== '\t') { onlyWS = false; break; }
        k--;
      }
      let trimmedOut = false;
      if (onlyWS) {
        if (k >= 0 && joined[k] === '\n') {
          out.length = 0;
          out.push(joined.slice(0, k + 1));
          trimmedOut = true;
        } else if (k < 0) {
          out.length = 0;
          trimmedOut = true;
        }
        if (end < n && src[end] === '\n') {
          i = trimmedOut ? end + 1 : end;
        } else {
          i = end;
        }
      } else {
        i = end;
      }
      continue;
    }

    if (c === '/' && isRegexPos()) {
      const start = i;
      i++;
      let inClass = false;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) { i += 2; continue; }
        if (src[i] === '[') { inClass = true; i++; continue; }
        if (src[i] === ']') { inClass = false; i++; continue; }
        if (src[i] === '/' && !inClass) { i++; break; }
        if (src[i] === '\n') break;
        i++;
      }
      while (i < n && /[gimsuy]/.test(src[i])) i++;
      out.push(src.slice(start, i));
      continue;
    }

    out.push(c);
    i++;
  }
  return { output: out.join(''), removed };
}

function stripYAML(src) {
  const out = [];
  let removed = 0;
  const lines = src.split('\n');
  for (const line of lines) {
    let inStr = null;
    let i = 0;
    let cutAt = -1;
    while (i < line.length) {
      const c = line[i];
      if (inStr) {
        if (c === '\\' && i + 1 < line.length) { i += 2; continue; }
        if (c === inStr) inStr = null;
        i++;
        continue;
      }
      if (c === '"' || c === "'") { inStr = c; i++; continue; }
      if (c === '#') {
        const before = i === 0 ? '' : line[i - 1];
        if (i === 0 || before === ' ' || before === '\t') {
          cutAt = i;
          break;
        }
      }
      i++;
    }
    if (cutAt >= 0) {
      removed++;
      const kept = line.slice(0, cutAt).replace(/[ \t]+$/, '');
      if (kept.length > 0) out.push(kept);
    } else {
      out.push(line);
    }
  }
  return { output: out.join('\n'), removed };
}

function stripProto(src) {
  return stripGoLikeComments(src, { rawBacktick: false, supportSingleQuoteRune: false });
}

const extConfig = {
  '.go': { strip: stripGo, exclude: ['backend/gen/', 'scripts/strip_comments.mjs', 'scripts/strip_go_comments.go'] },
  '.ts': { strip: stripTSWithTokenizer, exclude: ['src/shared/api/gen/', 'node_modules/', '.next/'] },
  '.tsx': { strip: stripTSWithTokenizer, exclude: ['src/shared/api/gen/', 'node_modules/', '.next/'] },
  '.yaml': { strip: stripYAML, exclude: [] },
  '.yml': { strip: stripYAML, exclude: [] },
  '.proto': { strip: stripProto, exclude: [] },
};

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === 'coverage' || entry.name === '.git') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, callback);
    else callback(p);
  }
}

function relPosix(p) {
  return path.relative(repoRoot, p).split(path.sep).join('/');
}

function shouldProcess(rel) {
  const ext = path.extname(rel);
  const cfg = extConfig[ext];
  if (!cfg) return null;
  for (const ex of cfg.exclude) {
    if (rel.startsWith(ex) || rel.includes('/' + ex) || rel === ex) return null;
    if (rel.includes(ex)) return null;
  }
  return cfg;
}

const inScopeRoots = ['backend', 'src', 'app', 'i18n', 'proto'];
const inScopeFiles = ['middleware.ts', 'next.config.ts', 'vitest.config.ts', 'buf.yaml', 'buf.gen.yaml'];

const args = process.argv.slice(2);
let onlyExt = null;
if (args.length > 0) onlyExt = args[0];

const targets = [];
for (const root of inScopeRoots) {
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) continue;
  walk(full, (p) => {
    const rel = relPosix(p);
    const cfg = shouldProcess(rel);
    if (cfg) {
      if (onlyExt && !rel.endsWith(onlyExt)) return;
      targets.push({ path: p, rel, cfg });
    }
  });
}
for (const file of inScopeFiles) {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) continue;
  const rel = relPosix(full);
  const ext = path.extname(rel);
  if (extConfig[ext]) {
    if (onlyExt && !rel.endsWith(onlyExt)) continue;
    targets.push({ path: full, rel, cfg: extConfig[ext] });
  }
}

for (const { path: p, rel, cfg } of targets) {
  const src = fs.readFileSync(p, 'utf8');
  const { output, removed } = cfg.strip(src);
  if (removed > 0 && output !== src) {
    fs.writeFileSync(p, output);
    stats.files++;
    stats.comments += removed;
    stats.perFile[rel] = removed;
    console.log(`${rel}: removed ${removed}`);
  }
}

console.log(`\nTotal: ${stats.files} files modified, ${stats.comments} comments removed.`);
