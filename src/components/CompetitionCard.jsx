import { CheckCircle, Clock, Lock, QrCode } from 'lucide-react';

const CompetitionCard = ({ competition, completed, lockedMessage, onScan }) => {
  const duration = competition.duration ? `${Math.round(competition.duration / 60)} دقائق` : 'غير محدد';

  return (
    <article className={`card transition ${competition.isOpen ? 'hover:-translate-y-1 hover:border-signal/35' : 'opacity-75'}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <span
          className={`rounded-lg px-3 py-1 text-xs font-bold ${
            competition.isOpen ? 'border border-primary/25 bg-primary/15 text-emerald-200' : 'border border-rose-400/25 bg-rose-500/10 text-rose-200'
          }`}
        >
          {competition.isOpen ? 'مفتوحة' : 'مغلقة'}
        </span>
        {completed && <CheckCircle className="text-primary-light" size={24} />}
      </div>

      <h3 className="mb-2 text-right text-xl font-black text-slate-50">{competition.name}</h3>
      <div className="mb-5 flex items-center justify-end gap-2 text-sm text-slate-400">
        <span>{duration}</span>
        <Clock size={16} className="text-signal" />
      </div>

      {lockedMessage && <p className="mb-4 rounded-lg border border-accent/20 bg-accent/10 p-3 text-right text-sm font-bold text-accent">{lockedMessage}</p>}

      <button
        type="button"
        disabled={!competition.isOpen || completed}
        onClick={onScan}
        className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
      >
        {completed ? 'تم تسجيل إجابتك' : competition.isOpen ? 'الدخول عبر QR' : 'المسابقة مغلقة حالياً'}
        {competition.isOpen && !completed ? <QrCode size={20} /> : <Lock size={18} />}
      </button>
    </article>
  );
};

export default CompetitionCard;
