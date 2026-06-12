import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Flame, Mountain, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';
import { FESTIVAL_DETAILS } from '../data/mockData';
import NewsCard from '../components/NewsCard';
import { NavCircle } from '../components/NavCircle';
import { FloatSettings } from '../components/FloatSettings';

/* ─── AI Neural Network Background ─── */
const AIBackground = memo(function AIBackground() {
  return (
    <div className="ai-grid-bg" aria-hidden="true">
      {/* Grid dots */}
      <div className="ai-node" style={{ left: '15%', top: '20%' }} />
      <div className="ai-node" />
      <div className="ai-node" />
      <div className="ai-node" />
      <div className="ai-node" />

      {/* Neural Network SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.35 }}
      >
        {/* Connection lines */}
        <g stroke="var(--green)" strokeWidth="1" fill="none" opacity="0.4">
          {/* Layer 1 → Layer 2 */}
          <line x1="120" y1="150" x2="320" y2="120"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" /></line>
          <line x1="120" y1="150" x2="320" y2="250"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="5s" repeatCount="indefinite" /></line>
          <line x1="120" y1="150" x2="320" y2="380"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="3.5s" repeatCount="indefinite" /></line>
          <line x1="120" y1="300" x2="320" y2="120"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="4.5s" repeatCount="indefinite" /></line>
          <line x1="120" y1="300" x2="320" y2="250"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" repeatCount="indefinite" /></line>
          <line x1="120" y1="300" x2="320" y2="380"><animate attributeName="opacity" values="0.3;0.5;0.3" dur="5.5s" repeatCount="indefinite" /></line>
          <line x1="120" y1="450" x2="320" y2="250"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" /></line>
          <line x1="120" y1="450" x2="320" y2="380"><animate attributeName="opacity" values="0.3;0.5;0.3" dur="3.8s" repeatCount="indefinite" /></line>

          {/* Layer 2 → Layer 3 */}
          <line x1="320" y1="120" x2="540" y2="200"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="4.2s" repeatCount="indefinite" /></line>
          <line x1="320" y1="120" x2="540" y2="350"><animate attributeName="opacity" values="0.3;0.5;0.3" dur="3.6s" repeatCount="indefinite" /></line>
          <line x1="320" y1="250" x2="540" y2="200"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" repeatCount="indefinite" /></line>
          <line x1="320" y1="250" x2="540" y2="350"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" /></line>
          <line x1="320" y1="380" x2="540" y2="200"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="3.5s" repeatCount="indefinite" /></line>
          <line x1="320" y1="380" x2="540" y2="350"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="4.8s" repeatCount="indefinite" /></line>

          {/* Layer 3 → Output */}
          <line x1="540" y1="200" x2="700" y2="275"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" /></line>
          <line x1="540" y1="350" x2="700" y2="275"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="4s" repeatCount="indefinite" /></line>
        </g>

        {/* Neural nodes */}
        <g fill="var(--green)" opacity="0.6">
          {/* Input layer */}
          <circle cx="120" cy="150" r="5"><animate attributeName="r" values="4;7;4" dur="3s" repeatCount="indefinite" /></circle>
          <circle cx="120" cy="300" r="5"><animate attributeName="r" values="5;8;5" dur="4s" repeatCount="indefinite" /></circle>
          <circle cx="120" cy="450" r="5"><animate attributeName="r" values="4;6;4" dur="3.5s" repeatCount="indefinite" /></circle>

          {/* Hidden layer 1 */}
          <circle cx="320" cy="120" r="6"><animate attributeName="r" values="5;8;5" dur="3.8s" repeatCount="indefinite" /></circle>
          <circle cx="320" cy="250" r="6"><animate attributeName="r" values="4;7;4" dur="4.2s" repeatCount="indefinite" /></circle>
          <circle cx="320" cy="380" r="6"><animate attributeName="r" values="5;8;5" dur="3.2s" repeatCount="indefinite" /></circle>

          {/* Hidden layer 2 */}
          <circle cx="540" cy="200" r="6"><animate attributeName="r" values="5;9;5" dur="4s" repeatCount="indefinite" /></circle>
          <circle cx="540" cy="350" r="6"><animate attributeName="r" values="4;8;4" dur="3.5s" repeatCount="indefinite" /></circle>

          {/* Output */}
          <circle cx="700" cy="275" r="8" fill="var(--amber)" opacity="0.7"><animate attributeName="r" values="6;12;6" dur="2.5s" repeatCount="indefinite" /></circle>
        </g>

        {/* Layer labels */}
        <g fill="var(--green)" fontSize="10" fontFamily="monospace" opacity="0.3">
          <text x="120" y="520" textAnchor="middle">INPUT</text>
          <text x="320" y="520" textAnchor="middle">HIDDEN</text>
          <text x="540" y="520" textAnchor="middle">HIDDEN</text>
          <text x="700" y="520" textAnchor="middle">OUTPUT</text>
        </g>
      </svg>
    </div>
  );
});

