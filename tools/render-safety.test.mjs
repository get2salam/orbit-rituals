#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainJs = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');

test('ritual list escapes free-text fields before writing them into innerHTML', () => {
  assert.match(mainJs, /<strong>\$\{escapeHtml\(item\.title\)\}<\/strong>/);
  assert.match(mainJs, /<p>\$\{escapeHtml\(item\.note\)\}<\/p>/);
  assert.match(mainJs, /<span>\$\{escapeHtml\(item\.cue\)\}<\/span>/);
});

test('insight cards escape ritual titles and cues before writing them into innerHTML', () => {
  assert.match(mainJs, /<h3>\$\{escapeHtml\(card\.title\)\}<\/h3>/);
  assert.match(mainJs, /<p>\$\{escapeHtml\(card\.body\)\}<\/p>/);
});

test('rhythm panels escape ritual titles and cues before writing them into innerHTML', () => {
  assert.match(mainJs, /<strong>\$\{escapeHtml\(item\.title\)\}<\/strong>\s*\n\s*<span class="pill \$\{toneForDue\(item\)\}">/);
  assert.match(mainJs, /cue: \$\{escapeHtml\(item\.cue\)\}\./);
  assert.match(mainJs, /<strong>\$\{escapeHtml\(strongestStreakTitle\)\}<\/strong>/);
});

test('ritual editor heading escapes the selected ritual title', () => {
  assert.match(mainJs, /<h3>\$\{escapeHtml\(item\.title\)\}<\/h3>/);
});

test('importState rejects malformed backups instead of merging unsafe shapes into state', () => {
  assert.match(mainJs, /if \(!parsed \|\| typeof parsed !== 'object' \|\| Array\.isArray\(parsed\)\)/);
  assert.match(mainJs, /Backup file must contain a JSON object\./);
  assert.match(mainJs, /if \(parsed\.items !== undefined && !Array\.isArray\(parsed\.items\)\)/);
  assert.match(mainJs, /filter\(\(item\) => item && typeof item === 'object'\)/);
});
