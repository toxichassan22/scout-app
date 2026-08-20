import assert from 'node:assert/strict';
import { OFFICIAL_ZONES, OFFICIAL_AGENDA, OFFICIAL_AGENDA_IDS, PERIOD_LABELS, getAgendaStatus } from '../src/agendaCanonical.js';

assert.equal(OFFICIAL_ZONES.length, 8, 'should have 8 zones');
assert.ok(OFFICIAL_ZONES.every(z => z.id && z.numberLabel && z.name), 'zones should have id, numberLabel, and name');

assert.equal(OFFICIAL_AGENDA.length, 30, 'final program should contain 30 agenda items');
assert.equal(OFFICIAL_AGENDA_IDS.length, OFFICIAL_AGENDA.length, 'agenda ids should match agenda length');
assert.deepEqual(new Set(OFFICIAL_AGENDA_IDS).size, OFFICIAL_AGENDA_IDS.length, 'agenda ids should be unique');

assert.ok(Object.keys(PERIOD_LABELS).length > 0, 'period labels should be defined');
const closing = OFFICIAL_AGENDA.find(item => item.title === 'حفل الختام والسمر');
assert.equal(closing?.startTime, '17:30', 'closing should start at 17:30');
assert.equal(closing?.endTime, '20:30', 'closing should end at 20:30');
assert.equal(OFFICIAL_AGENDA.find(item => item.title === 'تجمع واستقبال الوفود')?.zoneId, 'zone-5', 'arrival should be at camp');
assert.equal(OFFICIAL_AGENDA.find(item => item.title === 'تحية العلم وافتتاح المهرجان')?.zoneId, 'zone-5', 'opening should be at camp');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-11')?.title, 'تكملة المجال الرياضي', 'sports continuation should use the final title');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-6')?.competitionId, 'comp-schedule-6', 'sports competition should be judgeable');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-11')?.startTime, '11:30', 'sports continuation should start at 11:30');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-16')?.startTime, '13:00', 'Friday prayer should start at 13:00');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-10')?.competitionId, 'comp-report-catalog-17', 'knots should have a unique competition');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-23')?.competitionId, 'comp-schedule-23', 'cipher competition should be judgeable');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-18')?.startTime, '15:00', 'exhibition setup should start at 15:00');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-24')?.startTime, '15:00', 'earth magazine should start at 15:00');
assert.equal(OFFICIAL_AGENDA.find(item => item.id === 'agenda-official-29-video')?.title, 'الاستعداد للختام', 'closing preparation should replace documentary video');

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
