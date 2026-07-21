import { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Flame, Trophy, Crown, Compass, Sparkles, FileText, ChevronLeft, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getLeaderboard, getNews } from '../services/api';
import { FESTIVAL_DETAILS } from '../data/mockData';
import NewsCard from '../components/NewsCard';
import { FloatSettings } from '../components/FloatSettings';

/* ─── Neural Grid Background Effect ─── */
const DigitalGridBackground = memo(function DigitalGridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0,transparent_100%)]" />
      <div className="ai-node" style={{ left: '15%', top: '20%' }} />
      <div className="ai-node" style={{ left: '85%', top: '35%' }} />
      <div className="ai-node" style={{ left: '45%', top: '75%' }} />
    </div>
  );
});

const Home = memo(function Home() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [board, setBoard] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      const [leaderboardData, newsData] = await Promise.all([
        getLeaderboard().catch(() => []),
        getNews().catch(() => [])
      ]);
      setBoard(leaderboardData);
      setNews(newsData.slice(0, 2));
    } catch (e) {
      console.error('Failed to load home data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    if (socket) {
      socket.on('leaderboard:update', (updatedBoard) => {
        setBoard(updatedBoard);
      });

      socket.on('news:published', (newStory) => {
        setNews((prev) => [newStory, ...prev.slice(0, 1)]);
      });

      socket.on('news:deleted', ({ id }) => {
        setNews((prev) => prev.filter((item) => item.id !== id));
      });

      return () => {
        socket.off('leaderboard:update');
        socket.off('news:published');
        socket.off('news:deleted');
      };
    }
  }, [socket]);

  const first = board[0];
  const second = board[1];
  const third = board[2];
  const rest = board.slice(3);

  const firstPoints = first ? first.points : 0;
  const secondPoints = second ? second.points : 0;
  const thirdPoints = third ? third.points : 0;

  const diffFirstSecond = first && second ? Math.round((firstPoints - secondPoints) * 10) / 10 : 0;

  return (
    <main className="page-shell relative text-right dir-rtl">
      <DigitalGridBackground />
      <FloatSettings />

      {/* Modern Top Header Banner */}
      <header className="glass-card mb-6 p-4 sm:p-6 border border-emerald-500/20 bg-slate-950/70 shadow-2xl rounded-3xl">
        <div className="flex items-center justify-between gap-4">
          {/* Logo 1 */}
          <div className="shrink-0">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2 flex items-center justify-center shadow-glow-green hover:scale-105 transition">
              <img src={FESTIVAL_DETAILS.logo} alt="شعار المهرجان" className="h-full w-full object-contain" />
            </div>
          </div>

          {/* Title Branding */}
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-1">
              <Zap size={13} className="animate-pulse" />
              <span>المهرجان الكشفي الرقمي 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gradient">
              كشفيتي بفكر ديجيتال
            </h1>
          </div>

          {/* Logo 2 */}
          <div className="shrink-0">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2 flex items-center justify-center text-amber-400 font-black text-xs text-center hover:scale-105 transition">
              منشية<br />التحرير
            </div>
          </div>
        </div>
      </header>

      {/* Scout Welcome Banner */}
      <section className="glass-card mb-8 p-5 sm:p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-glow-amber shrink-0">
              <Flame size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-400">لوحة الفرق الكشفية</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                مرحباً بك في ساحة التنافس الكشفي الحي
              </h2>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-300">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>الحساب مؤمن والبيانات لحظية</span>
          </div>
        </div>
      </section>

      {/* 🏆 Interactive 3D Podium (The Star Leaderboard) */}
      <section className="glass-card mb-10 p-6 sm:p-8 rounded-3xl border border-amber-500/20 bg-slate-950/60 relative">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            تحديث حي ومباشر (مجهول الفرق)
          </span>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            لوحة التتويج وشرف المخيم
            <Trophy size={24} className="text-amber-400 animate-bounce" />
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <div className="mx-auto h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            جاري احتساب الترتيب الفوري...
          </div>
        ) : (
          <div>
            {/* The 3D Podium Blocks */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-6 pb-6">
              
              {/* 🥈 2nd Place (Silver) */}
              <div className="order-1 flex flex-col items-center">
                {second ? (
                  <div className="w-full glass-card-silver p-4 sm:p-5 text-center flex flex-col items-center">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-slate-200/10 border border-slate-300/30 flex items-center justify-center text-slate-200 font-black text-lg mb-3 shadow-lg">
                      2
                    </div>
                    <span className="text-xs font-black text-slate-200">المركز الثاني</span>
                    <span className="text-base sm:text-xl font-mono font-black text-slate-100 mt-2">
                      {secondPoints} <span className="text-xs text-slate-400">نقطة</span>
                    </span>
                  </div>
                ) : (
                  <div className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-600">
                    المركز 2
                  </div>
                )}
              </div>

              {/* 👑 1st Place (Gold) - Elevated */}
              <div className="order-2 flex flex-col items-center -translate-y-4">
                {first ? (
                  <div className="w-full glass-card-gold p-5 sm:p-6 text-center flex flex-col items-center relative">
                    {/* Animated Gold Crown */}
                    <div className="absolute -top-6 animate-crown text-amber-400">
                      <Crown size={36} fill="#f59e0b" />
                    </div>

                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-2xl mb-3 shadow-glow-amber mt-2">
                      1
                    </div>
                    <span className="text-sm font-black text-gradient-gold">المركز الأول</span>

                    {second && (
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-1">
                        +{diffFirstSecond} ن عن الثاني
                      </span>
                    )}

                    <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 mt-2">
                      {firstPoints} <span className="text-xs text-amber-300">نقطة</span>
                    </span>
                  </div>
                ) : (
                  <div className="w-full p-6 rounded-2xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-600">
                    المركز 1
                  </div>
                )}
              </div>

              {/* 🥉 3rd Place (Bronze) */}
              <div className="order-3 flex flex-col items-center">
                {third ? (
                  <div className="w-full glass-card-bronze p-4 sm:p-5 text-center flex flex-col items-center">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-amber-700/20 border border-amber-600/30 flex items-center justify-center text-amber-500 font-black text-lg mb-3 shadow-lg">
                      3
                    </div>
                    <span className="text-xs font-black text-amber-300">المركز الثالث</span>
                    <span className="text-base sm:text-xl font-mono font-black text-amber-400 mt-2">
                      {thirdPoints} <span className="text-xs text-amber-500">نقطة</span>
                    </span>
                  </div>
                ) : (
                  <div className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-600">
                    المركز 3
                  </div>
                )}
              </div>

            </div>

            {/* Rest of Competitors List */}
            {rest.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 mb-3">باقي المراكز التنافسية</h3>
                {rest.map((item) => (
                  <div
                    key={item.rank}
                    className="glass-card p-3.5 rounded-2xl flex items-center justify-between border-white/5 bg-slate-900/40 hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black flex items-center justify-center">
                        #{item.rank}
                      </span>
                      <span className="text-xs font-bold text-slate-300">المركز الرقمي {item.rank}</span>
                      {item.gapToNext > 0 && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          (-{item.gapToNext} ن عن السابق)
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-mono font-black text-emerald-400">{item.points} نقطة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Shortcuts & Quick Actions Grid */}
      <section className="mb-10">
        <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
          الوصول السريع لخدمات المهرجان
          <Sparkles size={18} className="text-emerald-400" />
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/activities"
            className="glass-card p-5 rounded-3xl text-right group hover:border-emerald-500/40 flex flex-col justify-between"
          >
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition">الأنشطة والمسابقات</h3>
              <p className="text-[11px] text-slate-400 mt-1">التحديات الرقمية والميدانية</p>
            </div>
          </Link>

          <Link
            to="/program"
            className="glass-card p-5 rounded-3xl text-right group hover:border-blue-500/40 flex flex-col justify-between"
          >
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition">البرنامج والخريطة</h3>
              <p className="text-[11px] text-slate-400 mt-1">جدول المواعيد والمناطق</p>
            </div>
          </Link>

          <Link
            to="/upload-report"
            className="glass-card p-5 rounded-3xl text-right group hover:border-amber-500/40 flex flex-col justify-between"
          >
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white group-hover:text-amber-400 transition">رفع التقارير</h3>
              <p className="text-[11px] text-slate-400 mt-1">تسليم ملفات الإنجاز</p>
            </div>
          </Link>

          <Link
            to="/news"
            className="glass-card p-5 rounded-3xl text-right group hover:border-rose-500/40 flex flex-col justify-between"
          >
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Newspaper size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white group-hover:text-rose-400 transition">الجريدة الرقمية</h3>
              <p className="text-[11px] text-slate-400 mt-1">التوجيهات والقرارات الحية</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Latest Official News Preview */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link to="/news" className="text-xs font-extrabold text-emerald-400 hover:underline flex items-center gap-1">
            مشاهدة كل الأخبار <ChevronLeft size={14} />
          </Link>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            آخر الأخبار الرسمية
            <Newspaper size={18} className="text-emerald-400" />
          </h2>
        </div>

        {news.length === 0 ? (
          <div className="glass-card p-6 text-center text-slate-500 text-xs rounded-2xl">
            لا توجد أخبار جديدة حالياً
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
});

export default Home;
