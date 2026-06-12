#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { bumpDate, cadenceDays, daysFromToday, priority, todayISO } from '../js/ritual-scoring.js';

const BASE_DATE = new Date('2026-04-25T12:00:00Z');

test('date helpers stay deterministic for evaluation fixtures', () => {
  assert.equal(todayISO(0, BASE_DATE), '2026-04-25');
  assert.equal(daysFromToday('2026-04-27', BASE_DATE), 2);
  assert.equal(bumpDate('2026-04-25', cadenceDays('Weekly'), BASE_DATE), '2026-05-02');
  assert.equal(bumpDate('', cadenceDays('Recovery'), BASE_DATE), '2026-04-27');
});

test('priority rewards urgent active rituals without hiding friction', () => {
  const dailyReview = {
    title: 'Morning clarity pass',
    state: 'Active',
    score: 9,
    effort: 2,
    streak: 6,
    nextDue: '2026-04-25',
  };
  const heavyReset = {
    title: 'Monthly reset block',
    state: 'Draft',
    score: 8,
    effort: 8,
    streak: 1,
    nextDue: '2026-05-20',
  };

  assert.equal(priority(dailyReview, { baseDate: BASE_DATE }), 87);
  assert.equal(priority(heavyReset, { baseDate: BASE_DATE }), 21);
  assert.ok(priority(dailyReview, { baseDate: BASE_DATE }) > priority(heavyReset, { baseDate: BASE_DATE }));
});

test('archived rituals lose ranking strength even with a streak', () => {
  const active = { state: 'Active', score: 7, effort: 3, streak: 4, nextDue: '2026-04-26' };
  const archived = { ...active, state: 'Archived', streak: 10 };

  assert.ok(priority(active, { baseDate: BASE_DATE }) > priority(archived, { baseDate: BASE_DATE }));
});
