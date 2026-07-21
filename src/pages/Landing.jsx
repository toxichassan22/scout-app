import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BrainCircuit,
  Calendar,
  ChevronDown,
  Flame,
  LogIn,
  MapPin,
  Radio,
  ShieldAlert,
  ShieldCheck,
  TreePine,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { FESTIVAL_DETAILS, MOCK_COMPETITIONS, MOCK_TEAMS } from '../data/mockData';
import Countdown from '../components/Countdown';

/* ─── Simulated live pulses (UI only) ─── */
const LIVE_EVENTS = [
  { icon: Users, text: 'الفريق الثالث انضم إلى ساحة التحديات', color: 'text-emerald-400' },
  { icon: Trophy, text: 'نقاط جديدة سُجلت في تحدي عبقرينو', color: 'text-amber-400' },
  { icon: BrainCircuit, text: 'مختبر الذكاء الاصطناعي يستقبل فكرة فيديو جديدة', color: 'text-emerald-300' },
  { icon: Flame, text: 'اشتعلت المنافسة في مسابقة حقيقتين وكذبة', color: 'text-amber-400' },
  { icon: MapPin, text: 'فرقة استكشاف وصلت إلى زون الساحة الرقمية', color: 'text-emerald-400' },
  { icon: Zap, text: 'لوحة القيادة تحدثت لحظياً بترتيب الفرق', color: 'text-emerald-300' },
];

const TICKER_ITEMS = [
  'كشفية بفكر ديجيتال',
  'تحديات رقمية مباشرة',
  ...MOCK_COMPETITIONS.map((c) => `مسابقة ${c.name}`),
  'مختبر ذكاء اصطناعي',
  'نتائج لحظة بلحظة',
  'روح المعسكر × قوة التقنية',
];

/* ─── Count-up hook for stats ─── */
const useCountUp = (target, duration = 1400, start = false) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
};

