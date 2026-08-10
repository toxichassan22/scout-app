import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, MapPin, Save, ToggleLeft, ToggleRight, Trophy } from 'lucide-react';
import { getAdminCompetitions, getAgenda, updateCompetition } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const TYPE_LABELS = {
  auto_digital: 'مسابقة رقمية',
  manual_judged: 'مسابقة بتحكيم',
  schedule_only: 'فعالية زمنية فقط',
};
const PERIOD_NAMES = {
  before: 'قبل الفترة الأولى',
  'period-1': 'الفترة الأولى',
  'period-2': 'الفترة الثانية',
  'period-3': 'الفترة الثالثة',
  'period-4': 'الفترة الرابعة',
  closing: 'الختام والسمر',
  unlinked: 'غير مرتبطة بالبرنامج',
};

const typeClass = type => type === 'schedule_only'
  ? 'border-slate-600 bg-slate-800 text-slate-300'
  : type === 'manual_judged'
    ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [zones, setZones] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [openPeriods, setOpenPeriods] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, agenda] = await Promise.all([getAdminCompetitions(), getAgenda()]);
      setCompetitions(rows);
      setZones(agenda.zones || []);
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

  const groups = useMemo(() => {
    const grouped = new Map();
    competitions.forEach(competition => {
      const schedule = competition.schedule || {};
      const key = schedule.period || 'unlinked';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(competition);
    });
    return [...grouped.entries()]
      .map(([key, items]) => {
        const starts = items.map(item => item.schedule?.startTime).filter(Boolean).sort();
        const ends = items.map(item => item.schedule?.endTime).filter(Boolean).sort();
        return { key, items, start: starts[0] || '', end: ends.at(-1) || '' };
      })
      .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'));
  }, [competitions]);

  useEffect(() => {
    if (groups.length && !Object.keys(openPeriods).length) {
      setOpenPeriods({ [groups[0].key]: true });
    }
  }, [groups, openPeriods]);

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
    setBusy(`${id}:toggle`);
    try {
      await updateCompetition(id, { isOpen: !draft.isOpen });
      await load();
    } catch (toggleError) {
      alert(toggleError.message || 'تعذر تغيير حالة المسابقة');
    } finally {
      setBusy('');
    }
  };

  const togglePeriod = key => setOpenPeriods(previous => ({ ...previous, [key]: !previous[key] }));

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-6xl">
        <AdminBackLink />
        <header className="mb-7 flex items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">إدارة المسابقات <Trophy className="text-amber-400" /></h1>
            <p className="mt-2 text-xs font-bold text-slate-400">افتح الفترة، اختر المسابقة، وعدّل الاسم والمكان والموعد فقط.</p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-black text-cyan-300">{competitions.length} عنصر</span>
        </header>

        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}

        {loading ? <div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل المسابقات...</div>
          : competitions.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-sm font-bold text-slate-400">لا توجد مسابقات مضافة بعد.</div>
            : <div className="space-y-4">
              {groups.map(group => {
                const isOpen = Boolean(openPeriods[group.key]);
                return (
                  <section key={group.key} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/55 shadow-xl">
                    <button type="button" onClick={() => togglePeriod(group.key)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition hover:bg-cyan-500/[0.06]">
                      <div>
                        <h2 className="text-base font-black text-white">{PERIOD_NAMES[group.key] || group.key}</h2>
                        <p className="mt-1 text-xs font-mono font-bold text-cyan-300" dir="ltr">{group.start && group.end ? `${group.start} - ${group.end}` : 'بدون موعد محدد'} · {group.items.length} عنصر</p>
                      </div>
                      {isOpen ? <ChevronUp className="text-cyan-300" /> : <ChevronDown className="text-slate-400" />}
                    </button>

                    {isOpen && <div className="space-y-2 border-t border-slate-800 p-3 sm:p-4">
                      {group.items.map(competition => {
                        const draft = drafts[competition.id] || {};
                        const schedule = competition.schedule || {};
                        const expanded = expandedId === competition.id;
                        const isToggling = busy === `${competition.id}:toggle`;
                        return expanded ? (
                          <article key={competition.id} className="rounded-2xl border border-cyan-400/40 bg-slate-950/55 p-4 shadow-lg">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${typeClass(competition.type)}`}>{TYPE_LABELS[competition.type] || competition.type}</span>
                                <p className="mt-2 text-xs font-bold text-slate-500">تعديل العنصر المحدد</p>
                              </div>
                              <button type="button" onClick={() => setExpandedId(null)} className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white">إغلاق</button>
                            </div>
                            <div className="space-y-4">
                              <label className="block text-xs font-black text-slate-400">اسم المسابقة<input className="ai-input mt-1 w-full text-base font-black" value={draft.name || ''} onChange={event => field(competition.id, 'name', event.target.value)} /></label>
                              <label className="block text-xs font-black text-slate-400">مكان المسابقة<select className="ai-input mt-1 w-full bg-slate-950" value={draft.zoneId || ''} onChange={event => field(competition.id, 'zoneId', event.target.value)}><option value="">غير محدد</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
                              <label className="block text-xs font-black text-slate-400">تفاصيل المكان<input className="ai-input mt-1 w-full" placeholder="مثال: الدور الثاني أو المكان يحدد لاحقاً" value={draft.locationNote || ''} onChange={event => field(competition.id, 'locationNote', event.target.value)} /></label>
                              <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-black text-slate-400">من<span className="relative mt-1 block"><Clock3 size={15} className="pointer-events-none absolute right-3 top-3 text-amber-300" /><input type="time" className="ai-input w-full pr-9 font-mono" value={draft.startTime || ''} onChange={event => field(competition.id, 'startTime', event.target.value)} /></span></label><label className="block text-xs font-black text-slate-400">إلى<span className="relative mt-1 block"><Clock3 size={15} className="pointer-events-none absolute right-3 top-3 text-amber-300" /><input type="time" className="ai-input w-full pr-9 font-mono" value={draft.endTime || ''} onChange={event => field(competition.id, 'endTime', event.target.value)} /></span></label></div>
                              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4"><button type="button" onClick={() => toggle(competition.id)} disabled={Boolean(busy)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black disabled:opacity-50">{draft.isOpen ? <ToggleRight size={30} className="text-emerald-400" /> : <ToggleLeft size={30} className="text-slate-500" />}<span className={draft.isOpen ? 'text-emerald-300' : 'text-slate-400'}>{isToggling ? 'جاري التحديث...' : draft.isOpen ? 'مفتوحة الآن' : 'فتح المسابقة'}</span></button><button type="button" onClick={() => save(competition.id)} disabled={busy === competition.id} className="btn-primary flex items-center gap-2 !px-4 !py-2 text-xs"><Save size={15} />{busy === competition.id ? 'جاري الحفظ...' : 'حفظ التعديل'}</button></div>
                            </div>
                          </article>
                        ) : (
                          <button key={competition.id} type="button" onClick={() => setExpandedId(competition.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-right transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.05]">
                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${typeClass(competition.type)}`}>{TYPE_LABELS[competition.type] || competition.type}</span><h3 className="truncate text-sm font-black text-white">{draft.name || competition.name}</h3></div><div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400"><span dir="ltr">{schedule.startTime && schedule.endTime ? `${schedule.startTime} - ${schedule.endTime}` : 'موعد غير محدد'}</span><span className="flex items-center gap-1 text-cyan-300"><MapPin size={12} />{draft.locationNote || schedule.locationNote || schedule.zone?.name || 'مكان غير محدد'}</span></div></div><ChevronDown size={18} className="shrink-0 text-slate-500" /></button>
                        );
                      })}
                    </div>}
                  </section>
                );
              })}
            </div>}
      </div>
    </main>
  );
};

export default AdminCompetitions;
