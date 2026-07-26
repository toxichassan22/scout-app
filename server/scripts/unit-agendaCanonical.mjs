import assert from 'node:assert/strict';
import { OFFICIAL_ZONES, OFFICIAL_AGENDA, OFFICIAL_AGENDA_IDS, PERIOD_LABELS, getAgendaStatus } from '../src/agendaCanonical.js';

assert.equal(OFFICIAL_ZONES.length, 8, 'should have 8 zones');
assert.ok(OFFICIAL_ZONES.every(z => z.id && z.numberLabel && z.name), 'zones should have id, numberLabel, and name');

assert.ok(OFFICIAL_AGENDA.length > 0, 'should have agenda items');
assert.equal(OFFICIAL_AGENDA_IDS.length, OFFICIAL_AGENDA.length, 'agenda ids should match agenda length');
assert.deepEqual(new Set(OFFICIAL_AGENDA_IDS).size, OFFICIAL_AGENDA_IDS.length, 'agenda ids should be unique');

assert.ok(Object.keys(PERIOD_LABELS).length > 0, 'period labels should be defined');

const sampleItem = OFFICIAL_AGENDA[0];
const festivalDate = '2026-08-21';

const beforeStart = new Date(`${festivalDate}T07:00:00+03:00`);
assert.equal(getAgendaStatus(sampleItem, beforeStart, festivalDate), 'upcoming', 'item before start is upcoming');

const during = new Date(`${festivalDate}T08:30:00+03:00`);
assert.equal(getAgendaStatus(sampleItem, during, festivalDate), 'active', 'item during time is active');

const afterEnd = new Date(`${festivalDate}T10:00:00+03:00`);
assert.equal(getAgendaStatus(sampleItem, afterEnd, festivalDate), 'finished', 'item after end is finished');

const closedItem = { ...sampleItem, isClosed: true };
assert.equal(getAgendaStatus(closedItem, beforeStart, festivalDate), 'finished', 'closed item is finished');

console.log('agendaCanonical unit tests passed');
