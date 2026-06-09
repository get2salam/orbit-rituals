#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTERNAL_SCHEMES = /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i;

async function exists(relativePath) {
  try {
    await access(resolve(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function isLocal(value) {
  return value && !EXTERNAL_SCHEMES.test(value);
}

function normalize(value) {
  return value.replace(/^\.\//, '').replace(/^\//, '').split(/[?#]/)[0];
}

function collectHtmlAssets(html) {
  const refs = new Set();
  const pattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    if (isLocal(match[1])) refs.add(normalize(match[1]));
  }
  return refs;
}

function collectMarkdownAssets(markdown) {
  const refs = new Set();
  const pattern = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?\s*(?:"[^"]*")?\s*\)/g;
  for (const match of markdown.matchAll(pattern)) {
    if (isLocal(match[1])) refs.add(normalize(match[1]));
  }
  return refs;
}

const sources = [
  { file: 'index.html', collect: collectHtmlAssets },
  { file: 'README.md', collect: collectMarkdownAssets },
];

const broken = [];
let checked = 0;
for (const source of sources) {
  const content = await readFile(resolve(ROOT, source.file), 'utf8');
  for (const ref of source.collect(content)) {
    checked += 1;
    if (!(await exists(ref))) broken.push(`${source.file} -> ${ref}`);
  }
}

if (broken.length) {
  console.error(`verify-links: ${broken.length} broken reference(s) in ${checked} checked:`);
  for (const entry of broken) console.error(`  - ${entry}`);
  process.exit(1);
}

console.log(`verify-links: ${checked} local reference(s) resolved across ${sources.length} file(s).`);
