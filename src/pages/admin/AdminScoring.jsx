import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Edit3, FileText, Lock, Save, Trash2, Trophy, Unlock, Users, X } from 'lucide-react';
import { deleteScore, getScoreBreakdown, lockScore, unlockScore, updateScoreOverride } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const json = value => {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : value || {}; } catch { return {}; }
};

const byArabic = (a, b) => String(a).localeCompare(String(b), 'ar');

const getMaxScore = competition => {
  if (!competition) return 0;
  try {
    const criteria = typeof competition.criteria === 'string'
      ? JSON.parse(competition.criteria || '[]')
      : competition.criteria;
    if (Array.isArray(criteria) && criteria.length > 0) {
      return criteria.reduce((sum, criterion) => {
        const max = Number(criterion?.maxScore);
        return sum + (Number.isFinite(max) && max >= 0 ? max : 0);
      }, 0);
    }
  } catch {}
  if (competition.type === 'manual_judged') return 0;
  const questionCount = Number(competition.questionCount);
  return Number.isFinite(questionCount) && questionCount > 0 ? questionCount : 0;
};

const StatCard = ({ label, value, hint, tone, icon: Icon }) => (
  <div className={`rounded-2xl border p-4 ${tone}`}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-300">{label}</span>
      <Icon size={18} className="opacity-80" />
    </div>
    <strong className="block text-3xl font-black tabular-nums text-white">{value}</strong>
    <span className="mt-1 block text-[11px] font-bold opacity-70">{hint}</span>
  </div>
);

