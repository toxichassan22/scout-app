import { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Sparkles, FileText, ChevronLeft, Flame,
  Radio, Newspaper, Lock, ShieldCheck, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getLeaderboard, getNews } from '../services/api';
import { FESTIVAL_DETAILS, MOCK_TEAMS } from '../data/mockData';
import NewsCard from '../components/NewsCard';
import LoadingSpinner from '../components/LoadingSpinner';

/* ═══════════════════════════════════════════════════════════════
   HOME — لوحة التحكم الكشفية الرقمية (Digital Scout App Dashboard)
   - اسم الفريق الديناميكي بحسب مسجل الدخول
   - لوحة الشرف: أفضل 5 مراكز فقط وبدون إظهار أسماء الفرق (هوية محجوبة)
   - النشرة الإخبارية المباشرة للتوجيهات والمفقودات
═══════════════════════════════════════════════════════════════ */

/* عداد تنازلي للمهرجان */
const Countdown = memo(function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(FESTIVAL_DETAILS.startDate).getTime();
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: 'يوم', value: timeLeft.days },
    { label: 'ساعة', value: timeLeft.hours },
    { label: 'دقيقة', value: timeLeft.minutes },
    { label: 'ثانية', value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(16,185,129,0.3)] bg-[rgba(2,11,14,0.85)] sm:h-14 sm:w-14 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <span className="font-mono text-lg font-black text-[#38bdf8] sm:text-xl" dir="ltr">
              {String(item.value).padStart(2, '0')}
            </span>
          </div>
          <span className="mt-1 text-[9px] font-bold text-[#94a3b8]">{item.label}</span>
        </div>
      ))}
    </div>
  );
});