/* ─── Scroll reveal hook ─── */
const useReveal = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const Reveal = ({ children, delay = 0, className = '' }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ─── Live activity feed ─── */
const LiveFeed = () => {
  const [items, setItems] = useState(() => LIVE_EVENTS.slice(0, 3).map((e, i) => ({ ...e, key: i })));
  const counter = useRef(3);

  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => {
        const next = LIVE_EVENTS[counter.current % LIVE_EVENTS.length];
        const item = { ...next, key: counter.current };
        counter.current += 1;
        return [item, ...prev].slice(0, 3);
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div
          key={item.key}
          className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-right ${idx === 0 ? 'feed-in border-emerald-500/20' : ''}`}
          style={{ opacity: 1 - idx * 0.28 }}
        >
          <span className="inline-flex rounded-lg bg-white/5 p-2 shrink-0">
            <item.icon size={16} className={item.color} />
          </span>
          <p className="text-sm text-slate-300 leading-6">{item.text}</p>
          {idx === 0 && (
            <span className="mr-auto shrink-0 h-2 w-2 rounded-full bg-emerald-400 live-dot" />
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── Live leaderboard preview (simulated) ─── */
const LiveBoard = () => {
  const [scores, setScores] = useState(() =>
    MOCK_TEAMS.map((name, i) => ({ name, pts: 320 - i * 45 }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setScores((prev) =>
        [...prev]
          .map((t) => ({ ...t, pts: t.pts + Math.floor(Math.random() * 12) }))
          .sort((a, b) => b.pts - a.pts)
      );
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const max = scores[0]?.pts || 1;

  return (
    <div className="space-y-3">
      {scores.slice(0, 4).map((team, i) => (
        <div key={team.name} className="text-right">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono tabular-nums text-emerald-400 font-bold">{team.pts}</span>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              {team.name}
              {i === 0 && <Flame size={12} className="text-amber-400 flame-flicker" />}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden" dir="rtl">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${i === 0 ? 'bg-gradient-to-l from-amber-500 to-emerald-500' : 'bg-emerald-600/60'}`}
              style={{ width: `${(team.pts / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-slate-600 pt-1 flex items-center justify-end gap-1.5">
        يتحدث الترتيب تلقائياً أثناء المنافسات
        <Activity size={11} className="text-emerald-500" />
      </p>
    </div>
  );
};

/* ─── Stats with count-up ─── */
const StatsBar = () => {
  const [ref, visible] = useReveal();
  const comps = useCountUp(MOCK_COMPETITIONS.length, 1200, visible);
  const teams = useCountUp(MOCK_TEAMS.length, 1400, visible);

  const stats = [
    { icon: Trophy, value: comps, label: 'تحديات رقمية', color: 'text-amber-400', border: 'hover:border-amber-400/25' },
    { icon: Users, value: teams, label: 'فرق مشاركة', color: 'text-emerald-400', border: 'hover:border-emerald-400/25' },
    { icon: BrainCircuit, value: 'AI', label: 'مختبر ذكي', color: 'text-emerald-300', border: 'hover:border-emerald-300/25' },
  ];

  return (
    <div ref={ref} className={`reveal ${visible ? 'reveal-visible' : ''} grid grid-cols-3 gap-4 sm:gap-6`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 text-center transition duration-300 hover:bg-white/[0.04] hover:-translate-y-1 ${stat.border}`}
        >
          <div className="inline-flex rounded-xl p-3 mb-3 bg-white/5">
            <stat.icon size={22} className={stat.color} />
          </div>
          <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

const Landing = () => {
  // Floating campfire sparks
  const sparks = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 2}px`,
      delay: `${Math.random() * 8}s`,
      duration: `${Math.random() * 8 + 6}s`,
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0f0a] relative overflow-hidden">

      {/* Floating Campfire Sparks / Fireflies */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: spark.left,
              bottom: '-20px',
              width: spark.size,
              height: spark.size,
              backgroundColor: '#f59e0b',
              boxShadow: '0 0 8px #f59e0b, 0 0 16px #d97706',
              opacity: 0,
              animation: `floatUp ${spark.duration} infinite ease-in-out`,
              animationDelay: spark.delay,
            }}
          />
        ))}
      </div>

      {/* ══════════ LIVE TICKER — top strip ══════════ */}
      <div className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.06] bg-[#0a0f0a]/85 backdrop-blur-xl">
        <div className="flex items-stretch">
          <div className="flex items-center gap-2 shrink-0 px-4 py-2 border-l border-white/[0.08] bg-emerald-500/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot" />
            <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
              <Radio size={12} />
              مباشر
            </span>
          </div>
          <div className="overflow-hidden flex-1" dir="ltr">
            <div className="ticker-track items-center py-2">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="flex items-center gap-2 px-5 text-[11px] font-bold text-slate-400 whitespace-nowrap" dir="rtl">
                  <Zap size={10} className="text-amber-500/70 shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ HERO — Full bleed image + overlay ══════════ */}
      <section className="relative min-h-screen flex items-end overflow-hidden">
        {/* Background image with slow cinematic zoom */}
        <img
          src="/brand/hero-arena.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none hero-kenburns"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0a] via-[#0a0f0a]/70 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#0a0f0a] to-transparent" />

        {/* Breathing fire glow behind content */}
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full fire-glow pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.18) 0%, transparent 70%)' }}
        />

        {/* Top bar — logo + badges */}
        <div className="absolute top-12 inset-x-0 z-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-6 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80">
              <Flame size={12} className="text-amber-400 flame-flicker" />
              {FESTIVAL_DETAILS.subtitle}
            </span>
            <div className="h-12 w-12 rounded-xl border border-white/15 bg-black/40 backdrop-blur-md p-1.5 overflow-hidden">
              <img src={FESTIVAL_DETAILS.logo} alt="شعار" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-20 w-full">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-14 sm:pb-20">
            <div className="max-w-2xl mr-auto text-right">
              {/* Live status pill */}
              <div className="flex justify-end mb-4 animate-fade-in">
                <span className="relative inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 backdrop-blur-md px-4 py-1.5 text-xs font-black text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 radar-ring" />
                    <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  المعسكر يستعد للانطلاق
                </span>
              </div>

              <h1 className="text-5xl sm:text-7xl font-bold text-white leading-[1.1] mb-4 drop-shadow-lg animate-fade-in">
                {FESTIVAL_DETAILS.name}
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-amber-400 mb-4 drop-shadow ember-text animate-fade-in" style={{ animationDelay: '0.1s' }}>
                ساحة كشفية ذكية للمنافسة والإبداع
              </p>
              <p className="text-slate-300/90 text-base sm:text-lg leading-8 mb-8 max-w-lg drop-shadow animate-fade-in" style={{ animationDelay: '0.2s' }}>
                تجربة تجمع روح الكشافة مع تحديات مباشرة، بث أخبار، ولوحة قيادة مصممة للمنافسة الحقيقية.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 justify-end mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Link
                  to="/home"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white transition hover:brightness-110 active:scale-[0.97] cta-glow"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <LogIn size={19} />
                  دخول الفرق
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 backdrop-blur-md px-7 py-3.5 text-base font-bold text-amber-400 transition active:scale-[0.97]"
                >
                  <ShieldAlert size={19} />
                  الدعم والإعطال
                </Link>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-7 py-3.5 text-base font-bold text-white/90 transition hover:bg-white/10 active:scale-[0.97]"
                >
                  <ShieldCheck size={19} />
                  لوحة الأدمن
                </Link>
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 justify-end animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <span className="flex items-center gap-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs text-white/70">
                  <Calendar size={13} className="text-amber-400/80" />
                  {FESTIVAL_DETAILS.startDateLabel}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs text-white/70">
                  <MapPin size={13} className="text-emerald-400/80" />
                  {FESTIVAL_DETAILS.location}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 scroll-hint">
          <ChevronDown size={22} className="text-white/40" />
        </div>
      </section>

      {/* ══════════ COUNTDOWN ══════════ */}
      <section className="relative -mt-2 z-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <Reveal>
            <div className="rounded-2xl border border-white/[0.08] bg-[#111a11]/90 backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-emerald-500/60 to-transparent" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 live-dot" />
                انطلاق المخيم خلال
              </p>
              <Countdown targetDate={FESTIVAL_DETAILS.startDate} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section className="py-12 sm:py-16 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <StatsBar />
        </div>
      </section>

      {/* ══════════ LIVE PULSE — feed + leaderboard ══════════ */}
      <section className="pb-16 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-black text-emerald-400 mb-4">
                <Activity size={13} />
                نبض المخيم
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-balance">كل شيء يحدث هنا... مباشرة</h2>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            <Reveal delay={100}>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0c130c]/80 p-5 sm:p-6 h-full">
                <h3 className="text-sm font-black text-white mb-4 flex items-center justify-end gap-2">
                  تدفق الأحداث
                  <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot" />
                </h3>
                <LiveFeed />
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0c130c]/80 p-5 sm:p-6 h-full">
                <h3 className="text-sm font-black text-white mb-4 flex items-center justify-end gap-2">
                  ترتيب الفرق التجريبي
                  <Trophy size={14} className="text-amber-400" />
                </h3>
                <LiveBoard />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="pb-20 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">ما الذي ينتظرك؟</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">كل ما تحتاجه لتجربة كشفية رقمية مميزة في مكان واحد</p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: 'تحديات ومسابقات',
                desc: 'مسابقات رقمية متنوعة تشمل الذكاء والجغرافيا والمعرفة العامة بنظام نقاط مباشر.',
                color: 'text-amber-400',
                border: 'hover:border-amber-400/25',
              },
              {
                icon: BrainCircuit,
                title: 'مختبر الذكاء الاصطناعي',
                desc: 'أنشئ فيديوهات احترافية بالذكاء الاصطناعي من وصف نصي بسيط.',
                color: 'text-emerald-400',
                border: 'hover:border-emerald-400/25',
              },
              {
                icon: Zap,
                title: 'نتائج لحظية',
                desc: 'تابع ترتيب الفرق والنتائج لحظة بلحظة من لوحة القيادة.',
                color: 'text-emerald-300',
                border: 'hover:border-emerald-300/25',
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 120}>
                <div className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-right transition duration-300 h-full hover:bg-white/[0.04] hover:-translate-y-1 ${feature.border}`}>
                  <div className="inline-flex rounded-xl p-3 mb-4 bg-white/5 group-hover:scale-110 transition-transform">
                    <feature.icon size={24} className={feature.color} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-7">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ LOCATION DETAILS ══════════ */}
      <section className="pb-20 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c130c]/90 p-6 sm:p-8 text-right shadow-2xl">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-3 flex items-center justify-end gap-2">
                مقر وموقع المعسكر
                <MapPin size={22} className="text-emerald-500" />
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-7">
                يقام المهرجان الكشفي الرقمي في مقر <strong>مركز شباب منشية التحرير بالقاهرة</strong>. استكشف معلومات الوصول وموقع المعسكر التفاعلي.
              </p>

              <div className="grid gap-6 md:grid-cols-2 items-center">
                {/* Location details list */}
                <div className="space-y-4 text-right">
                  <div className="rounded-xl bg-white/[0.01] border border-white/[0.04] p-4">
                    <h3 className="font-extrabold text-white text-sm mb-1">العنوان بالتفصيل</h3>
                    <p className="text-xs text-slate-400 leading-5">شارع منشية التحرير، عين شمس الشرقية، محافظة القاهرة، جمهورية مصر العربية.</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.01] border border-white/[0.04] p-4">
                    <h3 className="font-extrabold text-white text-sm mb-1">وسائل الوصول المقترحة</h3>
                    <p className="text-xs text-slate-400 leading-5">مترو الأنفاق الخط الأول (محطة عين شمس) ثم استقلال ميكروباص باتجاه منشية التحرير، أو بالسيارة عبر محور جسر السويس.</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.01] border border-white/[0.04] p-4">
                    <h3 className="font-extrabold text-white text-sm mb-1">المنطقة الجغرافية للمعسكر</h3>
                    <p className="text-xs text-slate-400 leading-5">مقسم إلى 4 زونات رئيسية (منطقة الابتكار، الساحة الرقمية، مختبر الكومبيوتر، ساحة التحديات الكشفية).</p>
                  </div>
                </div>

                {/* Mock Map Preview Graphic */}
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 p-4 h-60 flex flex-col justify-between relative shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 space-y-2">
                    <div className="relative h-10 w-10 mx-auto">
                      <span className="absolute inset-0 rounded-full bg-emerald-500 radar-ring" />
                      <div className="relative h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 font-black shadow-glow-green">
                        <MapPin size={20} />
                      </div>
                    </div>
                    <p className="text-xs font-black text-white">مركز شباب منشية التحرير</p>
                    <p className="text-[10px] text-slate-500 font-mono">30.1287° N, 31.3621° E</p>
                  </div>

                  <div className="flex justify-between items-center z-10 w-full">
                    <span className="text-[10px] font-mono text-slate-500">ZOOM: 16x</span>
                    <span className="text-[10px] font-mono text-slate-500">CAIRO - EGYPT</span>
                  </div>
                  <div className="flex justify-end z-10 w-full mt-auto">
                    <a
                      href="https://maps.google.com/?q=Young+Mansheya+Center+Cairo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 hover:shadow-glow-green transition"
                    >
                      عرض في خرائط جوجل
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-white/[0.06] py-8 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 p-1 overflow-hidden">
              <img src={FESTIVAL_DETAILS.logo} alt="" className="h-full w-full object-contain" />
            </div>
            <span className="text-xs text-slate-600">{FESTIVAL_DETAILS.name} • {FESTIVAL_DETAILS.startDateLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition">
              الإبلاغ عن أعطال (المطور)
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <TreePine size={13} className="text-emerald-600" />
              {FESTIVAL_DETAILS.slogan}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Landing;
