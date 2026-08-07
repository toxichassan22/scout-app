import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Save, ToggleLeft, ToggleRight, Trophy } from 'lucide-react';
import { createCompetition, getAdminCompetitions, updateCompetition } from '../../services/api';
import { QRCodeCanvas } from 'qrcode.react';

const parseCriteria = value => {
  try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value || '[]') : value || [], null, 2); } catch { return value || '[]'; }
};

const toDateInput = value => value ? new Date(value).toISOString().slice(0, 16) : '';

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [creating, setCreating] = useState({ name: '', slug: '', type: 'auto_digital', duration: 600, questionCount: 50, criteria: '[]', requiresQr: true });
  const [busy, setBusy] = useState('');

  const load = async () => {
    const rows = await getAdminCompetitions();
    setCompetitions(rows);
    setDrafts(Object.fromEntries(rows.map(item => [item.id, {
      ...item,
      duration: item.duration ?? '',
      questionCount: item.questionCount ?? 50,
      startsAt: toDateInput(item.startsAt),
      endsAt: toDateInput(item.endsAt),
      criteria: parseCriteria(item.criteria),
    }])));
  };

  useEffect(() => { load().catch(console.error); }, []);
  const field = (id, key, value) => setDrafts(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } }));

  const save = async id => {
    setBusy(id);
    try {
      const draft = drafts[id];
      let criteria;
      try { criteria = JSON.parse(draft.criteria || '[]'); } catch { alert('صيغة معايير التقييم JSON غير صحيحة'); return; }
      await updateCompetition(id, {
        name: draft.name,
        slug: draft.slug,
        description: draft.description,
        details: draft.details,
        duration: draft.duration === '' ? null : Number(draft.duration),
        questionCount: Number(draft.questionCount || 50),
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        qrCode: draft.qrCode || null,
        requiresQr: Boolean(draft.requiresQr),
        type: draft.type,
        criteria,
        isOpen: Boolean(draft.isOpen),
      });
      await load();
    } catch (error) { alert(error.message); } finally { setBusy(''); }
  };

  const add = async event => {
    event.preventDefault();
    try {
      await createCompetition({ ...creating, criteria: JSON.parse(creating.criteria || '[]') });
      setCreating({ name: '', slug: '', type: 'auto_digital', duration: 600, questionCount: 50, criteria: '[]', requiresQr: true });
      await load();
    } catch (error) { alert(error.message); }
  };

  return (
    <main className="app-shell p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex justify-between"><Link to="/admin/dashboard" className="flex gap-1 text-slate-400">العودة <ChevronLeft size={18} /></Link><h1 className="flex gap-2 text-2xl font-black">إدارة المسابقات <Trophy className="text-amber-400" /></h1></header>
        <form onSubmit={add} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-4">
          <input className="ai-input" placeholder="اسم المسابقة" value={creating.name} onChange={event => setCreating({ ...creating, name: event.target.value })} required />
          <input className="ai-input font-mono" placeholder="slug مثل genius" value={creating.slug} onChange={event => setCreating({ ...creating, slug: event.target.value })} required />
          <select className="ai-input bg-slate-950" value={creating.type} onChange={event => setCreating({ ...creating, type: event.target.value })}><option value="auto_digital">رقمية تلقائية</option><option value="manual_judged">تحكيم يدوي</option></select>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold"><Plus size={16} /> إضافة</button>
          <textarea className="ai-input md:col-span-3" placeholder="معايير التقييم JSON" value={creating.criteria} onChange={event => setCreating({ ...creating, criteria: event.target.value })} />
          <input className="ai-input" type="number" min="1" placeholder="المدة بالثواني" value={creating.duration} onChange={event => setCreating({ ...creating, duration: event.target.value })} />
        </form>
        <div className="grid gap-4 lg:grid-cols-2">{competitions.map(competition => {
          const draft = drafts[competition.id] || competition;
          return <article key={competition.id} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between"><button type="button" onClick={() => field(competition.id, 'isOpen', !draft.isOpen)}>{draft.isOpen ? <ToggleRight size={42} className="text-emerald-400" /> : <ToggleLeft size={42} className="text-slate-500" />}</button><span className="text-xs text-slate-400">{draft.slug} · {draft.isOpen ? 'مفتوحة' : 'مغلقة'}</span></div>
            <input className="ai-input font-black" value={draft.name || ''} onChange={event => field(competition.id, 'name', event.target.value)} />
            <input className="ai-input font-mono" value={draft.slug || ''} onChange={event => field(competition.id, 'slug', event.target.value)} />
            <textarea className="ai-input min-h-20" placeholder="الوصف" value={draft.description || ''} onChange={event => field(competition.id, 'description', event.target.value)} />
            <textarea className="ai-input min-h-24" placeholder="التفاصيل والتعليمات التي ستظهر للفريق" value={draft.details || ''} onChange={event => field(competition.id, 'details', event.target.value)} />
            <div className="grid grid-cols-2 gap-2"><select className="ai-input bg-slate-950" value={draft.type} onChange={event => field(competition.id, 'type', event.target.value)}><option value="auto_digital">رقمية تلقائية</option><option value="manual_judged">تحكيم يدوي</option></select><input type="number" min="1" className="ai-input" placeholder="المدة بالثواني" value={draft.duration} onChange={event => field(competition.id, 'duration', event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2"><input type="number" min="1" max="500" className="ai-input" placeholder="عدد الأسئلة" value={draft.questionCount} onChange={event => field(competition.id, 'questionCount', event.target.value)} /><input className="ai-input font-mono" placeholder="QR الثابت" value={draft.qrCode || ''} onChange={event => field(competition.id, 'qrCode', event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400">بداية الموعد<input type="datetime-local" className="ai-input mt-1" value={draft.startsAt || ''} onChange={event => field(competition.id, 'startsAt', event.target.value)} /></label><label className="text-xs text-slate-400">نهاية الموعد<input type="datetime-local" className="ai-input mt-1" value={draft.endsAt || ''} onChange={event => field(competition.id, 'endsAt', event.target.value)} /></label></div>
            <label className="flex items-center justify-end gap-2 text-xs text-slate-300"><input type="checkbox" checked={Boolean(draft.requiresQr)} onChange={event => field(competition.id, 'requiresQr', event.target.checked)} /> QR إجباري</label>
            {draft.qrCode && <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white p-3"><QRCodeCanvas value={draft.qrCode} size={96} includeMargin /><span className="text-right text-xs font-bold text-slate-700">اطبع هذا QR للمسابقة<br /><span className="font-mono">{draft.qrCode}</span></span></div>}
            <label className="text-xs text-slate-400">معايير التحكيم JSON<textarea dir="ltr" className="ai-input mt-1 min-h-28 font-mono text-left" value={draft.criteria || '[]'} onChange={event => field(competition.id, 'criteria', event.target.value)} /></label>
            <button type="button" disabled={busy === competition.id} onClick={() => save(competition.id)} className="flex w-full justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black"><Save size={17} />{busy === competition.id ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button>
          </article>;
        })}</div>
      </div>
    </main>
  );
};

export default AdminCompetitions;
