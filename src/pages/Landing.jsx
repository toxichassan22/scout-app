import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Binary,
  CalendarDays,
  ChevronLeft,
  Compass,
  Cpu,
  Flame,
  Globe,
  Key,
  Layers,
  LogIn,
  Map,
  MapPin,
  Menu,
  Move3D,
  Play,
  QrCode,
  Radio,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import heroImage from '../../1.png';
import digitalChallengeImage from '../../2.png';
import teamworkImage from '../../3.png';
import closingImage from '../../4.png';
import mapImage from '../../س.jpeg';
import heroVideo from '../../authentic_Egyptian_scout_youth.mp4';
import centerModel from '../../youth-center-map.glb';

const MODEL_VIEWER_URL = 'https://unpkg.com/@google/model-viewer@4.1.0/dist/model-viewer.min.js';

const zoneDetails = [
  { name: 'مبنى الإدارة', summary: 'نقطة التنظيم والربط الشبكي', sysCode: 'NODE-01', accent: 'from-cyan-400 to-blue-600', position: '-1.8m 0.4m 1.2m', mapPos: { top: '22%', left: '22%' } },
  { name: 'مبنى الأنشطة والـ AI', summary: 'ورش وتحديات التقنية والذكاء الاصطناعي', sysCode: 'NODE-02', accent: 'from-sky-300 to-cyan-500', position: '1.8m 0.4m 1.2m', mapPos: { top: '22%', left: '78%' } },
  { name: 'المسجد', summary: 'مساحة هادئة للقيم والخدمة', sysCode: 'NODE-03', accent: 'from-emerald-300 to-teal-500', position: '-2.2m 0.4m -0.5m', mapPos: { top: '42%', left: '18%' } },
  { name: 'المبنى الجديد', summary: 'أنشطة الابتكار والتجارب الرقمية', sysCode: 'NODE-04', accent: 'from-indigo-400 to-purple-600', position: '2.2m 0.4m -0.5m', mapPos: { top: '42%', left: '82%' } },
  { name: 'المخيم الكشفي', summary: 'روح المغامرة والميدان الرقمي', sysCode: 'NODE-05', accent: 'from-teal-300 to-emerald-500', position: '0m 0.4m 2.2m', mapPos: { top: '82%', left: '50%' } },
  { name: 'ملعب كرة القدم', summary: 'ساحة التنافس الرياضي والكشفي', sysCode: 'NODE-06', accent: 'from-amber-300 to-orange-500', position: '0m 0.4m -0.8m', mapPos: { top: '50%', left: '50%' } },
  { name: 'ملعب كرة السلة', summary: 'تحديات الحركة واللياقة', sysCode: 'NODE-07', accent: 'from-pink-400 to-rose-600', position: '1.6m 0.4m -2m', mapPos: { top: '68%', left: '76%' } },
  { name: 'الملعب الخماسي', summary: 'نقطة تجمع وانطلاق الفِرق', sysCode: 'NODE-08', accent: 'from-cyan-300 to-teal-500', position: '-1.6m 0.4m -2m', mapPos: { top: '68%', left: '24%' } },
];

const challenges = [
  {
    number: '01',
    sysCode: 'SYS_CODE: QR_MATRIX',
    title: 'فكّر بسرعة',
    text: 'ألغاز تقنية وشفرات QR ذكية تدمج السرعة بالتحليل التكتيكي.',
    icon: QrCode,
    image: digitalChallengeImage,
    accent: 'cyan',
    className: 'md:translate-y-12',
  },
  {
    number: '02',
    sysCode: 'SYS_CODE: TEAM_SYNC',
    title: 'ابنِ مع فريقك',
    text: 'مهارات كشفية عملية متقدمة تدار بأنظمة التنسيق والعمل الجماعي.',
    icon: Users,
    image: teamworkImage,
    accent: 'emerald',
    className: 'md:-translate-y-4',
  },
  {
    number: '03',
    sysCode: 'SYS_CODE: NIGHT_QUEST',
    title: 'اصنع لحظتك',
    text: 'ختام رقمي مبهر وعروض سمر تجمع روح الكشافة بالتكنولوجيا.',
    icon: Flame,
    image: closingImage,
    accent: 'amber',
    className: 'md:translate-y-16',
  },
];

