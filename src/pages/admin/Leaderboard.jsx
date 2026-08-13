import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Award, Eye, EyeOff, RefreshCw, Filter, ShieldCheck, ArrowRight, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminLeaderboard, getLeaderboardVisibility, setLeaderboardVisibility, getAdminCompetitions } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

export default function AdminLeaderboard() {
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [visibility, setVisibility] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [selectedComp, setSelectedComp] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideTeamNames, setHideTeamNames] = useState(false);

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

  const filteredStandings = useMemo(() => {
    let list = standings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => (s.teamName || s.label || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.totalScore || b.points || 0) - (a.totalScore || a.points || 0));
  }, [standings, searchQuery]);

  return (
    <main className="app-shell p-4 sm:p-6 text-right dir-rtl">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <AdminBackLink label="لوحة التحكم" />
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Trophy className="text-amber-400" size={26} />
            ترتيب الفرق ولوحة الصدارة الشاملة
          </h1>
        </div>

        {/* Top Control Header */}
        <section className="mb-8 p-5 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
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

        {/* Filters */}
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

          <button
            onClick={loadData}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition bg-slate-800 px-3 py-2 rounded-xl"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث البيانات
          </button>
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-3xl border border-slate-800 flex flex-col items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-purple-400 mb-3" />
            <p className="text-xs font-bold">جاري حساب النقاط والترتيب العام...</p>
          </div>
        ) : filteredStandings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-950 rounded-3xl border border-slate-800">
            <p className="text-sm font-bold">لا توجد نتائج مسجلة حتى الآن.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950 text-slate-400 text-xs font-black border-b border-slate-800">
                <tr>
                  <th className="p-4 text-center">المركز</th>
                  <th className="p-4">الفريق</th>
                  <th className="p-4 text-center">النقاط الإجمالية</th>
                  <th className="p-4 text-center">حالة النتائج</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStandings.map((item, idx) => {
                  const rank = idx + 1;
                  const points = item.totalScore ?? item.points ?? item.total ?? 0;
                  const teamName = hideTeamNames ? `فريق كشفي #${rank} 🎭` : (item.teamName || item.label || 'فريق كشفي');
                  const badgeColor = rank === 1 ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : rank === 2 ? 'bg-slate-300/20 text-slate-200 border-slate-300/40' : rank === 3 ? 'bg-amber-700/20 text-amber-500 border-amber-600/40' : 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <tr key={item.teamId || item.id || idx} className="hover:bg-purple-500/5 transition">
                      <td className="p-4 text-center font-bold">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-black font-mono ${badgeColor}`}>
                          {rank}
                        </span>
                      </td>
                      <td className="p-4 font-black text-white text-base">
                        {teamName}
                      </td>
                      <td className="p-4 text-center font-black font-mono text-purple-300 text-lg">
                        {points}
                      </td>
                      <td className="p-4 text-center text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300 border border-emerald-500/20 font-bold">
                          <ShieldCheck size={13} /> موثقة
                        </span>
                      </td>
                    </tr>
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
