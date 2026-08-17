import React, { useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, UserCheck, X } from 'lucide-react';
import {
  assignJudgeCompetition, createJudge, deleteJudge, generateCompetitionPasscode,
  getAdminCompetitions, getAdminJudges, getJudgeAssignments,
  unassignJudgeCompetition, updateCompetition, updateJudge
} from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const emptyForm = { name: '', username: '', password: '' };

const AdminJudges = () => {
  const [judges, setJudges] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [j, c] = await Promise.all([getAdminJudges(), getAdminCompetitions()]);
    setJudges(j);
    setCompetitions(c.filter(x => x.type === 'manual_judged'));
    const pairs = await Promise.all(j.map(async x => [x.id, await getJudgeAssignments(x.id)]));
    setAssignments(Object.fromEntries(pairs));
  };

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  const assigned = (jid, cid) => assignments[jid]?.some(a => a.competitionId === cid);
  // Each competition is owned by exactly one judge, so surface who holds it
  // instead of letting the admin click and get rejected.
  const ownerOf = cid => judges.find(j => assignments[j.id]?.some(a => a.competitionId === cid));
  const availableComps = competitions.filter(c => !ownerOf(c.id));

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const saveJudge = async e => {
    e.preventDefault();
    try {
      if (editing) {
        const p = { name: form.name, username: form.username };
        if (form.password) p.password = form.password;
        await updateJudge(editing, p);
      } else {
        await createJudge(form);
      }
      resetForm();
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = j => {
    setEditing(j.id);
    setForm({ name: j.name, username: j.username, password: '' });
    setShowForm(true);
  };

  const removeJudge = async j => {
    if (!confirm(`حذف المحكم ${j.name}؟`)) return;
    try {
      await deleteJudge(j.id);
      if (editing === j.id) resetForm();
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleAssignment = async (jid, cid) => {
    try {
      assigned(jid, cid) ? await unassignJudgeCompetition(jid, cid) : await assignJudgeCompetition(jid, cid);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const setCode = async (c, mode) => {
    try {
      if (mode === 'generate') await generateCompetitionPasscode(c.id);
      else if (mode === 'revoke') {
        if (!confirm(`إلغاء كود «${c.name}» وإغلاق المسابقة؟`)) return;
        await updateCompetition(c.id, { revoke: true });
      } else {
        const code = prompt('أدخل كود المحكم المخصص', c.passcode || '');
        if (code !== null) await updateCompetition(c.id, { passcode: code, isOpen: true });
      }
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 text-right dir-rtl text-white">
      <AdminBackLink />

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            المحكمون والتكليفات
            <UserCheck className="text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">حساب المحكم، ثم تكليف المسابقة، ثم كود الدخول</p>
        </div>
        {!showForm && (
          <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500">
            <Plus size={16} /> إضافة محكم
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={saveJudge} className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black">{editing ? 'تعديل المحكم' : 'محكم جديد'}</h2>
            <button type="button" onClick={resetForm} className="rounded-lg p-1 text-slate-400 hover:text-white" title="إغلاق">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input className="ai-input" placeholder="اسم المحكم" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <input className="ai-input" placeholder="اسم المستخدم" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            <input type="password" className="ai-input" placeholder={editing ? 'كلمة جديدة (اختياري)' : 'كلمة السر'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} />
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold hover:bg-blue-500">
              <Plus size={16} />{editing ? 'حفظ التعديل' : 'إضافة المحكم'}
            </button>
          </div>
        </form>
      )}

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm font-black">المحكمون ({judges.length})</h2>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">جاري التحميل...</p>
        ) : judges.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">لا يوجد محكمون بعد. أضف أول محكم من الزر أعلى الصفحة.</p>
        ) : (
          <div className="space-y-2">
            {judges.map(j => {
              const judgeComps = (assignments[j.id] || []).map(a => a.competition).filter(Boolean);
              return (
                <article key={j.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{j.name} <span className="text-xs font-normal text-slate-400">@{j.username}</span></p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {judgeComps.length === 0 && <span className="text-xs text-slate-500">بدون تكليف</span>}
                      {judgeComps.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                          {c.name}
                          <button type="button" onClick={() => toggleAssignment(j.id, c.id)} className="hover:text-red-400" title="إلغاء التكليف">×</button>
                        </span>
                      ))}
                      {availableComps.length > 0 && (
                        <select
                          className="ai-input max-w-[180px] cursor-pointer rounded-lg py-1 text-xs"
                          value=""
                          onChange={e => { if (e.target.value) toggleAssignment(j.id, e.target.value); }}
                        >
                          <option value="">+ تكليف مسابقة</option>
                          {availableComps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => startEdit(j)} className="p-1.5 text-amber-400 hover:text-amber-300" title="تعديل">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => removeJudge(j)} className="p-1.5 text-red-400 hover:text-red-300" title="حذف">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black">
          أكواد المسابقات
          <KeyRound size={16} className="text-amber-400" />
        </h2>
        <p className="mb-4 text-[11px] text-slate-500">كود الدخول للمحكم. كل مسابقة لها محكم واحد.</p>
        {competitions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">لا توجد مسابقات تحكيم يدوي.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-2 font-bold">المسابقة</th>
                  <th className="py-2 font-bold">المحكم</th>
                  <th className="py-2 font-bold">الكود</th>
                  <th className="py-2 font-bold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map(c => {
                  const owner = ownerOf(c.id);
                  return (
                    <tr key={c.id} className="border-b border-slate-800/70 last:border-0">
                      <td className="py-3 font-bold">{c.name}</td>
                      <td className="py-3 text-xs text-slate-400">{owner ? owner.name : 'غير مكلّف'}</td>
                      <td className="py-3 font-mono text-amber-400">{c.passcode || '—'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setCode(c, 'generate')} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950">توليد</button>
                          <button type="button" onClick={() => setCode(c, 'custom')} className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200">تخصيص</button>
                          {c.passcode && (
                            <button type="button" onClick={() => setCode(c, 'revoke')} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-red-300">إلغاء</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminJudges;
