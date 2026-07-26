import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Save, ToggleLeft, ToggleRight, Trophy } from 'lucide-react';
import { createCompetition, getAdminCompetitions, updateCompetition } from '../../services/api';

const parseCriteria = value => { try { return JSON.stringify(JSON.parse(value || '[]'), null, 2); } catch { return value || '[]'; } };

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [creating, setCreating] = useState({ name: '', type: 'manual_judged', criteria: '[]' });
  const [busy, setBusy] = useState('');
  const load = async () => { const rows = await getAdminCompetitions(); setCompetitions(rows); setDrafts(Object.fromEntries(rows.map(c => [c.id, { ...c, duration: c.duration ?? '', criteria: parseCriteria(c.criteria) }]))); };
  useEffect(() => { load().catch(console.error); }, []);
  const field = (id, key, value) => setDrafts(p => ({ ...p, [id]: { ...p[id], [key]: value } }));
  const save = async id => {
    setBusy(id);
    try {
      const d = drafts[id]; let criteria; try { criteria = JSON.parse(d.criteria || '[]'); } catch { return alert('صيغة معايير التقييم JSON غير صحيحة'); }
      await updateCompetition(id, { name: d.name, description: d.description, duration: d.duration === '' ? null : Number(d.duration), type: d.type, criteria, entryCode: d.entryCode || null, passcode: d.passcode || null, isOpen: d.isOpen }); await load();
    } catch (e) { alert(e.message); } finally { setBusy(''); }
  };
  const add = async e => { e.preventDefault(); try { await createCompetition({ ...creating, criteria: JSON.parse(creating.criteria || '[]') }); setCreating({ name: '', type: 'manual_judged', criteria: '[]' }); await load(); } catch (err) { alert(err.message); } };
  return <main className="app-shell p-4 sm:p-6 text-white dir-rtl"><div className="mx-auto max-w-6xl">
    <header className="mb-7 flex justify-between"><Link to="/admin/dashboard" className="text-slate-400 flex gap-1">العودة <ChevronLeft size={18} /></Link><h1 className="text-2xl font-black flex gap-2">إدارة المسابقات <Trophy className="text-amber-400" /></h1></header>
    <form onSubmit={add} className="card p-5 mb-6 grid md:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
      <input className="ai-input" placeholder="اسم المسابقة الجديدة" value={creating.name} onChange={e => setCreating({ ...creating, name: e.target.value })} required />
      <select className="ai-input bg-slate-950" value={creating.type} onChange={e => setCreating({ ...creating, type: e.target.value })}><option value="manual_judged">تحكيم يدوي</option><option value="auto_digital">رقمية تلقائية</option></select>
      <input className="ai-input font-mono" value={creating.criteria} onChange={e => setCreating({ ...creating, criteria: e.target.value })} placeholder="[]" />
      <button className="bg-emerald-600 rounded-xl font-bold flex justify-center items-center gap-2"><Plus size={16} /> إضافة</button>
    </form>
    <div className="grid lg:grid-cols-2 gap-4">{competitions.map(c => {
      const d = drafts[c.id] || c; return <article key={c.id} className="card p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex justify-between items-center"><button onClick={() => field(c.id, 'isOpen', !d.isOpen)}>{d.isOpen ? <ToggleRight size={42} className="text-emerald-400" /> : <ToggleLeft size={42} className="text-slate-500" />}</button><span className="text-xs text-slate-400">{c.slug} • {d.isOpen ? 'مفتوحة' : 'مغلقة'}</span></div>
        <input className="ai-input font-black" value={d.name || ''} onChange={e => field(c.id, 'name', e.target.value)} />
        <textarea className="ai-input min-h-20" placeholder="الوصف" value={d.description || ''} onChange={e => field(c.id, 'description', e.target.value)} />
        <div className="grid grid-cols-2 gap-2"><select className="ai-input bg-slate-950" value={d.type} onChange={e => field(c.id, 'type', e.target.value)}><option value="manual_judged">تحكيم يدوي</option><option value="auto_digital">رقمية تلقائية</option></select><input type="number" min="0" className="ai-input" placeholder="المدة بالثواني" value={d.duration} onChange={e => field(c.id, 'duration', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2"><input className="ai-input" placeholder="كود دخول الفريق" value={d.entryCode || ''} onChange={e => field(c.id, 'entryCode', e.target.value)} /><input className="ai-input" placeholder="كود المحكم" value={d.passcode || ''} onChange={e => field(c.id, 'passcode', e.target.value)} /></div>
        <label className="text-xs text-slate-400">المعايير JSON<textarea dir="ltr" className="ai-input font-mono text-left min-h-28 mt-1" value={d.criteria || '[]'} onChange={e => field(c.id, 'criteria', e.target.value)} /></label>
        <button disabled={busy === c.id} onClick={() => save(c.id)} className="w-full py-3 bg-blue-600 rounded-xl font-black flex justify-center gap-2"><Save size={17} />{busy === c.id ? 'جاري الحفظ...' : 'حفظ جميع التغييرات في الخادم'}</button>
      </article>;
    })}</div>
  </div></main>;
};
export default AdminCompetitions;
