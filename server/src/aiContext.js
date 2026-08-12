import prisma from './db.js';
import { OFFICIAL_ZONES } from './agendaCanonical.js';
import { OFFICIAL_REPORT_CATALOG } from './reportCatalog.js';
import { getActivityConfig, getCatalogEntry, getEasterEggStages } from './activityService.js';

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
  const [agendaItems, competitions, activities] = await Promise.all([
    prisma.agendaItem.findMany({
      where: { isVisible: true },
      orderBy: [{ order: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      select: { title: true, type: true, period: true, startTime: true, endTime: true, description: true, zoneId: true, locationNote: true, competitionId: true },
    }),
    prisma.competition.findMany({
      orderBy: { createdAt: 'asc' },
      // Never select passcode, entryCode or qrCode: they must not reach the model.
      select: { id: true, slug: true, name: true, type: true, description: true, details: true, isOpen: true, duration: true, criteria: true },
    }),
    prisma.activity.findMany({
      where: { isOpen: true },
      orderBy: { createdAt: 'asc' },
      select: { slug: true, name: true, description: true, isOpen: true, config: true },
    }),
  ]);

  const zoneNameById = new Map(OFFICIAL_ZONES.map(zone => [zone.id, zone.name]));
  const competitionById = new Map(competitions.map(competition => [competition.id, competition]));
  const reportByKey = new Map(OFFICIAL_REPORT_CATALOG.flatMap(report => [[report.id, report], [report.slug, report]]));

  const agendaLines = agendaItems.map(item => {
    const linkedCompetition = competitionById.get(item.competitionId);
    const zone = item.locationNote || zoneNameById.get(item.zoneId) || '';
    const when = [item.startTime, item.endTime].filter(Boolean).join(' - ');
    const title = linkedCompetition?.name || item.title;
    return `- ${title}${when ? ` (${when})` : ''}${zone ? ` — ${zone}` : ''}${item.description ? `: ${truncate(item.description, 160)}` : ''}`;
  });

  const competitionLines = competitions.map(competition => {
    const kind = competition.type === 'manual_judged' ? 'تقييم بمحكم' : 'رقمية تلقائية';
    const state = competition.isOpen ? 'مفتوحة' : 'مغلقة';
    const minutes = competition.duration ? `، المدة ${Math.round(competition.duration / 60)} دقيقة` : '';
    const report = reportByKey.get(competition.id) || reportByKey.get(competition.slug);
    const reportText = report ? `، تقرير رسمي مطلوب ضمن ${report.field}` : '، غير مدرجة في كتالوج التقارير الرسمي';
    let criteria = [];
    try { criteria = JSON.parse(competition.criteria || '[]'); } catch { criteria = []; }
    const criteriaText = criteria.length
      ? `، بنود التقييم: ${criteria.map(item => `${item.label} بحد أقصى ${item.maxScore}`).join('؛ ')}`
      : '';
    return `- ${competition.name} (${kind}، ${state}${minutes}${reportText})${competition.description ? `: ${truncate(competition.description, 160)}` : ''}${competition.details ? ` — ${truncate(competition.details, 220)}` : ''}${criteriaText}`;
  });

  const activityLines = activities.map(activity => {
    const config = getActivityConfig(activity);
    const catalog = getCatalogEntry(activity.slug);
    const state = activity.isOpen ? 'متاح' : 'مغلق';
    const players = catalog ? `، ${catalog.minPlayers} إلى ${catalog.maxPlayers} لاعبين` : '';
    const stages = config.kind === 'easter' ? `، ${getEasterEggStages(activity).length} مراحل QR` : '';
    return `- ${activity.name} (نشاط ترفيهي، ${state}${players}${stages}): ${truncate(activity.description, 180)}. لا يؤثر على نتيجة المسابقات ولا يمنح نقاطًا أو عملات.`;
  });

  return [
    `تاريخ المهرجان: ${process.env.FESTIVAL_DATE || '2026-08-21'}`,
    agendaLines.length ? `\nبرنامج المهرجان:\n${agendaLines.join('\n')}` : '',
    competitionLines.length ? `\nالمسابقات:\n${competitionLines.join('\n')}` : '',
    activityLines.length ? `\nالأنشطة الترفيهية:\n${activityLines.join('\n')}` : '',
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