function useModelViewer() {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.customElements?.get('model-viewer')));

  useEffect(() => {
    if (window.customElements?.get('model-viewer')) {
      setReady(true);
      return undefined;
    }

    const existingScript = document.getElementById('model-viewer-script');
    const script = existingScript || document.createElement('script');
    const markReady = () => {
      window.customElements.whenDefined('model-viewer').then(() => setReady(true)).catch(() => setReady(false));
    };

    if (!existingScript) {
      script.id = 'model-viewer-script';
      script.type = 'module';
      script.src = MODEL_VIEWER_URL;
      script.addEventListener('load', markReady, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', markReady, { once: true });
    }

    return () => script.removeEventListener('load', markReady);
  }, []);

  return ready;
}

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeZone, setActiveZone] = useState(4);
  const [viewMode, setViewMode] = useState('3d');
  const modelViewerReady = useModelViewer();

  // Persistent Auth Redirect Check
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'judge') navigate('/judge/passcode', { replace: true });
      else navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const scrollTo = (target) => {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  return (
    <main className="landing-page relative min-h-screen overflow-hidden bg-[#020b0e] text-right text-slate-100" dir="rtl">
      {/* Cyber Background Grid & Laser Trail Overlay */}
      <div className="landing-grid pointer-events-none fixed inset-0 z-0 opacity-50" />

      {/* Cyber Dotted Digital Trail Path */}
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-40" viewBox="0 0 1440 3400" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="cyberPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#10b981" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>
          <filter id="cyberGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M 1100 250 C 1400 700, 100 1100, 720 1600 C 1300 2100, 200 2600, 800 3300"
          stroke="url(#cyberPathGrad)"
          strokeWidth="3.5"
          strokeDasharray="12 12"
          strokeLinecap="round"
          filter="url(#cyberGlow)"
          className="animate-treasure-path"
        />

        <g stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
          <path d="M 1090 240 L 1110 260 M 1110 240 L 1090 260" />
          <path d="M 710 1590 L 730 1610 M 730 1590 L 710 1610" />
          <path d="M 790 3290 L 810 3310 M 810 3290 L 790 3310" />
        </g>
      </svg>

      {/* Main Glass Navigation Header - Pure Scout Theme */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-amber-500/20 bg-[#04140b]/85 backdrop-blur-xl shadow-lg shadow-black/40">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="hidden items-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-black text-[#102018] shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-200 sm:inline-flex"
          >
            <LogIn size={17} />
            تسجيل دخول الفرق
          </button>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-300 lg:flex" aria-label="التنقل الرئيسي">
            <button type="button" onClick={() => scrollTo('experience')} className="transition hover:text-amber-300">التجربة</button>
            <button type="button" onClick={() => scrollTo('explore')} className="transition hover:text-amber-300">استكشف المكان</button>
            <button type="button" onClick={() => scrollTo('countdown')} className="transition hover:text-amber-300">الموعد</button>
          </nav>

          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <p className="text-base sm:text-lg font-black leading-tight tracking-tight text-white">المهرجان الكشفي الإرشادي</p>
              <p className="mt-0.5 flex items-center justify-end gap-1.5 text-xs font-black tracking-wide text-amber-300 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                النسخة الثلاثون · 2026
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="mr-1 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden"
              aria-label="فتح القائمة"
              aria-expanded={menuOpen}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-white/10 bg-[#061710] lg:hidden">
              <div className="flex flex-col gap-2 px-5 py-4 text-sm font-bold text-slate-200">
                <button type="button" onClick={() => scrollTo('experience')} className="rounded-xl px-4 py-3 text-right hover:bg-white/5">التجربة</button>
                <button type="button" onClick={() => scrollTo('explore')} className="rounded-xl px-4 py-3 text-right hover:bg-white/5">استكشف المكان</button>
                <button type="button" onClick={() => navigate('/login')} className="rounded-xl bg-amber-300 px-4 py-3 font-black text-[#102018]">تسجيل دخول الفرق</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section: Pure Scout Warm Atmosphere with Cyan Highlight on "ديجيتال." */}
      <section className="relative isolate flex min-h-[680px] items-center overflow-hidden pt-20 sm:min-h-[740px]">
        <video className="absolute inset-0 -z-30 h-full w-full object-cover object-center" autoPlay muted playsInline poster={heroImage} aria-hidden="true">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(4,18,11,0.25)_0%,rgba(4,18,11,0.75)_45%,rgba(4,18,11,0.96)_100%)]" />
        <div className="landing-hero-orb absolute -bottom-40 right-[8%] -z-10 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24">
          <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.12, delayChildren: 0.15 }} className="max-w-3xl">

            {/* Pure Transparent Grand Hero Brand Logo */}
            <motion.div variants={reveal} className="mb-4 flex items-center gap-4">
              <img
                src="/logo.png"
                alt="شعار المهرجان الكشفي الإرشادي"
                className="h-44 w-44 sm:h-56 sm:w-56 lg:h-60 lg:w-60 object-contain drop-shadow-[0_0_55px_rgba(245,158,11,0.55)] transition duration-300 hover:scale-105"
              />
            </motion.div>

            <motion.h1 variants={reveal} className="max-w-3xl text-5xl font-black leading-[1.35] tracking-wide text-white sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="block pb-1">كشفية بفكر</span>
              <span className="mt-4 block text-[#38bdf8] drop-shadow-[0_0_30px_rgba(56,189,248,0.85)]">
                ديجيتال.
              </span>
            </motion.h1>

            <motion.div variants={reveal} className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2.5 rounded-full bg-amber-300 px-7 py-4 text-base font-black text-[#112018] shadow-xl shadow-amber-500/20 transition hover:-translate-y-1 hover:bg-amber-200"
              >
                <LogIn size={20} />
                ابدأ مع فريقك
              </button>
              <button
                type="button"
                onClick={() => scrollTo('experience')}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <Play size={17} fill="currentColor" />
                استكشف الرحلة
              </button>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* Experience / Challenges Section: Hybrid Scout-Digital Transition */}
      <section id="experience" className="relative z-10 px-5 py-24 sm:px-8 lg:py-32">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ staggerChildren: 0.12 }} className="mx-auto max-w-7xl">
          <motion.div variants={reveal} className="max-w-2xl">
            <p className="mb-4 flex items-center gap-2 text-xs font-black tracking-[0.18em] text-emerald-300">
              <Sparkles size={15} />
              الرحلة الكشفية التقنية
            </p>
            <h2 className="text-3xl font-black leading-snug sm:leading-[1.3] text-white sm:text-5xl">
              كل سنة ذكرى جديدة معاكم
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              تحديات تجمع الأصالة الميدانية الكشفية والابتكار الرقمي الحديث في تجربة واحدة.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
            {challenges.map((challenge) => {
              const Icon = challenge.icon;
              return (
                <motion.article
                  key={challenge.number}
                  variants={reveal}
                  whileHover={{ y: -10 }}
                  className={`group overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-[#071c14]/80 shadow-2xl shadow-black/40 ${challenge.className}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img src={challenge.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05160f] via-[#05160f]/20 to-transparent" />
                    
                    <div className="absolute left-5 top-5">
                      <span className="rounded-full border border-white/20 bg-black/40 px-3.5 py-1 text-xs font-mono font-black text-white backdrop-blur-md">
                        {challenge.number}
                      </span>
                    </div>
                  </div>

                  <div className="relative -mt-24 p-7 pt-0">
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-[#122117] shadow-lg shadow-amber-500/20">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">{challenge.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{challenge.text}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* 3D & Camp Map Explorer Section - Seamless Organic Blend */}
      <section id="explore" className="relative z-10 bg-transparent px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} transition={{ staggerChildren: 0.12 }}>
            <motion.div variants={reveal} className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-mono font-bold text-emerald-300 backdrop-blur-md">
                <Move3D size={14} className="text-emerald-300" />
                3D DIGITAL CAMPUS EXPLORER
              </span>
            </motion.div>
            <motion.h2 variants={reveal} className="max-w-lg text-3xl font-black leading-snug sm:leading-[1.3] text-white sm:text-5xl">
              المعسكر الرقمي بين يديك. لفّ واكتشف محطتك.
            </motion.h2>
            <motion.p variants={reveal} className="mt-5 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
              المجسّم التفاعلي ثلاثي الأبعاد يوفر نظرة شمولية دقيقة لمرافق مركز الشباب مع واجهة استكشاف ذكية.
            </motion.p>

            <motion.div variants={reveal} className="mt-8 grid grid-cols-2 gap-2.5">
              {zoneDetails.map((zone, index) => (
                <button
                  type="button"
                  key={zone.name}
                  onClick={() => setActiveZone(index)}
                  className={`group relative flex items-center justify-between rounded-2xl border p-3.5 text-right transition duration-300 ${
                    activeZone === index
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/10'
                      : 'border-emerald-500/15 bg-[#051f18]/40 text-slate-400 hover:border-emerald-400/35 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${zone.accent} ${activeZone === index ? 'shadow-[0_0_12px_#34d399]' : 'opacity-60'}`} />
                    <span className="text-xs font-black leading-5">{zone.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400/80">{zone.sysCode}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            className="relative flex min-h-[480px] flex-col overflow-hidden rounded-[2.5rem] border border-emerald-500/25 bg-[#041a15]/80 backdrop-blur-2xl shadow-2xl shadow-black/60 transition duration-500 hover:border-emerald-400/40 sm:min-h-[570px]"
          >
            {/* Top View Controller Bar */}
            <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-[#031510]/90 p-1.5 backdrop-blur-xl shadow-lg">
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                  viewMode === '3d'
                    ? 'bg-emerald-400 text-[#091b12] shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-200'
                }`}
              >
                <Move3D size={15} />
                مجسّم 3D
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                  viewMode === 'map'
                    ? 'bg-amber-300 text-[#122117] shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-200'
                }`}
              >
                <Map size={15} />
                خريطة المعسكر
              </button>
            </div>

            {/* HUD Status Bar overlay */}
            <div className="absolute left-5 top-5 z-20 hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-black/60 px-3 py-1.5 text-[10px] font-mono text-emerald-300 backdrop-blur-md sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SYS_MODE: {viewMode === '3d' ? 'INTERACTIVE_3D' : '2D_MAP'}</span>
            </div>

            {viewMode === '3d' ? (
              modelViewerReady ? (
                <model-viewer
                  src={centerModel}
                  alt="نموذج ثلاثي الأبعاد لمركز شباب منشية التحرير"
                  camera-controls
                  shadow-intensity="2.5"
                  shadow-softness="0.3"
                  exposure="0.6"
                  tone-mapping="neutral"
                  environment-image="neutral"
                  bounds="tight"
                  camera-target="auto auto auto"
                  camera-orbit="0deg 55deg 100%"
                  field-of-view="auto"
                  interaction-prompt="auto"
                  style={{ width: '100%', height: '100%', minHeight: '520px', display: 'block' }}
                  className="block h-full min-h-[480px] w-full sm:min-h-[570px]"
                />
              ) : (
                <div className="absolute inset-0 overflow-hidden">
                  <img src={heroImage} alt="نظرة من أجواء المهرجان" className="h-full w-full object-cover opacity-30 filter brightness-90" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#041a15_85%)]" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
                        <Move3D size={28} />
                      </div>
                      <p className="mt-4 text-sm font-black text-white font-mono">جارٍ تحميل المجسّم ثلاثي الأبعاد…</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="relative flex h-full min-h-[480px] w-full items-center justify-center overflow-hidden p-6 sm:min-h-[570px]">
                <img src={mapImage} alt="خريطة تفصيلية لمركز شباب منشية التحرير" className="max-h-[85%] max-w-[90%] rounded-2xl object-contain shadow-2xl shadow-black/80 transition duration-500 hover:scale-105" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#041a15] via-transparent to-transparent" />
              </div>
            )}

            {/* Bottom Info HUD Panel */}
            <div className="pointer-events-none absolute inset-x-5 bottom-5 z-20 flex items-end justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-[#031510]/90 p-4 backdrop-blur-xl shadow-lg">
              <div>
                <p className="text-[10px] font-mono font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span>{zoneDetails[activeZone].sysCode}</span>
                  <span className="text-slate-600">|</span>
                  <span>المحطة المختارة</span>
                </p>
                <p className="mt-1 text-sm font-black text-white">{zoneDetails[activeZone].name}</p>
                <p className="mt-1 text-xs text-slate-300">{zoneDetails[activeZone].summary}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-bold text-emerald-300">
                {viewMode === '3d' ? <Move3D size={14} /> : <Map size={14} />}
                <span>{viewMode === '3d' ? 'تفاعل 3D حر' : 'خريطة 2D'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Countdown & Action Section */}
      <section id="countdown" className="relative z-10 px-5 py-10 sm:px-8 sm:py-14">
        <div className="cyber-hud-card mx-auto flex flex-col lg:flex-row-reverse max-w-6xl items-stretch overflow-hidden rounded-[2.5rem] border border-cyan-500/30 bg-[#02131a] shadow-2xl">
          <div className="cyber-hud-corner cyber-hud-corner-tl" />
          <div className="cyber-hud-corner cyber-hud-corner-tr" />
          <div className="cyber-hud-corner cyber-hud-corner-bl" />
          <div className="cyber-hud-corner cyber-hud-corner-br" />

          {/* Right/Top Image */}
          <div className="relative h-64 lg:h-auto lg:w-1/2 min-h-[220px] overflow-hidden shrink-0">
            <img
              src={closingImage}
              alt="فريق كشفي يجتمع في نهاية اليوم"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover filter brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-[#02131a] via-[#02131a]/40 to-transparent" />
          </div>

          {/* Left/Bottom Text Content */}
          <div className="p-7 sm:p-10 lg:w-1/2 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-cyan-300 mb-3">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <CalendarDays size={15} /> 21 أغسطس 2026 · الافتتاح الرسمي
            </div>
            <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">
              جاهزين تكتبوا فصل جديد في الميدان الرقمي؟
            </h2>
            <p className="mt-3 text-xs leading-6 text-slate-300 sm:text-sm">
              انضموا إلى المنظومة الرقمية للمهرجان، وتابِعوا النتائج والتحديات لحظة بلحظة.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition hover:scale-105"
              >
                <Trophy size={16} />
                تسجيل دخول الفرق
              </button>
              <a
                href="https://maps.app.goo.gl/VnjxULqUY7dTXxeA6"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-5 py-3 text-xs sm:text-sm font-black text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-900/50"
              >
                <MapPin size={16} />
                الموقع على الخريطة
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Bottom Bar */}
      <footer className="relative z-10 border-t border-cyan-500/20 px-5 py-9 text-center sm:px-8 bg-[#01080b]">
        {/* Semaphore Robot standing on top of bottom bar at far bottom-right edge */}
        <div className="absolute right-0 sm:right-2 bottom-full pointer-events-none select-none flex flex-col items-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-36 sm:h-48 md:h-56 w-auto object-contain"
          >
            <source src="/روبوت.webm" type="video/webm" />
            <source src="/%D8%B1%D9%88%D8%A0%D9%88%D8%AA.webm" type="video/webm" />
            <source src="/robot.webm" type="video/webm" />
            <source src="/روبوت.mov" type="video/quicktime" />
            <source src="/robot.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-slate-400 sm:flex-row font-mono">
          <p className="font-bold text-slate-200">المهرجان الكشفي الإرشادي السنوي الثلاثون — النسخة الرقمية</p>
          <p className="text-cyan-400/80">مركز شباب منشية التحرير · عين شمس · القاهرة</p>
        </div>
      </footer>
    </main>
  );
};

export default Landing;

