function isTimeOfDayActive(startTime, endTime, now) {
  if (!startTime || !endTime) return false;
  const startObj = new Date(startTime);
  const endObj = new Date(endTime);
  const startMinutes = startObj.getHours() * 60 + startObj.getMinutes();
  const endMinutes = endObj.getHours() * 60 + endObj.getMinutes();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return endMinutes > startMinutes && nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

function evaluateScheduleState(competition, now) {
  const nowTime = now.getTime();
  const startTime = competition.startsAt ? new Date(competition.startsAt).getTime() : null;
  const endTime = competition.endsAt ? new Date(competition.endsAt).getTime() : null;

  if (startTime && endTime && nowTime >= startTime && nowTime < endTime) return 'active';
  if (startTime && !endTime && nowTime >= startTime) return 'active';
  if (isTimeOfDayActive(startTime, endTime, now)) return 'active';

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


