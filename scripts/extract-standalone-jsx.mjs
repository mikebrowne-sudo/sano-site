// Decode just the JSX/JS files out of the standalone bundle.
// usage: node scripts/extract-standalone-jsx.mjs <input.html> <output-dir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const [, , inputArg, outDirArg] = process.argv;
const input = resolve(inputArg);
const outDir = resolve(outDirArg);
mkdirSync(outDir, { recursive: true });

const html = readFileSync(input, 'utf8');
const tagRe = /<script[^>]*type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/;
const manifest = JSON.parse(html.match(tagRe)[1]);

const wanted = new Set(['text/javascript', 'application/javascript', 'text/jsx', 'text/babel']);

for (const [uuid, entry] of Object.entries(manifest)) {
  if (!wanted.has(entry.mime)) continue;
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = gunzipSync(bytes);
  const text = bytes.toString('utf8');
  const ext = entry.mime.endsWith('jsx') ? 'jsx' : 'js';
  const file = `${outDir}/${uuid}.${ext}`;
  writeFileSync(file, text);
  console.log(`${file}  mime=${entry.mime}  ${text.length} bytes`);
}
