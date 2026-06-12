import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Calendar, Compass, LogIn, MapPin, ShieldCheck, Trophy, Users, Flame, TreePine, Zap, ShieldAlert } from 'lucide-react';
import { FESTIVAL_DETAILS, MOCK_COMPETITIONS, MOCK_TEAMS } from '../data/mockData';
import Countdown from '../components/Countdown';

const Landing = () => {
  // Generate random floating campfire sparks
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

      {/* ══════════ HERO — Full bleed image + overlay ══════════ */}
      <section className="relative min-h-screen flex items-end overflow-hidden">
        {/* Background image */}
        <img
          src="/brand/hero-arena.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
        {/* Gradient overlay — dark bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0a] via-[#0a0f0a]/70 to-transparent" />
        {/* Extra darkness at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#0a0f0a] to-transparent" />

        {/* Top bar — logo + badges */}
        <div className="absolute top-0 inset-x-0 z-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80">
                <Flame size={12} className="text-amber-400" />
                {FESTIVAL_DETAILS.subtitle}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl border border-white/15 bg-black/40 backdrop-blur-md p-1.5 overflow-hidden">
              <img src={FESTIVAL_DETAILS.logo} alt="شعار" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-20 w-full">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-10 sm:pb-16">
            <div className="max-w-2xl mr-auto text-right">
              <h1 className="text-5xl sm:text-7xl font-bold text-gradient leading-[1.2] mb-4 pb-1 animate-fade-in">
                {FESTIVAL_DETAILS.name}
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-amber-400 mb-4 drop-shadow animate-fade-in" style={{ animationDelay: '0.1s' }}>
                ساحة كشفية ذكية للمنافسة والإبداع
              </p>
              <p className="text-slate-300/90 text-base sm:text-lg leading-8 mb-8 max-w-lg drop-shadow animate-fade-in" style={{ animationDelay: '0.2s' }}>
                تجربة تجمع روح الكشافة مع تحديات مباشرة، بث أخبار، ولوحة قيادة مصممة للمنافسة الحقيقية.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 justify-end mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Link
                  to="/home"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white transition hover:brightness-110 active:scale-[0.97] hover:shadow-lg hover:shadow-primary/30"
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
                  الدعم والأعطال
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
      </section>

      {/* ══════════ COUNTDOWN ══════════ */}
      <section className="relative -mt-2 z-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="card-sheen animate-pulse-glow rounded-2xl border border-emerald-500/20 bg-[#111a11]/90 backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              انطلاق المخيم خلال
            </p>
            <Countdown targetDate={FESTIVAL_DETAILS.startDate} />
          </div>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section className="py-12 sm:py-16 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Trophy, value: MOCK_COMPETITIONS.length, label: 'تحديات رقمية', color: 'text-amber-400', bg: 'bg-amber-400/8 hover:border-amber-400/20' },
              { icon: Users, value: MOCK_TEAMS.length, label: 'فرق مشاركة', color: 'text-emerald-400', bg: 'bg-emerald-400/8 hover:border-primary/20' },
              { icon: BrainCircuit, value: 'AI', label: 'مختبر ذكي', color: 'text-emerald-300', bg: 'bg-emerald-300/8 hover:border-primary/20' },
            ].map((stat) => (
              <div key={stat.label} className={`card-sheen rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 text-center transition duration-300 ${stat.bg} hover:shadow-lg hover:-translate-y-1`}>
                <div className="inline-flex rounded-xl p-3 mb-3 bg-white/5">
                  <stat.icon size={22} className={stat.color} />
                </div>
                <p className={`text-3xl sm:text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="pb-20 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">ما الذي ينتظرك؟</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">كل ما تحتاجه لتجربة كشفية رقمية مميزة في مكان واحد</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: 'تحديات ومسابقات',
                desc: 'مسابقات رقمية متنوعة تشمل الذكاء والجغرافيا والمعرفة العامة بنظام نقاط مباشر.',
                color: 'text-amber-400',
                bg: 'bg-amber-400/8 hover:border-amber-400/20',
              },
              {
                icon: BrainCircuit,
                title: 'مختبر الذكاء الاصطناعي',
                desc: 'أنشئ فيديوهات احترافية بالذكاء الاصطناعي من وصف نصي بسيط.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-400/8 hover:border-primary/20',
              },
              {
                icon: Zap,
                title: 'نتائج لحظية',
                desc: 'تابع ترتيب الفرق والنتائج لحظة بلحظة من لوحة القيادة.',
                color: 'text-emerald-300',
                bg: 'bg-emerald-300/8 hover:border-primary/20',
              },
            ].map((feature) => (
              <div key={feature.title} className={`group card-sheen rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-right transition duration-300 ${feature.bg} hover:bg-white/[0.04] hover:-translate-y-1`}>
                <div className="inline-flex rounded-xl p-3 mb-4 bg-white/5 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className={feature.color} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-7">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ LOCATION DETAILS ══════════ */}
      <section className="pb-20 relative z-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
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
                {/* Simulated Map Coordinates Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 space-y-2">
                  <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 font-black animate-bounce mx-auto shadow-glow-green">
                    <MapPin size={20} />
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