/* لوحة الشرف — تعرض أفضل 5 مراكز فقط بدون إظهار أسماء الفرق (هوية محجوبة) */
const CompactLeaderboard = memo(function CompactLeaderboard({ board = [], maxPoints = 0, loading = false }) {
  const rankTitles = {
    1: 'المركز الأول',
    2: 'المركز الثاني',
    3: 'المركز الثالث',
    4: 'المركز الرابع',
    5: 'المركز الخامس',
  };

  // حصر القائمة في أفضل 5 مراكز فقط
  const rawList = board.length > 0 ? board.slice(0, 5) : MOCK_TEAMS.slice(0, 5);

  const displayList = rawList.map((item, idx) => ({
    rank: item.rank || idx + 1,
    points: item.points || Math.max(0, 2850 - idx * 230),
    title: rankTitles[idx + 1] || `المركز #${idx + 1}`,
  }));

  const highestPoints = maxPoints || displayList[0]?.points || 3000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-sheen p-6 space-y-4 rounded-[2.5rem] border border-[rgba(16,185,129,0.3)] bg-[#041a15]/85 backdrop-blur-2xl shadow-2xl shadow-black/80"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(16,185,129,0.2)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] text-[#fcd34d]">
            <Trophy size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              لوحة <span className="text-fire">الشرف</span>
              <Flame size={16} className="animate-flame text-[#f59e0b]" />
            </h3>
            <p className="text-[10px] text-[#64748b] font-bold">أفضل 5 مراكز متصدرة فقط</p>
          </div>
        </div>

        <span className="badge-ember font-mono text-[10px] flex items-center gap-1">
          <Lock size={10} />
          هوية الفرق محجوبة
        </span>
      </div>

      {loading ? (
        <LoadingSpinner label="جاري تحديث المراكز..." />
      ) : (
        <div className="space-y-2.5">
          {displayList.map((item) => {
            const percent = highestPoints > 0 ? Math.min(100, Math.max(5, (item.points / highestPoints) * 100)) : 0;
            const rankStyles = {
              1: { bg: 'bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.4)]', text: 'text-[#fcd34d]', icon: '👑' },
              2: { bg: 'bg-[rgba(203,213,225,0.12)] border-[rgba(203,213,225,0.3)]', text: 'text-[#e2e8f0]', icon: '🥈' },
              3: { bg: 'bg-[rgba(217,119,6,0.15)] border-[rgba(217,119,6,0.4)]', text: 'text-[#f97316]', icon: '🥉' },
            }[item.rank] || { bg: 'bg-[rgba(2,11,14,0.6)] border-[rgba(16,185,129,0.15)]', text: 'text-[#7dd3fc]', icon: null };

            return (
              <motion.div
                key={item.rank}
                whileHover={{ scale: 1.01, x: -2 }}
                className={`relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 ${rankStyles.bg}`}
              >
                {/* Progress bar background */}
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-[rgba(56,189,248,0.2)] to-transparent pointer-events-none"
                  style={{ width: `${percent}%` }}
                />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-sm font-black ${rankStyles.text} bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.1)]`}>
                      {rankStyles.icon || `#${item.rank}`}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-[#f59e0b]">🔒</span>
                      </p>
                      <p className="text-[9px] font-mono text-[#64748b]">ترتيب الساحة الرسمية</p>
                    </div>
                  </div>

                  <span className="font-mono text-base font-black text-[#38bdf8]" dir="ltr">
                    {item.points} <span className="text-[10px] font-bold text-[#94a3b8]">نقطة</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="pt-2 text-center border-t border-[rgba(16,185,129,0.15)]">
        <p className="text-[10px] text-[#64748b] font-bold">
          🔥 التحديث التلقائي الفوري مستمر طوال فترة المهرجان الكشفي
        </p>
      </div>
    </motion.div>
  );
});

const Home = memo(function Home() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [board, setBoard] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // اسم الفريق المسجل ديناميكياً
  const teamName = user?.name || user?.teamName || user?.username || 'الكشاف';

  const fetchInitialData = async () => {
    try {
      const [leaderboardData, newsData] = await Promise.all([
        getLeaderboard().catch(() => []),
        getNews().catch(() => []),
      ]);
      setBoard(leaderboardData);
      setNews(newsData.slice(0, 1));
    } catch (e) {
      console.error('Failed to load home data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    if (socket) {
      socket.on('leaderboard:update', setBoard);
      socket.on('news:published', (story) => setNews((prev) => [story, ...prev.slice(0, 3)]));
      socket.on('news:deleted', ({ id }) => setNews((prev) => prev.filter((n) => n.id !== id)));
      return () => {
        socket.off('leaderboard:update');
        socket.off('news:published');
        socket.off('news:deleted');
      };
    }
  }, [socket]);

  const maxPoints = board[0]?.points || 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6">

        {/* ══════════ HERO DASHBOARD BANNER — بانر الترحيب الديناميكي باسم الفريق ══════════ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hud-frame glass-sheen relative overflow-hidden rounded-[2.5rem] border border-[rgba(16,185,129,0.3)] bg-gradient-to-r from-[#041a15]/95 via-[#031510]/90 to-[#020b0e] p-7 sm:p-10 mb-10 shadow-2xl shadow-black/80"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">

            {/* Right side: Dynamic Welcome & Logged In Team Name */}
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.4)] bg-[rgba(2,11,14,0.8)] px-4 py-1.5 text-xs font-black text-[#38bdf8] backdrop-blur-xl">
                <span className="live-dot" />
                <span>منصة العمليات الكشفية حية</span>
                <Radio size={14} />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                أهلاً <span className="text-fire">{teamName}</span> ⚡
              </h1>

              <p className="text-sm leading-7 text-[#94a3b8]">
                مرحباً بك في لوحة تحكم المخيم الرقمي. ارفع تقرير الفريق وتابع التنبيهات الرسمية وتوجيهات القيادة الكشفية.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 pt-2">
                <Link to="/upload-report" className="btn-ember btn-shine !px-7 !py-3.5 !text-sm font-black">
                  <FileText size={18} />
                  تسليم تقرير
                </Link>
                <Link to="/activities" className="btn-ghost !px-7 !py-3.5 !text-sm font-black">
                  <Trophy size={18} className="text-[#fcd34d]" />
                  المسابقات والأنشطة
                </Link>
              </div>
            </div>

            {/* Left side: Countdown Widget */}
            <div className="flex flex-col items-center md:items-end gap-2 bg-[rgba(2,11,14,0.6)] p-5 rounded-3xl border border-[rgba(16,185,129,0.2)]">
              <span className="text-xs font-black text-[#fcd34d] flex items-center gap-1.5 mb-1">
                <Flame size={15} className="animate-flame" />
                المتبقي على البداية              </span>
              <Countdown />
            </div>

          </div>
        </motion.section>

        {/* ══════════ MAIN DASHBOARD GRID (50% / 50%) ══════════ */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">

          {/* Right Column: Top 5 Anonymized Leaderboard */}
          <div className="lg:col-span-5">
            <CompactLeaderboard board={board} maxPoints={maxPoints} loading={loading} />
          </div>

          {/* Left Column: Live News & Important Broadcast Announcements */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header: عنوان + كل الأخبار inline */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(56,189,248,0.15)] border border-[rgba(56,189,248,0.3)] text-[#38bdf8]">
                <Newspaper size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-white leading-tight">النشرة الإخبارية والقرارات</h2>
                  <Link to="/news" className="inline-flex items-center gap-1 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-2.5 py-0.5 text-[10px] font-black text-[#38bdf8] hover:bg-[rgba(56,189,248,0.18)] transition">
                    كل الأخبار
                    <ChevronLeft size={11} />
                  </Link>
                </div>

              </div>
            </div>

            {loading ? (
              <LoadingSpinner label="جاري تحميل البلاغات..." />
            ) : news.length > 0 ? (
              <NewsCard item={news[0]} />
            ) : (
              <div className="rounded-3xl border border-dashed border-[rgba(16,185,129,0.2)] bg-[rgba(2,11,14,0.4)] p-8 text-center">
                <p className="text-sm font-bold text-[#94a3b8]">لا توجد بلاغات عاجلة حالياً</p>
                <p className="mt-1 text-xs text-[#64748b]">سيتم بث الإعلانات والقرارات الرسمية هنا فور صدورها من القيادة.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
});

export default Home;
