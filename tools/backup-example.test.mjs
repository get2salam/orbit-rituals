#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bumpDate, cadenceDays, priority } from '../js/ritual-scoring.js';

const backup = JSON.parse(await readFile(new URL('../docs/sample-backup.json', import.meta.url), 'utf8'));
const BASE_DATE = new Date('2026-04-25T12:00:00Z');
const ALLOWED_CATEGORIES = new Set(['Daily', 'Weekly', 'Monthly', 'Recovery']);
const ALLOWED_STATES = new Set(['Draft', 'Active', 'Needs work', 'Archived']);
const REQUIRED_ITEM_FIELDS = ['title', 'category', 'state', 'score', 'effort', 'streak', 'duration', 'cue', 'lastDone', 'nextDue', 'note'];

function assertImportableItem(item) {
  for (const field of REQUIRED_ITEM_FIELDS) {
    assert.notEqual(item[field], undefined, `${item.title || 'ritual'} is missing ${field}`);
  }

  assert.ok(ALLOWED_CATEGORIES.has(item.category), `${item.title} uses a supported category`);
  assert.ok(ALLOWED_STATES.has(item.state), `${item.title} uses a supported state`);
  assert.match(item.lastDone, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(item.nextDue, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isInteger(item.score) && item.score >= 1 && item.score <= 10);
  assert.ok(Number.isInteger(item.effort) && item.effort >= 1 && item.effort <= 5);
  assert.ok(Number.isInteger(item.duration) && item.duration >= 5);
}

test('sample backup documents an importable launch-week board', () => {
  assert.equal(backup.schema, 'orbit-rituals/v2');
  assert.match(backup.boardTitle, /Launch week/);
  assert.ok(Array.isArray(backup.items));
  assert.equal(backup.items.length, 3);
  backup.items.forEach(assertImportableItem);
});

test('sample backup next-due dates match each ritual cadence', () => {
  for (const item of backup.items) {
    assert.equal(item.nextDue, bumpDate(item.lastDone, cadenceDays(item.category)), `${item.title} has a cadence-aligned nextDue`);
  }
});

test('sample backup produces a stable top ritual in the priority queue', () => {
  const [top] = [...backup.items].sort((a, b) => priority(b, { baseDate: BASE_DATE }) - priority(a, { baseDate: BASE_DATE }));
  assert.equal(top.title, 'Daily launch triage');
});
