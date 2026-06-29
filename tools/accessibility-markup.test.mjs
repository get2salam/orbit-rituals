#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [indexHtml, appCss, mainJs] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles/app.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/main.js', import.meta.url), 'utf8'),
]);

test('dynamic ritual updates have a persistent screen-reader announcer', () => {
  assert.match(indexHtml, /role="status"/);
  assert.match(indexHtml, /aria-live="polite"/);
  assert.match(indexHtml, /data-role="announcer"/);
  assert.match(appCss, /\.sr-only\s*{/);
  assert.match(mainJs, /function announce\(message\)/);
});

test('ritual result buttons expose selection state and descriptive labels', () => {
  assert.match(mainJs, /role', 'listbox'/);
  assert.match(mainJs, /role="option"/);
  assert.match(mainJs, /aria-selected=/);
  assert.match(mainJs, /aria-label="\$\{escapeHtml\(ritualButtonLabel\(item\)\)\}"/);
});

test('range inputs have unique IDs and linked output elements for screen readers', () => {
  assert.match(mainJs, /id="\$\{escapeHtml\(item\.id\)\}-streak"/);
  assert.match(mainJs, /for="\$\{escapeHtml\(item\.id\)\}-streak"/);
  assert.match(mainJs, /id="\$\{escapeHtml\(item\.id\)\}-score"/);
  assert.match(mainJs, /for="\$\{escapeHtml\(item\.id\)\}-score"/);
  assert.match(mainJs, /id="\$\{escapeHtml\(item\.id\)\}-effort"/);
  assert.match(mainJs, /for="\$\{escapeHtml\(item\.id\)\}-effort"/);
});

test('stat cards expose a summary aria-label for screen reader comprehension', () => {
  assert.match(mainJs, /aria-label="\$\{label\}: \$\{valueText\}"/);
});

test('key controls advertise their keyboard shortcuts via aria-keyshortcuts', () => {
  assert.match(indexHtml, /aria-keyshortcuts="n"/);
  assert.match(indexHtml, /aria-keyshortcuts="\/"/);
});
