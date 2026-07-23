import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, X, MessageSquare, ShieldCheck, Heart, Zap, Compass } from 'lucide-react';

const SCOUT_PHRASES = [
  "أهلاً يا بطل! جاهز لتسليم تقرير فريقك؟ 📜",
  "نار السمر مشتعلة والمنافسة حامية جداً! 🔥",
  "كشاف دوماً مستعد! ركّز واجمع النقاط 🏆",
  "ما تنساش ترقية شارات الفريق اليوم! 🎖️",
  "روح الفريق والجماعة هي سر الفوز! 🤝",
  "المعسكر الرقمي معك في كل خطوة! 🏕️",
];

export const ScoutPet = memo(function ScoutPet() {
  const [open, setOpen] = useState(true);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);

  // Auto cycle phrase every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % SCOUT_PHRASES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleClickMascot = () => {
    setIsBouncing(true);
    setPhraseIdx((prev) => (prev + 1) % SCOUT_PHRASES.length);
    setOpen(true);
    setTimeout(() => setIsBouncing(false), 800);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-auto dir-rtl select-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="mb-3 max-w-[240px] rounded-2xl border border-[rgba(245,158,11,0.4)] bg-[rgba(4,20,14,0.92)] p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.25)] backdrop-blur-xl relative"
          >
            {/* Bubble Tail */}
            <div className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-l border-[rgba(245,158,11,0.4)] bg-[#041a15]" />

            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="flex items-center gap-1 text-[10px] font-black text-[#fcd34d]">
                <Flame size={12} className="animate-flame text-[#f59e0b]" />
                رفيق الكشاف
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-[#64748b] hover:text-white transition"
              >
                <X size={13} />
              </button>
            </div>

            <p className="text-xs font-bold text-[#e2e8f0] leading-5">
              {SCOUT_PHRASES[phraseIdx]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Mascot Avatar (Scout Flame Pet) */}
      <motion.button
        onClick={handleClickMascot}
        animate={
          isBouncing
            ? { scale: [1, 1.25, 0.95, 1.1, 1], rotate: [0, -12, 12, -6, 0] }
            : { y: [0, -6, 0] }
        }
        transition={
          isBouncing
            ? { duration: 0.6 }
            : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }
        className="group relative flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-[rgba(245,158,11,0.6)] bg-gradient-to-br from-[#f59e0b] via-[#d97706] to-[#041a15] p-2 shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-transform hover:scale-110 active:scale-95"
      >
        {/* Glow Ring */}
        <span className="absolute -inset-1 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.4),transparent_70%)] animate-pulse" />

        {/* Scout Neckerchief Icon / Mascot Flame Character */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Flame size={32} className="animate-flame text-[#fff] drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          <span className="text-[9px] font-black text-[#fcd34d] tracking-tight -mt-1 font-mono">
            SCOUT
          </span>
        </div>

        {/* Pulse Status Dot */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10b981] border-2 border-[#020b0e] text-[8px] font-black text-[#020b0e]">
          ✓
        </span>
      </motion.button>
    </div>
  );
});
