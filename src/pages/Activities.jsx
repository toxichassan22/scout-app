import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock3, Film, Gamepad2, Play, QrCode, Sparkles, Trophy, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';
import { createActivitySession, finishActivitySession, getColorRound } from '../services/api';
import { getCompetitionBadgeInfo } from '../utils/competitionUtils';

const competitionMeta = {
  genius: { tone: 'ember', label: 'من سيربح الكود — عبقرينو', description: 'بنك أسئلة معرفي سريع، كل إجابة صحيحة بنقطة.' },
  geography: { tone: 'fern', label: 'رحالة العالم الذكي — الجغرافيا', description: 'أسئلة عشوائية ذكية عن عواصم وعملات وأنظمة حكم الدول العربية.' },
  two_truths: { tone: 'violet', label: 'المحقق الذكي — حقيقتان وكذبة', description: 'اكتشف العبارة الكاذبة من بين ثلاث عبارات.' },
};

const toneClasses = {
  ember: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  fern: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
};

function CompetitionCard({ competition, onEnter, index }) {
  const meta = competitionMeta[competition.slug] || { tone: 'violet', label: competition.name, description: competition.description };
  const badgeInfo = getCompetitionBadgeInfo(competition, competition.completed);
  return (
    <motion.article initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className={`min-w-0 overflow-hidden rounded-[2rem] border backdrop-blur-xl ${toneClasses[meta.tone]}`}>
      <div className="flex min-w-0 items-start justify-between gap-4 p-6">
        <div className="min-w-0 text-right">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1 text-[11px] font-black"><span className={`h-2 w-2 rounded-full ${badgeInfo.dotClass}`} />{badgeInfo.text}</span>
          <h2 className="break-words text-xl font-black leading-7 text-white">{meta.label}</h2>
          <p className="mt-2 break-words text-sm leading-7 text-slate-300">{meta.description || competition.description}</p>
        </div>
        <Trophy className="shrink-0 text-amber-300/60" size={28} />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-black/10 p-5 text-right text-xs font-bold text-slate-300"><span>الأسئلة: {competition.questionCount || 50}</span><span>الدرجة: 50 نقطة</span><span>المدة: {competition.duration ? `${Math.ceil(competition.duration / 60)} دقيقة` : 'قابلة للإعداد'}</span><span>الدخول: QR إجباري</span></div>
      <button type="button" onClick={() => onEnter(competition)} className="m-5 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3.5 text-sm font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50" disabled={competition.completed}>{competition.completed ? 'تم تسجيل النتيجة' : <><Play size={17} /> فتح صفحة التفاصيل ومسح QR</>}<ChevronLeft size={17} /></button>
    </motion.article>
  );
}

