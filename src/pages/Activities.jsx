import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, KeyRound, Play, CheckCircle, Trophy, Gamepad2,
  Flame, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';
import MediaSlot from '../components/MediaSlot';

/* خريطة صور المسابقات (تُملأ لاحقاً من MEDIA_MANIFEST) */
const COMP_MEDIA = {
  1: { slot: 'comp-genius', label: 'غلاف مسابقة عبقرينو', desc: 'خمسون سؤالاً متوازناً في ربع ساعة - الذكاء الاصطناعي والثقافة الكشفية والعامة.', tone: 'ember', code: '1001' },
  2: { slot: 'comp-geography', label: 'غلاف مسابقة الجغرافيا', desc: 'التعرف على الأعلام والعواصم والعملات والتقسيم الإداري ونظام الحكم للـ 22 دولة عربية.', tone: 'fern', code: '1003' },
  3: { slot: 'comp-two-truths', label: 'غلاف مسابقة حقيقتان وكذبة', desc: 'اكتشف عبارة الزور من بين الحقائق الكشفية والتاريخية — سرعة وتركيز.', tone: 'violet', code: '1002' },
  4: { slot: 'comp-video-ai', label: 'غلاف مسابقة تصميم الفيديو الكشفي والتقارير', desc: 'تقييم لجنة التحكيم لمونتاج ومحتوى الفيديو الكشفي والتقارير.', tone: 'violet', code: '1234' },
  genius: { slot: 'comp-genius', label: 'غلاف مسابقة عبقرينو', desc: 'خمسون سؤالاً متوازناً في ربع ساعة - الذكاء الاصطناعي والثقافة الكشفية والعامة.', tone: 'ember', code: '1001' },
  geography: { slot: 'comp-geography', label: 'غلاف مسابقة الجغرافيا', desc: 'التعرف على الأعلام والعواصم والعملات والتقسيم الإداري ونظام الحكم للـ 22 دولة عربية.', tone: 'fern', code: '1003' },
  two_truths: { slot: 'comp-two-truths', label: 'غلاف مسابقة حقيقتان وكذبة', desc: 'اكتشف عبارة الزور من بين الحقائق الكشفية والتاريخية — سرعة وتركيز.', tone: 'violet', code: '1002' },
  video_design: { slot: 'comp-video-ai', label: 'غلاف مسابقة تصميم الفيديو الكشفي والتقارير', desc: 'تقييم لجنة التحكيم لمونتاج ومحتوى الفيديو الكشفي والتقارير.', tone: 'violet', code: '1234' },
  video: { slot: 'comp-video-ai', label: 'غلاف مسابقة تصميم الفيديو الكشفي والتقارير', desc: 'تقييم لجنة التحكيم لمونتاج ومحتوى الفيديو الكشفي والتقارير.', tone: 'violet', code: '1234' },
};

const toneCls = {
  violet: { border: 'hover:border-[rgba(139,92,246,0.55)]', badge: 'badge-violet', btn: 'btn-violet' },
  ember: { border: 'hover:border-[rgba(245,158,11,0.55)]', badge: 'badge-ember', btn: 'btn-ember' },
  fern: { border: 'hover:border-[rgba(16,185,129,0.55)]', badge: 'badge-fern', btn: 'btn-ember' },
};

