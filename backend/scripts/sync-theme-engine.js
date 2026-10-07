// Makes the backend copy of the app's theme engine (reminder emails use the same colour maths).
//
// The backend is deployed on its own (Render, root directory `backend`), so it cannot read
// the frontend folder at run time, and the frontend files are ES modules. This script copies
// four of them into backend/services/theme/ as CommonJS, changing only the import/export lines:
//   import { a, b } from './x';   ->  const { a, b } = require('./x');
//   export const NAME / function  ->  const NAME / function  (+ one module.exports line at the end)
// Any other import/export form is refused, so the copy can never be silently wrong.
// services/themeEngineSync.test.js fails when a copy is out of date.
//
// Run after changing anything in frontend/src/design/theme/:  node scripts/sync-theme-engine.js
const fs = require('node:fs');
const path = require('node:path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'frontend', 'src', 'design', 'theme');
const TARGET_DIR = path.join(__dirname, '..', 'services', 'theme');
const FILES = ['color.js', 'theme.js', 'deriveTokens.js', 'palettes.js'];

function transform(source, fileName) {
  let out = source.replace(/import\s*\{([^}]*)\}\s*from\s*'(\.\/[\w-]+)';/g, "const {$1} = require('$2');");
  const names = [...out.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  out = out.replace(/^export (const|function) /gm, '$1 ');
  if (/^(export|import)\s/m.test(out)) throw new Error(`sync-theme-engine: unsupported export form in ${fileName}`);
  const header = `// GENERATED from frontend/src/design/theme/${fileName} by backend/scripts/sync-theme-engine.js.\n`
    + '// Do not edit. Edit the frontend file, then run: node scripts/sync-theme-engine.js\n';
  return `${header}${out}\nmodule.exports = { ${names.join(', ')} };\n`;
}

module.exports = { transform, FILES, SOURCE_DIR, TARGET_DIR };

if (require.main === module) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  for (const file of FILES) {
    const result = transform(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'), file);
    fs.writeFileSync(path.join(TARGET_DIR, file), result);
    console.log(`wrote services/theme/${file}`);
  }
}
