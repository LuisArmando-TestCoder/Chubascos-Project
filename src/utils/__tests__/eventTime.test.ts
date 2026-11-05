import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eventInstant, eventDateString, eventStartMs, formatEventDate, isEventPast,
  isDateString, isTimeString, isValidTimeZone, todayIn, wallClockIn, EVENT_GRACE_MS,
} from '../eventTime';

const CR = 'America/Costa_Rica'; // UTC-6, no DST
const NY = 'America/New_York';   // DST

test('eventInstant places wall time in the venue zone', () => {
  assert.equal(eventInstant('2026-11-05', '19:30', CR).toISOString(), '2026-11-06T01:30:00.000Z');
  assert.equal(eventInstant('2026-07-01', '09:00', NY).toISOString(), '2026-07-01T13:00:00.000Z');
  assert.equal(eventInstant('2026-12-01', '09:00', NY).toISOString(), '2026-12-01T14:00:00.000Z');
});

test('DST gap resolves forward and round-trips', () => {
  const i = eventInstant('2026-03-08', '02:30', NY); // 02:30 does not exist
  const w = wallClockIn(i, NY);
  assert.equal(w.hour, 3);
});

test('new events read back the same date the poet picked', () => {
  const day = { seconds: eventInstant('2026-11-05', '21:00', CR).getTime() / 1000 };
  const ev = { day, hour: '21:00', timeZone: CR };
  assert.equal(eventDateString(ev), '2026-11-05');
  assert.equal(formatEventDate(ev), '5 de noviembre de 2026');
});

test('legacy events (UTC midnight, no zone) keep their date and real start', () => {
  const ev = { day: { seconds: Date.UTC(2026, 10, 5) / 1000 }, hour: '19:00' };
  assert.equal(eventDateString(ev), '2026-11-05');
  assert.equal(new Date(eventStartMs(ev)).toISOString(), '2026-11-06T01:00:00.000Z');
  // Old bug: it was "past" from 18:00 CR the day before. Now it is not.
  assert.equal(isEventPast(ev, Date.parse('2026-11-05T12:00:00Z')), false);
  assert.equal(isEventPast(ev, Date.parse('2026-11-06T01:00:00Z') + EVENT_GRACE_MS + 1), true);
});

test('input validators', () => {
  assert.ok(isDateString('2026-02-28'));
  assert.ok(!isDateString('2026-02-30'));
  assert.ok(!isDateString('05/11/2026'));
  assert.ok(isTimeString('00:00') && isTimeString('23:59'));
  assert.ok(!isTimeString('24:00') && !isTimeString('7:00'));
  assert.ok(isValidTimeZone(CR));
  assert.ok(!isValidTimeZone('Mars/Olympus'));
  assert.ok(!isValidTimeZone(42));
});

test('todayIn follows the zone calendar, not UTC', () => {
  assert.equal(todayIn(CR, new Date('2026-11-05T03:00:00Z')), '2026-11-04');
});
