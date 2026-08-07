export function getCompetitionState(competition, now = new Date()) {
  if (!competition) return 'missing';
  if (!competition.isOpen) return 'closed';
  if (competition.startsAt && now < new Date(competition.startsAt)) return 'scheduled';
  if (competition.endsAt && now >= new Date(competition.endsAt)) return 'closed';
  return 'active';
}

export function canStartCompetition(competition, now = new Date()) {
  return getCompetitionState(competition, now) === 'active';
}

export function publicCompetitionSchedule(competition, now = new Date()) {
  const state = getCompetitionState(competition, now);
  return {
    state,
    canStart: state === 'active',
    startsAt: competition.startsAt,
    endsAt: competition.endsAt,
  };
}
