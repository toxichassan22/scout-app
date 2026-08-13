/**
 * Utility functions for competition states, status text, and visual badges.
 */

export function getCompetitionStateKey(competition) {
  if (!competition) return 'closed';
  if (competition.state) return competition.state;
  if (competition.isOpen) return 'active';
  return 'closed';
}

export function isCompetitionActive(competition) {
  const state = getCompetitionStateKey(competition);
  return state === 'active' || Boolean(competition?.isOpen);
}

export function getCompetitionStatusText(competition) {
  const state = getCompetitionStateKey(competition);
  if (state === 'active') return 'مفتوحة الآن';
  if (state === 'scheduled') return 'تبدأ في الموعد المحدد';
  return 'مغلقة من الإدارة';
}

export function getCompetitionBadgeInfo(competition, completed = false) {
  if (completed) {
    return {
      text: 'مكتملة',
      dotClass: 'bg-emerald-400',
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }

  const state = getCompetitionStateKey(competition);
  if (state === 'active') {
    return {
      text: 'مفتوحة الآن',
      dotClass: 'animate-pulse bg-emerald-400',
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }

  if (state === 'scheduled') {
    return {
      text: 'تبدأ في الموعد المحدد',
      dotClass: 'bg-amber-400',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    };
  }

  return {
    text: 'مغلقة من الإدارة',
    dotClass: 'bg-slate-500',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  };
}
