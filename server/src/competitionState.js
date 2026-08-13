function evaluateScheduleState(competition, now) {
  const nowTime = now.getTime();
  const startTime = competition.startsAt ? new Date(competition.startsAt).getTime() : null;
  const endTime = competition.endsAt ? new Date(competition.endsAt).getTime() : null;

  if (startTime && endTime && nowTime >= startTime && nowTime < endTime) return 'active';
  if (startTime && !endTime && nowTime >= startTime) return 'active';

  if (startTime && nowTime < startTime) return 'scheduled';
  if (endTime && nowTime >= endTime) return 'closed';

  return 'closed';
}

export function getCompetitionState(competition, now = new Date()) {
  if (!competition) return 'missing';

  // Manual admin override: if Admin turned ON isOpen (مفتوحة الآن), it is ALWAYS active.
  if (competition.isOpen) return 'active';

  // Automatic schedule check when isOpen is false
  if (competition.startsAt || competition.endsAt) {
    return evaluateScheduleState(competition, now);
  }

  return 'closed';
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


