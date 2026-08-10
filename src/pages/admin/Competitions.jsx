import { useEffect, useState } from 'react';
import { Clock3, MapPin, Save, ToggleLeft, ToggleRight, Trophy } from 'lucide-react';
import { getAdminCompetitions, getAgenda, updateCompetition } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const TYPE_LABELS = {
  auto_digital: 'مسابقة رقمية',
  manual_judged: 'مسابقة بتحكيم',
  schedule_only: 'فعالية زمنية فقط',
};

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [zones, setZones] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, agenda] = await Promise.all([getAdminCompetitions(), getAgenda()]);
      const agendaZones = agenda.zones || [];
      setCompetitions(rows);
      setZones(agendaZones);
      setDrafts(Object.fromEntries(rows.map(item => {
        const schedule = item.schedule || {};
        return [item.id, {
          name: item.name || '',
          isOpen: Boolean(item.isOpen),
          zoneId: schedule.zoneId || '',
          locationNote: schedule.locationNote || '',
          startTime: schedule.startTime || '',
          endTime: schedule.endTime || '',
        }];
      })));
    } catch (loadError) {
      setError(loadError.message || 'تعذر تحميل المسابقات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const field = (id, key, value) => setDrafts(previous => ({
    ...previous,
    [id]: { ...previous[id], [key]: value },
  }));

  const save = async id => {
    const draft = drafts[id];
    setBusy(id);
    try {
      await updateCompetition(id, {
        name: draft.name,
        isOpen: draft.isOpen,
        startTime: draft.startTime || null,
        endTime: draft.endTime || null,
        zoneId: draft.zoneId || null,
        locationNote: draft.locationNote || '',
      });
      await load();
    } catch (saveError) {
      alert(saveError.message || 'تعذر حفظ بيانات المسابقة');
    } finally {
      setBusy('');
    }
  };

  const toggle = async id => {
    const draft = drafts[id];
    const nextOpen = !draft.isOpen;
    setBusy(`${id}:toggle`);
    try {
      await updateCompetition(id, { isOpen: nextOpen });
      await load();
    } catch (toggleError) {
      alert(toggleError.message || 'تعذر تغيير حالة المسابقة');
    } finally {
      setBusy('');
    }
  };

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-6xl">
        <AdminBackLink />
        <header className="mb-7 flex items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              إدارة المسابقات
              <Trophy className="text-amber-400" />
            </h1>
            <p className="mt-2 text-xs font-bold text-slate-400">تحكم في الاسم والمكان والموعد وفتح المسابقة لكل الفرق والمحكمين.</p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-black text-cyan-300">
            {competitions.length} عنصر
          </span>
        </header>

        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل المسابقات...</div>
        ) : competitions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-sm font-bold text-slate-400">لا توجد مسابقات مضافة بعد.</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {competitions.map(competition => {
              const draft = drafts[competition.id] || {};
              const isToggling = busy === `${competition.id}:toggle`;
              return (
                <article key={competition.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
                  <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${competition.type === 'schedule_only' ? 'border-slate-600 bg-slate-800 text-slate-300' : competition.type === 'manual_judged' ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                        {TYPE_LABELS[competition.type] || competition.type}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">{competition.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(competition.id)}
                      disabled={Boolean(busy)}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-black transition hover:border-emerald-400/50 disabled:opacity-50"
                      title={draft.isOpen ? 'إغلاق المسابقة' : 'فتح المسابقة'}
                    >
                      {draft.isOpen ? <ToggleRight size={34} className="text-emerald-400" /> : <ToggleLeft size={34} className="text-slate-500" />}
                      <span className={draft.isOpen ? 'text-emerald-300' : 'text-slate-400'}>{draft.isOpen ? 'مفتوحة الآن' : 'مغلقة'}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400">
                      اسم المسابقة
                      <input className="ai-input mt-1 w-full text-base font-black" value={draft.name || ''} onChange={event => field(competition.id, 'name', event.target.value)} />
                    </label>

                    <label className="block text-xs font-black text-slate-400">
                      مكان المسابقة
                      <select className="ai-input mt-1 w-full bg-slate-950" value={draft.zoneId || ''} onChange={event => field(competition.id, 'zoneId', event.target.value)}>
                        <option value="">غير محدد</option>
                        {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                      </select>
                    </label>

                    <label className="block text-xs font-black text-slate-400">
                      تفاصيل إضافية للمكان
                      <input className="ai-input mt-1 w-full" placeholder="مثال: الدور الثاني أو المكان يحدد لاحقاً" value={draft.locationNote || ''} onChange={event => field(competition.id, 'locationNote', event.target.value)} />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-black text-slate-400">
                        من
                        <span className="relative mt-1 block"><Clock3 size={15} className="pointer-events-none absolute right-3 top-3 text-amber-300" /><input type="time" className="ai-input w-full pr-9 font-mono" value={draft.startTime || ''} onChange={event => field(competition.id, 'startTime', event.target.value)} /></span>
                      </label>
                      <label className="block text-xs font-black text-slate-400">
                        إلى
                        <span className="relative mt-1 block"><Clock3 size={15} className="pointer-events-none absolute right-3 top-3 text-amber-300" /><input type="time" className="ai-input w-full pr-9 font-mono" value={draft.endTime || ''} onChange={event => field(competition.id, 'endTime', event.target.value)} /></span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><MapPin size={13} />التعديل ينعكس على البرنامج وRuby</span>
                      <button type="button" onClick={() => save(competition.id)} disabled={busy === competition.id} className="btn-primary flex items-center gap-2 !px-4 !py-2 text-xs">
                        <Save size={15} />
                        {busy === competition.id ? 'جاري الحفظ...' : 'حفظ التعديل'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminCompetitions;
