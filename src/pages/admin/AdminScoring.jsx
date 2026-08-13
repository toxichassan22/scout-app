import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Lock, Save, ShieldCheck, Trophy, Unlock, X } from 'lucide-react';
import { getScoreBreakdown, lockScore, unlockScore, updateScoreOverride } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const json = value => { try { return typeof value === 'string' ? JSON.parse(value || '{}') : value || {}; } catch { return {}; } };
const byArabic = (a, b) => String(a).localeCompare(String(b), 'ar');

const AdminScoring = () => {
  const [scores, setScores] = useState([]), [loading, setLoading] = useState(true), [editing, setEditing] = useState(null), [total, setTotal] = useState(''), [values, setValues] = useState('{}'), [reason, setReason] = useState('');
  const [competitionId, setCompetitionId] = useState(''), [teamId, setTeamId] = useState('');
  const load = async () => { try { setScores(await getScoreBreakdown()) } finally { setLoading(false) } };
  useEffect(() => { load().catch(console.error) }, []);

  // The breakdown already embeds team and competition, so the drill-down lists are
  // derived from it. Teams are scoped to the chosen competition, not the whole set.
  const competitions = useMemo(() => {
    const found = new Map();
    scores.forEach(s => { if (s.competition) found.set(s.competition.id, s.competition); });
    return [...found.values()].sort((a, b) => byArabic(a.name, b.name));
  }, [scores]);

  const teams = useMemo(() => {
    const found = new Map();
    scores.forEach(s => {
      if (competitionId && s.competitionId !== competitionId) return;
      if (s.team) found.set(s.team.id, s.team);
    });
    return [...found.values()].sort((a, b) => byArabic(a.label, b.label));
  }, [scores, competitionId]);

  const visible = useMemo(() => scores.filter(s => (
    (!competitionId || s.competitionId === competitionId) && (!teamId || s.teamId === teamId)
  )), [scores, competitionId, teamId]);

  const isFiltered = Boolean(competitionId || teamId);
  const pickCompetition = id => { setCompetitionId(id); setTeamId(''); setEditing(null); };
  const unlock = async s => { const why = prompt('اكتب سبب فتح القفل (يسجل في سجل التدقيق):', 'تصحيح إداري'); if (!why) return; try { await unlockScore(s.id, why); await load() } catch (e) { alert(e.message) } };
  const begin = s => { setEditing(s.id); setTotal(s.total); setValues(JSON.stringify(json(s.values), null, 2)); setReason('') };
  const getMaxScore = comp => {
    if (!comp) return 50;
    try {
      const c = typeof comp.criteria === 'string' ? JSON.parse(comp.criteria) : comp.criteria;
      if (Array.isArray(c) && c.length > 0) {
        const sum = c.reduce((acc, item) => acc + Number(item.maxScore || 0), 0);
        if (sum > 0) return sum;
      }
    } catch {}
    return comp.questionCount || 50;
  };
  const save = async s => {
    if (!reason.trim()) return alert('سبب التصحيح مطلوب');
    const maxScore = getMaxScore(s.competition);
    if (Number(total) < 0 || Number(total) > maxScore) return alert(`الدرجة غير صالحة؛ الحد الأقصى لهذه المسابقة هو ${maxScore} نقطة`);
    let parsed;
    try { parsed = JSON.parse(values) } catch { return alert('قيم المعايير JSON غير صحيحة') }
    try { await updateScoreOverride(s.id, { total: Number(total), values: parsed, reason }); setEditing(null); await load() } catch (e) { alert(e.message) }
  };
  return <div className="p-6 text-right dir-rtl text-white"><AdminBackLink /><header className="mb-8"><h1 className="text-2xl font-black flex gap-2">الدرجات والقفل وسجل التدقيق <Trophy className="text-amber-400" /></h1><p className="text-xs text-slate-400">لا يمكن التصحيح إلا بعد فتح صريح بسبب، ثم تعاد النتيجة إلى الحالة النهائية تلقائياً</p></header>
    <section className="card mb-7 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-black">اختر المسابقة ثم الفريق</h2>
        {isFiltered && <button onClick={() => pickCompetition('')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:text-white"><X size={13} /> إلغاء التحديد وعرض الكل</button>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select className="ai-input bg-slate-950" value={competitionId} onChange={e => pickCompetition(e.target.value)}>
          <option value="">كل المسابقات ({competitions.length})</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="ai-input bg-slate-950" value={teamId} onChange={e => { setTeamId(e.target.value); setEditing(null); }} disabled={teams.length === 0}>
          <option value="">{competitionId ? `كل فرق هذه المسابقة (${teams.length})` : `كل الفرق (${teams.length})`}</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      {!loading && scores.length > 0 && <p className="mt-4 text-xs font-bold text-slate-400">{isFiltered ? `المعروض: ${visible.length} من ${scores.length} نتيجة` : `إجمالي النتائج: ${scores.length}`}</p>}
    </section>

    {loading ? <p className="py-16 text-center text-slate-500">جاري التحميل...</p>
      : scores.length === 0 ? <p className="py-16 text-center text-slate-500">لا توجد نتائج مسجّلة بعد</p>
        : visible.length === 0 ? <p className="py-16 text-center text-slate-500">لا توجد نتائج مطابقة لهذا التحديد</p>
          : <div className="space-y-4">{visible.map(s => <article key={s.id} className="card p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
      <div className="flex flex-wrap justify-between gap-3 border-b border-slate-800 pb-3"><div className="flex gap-2"><span className={`px-2 py-1 rounded text-xs ${s.isFinal ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{s.isFinal ? <><Lock size={12} className="inline" /> نهائي مقفل</> : <><Unlock size={12} className="inline" /> مفتوح للتصحيح</>}</span><b className="text-emerald-400">{s.total} نقطة</b></div><h2 className="font-black">{s.team?.label} • {s.competition?.name}</h2></div>
      <div className="grid md:grid-cols-2 gap-4 mt-4"><div><h3 className="text-xs text-slate-400 mb-2">المحكم وقيم المعايير</h3>{s.judgeScores?.map(j => <div key={j.id} className="p-3 bg-slate-950 rounded-xl text-xs mb-2"><b className="text-sky-400">{j.judge?.name || 'محكم'} — {j.total}</b><div className="flex flex-wrap gap-2 mt-2">{Object.entries(json(j.values)).map(([k, v]) => <span key={k} className="bg-slate-800 px-2 py-1 rounded">{k}: {v}</span>)}</div></div>)}</div>
        <div><h3 className="text-xs text-slate-400 mb-2">سجل التدقيق</h3><div className="space-y-1 max-h-32 overflow-auto">{s.audits?.map(a => <div key={a.id} className="text-[10px] bg-slate-950 p-2 rounded"><ShieldCheck size={11} className="inline text-violet-400" /> {a.action} • {a.reason || 'بدون سبب'} • {new Date(a.createdAt).toLocaleString('ar-EG')}</div>)}</div></div></div>
      {editing === s.id ? <div className="mt-4 p-4 bg-slate-950 rounded-xl space-y-2"><div className="flex justify-between items-center text-xs font-bold text-slate-400"><span>الدرجة الكلية</span><span>الحد الأقصى: {getMaxScore(s.competition)} نقطة</span></div><input type="number" step="0.5" min="0" max={getMaxScore(s.competition)} className="ai-input" value={total} onChange={e => setTotal(e.target.value)} /><textarea dir="ltr" className="ai-input text-left font-mono min-h-28" value={values} onChange={e => setValues(e.target.value)} /><input className="ai-input" placeholder="سبب التصحيح الإلزامي" value={reason} onChange={e => setReason(e.target.value)} /><button onClick={() => save(s)} className="px-4 py-2 rounded bg-emerald-600 font-bold flex gap-2"><Save size={15} /> حفظ وإعادة القفل</button></div> : <div className="mt-4 flex gap-2">{s.isFinal ? <button onClick={() => unlock(s)} className="px-3 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-black flex gap-1"><Unlock size={14} /> فتح بسبب</button> : <><button onClick={() => begin(s)} className="px-3 py-2 bg-blue-600 rounded-xl text-xs font-bold flex gap-1"><Edit3 size={14} /> تصحيح</button><button onClick={() => lockScore(s.id).then(load)} className="px-3 py-2 bg-slate-700 rounded-xl text-xs font-bold flex gap-1"><Lock size={14} /> قفل دون تعديل</button></>}</div>}
    </article>)}</div>}
  </div>;
};
export default AdminScoring;
