import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Edit3, FileText, Lock, Save, ShieldCheck, Trophy, Unlock, X } from 'lucide-react';
import { getScoreBreakdown, lockScore, unlockScore, updateScoreOverride } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const json = value => {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : value || {}; } catch { return {}; }
};

const byArabic = (a, b) => String(a).localeCompare(String(b), 'ar');

const auditLabels = {
  unlock: 'فتح التعديل',
  admin_correction: 'تصحيح إداري',
  judge_submit: 'تسليم المحكم',
};

const formatDate = value => new Date(value).toLocaleString('ar-EG', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const getMaxScore = competition => {
  if (!competition) return 50;
  try {
    const criteria = typeof competition.criteria === 'string' ? JSON.parse(competition.criteria) : competition.criteria;
    if (Array.isArray(criteria) && criteria.length > 0) {
      const sum = criteria.reduce((acc, item) => acc + Number(item.maxScore || 0), 0);
      if (sum > 0) return sum;
    }
  } catch {}
  return competition.questionCount || 50;
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

const AdminScoring = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
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
    scores.forEach(score => {
      if (competitionId && score.competitionId !== competitionId) return;
      if (score.team) found.set(score.team.id, score.team);
    });
    return [...found.values()].sort((a, b) => byArabic(a.label, b.label));
  }, [scores, competitionId]);

  const visible = useMemo(() => scores.filter(score => (
    (!competitionId || score.competitionId === competitionId) && (!teamId || score.teamId === teamId)
  )), [scores, competitionId, teamId]);

  const summary = useMemo(() => ({
    total: scores.length,
    locked: scores.filter(score => score.isFinal).length,
    open: scores.filter(score => !score.isFinal).length,
  }), [scores]);

  const begin = score => {
    setEditing(score.id);
    setTotal(score.total);
    setValues(JSON.stringify(json(score.values), null, 2));
  };

  const unlock = async score => {
    try {
      await unlockScore(score.id);
      begin(score);
      await load();
    } catch (error) {
      alert(error.message || 'فشل في فتح التعديل');
    }
  };

  const save = async score => {
    const numericTotal = Number(total);
    const maxScore = getMaxScore(score.competition);
    if (!Number.isFinite(numericTotal) || numericTotal < 0 || numericTotal > maxScore) {
      alert(`الدرجة غير صالحة؛ الحد الأقصى لهذه المسابقة هو ${maxScore} نقطة`);
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

  const lock = async score => {
    try { await lockScore(score.id); setEditing(null); await load(); }
    catch (error) { alert(error.message || 'فشل في قفل النتيجة'); }
  };

  const clearFilters = () => {
    setCompetitionId('');
    setTeamId('');
    setEditing(null);
  };

  return (
    <main className="min-h-screen p-4 text-right text-white sm:p-6" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <AdminBackLink />

        <header className="mb-7 flex flex-col gap-5 rounded-3xl border border-cyan-400/15 bg-slate-950/35 p-5 shadow-2xl shadow-cyan-950/10 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-200">
              <Trophy size={14} /> مركز التحكم في النتائج
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">إدارة الدرجات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">افتح أي نتيجة وعدّلها مباشرة. عند الحفظ تُقفل النتيجة تلقائياً ويُسجَّل التغيير في سجل التدقيق.</p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 sm:flex">
            <FileText size={30} />
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="إجمالي النتائج" value={summary.total} hint="كل نتائج المسابقات" tone="border-slate-700 bg-slate-900/70" icon={FileText} />
          <StatCard label="نتائج مقفلة" value={summary.locked} hint="جاهزة للعرض" tone="border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100" icon={Lock} />
          <StatCard label="تحتاج مراجعة" value={summary.open} hint="مفتوحة للتعديل الآن" tone="border-amber-400/25 bg-amber-500/[0.09] text-amber-100" icon={Unlock} />
        </section>

        <section className="mb-7 rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-xl sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">اعثر على النتيجة</h2>
              <p className="mt-1 text-xs text-slate-500">اختَر مسابقة أو فريقاً لتقليل القائمة</p>
            </div>
            {(competitionId || teamId) && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-400/40 hover:text-white">
                <X size={14} /> عرض الكل
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-black text-slate-400">
              المسابقة
              <span className="relative mt-1 block">
                <ChevronDown size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                <select className="ai-input w-full appearance-none bg-slate-950 pr-3 pl-9" value={competitionId} onChange={event => { setCompetitionId(event.target.value); setTeamId(''); setEditing(null); }}>
                  <option value="">كل المسابقات ({competitions.length})</option>
                  {competitions.map(competition => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
                </select>
              </span>
            </label>
            <label className="block text-xs font-black text-slate-400">
              الفريق
              <span className="relative mt-1 block">
                <ChevronDown size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                <select className="ai-input w-full appearance-none bg-slate-950 pr-3 pl-9" value={teamId} onChange={event => { setTeamId(event.target.value); setEditing(null); }} disabled={teams.length === 0}>
                  <option value="">{competitionId ? `كل فرق هذه المسابقة (${teams.length})` : `كل الفرق (${teams.length})`}</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.label}</option>)}
                </select>
              </span>
            </label>
          </div>
          {!loading && <p className="mt-4 border-t border-white/5 pt-3 text-xs font-bold text-slate-500">المعروض الآن: <span className="text-slate-300">{visible.length}</span> نتيجة</p>}
        </section>

        {loading ? <div className="rounded-3xl border border-white/10 bg-slate-900/50 py-20 text-center text-sm font-bold text-slate-400">جاري تحميل النتائج...</div>
          : scores.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/30 py-20 text-center text-sm font-bold text-slate-500">لا توجد نتائج مسجّلة بعد</div>
            : visible.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/30 py-20 text-center text-sm font-bold text-slate-500">لا توجد نتائج مطابقة لهذا التحديد</div>
              : <div className="space-y-5">
                {visible.map(score => {
                  const maxScore = getMaxScore(score.competition);
                  const isEditing = editing === score.id;
                  return (
                    <article key={score.id} className={`overflow-hidden rounded-3xl border bg-slate-900/70 shadow-xl transition ${isEditing ? 'border-cyan-400/50 shadow-cyan-950/20' : 'border-white/10 hover:border-white/20'}`}>
                      <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                        <div className="min-w-0">
                          <p className="mb-1 text-xs font-bold text-cyan-300/80">{score.competition?.name || 'مسابقة غير محددة'}</p>
                          <h2 className="truncate text-xl font-black text-white">{score.team?.label || 'فريق غير محدد'}</h2>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${score.isFinal ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}>
                            {score.isFinal ? <Lock size={13} /> : <Unlock size={13} />}
                            {score.isFinal ? 'نهائي مقفل' : 'مفتوح للتعديل'}
                          </span>
                          <div className="rounded-xl bg-slate-950 px-3 py-2 text-center">
                            <strong className="block text-xl font-black leading-none text-emerald-300">{score.total}</strong>
                            <span className="mt-1 block text-[10px] font-bold text-slate-500">من {maxScore}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.1fr_.9fr]">
                        <section className="rounded-2xl border border-white/5 bg-slate-950/45 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-xs font-black text-slate-300">تفاصيل التحكيم</h3>
                            <span className="text-[10px] font-bold text-slate-600">{score.judgeScores?.length || 0} محكّم</span>
                          </div>
                          {score.judgeScores?.length ? <div className="space-y-2">
                            {score.judgeScores.map(judgeScore => (
                              <div key={judgeScore.id} className="rounded-xl border border-white/5 bg-slate-900/75 p-3">
                                <div className="flex items-center justify-between gap-3 text-xs">
                                  <span className="font-black text-sky-300">{judgeScore.judge?.name || 'محكّم'}</span>
                                  <strong className="text-white">{judgeScore.total} نقطة</strong>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {Object.entries(json(judgeScore.values)).map(([key, value]) => <span key={key} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-400">{key}: {value}</span>)}
                                </div>
                              </div>
                            ))}
                          </div> : <p className="text-xs text-slate-600">لا توجد تفاصيل محكمين لهذه النتيجة.</p>}
                        </section>

                        <section className="rounded-2xl border border-white/5 bg-slate-950/45 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-xs font-black text-slate-300">سجل التغييرات</h3>
                            <ShieldCheck size={16} className="text-violet-300" />
                          </div>
                          {score.audits?.length ? <div className="max-h-36 space-y-2 overflow-auto pr-1">
                            {score.audits.map(audit => (
                              <div key={audit.id} className="rounded-xl border border-white/5 bg-slate-900/75 p-3 text-[10px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-violet-200">{auditLabels[audit.action] || audit.action}</span>
                                  <span className="text-slate-600">{formatDate(audit.createdAt)}</span>
                                </div>
                                {audit.reason && <p className="mt-1 text-slate-500">{audit.reason}</p>}
                              </div>
                            ))}
                          </div> : <p className="text-xs text-slate-600">لا توجد تغييرات مسجّلة.</p>}
                        </section>
                      </div>

                      {isEditing ? <form className="mx-5 mb-5 rounded-2xl border border-cyan-400/25 bg-cyan-950/15 p-4 sm:mx-6 sm:mb-6" onSubmit={event => { event.preventDefault(); save(score); }}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-black text-white">تعديل الدرجة</h3>
                            <p className="mt-1 text-[11px] text-slate-500">الحفظ سيعيد قفل النتيجة تلقائياً.</p>
                          </div>
                          <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-slate-400">الحد الأقصى: {maxScore}</span>
                        </div>
                        <label className="block text-xs font-black text-slate-300">الدرجة النهائية
                          <input type="number" step="0.5" min="0" max={maxScore} className="ai-input mt-1 w-full text-lg font-black" value={total} onChange={event => setTotal(event.target.value)} autoFocus />
                        </label>
                        <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                          <summary className="cursor-pointer list-none text-xs font-bold text-slate-400">تعديل تفاصيل المعايير <span className="text-[10px] text-slate-600">(اختياري)</span></summary>
                          <textarea dir="ltr" className="ai-input mt-3 min-h-28 w-full resize-y text-left font-mono text-xs" value={values} onChange={event => setValues(event.target.value)} aria-label="تفاصيل المعايير بصيغة JSON" />
                        </details>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"><Save size={15} />{saving ? 'جاري الحفظ...' : 'حفظ وإعادة القفل'}</button>
                          <button type="button" onClick={() => setEditing(null)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"><X size={15} /> إلغاء</button>
                        </div>
                      </form> : <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4 sm:px-6">
                        {score.isFinal ? <button type="button" onClick={() => unlock(score)} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-300"><Unlock size={15} /> فتح التعديل</button>
                          : <><button type="button" onClick={() => begin(score)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-400"><Edit3 size={15} /> تعديل الدرجة</button><button type="button" onClick={() => lock(score)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:border-emerald-400/40 hover:text-white"><Check size={15} /> قفل بدون تعديل</button></>}
                      </div>}
                    </article>
                  );
                })}
              </div>}
      </div>
    </main>
  );
};

export default AdminScoring;