function ColorHuntGame() {
  const [session, setSession] = useState(null);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(null);
  const [value, setValue] = useState({ r: 120, g: 120, b: 120 });
  const [score, setScore] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    createActivitySession('color-hunter').then(result => {
      if (!active) return null;
      setSession(result.session);
      return getColorRound(result.session.id, 1);
    }).then(result => {
      if (active && result) setTarget(result.target);
    }).catch(error => active && setMessage(error.message || 'تعذر بدء النشاط')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const check = async () => {
    if (!session || !target || score !== null || finished) return;
    try {
      const result = await getColorRound(session.id, round, value);
      setScore(Number(result.score || 0).toFixed(1));
      setTotal(Number(result.total || 0));
    } catch (error) { setMessage(error.message || 'تعذر حفظ الجولة'); }
  };

  const next = async () => {
    if (!session || round >= 10 || finished) return;
    const nextRound = round + 1;
    try {
      setRound(nextRound);
      setValue({ r: 120, g: 120, b: 120 });
      setScore(null);
      const result = await getColorRound(session.id, nextRound);
      setTarget(result.target);
    } catch (error) { setMessage(error.message || 'تعذر بدء الجولة التالية'); }
  };

  const finish = async () => {
    if (!session || finished) return;
    try {
      await finishActivitySession(session.id, total, { rounds: 10 });
      setFinished(true);
      setMessage('انتهت الجولة. شكرًا على اللعب — هذا النشاط للمتعة فقط.');
    } catch (error) { setMessage(error.message || 'تعذر إنهاء النشاط'); }
  };

  return (
    <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-5">
      <div className="mb-4 flex items-center justify-between"><span className="text-xs font-black text-slate-400">جولة {round} من 10</span><Sparkles className="text-amber-300" size={18} /></div>
      {loading && <p className="py-8 text-center text-sm font-bold text-slate-400">جاري تجهيز لون الجولة من السيرفر...</p>}
      {!loading && !target && <p className="py-8 text-center text-sm font-bold text-rose-200">{message || 'تعذر تجهيز النشاط.'}</p>}
      {!loading && target && <>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex justify-center gap-4"><div className="text-center"><div className="h-24 w-24 rounded-2xl border border-white/20" style={{ backgroundColor: `rgb(${value.r},${value.g},${value.b})` }} /><span className="mt-2 block text-xs text-slate-400">لونك</span></div><div className="text-center"><div className="h-24 w-24 rounded-2xl border border-white/20" style={{ backgroundColor: `rgb(${target.r},${target.g},${target.b})` }} /><span className="mt-2 block text-xs text-slate-400">المستهدف</span></div></div>
          <div className="space-y-3" dir="ltr">{['r', 'g', 'b'].map(channel => <input key={channel} aria-label={`قناة ${channel}`} type="range" min="0" max="255" value={value[channel]} onChange={event => setValue(previous => ({ ...previous, [channel]: Number(event.target.value) }))} className="w-full" disabled={score !== null || finished} />)}</div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="text-sm font-black text-emerald-300">{finished ? 'انتهت الجولة' : score !== null ? `مطابقة ${score}% · مجموع المرح` : 'اضبط اللون ثم افحص'}</span><div className="flex gap-2"><button type="button" onClick={check} disabled={score !== null || finished} className="btn-violet !px-4 !py-2 text-xs">فحص</button>{score !== null && round < 10 && <button type="button" onClick={next} disabled={finished} className="btn-ghost !px-4 !py-2 text-xs">الجولة التالية</button>}{score !== null && round === 10 && <button type="button" onClick={finish} disabled={finished} className="btn-ember !px-4 !py-2 text-xs">إنهاء</button>}</div></div>
      </>}
      {message && <p className="mt-4 text-center text-xs font-bold text-slate-300">{message}</p>}
    </div>
  );
}

function EntertainmentCard({ activity, onOpen }) {
  const Icon = activity.icon;
  const isFeatured = activity.featured;
  return (
    <motion.article 
      whileHover={{ y: -4 }} 
      className={`flex min-h-52 flex-col justify-between rounded-3xl border p-5 text-right transition-all ${
        isFeatured 
          ? 'border-cyan-400/50 bg-gradient-to-br from-cyan-950/40 via-teal-950/20 to-black/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:border-cyan-300' 
          : 'border-white/10 bg-black/15 hover:border-cyan-400/30'
      }`}
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${
            isFeatured 
              ? 'border-cyan-400/40 bg-cyan-400/20 text-cyan-200 animate-pulse' 
              : 'border-white/10 bg-white/5 text-cyan-200'
          }`}>
            {isFeatured ? '⚡ ذكاء اصطناعي GPU' : 'نشاط ترفيهي'}
          </span>
          <Icon className={isFeatured ? 'text-cyan-300 animate-pulse' : 'text-cyan-300/80'} size={26} />
        </div>
        <h3 className="text-lg font-black text-white">{activity.title}</h3>
        <p className="mt-2 text-xs leading-6 text-slate-300">{activity.description}</p>
      </div>
      <button 
        type="button" 
        onClick={() => onOpen(activity.path)} 
        className={`mt-5 flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black transition ${
          isFeatured 
            ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-teal-500/30 text-white hover:from-cyan-500/50 hover:to-teal-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
            : 'border-white/10 bg-white/5 text-white hover:border-cyan-300/40 hover:bg-cyan-400/10'
        }`}
      >
        <Play size={15} />
        {activity.action}
        <ChevronLeft size={15} />
      </button>
    </motion.article>
  );
}

const entertainmentActivities = [
  { 
    title: 'استوديو الذكاء الاصطناعي 🎬✨', 
    description: 'توليد فيديوهات سينمائية متحركة (LTX-Video) وصور كشفية فائقة الدقة 8K (FLUX.1-dev) بدعم GPU.', 
    action: 'دخول استوديو الفيديو والصور', 
    path: '/ai-studio', 
    icon: Film,
    featured: true 
  },
  { title: 'Guess the Number', description: 'لعبة جماعية من 3 إلى 10 لاعبين، تعتمد على الأدوار وكشف الأكواد.', action: 'فتح غرفة اللعب', path: '/activities/guess-number', icon: Users },
  { title: 'Easter Egg', description: 'رحلة QR طويلة بمهام صوتية وثقافية وحركية، وتتابعها السواعد ميدانيًا.', action: 'بدء رحلة QR', path: '/activities/easter-egg', icon: QrCode },
];

const Activities = () => {
  const { user } = useAuth();
  const { competitions } = useCompetitions();
  const navigate = useNavigate();
  const official = competitions.filter(competition => ['genius', 'geography', 'two_truths'].includes(competition.slug || competition.type));
  return (
    <main className="page-shell dir-rtl !max-w-6xl">
      <header className="mb-10 text-center"><span className="badge-ember mx-auto mb-4"><Trophy size={13} /> المسابقات والأنشطة</span><h1 className="text-3xl font-black text-white sm:text-4xl">ساحة المخيم الرقمي</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">أهلًا {user?.label || user?.username || 'بفريقك'}. المسابقات الرسمية تؤثر على نتيجة المهرجان، أما الأنشطة هنا فهي للمتعة والتجربة فقط.</p></header>
      <section className="mb-10 grid gap-6 md:grid-cols-2">{official.map((competition, index) => <CompetitionCard key={competition.id} competition={{ ...competition, slug: competition.slug || competition.type }} index={index} onEnter={item => navigate(`/competition-entry/${item.slug}`)} />)}</section>
      <section className="glass-sheen glass-violet p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div className="text-right"><span className="badge-violet mb-3"><Gamepad2 size={13} /> أنشطة ترفيهية</span><h2 className="text-2xl font-black text-white">العب من غير ضغط</h2><p className="mt-2 text-sm leading-7 text-slate-400">لا عملات، لا ترتيب، ولا تأثير على نتيجة المهرجان — مجرد ألعاب وتجارب خفيفة للفريق.</p></div><Clock3 className="text-violet-300/60" size={36} /></div><ColorHuntGame /><div className="mt-6 grid min-w-0 gap-4 md:grid-cols-3">{entertainmentActivities.map(activity => <EntertainmentCard key={activity.path} activity={activity} onOpen={navigate} />)}</div></section>
    </main>
  );
};

export default Activities;

