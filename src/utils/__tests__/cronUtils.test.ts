import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCron, buildMultiNthWeekdayCron, cronToHuman, getNextOccurrenceFromCron,
  isSupportedCron, listOccurrences, parseMultiNthWeekdayCron,
} from '../cronUtils';

const CR = 'America/Costa_Rica';

test('weekly next occurrence lands at venue wall time, not server time', () => {
  // Thursday 2026-11-05 12:00 CR (18:00Z). Saturdays at 19:00 CR.
  const next = getNextOccurrenceFromCron('0 19 * * 6', new Date('2026-11-05T18:00:00Z'), CR)!;
  assert.equal(next.toISOString(), '2026-11-08T01:00:00.000Z'); // Sat 7 Nov 19:00 CR
});

test('same-day occurrence is used only if still ahead', () => {
  const thu = '0 19 * * 4';
  assert.equal(getNextOccurrenceFromCron(thu, new Date('2026-11-05T18:00:00Z'), CR)!.toISOString(), '2026-11-06T01:00:00.000Z');
  assert.equal(getNextOccurrenceFromCron(thu, new Date('2026-11-06T01:00:00Z'), CR)!.toISOString(), '2026-11-13T01:00:00.000Z');
});

test('monthly nth weekday, including rollover to next month', () => {
  // 1st Friday 20:00. From 2026-11-07 (after 1st Fri = Nov 6) → Dec 4.
  const cron = buildMultiNthWeekdayCron([1], 5, '20:00');
  const next = getNextOccurrenceFromCron(cron, new Date('2026-11-07T03:00:00Z'), CR)!; // just after Fri 6 Nov 20:00 CR
  assert.equal(next.toISOString(), '2026-12-05T02:00:00.000Z');
});

test('multi nth picks the soonest', () => {
  const cron = buildMultiNthWeekdayCron([3, 1], 1, '18:00'); // 1st & 3rd Monday
  assert.equal(cron, '0 18 1-7 * 1|0 18 15-21 * 1');
  const dates = listOccurrences(cron, 3, new Date('2026-11-01T00:00:00Z'), CR).map((d) => d.toISOString().slice(0, 10));
  assert.deepEqual(dates, ['2026-11-03', '2026-11-17', '2026-12-08']); // UTC dates (CR evening = next UTC day)
});

test('buildCron does not mutate its input and dedupes', () => {
  const days = [5, 1, 1];
  assert.equal(buildCron(days, '19:05'), '5 19 * * 1,5');
  assert.deepEqual(days, [5, 1, 1]);
});

test('only buildable schedules are supported', () => {
  assert.ok(isSupportedCron('0 19 * * 6'));
  assert.ok(isSupportedCron('30 7 * * 1,3,5'));
  assert.ok(isSupportedCron('0 20 1-7 * 5|0 20 15-21 * 5'));
  assert.ok(!isSupportedCron('*/5 * * * *'));
  assert.ok(!isSupportedCron('0 19 * * 7'));
  assert.ok(!isSupportedCron('0 25 * * 1'));
  assert.ok(!isSupportedCron('0 20 1-7 * 5|0 21 15-21 * 5')); // mixed times
  assert.ok(!isSupportedCron(''));
  assert.equal(getNextOccurrenceFromCron('garbage'), null);
});

test('human text', () => {
  assert.equal(cronToHuman('0 19 * * 6'), 'Cada sábado a las 19:00');
  assert.equal(cronToHuman('0 19 * * 0,1,3'), 'Cada lunes, miércoles y domingo a las 19:00');
  assert.equal(cronToHuman('0 20 1-7 * 5|0 20 15-21 * 5'), 'Cada primer y tercer viernes del mes a las 20:00');
  assert.deepEqual(parseMultiNthWeekdayCron('0 20 1-7 * 5|0 20 15-21 * 5'), { nths: [1, 3], dayOfWeek: 5, time: '20:00' });
});
