import fs from 'fs';
import path from 'path';
import { COLOR_ALLOWLIST } from './colorAllowlist';

// Hard-coded colours do not follow the student's theme. This scans the app's code for them: a new one
// fails here (use a token, or allow it with a reason), and an allowed one that has gone must be removed.
const ROOT = path.join(__dirname, '..', '..'); // frontend/
const HEX = /(?<![&A-Za-z0-9])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FUNC = /(?<![A-Za-z0-9])(?:rgba?|hsla?)\(\s*\d[^)]*\)/gi;

function listFiles(dir, out = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__fixtures__') listFiles(p, out);
    } else if (/\.(js|jsx|css)$/.test(e.name) && !/\.test\.js$/.test(e.name)) out.push(p);
  });
  return out;
}

const SKIPPED = ['src/design/theme/', 'src/design/tokens.css', 'src/design/colorAllowlist.js'];
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const files = listFiles(path.join(ROOT, 'src')).filter((f) => !SKIPPED.some((s) => rel(f).startsWith(s)));

// file -> literal -> [line numbers]
function scan() {
  const found = {};
  files.forEach((f) => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      [HEX, FUNC].forEach((re) => {
        for (const m of line.matchAll(re)) {
          const file = (found[rel(f)] = found[rel(f)] || {});
          (file[m[0]] = file[m[0]] || []).push(i + 1);
        }
      });
    });
  });
  return found;
}

describe('hard-coded colours', () => {
  const found = scan();
  const allowed = {};
  COLOR_ALLOWLIST.forEach((e) => { allowed[e.file] = e; });

  it('scans the app code', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.map(rel)).toContain('src/Pages/Authpage.js');
    expect(files.map(rel)).not.toContain('src/design/theme/deriveTokens.js');
  });

  it('every colour code in the code is a token or is allowed', () => {
    const problems = [];
    Object.entries(found).forEach(([file, literals]) => {
      Object.entries(literals).forEach(([lit, lines]) => {
        if (!(allowed[file] && allowed[file].literals.includes(lit))) {
          problems.push(`New hard-coded colour ${lit} at ${file}:${lines[0]}. Use a design token (rgb(var(--token)) or a token class, see src/design/tokens.css). If it is a data colour (subject, category, status, third-party logo), add it to src/design/colorAllowlist.js with a reason.`);
        }
      });
    });
    expect(problems).toEqual([]);
  });

  it('every allowed colour is still in its file', () => {
    const problems = [];
    COLOR_ALLOWLIST.forEach((e) => e.literals.forEach((lit) => {
      if (!(found[e.file] && found[e.file][lit])) problems.push(`${lit} is no longer in ${e.file}: remove it from src/design/colorAllowlist.js.`);
    }));
    expect(problems).toEqual([]);
  });

  it('every entry has a reason, a real file, and appears once', () => {
    const seen = new Set();
    COLOR_ALLOWLIST.forEach((e) => {
      expect(typeof e.reason === 'string' && e.reason.trim().length > 5).toBe(true);
      expect(fs.existsSync(path.join(ROOT, e.file))).toBe(true);
      expect(seen.has(e.file)).toBe(false);
      seen.add(e.file);
      expect(new Set(e.literals).size).toBe(e.literals.length);
    });
  });

  it('the patterns see what they should', () => {
    expect('x #EC706D y'.match(HEX)).toEqual(['#EC706D']);
    expect('color: #fff;'.match(HEX)).toEqual(['#fff']);
    expect('&#8199; a#b2 #ABCDEFG'.match(HEX)).toBeNull();
    expect('rgb(255 0 0 / .5) rgba(0,0,0,.2) hsl(10 20% 30%)'.match(FUNC)).toHaveLength(3);
    expect('rgb(var(--brand) / .5)'.match(FUNC)).toBeNull();
  });
});
