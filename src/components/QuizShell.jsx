import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Timer from './Timer';

/**
 * QuizShell — قالب موحّد لصفحات الأسئلة (TwoTruths / Genius / Geography).
 * Layout: شريط جانبي بالتقدم والتايمر + منطقة سؤال متحركة.
 */
const QuizShell = memo(function QuizShell({
  title,
  icon: Icon,
  tone = 'violet',       // violet | ember | fern
  currentIndex,
  total,
  remainingSeconds,
  onTimerEnd,
  questionKey,           // يتغير مع كل سؤال لإطلاق الأنيميشن
  children,              // محتوى السؤال
}) {
  const tones = {
    violet: { text: 'text-scout', bar: 'from-[#a78bfa] to-[#6d28d9]', iconBox: 'border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.12)] text-[#a78bfa]' },
    ember: { text: 'text-fire', bar: 'from-[#fcd34d] to-[#d97706]', iconBox: 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]' },
    fern: { text: 'text-oasis', bar: 'from-[#6ee7b7] to-[#059669]', iconBox: 'border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.12)] text-[#6ee7b7]' },
  };
  const t = tones[tone] || tones.violet;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">

        {/* ═══ الترويسة — تايمر + عنوان ═══ */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mb-8 flex items-center justify-between p-4 sm:p-5"
        >
          <div className="flex items-center gap-3.5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${t.iconBox}`}>
              {Icon && <Icon size={22} />}
            </div>
            <h1 className={`text-lg font-black sm:text-xl ${t.text}`}>{title}</h1>
          </div>
          {remainingSeconds != null && <Timer initialSeconds={remainingSeconds} onEnd={onTimerEnd} />}
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* ═══ الشريط الجانبي — التقدم ═══ */}
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="glass hidden flex-col items-center gap-5 self-start p-6 lg:flex"
          >
            <p className="section-kicker">التقدم</p>

            {/* حلقة التقدم */}
            <div className="relative h-28 w-28">
              <svg width="112" height="112" className="-rotate-90">
                <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                <motion.circle
                  cx="56" cy="56" r="48" fill="none" strokeWidth="8" strokeLinecap="round"
                  stroke="url(#quiz-progress-grad)"
                  strokeDasharray={2 * Math.PI * 48}
                  animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - progress / 100) }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <defs>
                  <linearGradient id="quiz-progress-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-black text-white" dir="ltr">{currentIndex + 1}</span>
                <span className="text-[10px] font-bold text-[#6e6889]">من {total}</span>
              </div>
            </div>

            {/* نقاط الأسئلة */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-400 ${
                    i < currentIndex
                      ? 'bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                      : i === currentIndex
                        ? 'scale-125 bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                        : 'bg-[rgba(255,255,255,0.12)]'
                  }`}
                />
              ))}
            </div>
          </motion.aside>

          {/* ═══ منطقة السؤال — متحركة مع كل سؤال ═══ */}
          <div className="min-w-0">
            {/* شريط تقدم علوي للموبايل */}
            <div className="mb-5 lg:hidden">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#a9a3c2]">
                <span>سؤال {currentIndex + 1} من {total}</span>
                <span className="font-mono" dir="ltr">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-l ${t.bar}`}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={questionKey}
                initial={{ opacity: 0, x: -40, rotateY: 6 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: 40, rotateY: -6 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformPerspective: 900 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
});

export default QuizShell;
