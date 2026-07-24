import { ArrowRight, CheckCircle, Clock, Lock, RadioTower, Trophy } from 'lucide-react';

const BADGES = {
  genius: { icon: RadioTower, code: '1001' },
  two_truths: { icon: Trophy, code: '1002' },
  geography: { icon: Trophy, code: '1003' },
  video: { icon: RadioTower, code: '1234' },
};

const CompetitionCard = ({ competition, completed, lockedMessage, onScan }) => {
  const duration = competition.duration ? `${Math.round(competition.duration / 60)} دقائق` : 'غير محدد';
  const isOpen = competition.isOpen && !completed;
  const badge = BADGES[competition.type] || BADGES.genius;
  const Icon = badge.icon;

  return (
    <article className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5 transition duration-300 ${!competition.isOpen ? 'opacity-60' : 'hover:border-white/10'}`}>

      <div className="mb-4 flex items-start justify-between gap-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
          completed
            ? 'border-primary/20 text-primary bg-primary/10'
            : competition.isOpen
              ? 'border-primary/20 text-primary bg-primary/10'
              : 'border-red-500/20 text-red-400 bg-red-500/10'
        }`}>
          {completed ? 'مكتملة' : competition.isOpen ? 'مفتوحة' : 'مغلقة'}
        </span>
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-400">
            <Icon size={20} />
          </div>
          <span className="absolute -bottom-1.5 -left-1.5 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400 ring-1 ring-amber-400/20">
            {competition.passcode || badge.code}
          </span>
        </div>
      </div>

      <h3 className="mb-2 text-right text-xl font-bold text-white">{competition.name}</h3>
      <div className="mb-4 flex items-center justify-end gap-2 text-sm text-slate-500">
        <span>{duration}</span>
        <Clock size={14} />
      </div>

      {lockedMessage && (
        <p className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/15 p-3 text-right text-sm font-medium text-amber-400">
          {lockedMessage}
        </p>
      )}

      <button
        type="button"
        disabled={!competition.isOpen || completed}
        onClick={onScan}
        className="command-button flex w-full items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {completed ? 'تم تسجيل إجابتك' : competition.isOpen ? 'الدخول للتحدي' : 'التحدي مغلق حالياً'}
        {competition.isOpen && !completed ? <ArrowRight size={18} /> : completed ? <CheckCircle size={16} /> : <Lock size={16} />}
      </button>
    </article>
  );
};

export default CompetitionCard;
