import prisma from './db.js';
import { OFFICIAL_AGENDA_IDS, OFFICIAL_ZONES } from './agendaCanonical.js';

// The assistant is told about the festival so it answers from real data instead of
// inventing a schedule. Only publicly visible fields are included: competition
// passcodes, entry codes, QR codes, scores and reports are deliberately excluded.
const CACHE_TTL_MS = Math.max(10_000, Number(process.env.AI_CONTEXT_TTL_MS) || 60_000);
let cache = null;
let cachedAt = 0;

function truncate(text, max) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function buildContext() {
  const [agendaItems, competitions] = await Promise.all([
    prisma.agendaItem.findMany({
      where: { id: { in: OFFICIAL_AGENDA_IDS }, isVisible: true },
      orderBy: [{ order: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      select: { title: true, type: true, period: true, startTime: true, endTime: true, description: true, zoneId: true },
    }),
    prisma.competition.findMany({
      orderBy: { createdAt: 'asc' },
      // Never select passcode, entryCode or qrCode: they must not reach the model.
      select: { name: true, type: true, description: true, isOpen: true, duration: true },
    }),
  ]);

  const zoneNameById = new Map(OFFICIAL_ZONES.map(zone => [zone.id, zone.name]));

  const agendaLines = agendaItems.map(item => {
    const zone = zoneNameById.get(item.zoneId) || '';
    const when = [item.startTime, item.endTime].filter(Boolean).join(' - ');
    return `- ${item.title}${when ? ` (${when})` : ''}${zone ? ` — ${zone}` : ''}${item.description ? `: ${truncate(item.description, 160)}` : ''}`;
  });

  const competitionLines = competitions.map(competition => {
    const kind = competition.type === 'manual_judged' ? 'تقييم بمحكم' : 'رقمية تلقائية';
    const state = competition.isOpen ? 'مفتوحة' : 'مغلقة';
    const minutes = competition.duration ? `، المدة ${Math.round(competition.duration / 60)} دقيقة` : '';
    return `- ${competition.name} (${kind}، ${state}${minutes})${competition.description ? `: ${truncate(competition.description, 160)}` : ''}`;
  });

  return [
    `تاريخ المهرجان: ${process.env.FESTIVAL_DATE || '2026-08-21'}`,
    agendaLines.length ? `\nبرنامج المهرجان:\n${agendaLines.join('\n')}` : '',
    competitionLines.length ? `\nالمسابقات:\n${competitionLines.join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

export async function getFestivalContext() {
  if (cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;
  cache = await buildContext();
  cachedAt = Date.now();
  return cache;
}

export function clearFestivalContextCache() {
  cache = null;
  cachedAt = 0;
}
