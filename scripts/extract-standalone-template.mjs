// Extract the template + manifest payloads from a Sano "standalone" bundled HTML
// file. Usage: node scripts/extract-standalone-template.mjs <input.html> <output-dir>
//
// Writes:
//   <output-dir>/template.html   - the resolved template HTML (UUID refs left in place)
//   <output-dir>/template.raw    - the JSON-parsed template string (same as .html)
//   <output-dir>/manifest.json   - { uuid: { mime, compressed, size } } (data omitted)
//   <output-dir>/index.html      - resolved HTML with asset uuids replaced by data: URLs
//                                  (small text assets only; large binaries kept as uuid:xxx)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const [, , inputArg, outDirArg] = process.argv;
if (!inputArg || !outDirArg) {
  console.error('usage: node extract-standalone-template.mjs <input.html> <output-dir>');
  process.exit(2);
}
const input = resolve(inputArg);
const outDir = resolve(outDirArg);
mkdirSync(outDir, { recursive: true });

const html = readFileSync(input, 'utf8');

function extractScriptBody(html, type) {
  const tagRe = new RegExp(`<script[^>]*type="__bundler\\/${type}"[^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(tagRe);
  if (!match) throw new Error(`could not find <script type="__bundler/${type}">`);
  return match[1];
}

const templateBody = extractScriptBody(html, 'template');
const manifestBody = extractScriptBody(html, 'manifest');

let template = JSON.parse(templateBody);
const manifest = JSON.parse(manifestBody);

writeFileSync(`${outDir}/template.raw`, template);
writeFileSync(`${outDir}/template.html`, template);

const manifestSummary = {};
for (const [uuid, entry] of Object.entries(manifest)) {
  const sizeB64 = entry.data ? entry.data.length : 0;
  manifestSummary[uuid] = {
    mime: entry.mime,
    compressed: !!entry.compressed,
    base64_size: sizeB64,
  };
}
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifestSummary, null, 2));

let resolved = template;
let textInlined = 0;
let binarySkipped = 0;
for (const [uuid, entry] of Object.entries(manifest)) {
  const isText = (entry.mime || '').startsWith('text/') ||
                 (entry.mime || '').includes('javascript') ||
                 (entry.mime || '').includes('json') ||
                 (entry.mime || '').includes('svg');
  if (!isText) {
    binarySkipped++;
    continue;
  }
  try {
    let bytes = Buffer.from(entry.data, 'base64');
    if (entry.compressed) bytes = gunzipSync(bytes);
    const text = bytes.toString('utf8');
    // Replace uuid references in the template with the inlined text (only for small ones)
    if (text.length < 200_000) {
      const dataUrl = `data:${entry.mime};utf8,${encodeURIComponent(text)}`;
      const re = new RegExp(uuid, 'g');
      resolved = resolved.replace(re, dataUrl);
      textInlined++;
    }
  } catch (err) {
    console.warn(`failed to inline ${uuid}:`, err.message);
  }
}
writeFileSync(`${outDir}/index.html`, resolved);

console.log(JSON.stringify({
  input,
  outDir,
  templateLength: template.length,
  manifestEntries: Object.keys(manifest).length,
  textInlined,
  binarySkipped,
}, null, 2));
