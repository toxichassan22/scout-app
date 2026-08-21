import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Award, Eye, EyeOff, RefreshCw, Filter, ShieldCheck, Medal, ChevronDown, ChevronUp, Sparkles, Layers, BookOpen, Palette, Compass, FlaskConical, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminLeaderboard, getLeaderboardVisibility, setLeaderboardVisibility, getAdminCompetitions } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const DOMAINS = [
  { id: 'all', label: 'المجموع العام', icon: Trophy, color: 'from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/30' },
  { id: 'المجال الديني', label: 'المجال الديني', icon: BookOpen, color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-300 border-emerald-500/30' },
  { id: 'المجال الفني', label: 'المجال الفني', icon: Palette, color: 'from-pink-500/20 to-pink-600/10 text-pink-300 border-pink-500/30' },
  { id: 'المجال الثقافي', label: 'المجال الثقافي', icon: Sparkles, color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-300 border-cyan-500/30' },
  { id: 'المجال الكشفي', label: 'المجال الكشفي', icon: Compass, color: 'from-purple-500/20 to-purple-600/10 text-purple-300 border-purple-500/30' },
  { id: 'المجال العلمي', label: 'المجال العلمي', icon: FlaskConical, color: 'from-blue-500/20 to-blue-600/10 text-blue-300 border-blue-500/30' },
  { id: 'مجال الخدمة العامة', label: 'مجال الخدمة العامة', icon: HeartHandshake, color: 'from-orange-500/20 to-orange-600/10 text-orange-300 border-orange-500/30' },
];

export default function AdminLeaderboard() {
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [visibility, setVisibility] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [activeDomain, setActiveDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideTeamNames, setHideTeamNames] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [standingsRes, visRes, compsRes] = await Promise.all([
        getAdminLeaderboard(),
        getLeaderboardVisibility(),
        getAdminCompetitions()
      ]);
      setStandings(Array.isArray(standingsRes) ? standingsRes : (standingsRes?.data || standingsRes?.items || standingsRes?.teams || standingsRes?.standings || []));
      setVisibility(Boolean(visRes?.visible));
      setCompetitions(Array.isArray(compsRes) ? compsRes : []);
    } catch (err) {
      console.error('Failed to load admin leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleVisibility = async () => {
    const nextState = !visibility;
    const confirmMsg = nextState
      ? 'سيتم إظهار لوحة الصدارة والترتيب لجميع الفرق. هل تريد المتابعة؟'
      : 'سيتم إخفاء لوحة الصدارة والترتيب عن الفرق. هل تريد المتابعة؟';
    if (!confirm(confirmMsg)) return;

    setTogglingVisibility(true);
    try {
      const result = await setLeaderboardVisibility(nextState);
      setVisibility(Boolean(result.visible));
      alert(result.visible ? '📢 تم إظهار الترتيب والنتائج لجميع الفرق بنجاح!' : '🔒 تم حجب وإخفاء النتائج عن الفرق بنجاح!');
    } catch (err) {
      alert(err.message || 'فشل في تغيير إعدادات رؤية النتائج');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const processedStandings = useMemo(() => {
    let list = [...standings];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => (s.teamName || s.label || '').toLowerCase().includes(q));
    }

    if (activeDomain === 'all') {
      return list.sort((a, b) => (Number(b.totalScore || b.points || 0)) - (Number(a.totalScore || a.points || 0)));
    }

    // Rank specifically by active domain score
    return list.sort((a, b) => {
      const aField = Number(a.fieldTotals?.[activeDomain] || 0);
      const bField = Number(b.fieldTotals?.[activeDomain] || 0);
      if (bField !== aField) return bField - aField;
      return (Number(b.totalScore || 0)) - (Number(a.totalScore || 0));
    });
  }, [standings, searchQuery, activeDomain]);

  // Statistics for current view
  const stats = useMemo(() => {
    if (processedStandings.length === 0) return { topTeam: '—', topScore: 0, avgScore: 0 };
    const scores = processedStandings.map(t => {
      if (activeDomain === 'all') return Number(t.totalScore || t.points || 0);
      return Number(t.fieldTotals?.[activeDomain] || 0);
    });
    const topScore = Math.max(...scores, 0);
    const sum = scores.reduce((acc, v) => acc + v, 0);
    const avgScore = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : 0;
    const topTeamObj = processedStandings[0];
    const topTeam = topTeamObj ? (topTeamObj.label || topTeamObj.teamName || '—') : '—';
    return { topTeam, topScore, avgScore };
  }, [processedStandings, activeDomain]);

  const toggleExpand = (id) => {
    setExpandedTeamId(prev => prev === id ? null : id);
  };

  return (
    <main className="app-shell p-4 sm:p-6 text-right dir-rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <AdminBackLink label="لوحة التحكم" />
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Trophy className="text-amber-400 shrink-0" size={28} />
            ترتيب الفرق ولوحة الصدارة الشاملة
          </h1>
        </div>

        {/* Top Control Header */}
        <section className="mb-6 p-5 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Medal size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">إظهار/إخفاء النتائج للفرق</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                الحالة الحالية: <span className={visibility ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{visibility ? 'ظاهرة للجميع ✅' : 'محجوبة عن الفرق 🔒'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Anonymous Mode Button */}
            <button
              type="button"
              onClick={() => setHideTeamNames(!hideTeamNames)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black transition border shadow-lg ${
                hideTeamNames
                  ? 'bg-purple-900/40 text-purple-200 border-purple-500/40 hover:bg-purple-900/60'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {hideTeamNames ? <EyeOff size={16} className="text-purple-400" /> : <Eye size={16} className="text-slate-400" />}
              {hideTeamNames ? '🎭 أسماء الفرق مخفية (سري)' : '🏷️ إخفاء أسماء الفرق بالشاشة'}
            </button>

            {/* Public Reveal Button */}
            <button
              type="button"
              onClick={handleToggleVisibility}
              disabled={togglingVisibility}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition shadow-lg ${
                visibility
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {visibility ? <EyeOff size={16} /> : <Eye size={16} />}
              {togglingVisibility ? 'جاري التعديل...' : visibility ? '🔒 حجب النتائج عن الفرق' : '📢 إظهار الترتيب للفرق الآن'}
            </button>
          </div>
        </section>

        {/* Domain Navigation Tabs */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-300 flex items-center gap-2">
              <Layers size={18} className="text-cyan-400" />
              اختر المجال لعرض الترتيب والنتائج المفصلة:
            </h2>
            <span className="text-xs text-slate-400">
              {activeDomain === 'all' ? 'عرض المجموع العام الشامل' : `عرض نتائج ${activeDomain} + المجموع العام`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {DOMAINS.map(domain => {
              const Icon = domain.icon;
              const isActive = activeDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => {
                    setActiveDomain(domain.id);
                    setExpandedTeamId(null);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1.5 shadow-sm ${
                    isActive
                      ? `bg-gradient-to-b ${domain.color} border-current ring-2 ring-white/20 font-black scale-[1.02]`
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="text-xs font-bold leading-tight">{domain.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick Stat Summary Cards */}
        <section className="mb-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.08] p-4 text-cyan-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-cyan-300">الفرق المشاركة</span>
              <strong className="block text-2xl font-black text-white mt-1">{processedStandings.length}</strong>
            </div>
            <Award size={28} className="text-cyan-400 opacity-80" />
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-amber-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300">
                {activeDomain === 'all' ? 'المتصدر العام' : `متصدر ${activeDomain}`}
              </span>
              <strong className="block text-lg font-black text-white mt-1 truncate max-w-[180px]">
                {hideTeamNames ? 'فريق كشفي #1 🎭' : stats.topTeam}
              </strong>
              <span className="text-[11px] text-amber-300 font-mono font-bold">{stats.topScore} نقطة</span>
            </div>
            <Trophy size={28} className="text-amber-400 opacity-80" />
          </div>

          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/[0.08] p-4 text-purple-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-300">
                {activeDomain === 'all' ? 'متوسط المجموع العام' : `متوسط نقاط ${activeDomain}`}
              </span>
              <strong className="block text-2xl font-black text-white mt-1 font-mono">{stats.avgScore}</strong>
              <span className="text-[10px] text-slate-400">نقطة لكل فريق</span>
            </div>
            <Sparkles size={28} className="text-purple-400 opacity-80" />
          </div>
        </section>

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ابحث باسم الفريق..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field min-h-10 text-xs w-full sm:w-64"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-bold">
              الترتيب الحالي: <strong className="text-white">{activeDomain === 'all' ? 'المجموع العام الشامل' : activeDomain}</strong>
            </span>
            <button
              onClick={loadData}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition bg-slate-800 px-3 py-2 rounded-xl"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث البيانات
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-purple-400 mb-3" />
            <p className="text-xs font-bold">جاري حساب النقاط وترتيب الفرق في {activeDomain === 'all' ? 'المجموع العام' : activeDomain}...</p>
          </div>
        ) : processedStandings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-3xl border border-slate-800">
            <p className="text-sm font-bold">لا توجد نتائج مسجلة حتى الآن.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950 text-slate-400 text-xs font-black border-b border-slate-800">
                <tr>
                  <th className="p-4 text-center w-16">المركز</th>
                  <th className="p-4">الفريق</th>
                  {activeDomain !== 'all' ? (
                    <>
                      <th className="p-4 text-center text-cyan-300">
                        نتيجة {activeDomain}
                      </th>
                      <th className="p-4 text-center text-amber-300">
                        المجموع العام
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 text-center hidden md:table-cell">تفصيل المجالات الستة</th>
                      <th className="p-4 text-center text-amber-300">المجموع العام</th>
                    </>
                  )}
                  <th className="p-4 text-center w-28">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {processedStandings.map((item, idx) => {
                  const rank = idx + 1;
                  const totalPoints = item.totalScore ?? item.points ?? item.total ?? 0;
                  const fieldPoints = activeDomain !== 'all' ? (item.fieldTotals?.[activeDomain] || 0) : 0;
                  const teamName = hideTeamNames ? `فريق كشفي #${rank} 🎭` : (item.label || item.teamName || 'فريق كشفي');
                  const badgeColor = rank === 1
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 ring-2 ring-amber-400/30'
                    : rank === 2
                      ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                      : rank === 3
                        ? 'bg-amber-700/20 text-amber-500 border-amber-600/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700';

                  const isExpanded = expandedTeamId === (item.id || item.teamId || idx);
                  const teamScores = item.scores || [];
                  const domainScores = activeDomain !== 'all'
                    ? teamScores.filter(s => s.field === activeDomain)
                    : teamScores;

                  return (
                    <React.Fragment key={item.id || item.teamId || idx}>
                      <tr className="hover:bg-purple-500/5 transition">
                        <td className="p-4 text-center font-bold">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-black font-mono ${badgeColor}`}>
                            {rank}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-black text-white text-base">
                            {teamName}
                          </div>
                          {item.username && !hideTeamNames && (
                            <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                              @{item.username}
                            </span>
                          )}
                        </td>

                        {activeDomain !== 'all' ? (
                          <>
                            {/* Domain Score */}
                            <td className="p-4 text-center">
                              <div className="inline-flex flex-col items-center justify-center rounded-2xl bg-cyan-950/40 border border-cyan-500/30 px-4 py-2">
                                <span className="font-mono font-black text-cyan-300 text-xl leading-none">
                                  {fieldPoints}
                                </span>
                                <span className="text-[10px] text-cyan-400/70 font-bold mt-1">نقطة في المجال</span>
                              </div>
                            </td>

                            {/* Overall Total Score */}
                            <td className="p-4 text-center">
                              <div className="inline-flex flex-col items-center justify-center rounded-2xl bg-amber-950/30 border border-amber-500/20 px-4 py-2">
                                <span className="font-mono font-black text-amber-300 text-lg leading-none">
                                  {totalPoints}
                                </span>
                                <span className="text-[10px] text-amber-400/70 font-bold mt-1">المجموع العام</span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* 6 Fields Breakdown in Overall View */}
                            <td className="p-4 hidden md:table-cell">
                              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                                {DOMAINS.filter(d => d.id !== 'all').map(d => {
                                  const pts = item.fieldTotals?.[d.id] || 0;
                                  return (
                                    <span
                                      key={d.id}
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${
                                        pts > 0 ? 'bg-slate-800/80 text-slate-200 border-slate-700' : 'bg-slate-950/40 text-slate-500 border-slate-800'
                                      }`}
                                      title={d.label}
                                    >
                                      <span>{d.label.replace('المجال ', '').replace('مجال ', '')}:</span>
                                      <strong className={`font-mono ${pts > 0 ? 'text-white' : 'text-slate-500'}`}>{pts}</strong>
                                    </span>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Overall Total */}
                            <td className="p-4 text-center">
                              <div className="inline-flex flex-col items-center justify-center rounded-2xl bg-amber-950/40 border border-amber-500/30 px-5 py-2">
                                <span className="font-mono font-black text-amber-300 text-xl leading-none">
                                  {totalPoints}
                                </span>
                                <span className="text-[10px] text-amber-400/70 font-bold mt-1">المجموع العام</span>
                              </div>
                            </td>
                          </>
                        )}

                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id || item.teamId || idx)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition"
                          >
                            <span>تفاصيل</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-table */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={activeDomain !== 'all' ? 5 : 5} className="p-4">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-xs font-black text-slate-300">
                                  تفاصيل مسابقات {activeDomain === 'all' ? 'كل المجالات' : activeDomain} للفريق
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  إجمالي المسابقات المسجلة: {domainScores.length}
                                </span>
                              </div>

                              {domainScores.length === 0 ? (
                                <p className="text-xs text-slate-500 py-3 text-center">لم تسجل درجات في هذا المجال بعد لهذا الفريق.</p>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                  {domainScores.map(score => (
                                    <div key={score.id || score.competitionId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-white truncate">{score.competitionName}</p>
                                        <span className="text-[10px] text-slate-400">{score.field}</span>
                                      </div>
                                      <span className="font-mono font-black text-cyan-300 text-sm px-2 py-1 rounded bg-slate-900 border border-slate-800">
                                        {score.total} نقطة
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