const ScoreCard = ({ score, editing, total, values, saving, deleting, onBegin, onSave, onCancel, onTotalChange, onValuesChange, onUnlock, onLock, onDelete }) => {
  const isEditing = editing === score.id;
  const maxScore = getMaxScore(score.competition);
  const exceedsLimit = !score.isVirtual && Number(score.total) > maxScore;

  const judgesList = score.judgeScores?.length
    ? score.judgeScores
        .map(js => {
          const name = js.judge?.name || 'محكّم';
          const username = js.judge?.username ? ` (@${js.judge.username})` : '';
          return `${name}${username}`;
        })
        .join('، ')
    : null;

  if (score.isVirtual) {
    return (
      <article className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/35 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-300">{score.competition?.name || 'مسابقة غير محددة'}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-600">لم تبدأ مشاركة الفريق في هذه المسابقة</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-black text-slate-500">صفر افتراضي</span>
            <strong className="rounded-xl bg-slate-950 px-3 py-2 text-lg font-black text-slate-500">0 / {maxScore}</strong>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`overflow-hidden rounded-2xl border bg-slate-900/70 transition ${isEditing ? 'border-cyan-400/50 shadow-lg shadow-cyan-950/20' : 'border-white/10 hover:border-white/20'}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{score.competition?.name || 'مسابقة غير محددة'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${score.isFinal ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>
              {score.isFinal ? <Lock size={12} /> : <Unlock size={12} />}
              {score.isFinal ? 'نهائي مقفل' : 'مفتوح للتعديل'}
            </span>
            {judgesList ? (
              <span className="font-bold text-sky-300">
                المحكّم: <strong className="text-white">{judgesList}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">المحكّم: لم يُسجّل بعد</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <div className="rounded-xl bg-slate-950 px-4 py-2 text-center">
            <strong className={`block text-xl font-black leading-none ${exceedsLimit ? 'text-red-300' : 'text-emerald-300'}`}>{score.total}</strong>
            <span className="mt-1 block text-[10px] font-bold text-slate-500">من {maxScore}</span>
          </div>
          {exceedsLimit && <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-black text-red-200">تجاوز الحد</span>}
        </div>
      </div>

      {isEditing ? (
        <form className="mx-4 mb-4 rounded-xl border border-cyan-400/25 bg-cyan-950/15 p-4" onSubmit={event => { event.preventDefault(); onSave(score); }}>
          <div className="mb-3">
            <h3 className="font-black text-white">تعديل الدرجة</h3>
            <p className="mt-1 text-[11px] text-slate-500">الحد الأقصى للمسابقة: {maxScore} نقطة.</p>
          </div>
          <label className="block text-xs font-black text-slate-300">الدرجة النهائية
            <input type="number" step="0.5" min="0" max={maxScore} className="ai-input mt-1 w-full text-lg font-black" value={total} onChange={event => onTotalChange(event.target.value)} autoFocus />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"><Save size={15} />{saving ? 'جاري الحفظ...' : 'حفظ الدرجة'}</button>
            <button type="button" onClick={onCancel} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"><X size={15} /> إلغاء</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={() => onBegin(score)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-400"><Edit3 size={15} /> تعديل الدرجة</button>
          {score.isFinal ? <button type="button" onClick={() => onUnlock(score)} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-400/20"><Unlock size={15} /> فتح التعديل</button>
            : <button type="button" onClick={() => onLock(score)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-xs font-black text-emerald-200 transition hover:bg-emerald-400/20"><Lock size={15} /> قفل التعديل</button>}
          <button type="button" onClick={() => onDelete(score)} disabled={deleting === score.id} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-60"><Trash2 size={15} />{deleting === score.id ? 'جاري الحذف...' : 'حذف الدرجة'}</button>
        </div>
      )}
    </article>
  );
};

const AdminScoring = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [total, setTotal] = useState('');
  const [values, setValues] = useState('{}');
  const [competitionId, setCompetitionId] = useState('');
  const [teamId, setTeamId] = useState('');

  const load = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try { setScores(await getScoreBreakdown()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(true).catch(console.error); }, []);

  const competitions = useMemo(() => {
    const found = new Map();
    scores.forEach(score => { if (score.competition) found.set(score.competition.id, score.competition); });
    return [...found.values()].sort((a, b) => byArabic(a.name, b.name));
  }, [scores]);

  const teams = useMemo(() => {
    const found = new Map();
    scores.forEach(score => { if (score.team) found.set(score.team.id, score.team); });
    return [...found.values()].sort((a, b) => byArabic(a.label, b.label));
  }, [scores]);

  const visible = useMemo(() => scores.filter(score => (
    (!competitionId || score.competitionId === competitionId) && (!teamId || score.teamId === teamId)
  )), [scores, competitionId, teamId]);

  const groups = useMemo(() => {
    const found = new Map();
    visible.forEach(score => {
      if (!found.has(score.teamId)) found.set(score.teamId, { team: score.team, scores: [] });
      found.get(score.teamId).scores.push(score);
    });
    return [...found.values()].sort((a, b) => byArabic(a.team?.label, b.team?.label));
  }, [visible]);

  const summary = useMemo(() => ({
    teams: teams.length,
    recorded: scores.filter(score => !score.isVirtual).length,
    virtual: scores.filter(score => score.isVirtual).length,
  }), [scores, teams.length]);

  const begin = score => {
    setEditing(score.id);
    setTotal(score.total);
    setValues(JSON.stringify(json(score.values), null, 2));
  };

  const unlock = async score => {
    try { await unlockScore(score.id); await load(); }
    catch (error) { alert(error.message || 'فشل في فتح التعديل'); }
  };

  const lock = async score => {
    try { await lockScore(score.id); setEditing(null); await load(); }
    catch (error) { alert(error.message || 'فشل في قفل التعديل'); }
  };

  const remove = async score => {
    const teamName = score.team?.label || 'هذا الفريق';
    const competitionName = score.competition?.name || 'هذه المسابقة';
    if (!window.confirm(`حذف درجة ${teamName} في «${competitionName}» نهائياً؟\nسيختفي التقييم من النتائج ويعود الفريق لقائمة التحكيم.`)) return;
    try {
      setDeleting(score.id);
      await deleteScore(score.id);
      if (editing === score.id) setEditing(null);
      await load();
    } catch (error) {
      alert(error.message || 'فشل في حذف الدرجة');
    } finally {
      setDeleting(null);
    }
  };

  const save = async score => {
    const numericTotal = Number(total);
    const maxScore = getMaxScore(score.competition);
    if (String(total).trim() === '' || !Number.isFinite(numericTotal) || numericTotal < 0 || numericTotal > maxScore) {
      alert(`الدرجة يجب أن تكون بين 0 و${maxScore} نقطة`);
      return;
    }
    let parsed;
    try { parsed = JSON.parse(values); } catch { alert('تفاصيل المعايير JSON غير صحيحة'); return; }

    try {
      setSaving(true);
      await updateScoreOverride(score.id, { total: numericTotal, values: parsed });
      setEditing(null);
      await load();
    } catch (error) {
      alert(error.message || 'فشل في حفظ الدرجة');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setCompetitionId('');
    setTeamId('');
    setEditing(null);
  };

  return (
    <main className="min-h-screen bg-[#071017] p-4 text-right text-white sm:p-6" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <AdminBackLink />

        <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-200"><Trophy size={14} /> مركز التحكم في النتائج</span>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">إدارة الدرجات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">كل الفرق وكل المسابقات موجودة هنا. الخانة غير المشاركة تظهر بصفر افتراضي، والدرجة الفعلية تظهر فور تسجيل المشاركة.</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><FileText size={28} /></div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="كل الفرق" value={summary.teams} hint="تظهر حتى بدون مشاركة" tone="border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-100" icon={Users} />
          <StatCard label="نتائج مسجلة" value={summary.recorded} hint="مشاركات فعلية" tone="border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100" icon={Check} />
          <StatCard label="خانات بصفر" value={summary.virtual} hint="لم تبدأ المشاركة بعد" tone="border-slate-700 bg-slate-900/70" icon={FileText} />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">اعثر على نتيجة</h2>
              <p className="mt-1 text-xs text-slate-500">الفِرق مغلقة في قوائم منسدلة حتى لا تتزاحم النتائج أمامك</p>
            </div>
            {(competitionId || teamId) && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-400/40 hover:text-white"><X size={14} /> عرض الكل</button>}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-black text-slate-400">المسابقة
              <select className="ai-input mt-1 w-full bg-slate-950" value={competitionId} onChange={event => { setCompetitionId(event.target.value); setTeamId(''); setEditing(null); }}>
                <option value="">كل المسابقات ({competitions.length})</option>
                {competitions.map(competition => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-black text-slate-400">الفريق
              <select className="ai-input mt-1 w-full bg-slate-950" value={teamId} onChange={event => { setTeamId(event.target.value); setEditing(null); }} disabled={teams.length === 0}>
                <option value="">كل الفرق ({teams.length})</option>
                {teams.map(team => <option key={team.id} value={team.id}>{team.label}</option>)}
              </select>
            </label>
          </div>
          {!loading && <p className="mt-4 border-t border-white/5 pt-3 text-xs font-bold text-slate-500">المعروض الآن: <span className="text-slate-300">{visible.length}</span> خانة</p>}
        </section>

        {loading ? <div className="border border-white/10 bg-slate-900/50 py-20 text-center text-sm font-bold text-slate-400">جاري تحميل النتائج...</div>
          : scores.length === 0 ? <div className="border border-dashed border-white/10 bg-slate-900/30 py-20 text-center text-sm font-bold text-slate-500">لا توجد فرق أو مسابقات مسجّلة بعد</div>
            : <div className="space-y-3">
              {groups.map(group => <details key={group.team?.id || group.teamId} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg" open={teamId ? true : undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-white/[0.03] sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <ChevronDown size={18} className="shrink-0 text-cyan-300 transition-transform group-open:rotate-180" />
                    <div className="min-w-0"><h2 className="truncate text-base font-black text-white sm:text-lg">{group.team?.label || 'فريق غير محدد'}</h2><p className="mt-1 text-[11px] font-bold text-slate-500">{group.scores.filter(score => !score.isVirtual).length} نتائج مسجلة من {group.scores.length}</p></div>
                  </div>
                  <span className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-black text-slate-400">فتح القائمة</span>
                </summary>
                <div className="space-y-3 border-t border-white/10 bg-slate-950/20 p-3 sm:p-4">
                  {group.scores.map(score => <ScoreCard key={score.id || `${score.teamId}:${score.competitionId}`} score={score} editing={editing} total={total} values={values} saving={saving} deleting={deleting} onBegin={begin} onSave={save} onCancel={() => setEditing(null)} onTotalChange={setTotal} onValuesChange={setValues} onUnlock={unlock} onLock={lock} onDelete={remove} />)}
                </div>
              </details>)}
            </div>}
      </div>
    </main>
  );
};

export default AdminScoring;