/* ═══ كرت مسابقة كبير (Showcase Card) ═══ */
const CompetitionShowcase = ({ comp, completed, onEnter, index }) => {
  const media = COMP_MEDIA[comp.type] || COMP_MEDIA[comp.slug] || COMP_MEDIA[comp.id] || { slot: `comp-${comp.id}`, label: `غلاف ${comp.name}`, desc: '', tone: 'violet', code: comp.passcode || '----' };
  const tone = toneCls[media.tone];
  const compCode = comp.passcode || media.code;

  return (
    <motion.article
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(12,10,22,0.65)] backdrop-blur-xl transition-all duration-500 ${tone.border} ${!comp.isOpen ? 'opacity-60' : ''}`}
    >
      {/* غلاف الصورة */}
      <div className="relative">
        <MediaSlot
          name={media.slot}
          kind="image"
          ratio="16/8"
          label={media.label}
          overlay={false}
          className="!rounded-none !border-0 !border-b border-[rgba(255,255,255,0.07)]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,10,22,0.9)] via-transparent to-transparent" />

        {/* شارة الحالة فوق الصورة */}
        <div className="absolute right-4 top-4 z-10">
          {completed ? (
            <span className="badge-fern backdrop-blur-xl">
              <CheckCircle size={12} />
              تم التسجيل
            </span>
          ) : comp.isOpen ? (
            <span className="badge-ember backdrop-blur-xl">
              <span className="live-dot" />
              مفتوحة الآن
            </span>
          ) : (
            <span className="badge-mute backdrop-blur-xl">مغلقة</span>
          )}
        </div>

        {/* المدة */}
        {comp.duration && (
          <div className="absolute left-4 top-4 z-10 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(7,6,12,0.6)] px-3 py-1.5 font-mono text-[11px] font-black text-white backdrop-blur-xl">
            {comp.duration / 60} دقيقة
          </div>
        )}
      </div>

      {/* المحتوى */}
      <div className="p-6 text-right sm:p-7">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 font-mono text-xs font-black text-amber-300">
            الكود: {compCode}
          </span>
          <h3 className="text-xl font-black text-white sm:text-2xl">{comp.name}</h3>
        </div>
        <p className="mb-6 text-sm leading-7 text-[#a9a3c2]">{media.desc}</p>

        <div className="flex items-center justify-between">
          {completed ? (
            <span className="flex items-center gap-2 text-sm font-black text-[#6ee7b7]">
              <CheckCircle size={18} />
              إجابتك محفوظة
            </span>
          ) : comp.isOpen ? (
            <button onClick={() => onEnter(comp)} className={`${tone.btn} btn-shine !px-7`}>
              <Play size={17} />
              دخول التحدي
            </button>
          ) : (
            <span className="text-xs font-bold text-[#6e6889]">في انتظار تفعيل القيادة</span>
          )}
          <Trophy size={22} className="text-[rgba(255,255,255,0.12)] transition-colors duration-500 group-hover:text-[rgba(245,158,11,0.5)]" />
        </div>
      </div>
    </motion.article>
  );
};

const Activities = () => {
  const { user } = useAuth();
  const { competitions, isCompleted, validateCompetitionEntry, registerCompetitionEntry } = useCompetitions();
  const navigate = useNavigate();

  const [selectedComp, setSelectedComp] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleEnterCompetition = (comp) => {
    setSelectedComp(comp);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    if (passwordInput === selectedComp.password) {
      const validation = validateCompetitionEntry(selectedComp.id, user.name);
      if (!validation.ok) {
        setPasswordError(validation.message);
        return;
      }
      registerCompetitionEntry(selectedComp.id, user.name);
      navigate(`/competition/${selectedComp.id}`);
    } else {
      setPasswordError('كلمة المرور غير صحيحة!');
    }
  };

  return (
    <main className="page-shell dir-rtl !max-w-6xl">

      {/* ═══ HERO — بانر سينمائي ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12"
      >
        <MediaSlot
          name="activities-hero"
          kind="image"
          ratio="21/8"
          label="بانر ساحة التحديات — فرق كشفية حول نار السمر بمناديل بنفسجية"
          className="!rounded-[2.5rem] border border-[rgba(245,158,11,0.25)]"
          overlay
        >
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="badge-ember backdrop-blur-xl"
            >
              <Flame size={13} />
              ساحة المنافسة الرسمية
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="text-3xl font-black text-white sm:text-4xl"
            >
              أثبت جدارتك <span className="text-fire">حول النار</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="max-w-md text-sm leading-7 text-[#d5d0e8]"
            >
              أربع تحديات رسمية بينك وبين منصة التتويج — كل نقطة تقرّبك من لقب المخيم.
            </motion.p>
          </div>
        </MediaSlot>
      </motion.section>

      {/* ═══ شبكة المسابقات ═══ */}
      <section className="mb-6 grid gap-6 md:grid-cols-2">
        {competitions.map((comp, i) => (
          <CompetitionShowcase
            key={comp.id}
            comp={comp}
            completed={comp.id !== 4 && isCompleted(comp.id, user.name)}
            onEnter={handleEnterCompetition}
            index={i}
          />
        ))}
      </section>

      {/* ═══ ركن الألعاب الترفيهية ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="glass-violet glass-sheen relative overflow-hidden p-7 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="text-right">
              <span className="badge-violet mb-3">
                <Gamepad2 size={13} />
                استراحة المحارب
              </span>
              <h2 className="text-2xl font-black text-white">ألعاب جانبية بين التحديات</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-[#a9a3c2]">
                تحدّيات خفيفة لتصفية ذهنك — لا تؤثر على نقاط المنافسة الرسمية.
              </p>
            </div>
            <Sparkles size={44} className="text-[rgba(139,92,246,0.35)]" />
          </div>

          {/* لعبة مطاردة الألوان */}
          <ColorHuntGame />
        </div>
      </motion.section>

      {/* ═══ Modal كلمة المرور ═══ */}
      {selectedComp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,6,12,0.85)] p-4 backdrop-blur-md"
          onClick={() => setSelectedComp(null)}
        >
          <motion.form
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onSubmit={handleVerifyPassword}
            onClick={(e) => e.stopPropagation()}
            className="glass-violet glass-sheen hud-frame w-full max-w-md p-7 text-right sm:p-8"
          >
            <div className="mb-2 flex items-center justify-end gap-2 text-[#c4b5fd]">
              <h3 className="text-lg font-black text-white">رمز مرور المسابقة</h3>
              <KeyRound size={22} />
            </div>
            <p className="mb-6 text-xs leading-6 text-[#a9a3c2]">
              أدخل الرمز المسلّم لفريقك لمباشرة <span className="font-black text-white">{selectedComp.name}</span> فوراً.
            </p>

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              placeholder="••••"
              className="input-field mb-4 text-center font-mono text-2xl tracking-[0.5em]"
              autoFocus
            />

            {passwordError && (
              <motion.p
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-4 rounded-2xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.1)] p-3 text-xs font-bold text-[#fda4af]"
              >
                {passwordError}
              </motion.p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedComp(null)} className="btn-ghost flex-1">
                إلغاء
              </button>
              <button type="submit" className="btn-ember btn-shine flex-1">
                بدء الاختبار
                <ChevronLeft size={17} />
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </main>
  );
};

/* ═══ لعبة مطاردة الألوان (محفوظة من النسخة القديمة بروح جديدة) ═══ */
const ColorHuntGame = () => {
  const [targetColor, setTargetColor] = useState(() => ({
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  }));
  const [userColor, setUserColor] = useState({ r: 120, g: 120, b: 120 });
  const [colorMatched, setColorMatched] = useState(false);
  const [colorMatchScore, setColorMatchScore] = useState(null);

  const handleCheck = () => {
    const diffR = Math.abs(targetColor.r - userColor.r);
    const diffG = Math.abs(targetColor.g - userColor.g);
    const diffB = Math.abs(targetColor.b - userColor.b);
    const matchPercent = Math.max(0, 100 - (diffR + diffG + diffB) / 7.65);
    setColorMatchScore(matchPercent.toFixed(1));
    if (matchPercent >= 92) setColorMatched(true);
  };

  const reset = () => {
    setTargetColor({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    });
    setColorMatched(false);
    setColorMatchScore(null);
  };

  return (
    <div className="mt-7 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.45)] p-6">
      <h3 className="mb-1.5 flex items-center gap-2 text-base font-black text-white">
        مطاردة الألوان
        <Sparkles size={16} className="text-[#fcd34d]" />
      </h3>
      <p className="mb-6 text-xs text-[#6e6889]">طابق اللون المستهدف بدقة 92% أو أكثر.</p>

      <div className="mb-6 grid items-center gap-6 md:grid-cols-2">
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <motion.div
              layout
              className="h-24 w-24 rounded-2xl border-4 border-[rgba(255,255,255,0.1)] shadow-inner"
              style={{ backgroundColor: `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})` }}
            />
            <span className="mt-2 block text-xs font-bold text-[#a9a3c2]">لونك</span>
          </div>
          <div className="text-center">
            <div
              className="h-24 w-24 rounded-2xl border-4 border-[rgba(255,255,255,0.1)] shadow-[0_0_24px_rgba(255,255,255,0.08)]"
              style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
            />
            <span className="mt-2 block text-xs font-bold text-[#a9a3c2]">المستهدف</span>
          </div>
        </div>

        <div className="space-y-3.5" dir="ltr">
          {[
            { key: 'r', accent: 'accent-rose-500' },
            { key: 'g', accent: 'accent-emerald-500' },
            { key: 'b', accent: 'accent-sky-500' },
          ].map(({ key, accent }) => (
            <input
              key={key}
              type="range"
              min="0"
              max="255"
              value={userColor[key]}
              onChange={(e) => setUserColor((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))}
              className={`w-full ${accent}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.07)] pt-4">
        {colorMatchScore ? (
          <span className={`text-sm font-black ${colorMatched ? 'text-[#6ee7b7]' : 'text-[#fcd34d]'}`}>
            {colorMatched ? `مطابقة مثالية! ${colorMatchScore}%` : `المطابقة: ${colorMatchScore}%`}
          </span>
        ) : (
          <span className="text-xs text-[#6e6889]">حرّك المؤشرات واضغط فحص</span>
        )}
        <div className="flex gap-2.5">
          {colorMatched && (
            <button onClick={reset} className="btn-ghost !px-5 !py-2.5 !text-xs">
              جولة جديدة
            </button>
          )}
          <button onClick={handleCheck} disabled={colorMatched} className="btn-violet !px-6 !py-2.5 !text-xs">
            فحص النسبة
          </button>
        </div>
      </div>
    </div>
  );
};

export default Activities;
