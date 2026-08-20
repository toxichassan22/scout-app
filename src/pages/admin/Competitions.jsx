import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, MapPin, Printer, QrCode, Save, ToggleLeft, ToggleRight, Trophy, Download, Copy, Check, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getAdminCompetitions, getAgenda, updateCompetition } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';
import { format12Hour, formatTimeRange12, parseTimeInput } from '../../utils/timeFormat';
import { printQrCards } from '../../utils/printQrSheet';

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

const isOnlineCompetition = competition => Boolean(
  competition && (
    competition.type === 'auto_digital'
    || competition.requiresQr
    || ['genius', 'geography', 'two_truths', 'two-truths'].includes(competition.slug)
  )
);

const downloadSvgAsPng = (svgId, filename) => {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width + 40;
    canvas.height = img.height + 40;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 20, 20);
    const pngFile = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `${filename}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
};

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [zones, setZones] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [openPeriods, setOpenPeriods] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, agenda] = await Promise.all([getAdminCompetitions(), getAgenda()]);
      const validRows = Array.isArray(rows) ? rows : (rows?.items || rows?.data || []);
      setCompetitions(validRows);
      setZones(Array.isArray(agenda?.zones) ? agenda.zones : (Array.isArray(agenda) ? agenda : []));
      setDrafts(Object.fromEntries(validRows.map(item => {
        const schedule = item?.schedule || {};
        return [item.id, {
          name: item?.name || '',
          isOpen: Boolean(item?.isOpen),
          zoneId: schedule?.zoneId || '',
          locationNote: schedule?.locationNote || '',
          startTime: schedule?.startTime || '',
          endTime: schedule?.endTime || '',
          qrCode: item?.qrCode || '',
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
    const validCompetitions = Array.isArray(competitions) ? competitions : [];
    validCompetitions.forEach(competition => {
      if (!competition) return;
      const schedule = competition.schedule || {};
      const key = schedule.period || 'unlinked';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(competition);
    });
    return [...grouped.entries()]
      .map(([key, items]) => {
        const scheduledCompetitions = items.filter(item => item.type !== 'schedule_only');
        const rangeItems = scheduledCompetitions.length > 0 ? scheduledCompetitions : items;
        const starts = rangeItems.map(item => item?.schedule?.startTime).filter(Boolean).sort();
        const ends = rangeItems.map(item => item?.schedule?.endTime).filter(Boolean).sort();
        return { key, items, start: starts[0] || '', end: ends.at(-1) || '' };
      })
      .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'));
  }, [competitions]);

  useEffect(() => {
    if (groups && groups.length > 0 && !Object.keys(openPeriods).length) {
      if (groups[0]?.key) {
        setOpenPeriods({ [groups[0].key]: true });
      }
    }
  }, [groups, openPeriods]);

  const field = (id, key, value) => setDrafts(previous => ({
    ...previous,
    [id]: { ...(previous[id] || {}), [key]: value },
  }));

  const save = async id => {
    const draft = drafts[id] || {};
    setBusy(id);
    try {
      const competition = competitions.find(item => item.id === id);
      await updateCompetition(id, {
        name: draft.name,
        isOpen: draft.isOpen,
        startTime: draft.startTime || null,
        endTime: draft.endTime || null,
        zoneId: draft.zoneId || null,
        locationNote: draft.locationNote || '',
        ...(isOnlineCompetition(competition) ? { qrCode: draft.qrCode || null } : {}),
      });
      await load();
    } catch (saveError) {
      alert(saveError.message || 'تعذر حفظ بيانات المسابقة');
    } finally {
      setBusy('');
    }
  };

  const toggle = async id => {
    const draft = drafts[id] || {};
    const newIsOpen = !draft.isOpen;
    field(id, 'isOpen', newIsOpen);
    setBusy(`${id}:toggle`);
    try {
      await updateCompetition(id, { isOpen: newIsOpen });
      await load();
    } catch (toggleError) {
      field(id, 'isOpen', draft.isOpen);
      alert(toggleError.message || 'تعذر تغيير حالة المسابقة');
    } finally {
      setBusy('');
    }
  };

  const togglePeriod = key => setOpenPeriods(previous => ({ ...previous, [key]: !previous[key] }));

  const copyQr = (val, id) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const validCompetitions = Array.isArray(competitions) ? competitions : [];
  const qrCompetitions = validCompetitions.filter(isOnlineCompetition);

  const handlePrint = () => {
    if (!qrCompetitions || qrCompetitions.length === 0) {
      alert('لا توجد مسابقات رقمية لطباعتها');
      return;
    }

    const cards = qrCompetitions.map(comp => {
      const qrValue = comp.qrCode || `scout-qr-${comp.slug || comp.id}`;
      const svgEl = document.getElementById(`comp-qr-svg-${comp.id}`) || document.getElementById(`comp-inline-svg-${comp.id}`) || document.getElementById(`comp-hidden-svg-${comp.id}`);
      const svgHtml = svgEl ? svgEl.outerHTML : '';

      return {
        title: comp.name,
        badge: 'مسابقة رقمية',
        typeLabel: TYPE_LABELS[comp.type] || comp.type,
        instruction: 'امسح الرمز عبر كاميرا التطبيق في صفحة المسابقة للبدء',
        qrValue: qrValue,
        svgHtml: svgHtml,
      };
    });

    printQrCards({
      title: 'المخيم الكشفي الرقمي • أكواد مسابقات المهرجان',
      subtitle: 'أكواد QR الثابتة لدخول المسابقات الرقمية — جاهزة للطباعة والتعليق',
      cards,
    });
  };

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-6xl">
        <AdminBackLink />
        
        {/* Header - Screen Only */}
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-5 print:hidden">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              إدارة المسابقات <Trophy className="text-amber-400" />
            </h1>
            <p className="mt-2 text-xs font-bold text-slate-400">
              افتح الفترة، اختر المسابقة، عدّل البيانات، واطبع أكواد الـ QR الثابتة للمسابقات الرقمية.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2.5 text-xs text-cyan-300 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
            >
              <QrCode size={16} /> تصدير ومعاينة أكواد QR
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-ember flex items-center gap-1.5 !px-4 !py-2.5 text-xs shadow-lg shadow-amber-500/20"
            >
              <Printer size={16} /> طباعة أكواد المسابقات (A4)
            </button>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-black text-cyan-300">
              {validCompetitions.length} مسابقة
            </span>
          </div>
        </header>

        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200 print:hidden">{error}</div>}

        {/* Hidden QR codes for SVG DOM export */}
        <div style={{ display: 'none' }} aria-hidden="true">
          {qrCompetitions.map(comp => (
            <QRCodeSVG
              key={`hidden-${comp.id}`}
              id={`comp-hidden-svg-${comp.id}`}
              value={comp.qrCode || `scout-qr-${comp.slug || comp.id}`}
              size={175}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QR EXPORT & PRINT PREVIEW MODAL
           ═══════════════════════════════════════════════════════════════════ */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md print:hidden">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/30 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 p-5 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                    <QrCode size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">أكواد QR للمسابقات الرقمية</h2>
                    <p className="text-xs text-slate-400">أكواد ثابتة جاهزة للطباعة أو التنزيل كصور عالية الدقة</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handlePrint} className="btn-ember flex items-center gap-1.5 !px-3.5 !py-2 text-xs">
                    <Printer size={15} /> طباعة الكل (A4)
                  </button>
                  <button type="button" onClick={() => setShowQrModal(false)} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-6 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {qrCompetitions.map(comp => {
                    const qrValue = comp.qrCode || `scout-qr-${comp.slug || comp.id}`;
                    const svgId = `comp-qr-svg-${comp.id}`;
                    return (
                      <div key={comp.id} className="flex flex-col items-center justify-between rounded-2xl border border-slate-700 bg-white p-5 text-center text-slate-900 shadow-xl">
                        <div className="w-full border-b border-slate-200 pb-2">
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            {comp.name}
                          </span>
                          <p className="mt-1 text-[10px] font-bold text-slate-500">
                            {TYPE_LABELS[comp.type] || comp.type}
                          </p>
                        </div>

                        <div className="my-3 p-2 bg-white rounded-xl border border-slate-200">
                          <QRCodeSVG id={svgId} value={qrValue} size={160} bgColor="#ffffff" fgColor="#0f172a" level="H" />
                        </div>

                        <div className="w-full space-y-2">
                          <p className="break-all font-mono text-[10px] font-bold text-slate-700 bg-slate-100 p-1.5 rounded">
                            {qrValue}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => downloadSvgAsPng(svgId, `QR_${comp.slug || comp.name}`)}
                              className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                            >
                              <Download size={13} /> تحميل PNG
                            </button>
                            <button
                              type="button"
                              onClick={() => copyQr(qrValue, comp.id)}
                              className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                            >
                              {copiedId === comp.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              {copiedId === comp.id ? 'تم النسخ' : 'نسخ الكود'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List of Competitions / Periods */}
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400 print:hidden">جاري تحميل المسابقات...</div>
        ) : validCompetitions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-sm font-bold text-slate-400 print:hidden">
            لا توجد مسابقات مضافة بعد.
          </div>
        ) : (
          <div className="space-y-4 print:hidden">
            {groups.map(group => {
              const isOpen = Boolean(openPeriods[group.key]);
              return (
                <section key={group.key} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/55 shadow-xl">
                  <button
                    type="button"
                    onClick={() => togglePeriod(group.key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition hover:bg-cyan-500/[0.06]"
                  >
                    <div>
                      <h2 className="text-base font-black text-white">{PERIOD_NAMES[group.key] || group.key}</h2>
                      <p className="mt-1 text-xs font-mono font-bold text-cyan-300" dir="ltr">
                        {group.start && group.end ? formatTimeRange12(group.start, group.end) : 'بدون موعد محدد'} · {group.items.length} عنصر
                      </p>
                    </div>
                    {isOpen ? <ChevronUp className="text-cyan-300" /> : <ChevronDown className="text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="space-y-2 border-t border-slate-800 p-3 sm:p-4">
                      {group.items.map(competition => {
                        const draft = drafts[competition.id] || {};
                        const schedule = competition.schedule || {};
                        const expanded = expandedId === competition.id;
                        const isToggling = busy === `${competition.id}:toggle`;
                        const usesQr = isOnlineCompetition(competition);
                        const currentQr = draft.qrCode || competition.qrCode || `scout-qr-${competition.slug || competition.id}`;
                        const compSvgId = `comp-inline-svg-${competition.id}`;

                        return expanded ? (
                          <article key={competition.id} className="rounded-2xl border border-cyan-400/40 bg-slate-950/55 p-4 shadow-lg">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${typeClass(competition.type)}`}>
                                  {TYPE_LABELS[competition.type] || competition.type}
                                </span>
                                <p className="mt-2 text-xs font-bold text-slate-500">تعديل بيانات المسابقة</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
                              >
                                إغلاق
                              </button>
                            </div>
                            <div className={`grid gap-5 ${usesQr ? 'md:grid-cols-[1fr_220px]' : ''}`}>
                              <div className="space-y-4">
                                <label className="block text-xs font-black text-slate-400">
                                  اسم المسابقة
                                  <input
                                    className="ai-input mt-1 w-full text-base font-black"
                                    value={draft.name || ''}
                                    onChange={event => field(competition.id, 'name', event.target.value)}
                                  />
                                </label>
                                <label className="block text-xs font-black text-slate-400">
                                  مكان المسابقة
                                  <select
                                    className="ai-input mt-1 w-full bg-slate-950"
                                    value={draft.zoneId || ''}
                                    onChange={event => field(competition.id, 'zoneId', event.target.value)}
                                  >
                                    <option value="">غير محدد</option>
                                    {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                                  </select>
                                </label>
                                <label className="block text-xs font-black text-slate-400">
                                  تفاصيل المكان
                                  <input
                                    className="ai-input mt-1 w-full"
                                    placeholder="مثال: الدور الثاني أو المكان يحدد لاحقاً"
                                    value={draft.locationNote || ''}
                                    onChange={event => field(competition.id, 'locationNote', event.target.value)}
                                  />
                                </label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block text-xs font-black text-slate-400">
                                    من
                                    <span className="relative mt-1 block">
                                      <Clock3 size={15} className="pointer-events-none absolute right-3 top-3 text-amber-300" />
                                      <input
                                        type="text"
                                        placeholder="08:00 AM"
                                        className="ai-input w-full pr-9 font-mono"
                                        value={format12Hour(draft.startTime)}
                                        onChange={event => field(competition.id, 'startTime', parseTimeInput(event.target.value))}
                                      />
                                    </span>
                                  </label>
                                  <label className="block text-xs font-black text-slate-400">
                                    إلى
                                    <span className="relative mt-1 block">
                                      <Clock3 size={15} className="pointer-events-none absolute right-3 top-3 text-amber-300" />
                                      <input
                                        type="text"
                                        placeholder="09:00 AM"
                                        className="ai-input w-full pr-9 font-mono"
                                        value={format12Hour(draft.endTime)}
                                        onChange={event => field(competition.id, 'endTime', parseTimeInput(event.target.value))}
                                      />
                                    </span>
                                  </label>
                                </div>
                                {usesQr && (
                                  <label className="block text-xs font-black text-slate-400">
                                    كود الـ QR الخاص بالمسابقة (مطبوع للدخول)
                                    <input
                                      className="ai-input mt-1 w-full font-mono text-sm text-cyan-300"
                                      value={draft.qrCode || ''}
                                      placeholder={`افتراضي: scout-qr-${competition.slug}`}
                                      onChange={event => field(competition.id, 'qrCode', event.target.value)}
                                    />
                                  </label>
                                )}
                              </div>
                              {usesQr && (
                                <div className="flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-white p-4 text-center text-slate-900">
                                  <p className="mb-1 text-xs font-black text-slate-800">QR المسابقة</p>
                                  <div className="my-2 p-1 bg-white rounded-lg border border-slate-200">
                                    <QRCodeSVG id={compSvgId} value={currentQr} size={140} bgColor="#ffffff" fgColor="#0f172a" level="H" />
                                  </div>
                                  <p className="break-all font-mono text-[9px] font-bold text-slate-600 bg-slate-100 p-1 rounded w-full">
                                    {currentQr}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => downloadSvgAsPng(compSvgId, `QR_${competition.slug}`)}
                                    className="mt-2 w-full flex items-center justify-center gap-1 rounded border border-slate-300 bg-slate-50 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                                  >
                                    <Download size={12} /> تحميل صورة PNG
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                              <button
                                type="button"
                                onClick={() => toggle(competition.id)}
                                disabled={Boolean(busy)}
                                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black disabled:opacity-50"
                              >
                                {draft.isOpen ? <ToggleRight size={30} className="text-emerald-400" /> : <ToggleLeft size={30} className="text-slate-500" />}
                                <span className={draft.isOpen ? 'text-emerald-300' : 'text-slate-400'}>
                                  {isToggling ? 'جاري التحديث...' : draft.isOpen ? 'مفتوحة الآن' : 'فتح المسابقة'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => save(competition.id)}
                                disabled={busy === competition.id}
                                className="btn-primary flex items-center gap-2 !px-4 !py-2 text-xs"
                              >
                                <Save size={15} />
                                {busy === competition.id ? 'جاري الحفظ...' : 'حفظ التعديل'}
                              </button>
                            </div>
                          </article>
                        ) : (
                          <button
                            key={competition.id}
                            type="button"
                            onClick={() => setExpandedId(competition.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-right transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.05]"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${typeClass(competition.type)}`}>
                                  {TYPE_LABELS[competition.type] || competition.type}
                                </span>
                                <h3 className="truncate text-sm font-black text-white">{draft.name || competition.name}</h3>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400">
                                <span dir="ltr">
                                  {schedule.startTime && schedule.endTime ? formatTimeRange12(schedule.startTime, schedule.endTime) : 'موعد غير محدد'}
                                </span>
                                <span className="flex items-center gap-1 text-cyan-300">
                                  <MapPin size={12} />
                                  {draft.locationNote || schedule.locationNote || schedule.zone?.name || 'مكان غير محدد'}
                                </span>
                              </div>
                            </div>
                            <ChevronDown size={18} className="shrink-0 text-slate-500" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
};

export default AdminCompetitions;
