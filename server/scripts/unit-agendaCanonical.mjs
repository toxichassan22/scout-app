import assert from 'node:assert/strict';
import { OFFICIAL_ZONES, OFFICIAL_AGENDA, OFFICIAL_AGENDA_IDS, PERIOD_LABELS, getAgendaStatus } from '../src/agendaCanonical.js';

assert.equal(OFFICIAL_ZONES.length, 8, 'should have 8 zones');
assert.ok(OFFICIAL_ZONES.every(z => z.id && z.numberLabel && z.name), 'zones should have id, numberLabel, and name');

assert.ok(OFFICIAL_AGENDA.length > 0, 'should have agenda items');
assert.equal(OFFICIAL_AGENDA_IDS.length, OFFICIAL_AGENDA.length, 'agenda ids should match agenda length');
assert.deepEqual(new Set(OFFICIAL_AGENDA_IDS).size, OFFICIAL_AGENDA_IDS.length, 'agenda ids should be unique');

assert.ok(Object.keys(PERIOD_LABELS).length > 0, 'period labels should be defined');
const closing = OFFICIAL_AGENDA.find(item => item.title === 'حفل الختام والسمر');
assert.equal(closing?.startTime, '17:30', 'closing should start at 17:30');
assert.equal(closing?.endTime, '20:30', 'closing should end at 20:30');
assert.equal(OFFICIAL_AGENDA.find(item => item.title === 'تجمع واستقبال الوفود')?.zoneId, 'zone-5', 'arrival should be at camp');
assert.equal(OFFICIAL_AGENDA.find(item => item.title === 'تحية العلم وافتتاح المهرجان')?.zoneId, 'zone-5', 'opening should be at camp');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-11')?.title, 'المجال الرياضي', 'sports continuation should use the current title');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-6')?.competitionId, 'comp-schedule-6', 'sports competition should be judgeable');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-23')?.competitionId, 'comp-schedule-23', 'cipher competition should be judgeable');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-18')?.type, 'competition', 'exhibition setup should be a competition');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-29-video')?.type, 'competition', 'documentary video should be a competition');

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