const Home = memo(function Home() {
  const { user } = useAuth();
  const { news, getOverallLeaderboard } = useCompetitions();
  const approvedNews = news.filter((item) => item.status === 'approved').slice(0, 2);

  return (
    <main className="page-shell relative">
      <AIBackground />
      <FloatSettings />

      {/* Header: 3 Logos */}
      <header className="card-sheen relative z-10 mb-6 rounded-2xl border border-emerald-500/10 bg-white/[0.02] px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center justify-between gap-4 py-4">
          {/* Right logo (fest) */}
          <div className="shrink-0">
            <div className="animate-soft-float h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-emerald-500/15 bg-white/5 p-1.5 overflow-hidden transition duration-300 hover:scale-105 hover:shadow-glow-green">
              <img src={FESTIVAL_DETAILS.logo} alt="شعار المهرجان" className="h-full w-full object-contain" />
            </div>
          </div>

          {/* Center: شعار كشفيتي بفكر ديجيتال */}
          <div className="flex-1 text-center">
            <div className="inline-flex flex-col items-center gap-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gradient leading-snug pb-0.5">
                {FESTIVAL_DETAILS.name}
              </h1>
              <span className="text-xs sm:text-sm font-medium text-primary/80 tracking-wide">
                {FESTIVAL_DETAILS.subtitle}
              </span>
            </div>
          </div>

          {/* Left logo (منشية) */}
          <div className="shrink-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/10 to-transparent p-1.5 overflow-hidden flex items-center justify-center transition duration-300 hover:scale-105 hover:shadow-glow-amber">
              <span className="text-[10px] font-bold text-amber-400/80 text-center leading-tight">
                منشية<br />التحرير
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome badge */}
      <section className="relative z-10 mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-bold text-amber-400 shadow-glow-amber">
          <Flame size={16} />
          مرحباً، {user?.name}
        </div>
      </section>

      {/* Nav Circle */}
      <section className="relative z-10 mb-6">
        <NavCircle />
      </section>

      {/* Leaderboard Section */}
      <section className="card-sheen relative z-10 mb-8 card border-slate-800 bg-slate-950/40 p-6 text-right">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <span className="text-xs text-primary font-bold bg-primary/10 border border-primary/20 rounded-full px-3 py-1">ترتيب النقاط الكلي</span>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            لوحة شرف المهرجان الكشفي
            <Trophy size={20} className="text-amber-500 animate-pulse" />
          </h2>
        </div>

        {/* Podium Layout */}
        {(() => {
          const board = getOverallLeaderboard();
          const first = board[0];
          const second = board[1];
          const third = board[2];
          const rest = board.slice(3);

          const firstScore = first ? Number(first.score || 0) : 0;
          const secondScore = second ? Number(second.score || 0) : 0;
          const thirdScore = third ? Number(third.score || 0) : 0;

          const diffFirstSecond = firstScore - secondScore;
          const diffThirdSecond = secondScore - thirdScore;

          return (
            <div className="space-y-6">
              {/* The 3 Podium Blocks */}
              <div className="flex items-end justify-center gap-2 sm:gap-6 pt-8 pb-4">
                {/* 2nd Place */}
                {second && (
                  <div className="flex flex-col items-center flex-1 max-w-[120px]">
                    <div className="text-center mb-6">
                      <p className="text-xs font-black text-slate-100 truncate w-24 sm:w-28">المركز الثاني</p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">ـ</span>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">{secondScore} نقطة</span>
                    </div>
                    <div className="w-full bg-slate-800/80 border-t border-x border-slate-700 rounded-t-xl flex flex-col items-center justify-center p-3 h-24 relative shadow-lg">
                      <div className="absolute -top-4 bg-slate-600 text-white rounded-full h-8 w-8 flex items-center justify-center border-2 border-slate-800 text-xs font-black">2</div>
                      <Trophy size={28} className="text-slate-400 mt-2" />
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {first && (
                  <div className="flex flex-col items-center flex-1 max-w-[130px] -translate-y-3">
                    <div className="text-center mb-7">
                      <p className="text-sm font-black text-amber-400 truncate w-24 sm:w-32">المركز الأول</p>
                      <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">+{diffFirstSecond} نقطة عن الثاني</span>
                      <span className="text-xs font-mono text-amber-500 font-bold block mt-0.5">{firstScore} نقطة</span>
                    </div>
                    <div className="w-full bg-amber-950/20 border-t border-x border-amber-500/40 rounded-t-2xl flex flex-col items-center justify-center p-3 h-32 relative shadow-glow-amber">
                      <div className="absolute -top-5 bg-amber-500 text-slate-950 rounded-full h-10 w-10 flex items-center justify-center border-2 border-slate-800 text-sm font-black shadow-glow-amber">1</div>
                      <Trophy size={36} className="text-amber-400 mt-2 animate-bounce" />
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {third && (
                  <div className="flex flex-col items-center flex-1 max-w-[110px]">
                    <div className="text-center mb-6">
                      <p className="text-xs font-black text-amber-700 truncate w-24 sm:w-28">المركز الثالث</p>
                      <span className="text-[10px] text-rose-400 font-bold block mt-0.5">-{diffThirdSecond} نقطة عن الثاني</span>
                      <span className="text-[11px] font-mono text-amber-700 block mt-0.5">{thirdScore} نقطة</span>
                    </div>
                    <div className="w-full bg-amber-900/10 border-t border-x border-amber-800/30 rounded-t-xl flex flex-col items-center justify-center p-3 h-20 relative shadow-lg">
                      <div className="absolute -top-4 bg-amber-700 text-white rounded-full h-8 w-8 flex items-center justify-center border-2 border-slate-800 text-xs font-black">3</div>
                      <Trophy size={24} className="text-amber-700 mt-2" />
                    </div>
                  </div>
                )}
              </div>

              {/* Remaining Leaders (باقي الأوائل) */}
              {rest.length > 0 && (
                <div className="border-t border-slate-800/80 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 mb-3 pr-1 text-right">باقي المراكز</h3>
                  <div className="grid gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {rest.map((item, index) => (
                      <div key={index} className="flex justify-between items-center rounded-xl bg-slate-900/40 border border-slate-800/60 p-3 text-right">
                        <span className="font-mono text-xs text-slate-400 font-bold">{item.score} نقطة</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">المركز {index + 4}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {index + 4}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* News */}
      <section className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Link to="/news" className="text-xs font-bold text-primary hover:text-primary-light transition">
            عرض الكل ←
          </Link>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            آخر الأخبار
            <Newspaper size={20} className="text-slate-500" />
          </h2>
        </div>
        {approvedNews.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
            <Mountain size={40} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm font-medium">لا توجد أخبار منشورة حالياً</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {approvedNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
});

export default Home;
