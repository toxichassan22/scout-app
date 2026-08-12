import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Printer, QrCode, RefreshCw, Save, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import AdminBackLink from '../../components/AdminBackLink';
import { getAdminEasterEggStages, updateAdminEasterEggStages } from '../../services/api';

function createStage(index) {
  const id = globalThis.crypto?.randomUUID ? `stage-${globalThis.crypto.randomUUID()}` : `stage-${Date.now()}-${index}`;
  return { id, title: '', taskType: 'مهمة', task: '', requiresSawaed: true, clue: '' };
}

const ActivitySetup = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminEasterEggStages();
      setStages(result.stages || []);
    } catch (loadError) {
      setError(loadError.message || 'تعذر تحميل مراحل الرحلة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (index, field, value) => setStages(previous => previous.map((stage, stageIndex) => stageIndex === index ? { ...stage, [field]: value } : stage));

  const moveStage = (index, direction) => setStages(previous => {
    const target = index + direction;
    if (target < 0 || target >= previous.length) return previous;
    const next = [...previous];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const addStage = () => setStages(previous => [...previous, createStage(previous.length)]);

  const removeStage = index => {
    if (stages.length <= 1) return;
    setStages(previous => previous.filter((_, stageIndex) => stageIndex !== index));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = stages.map(stage => ({ id: stage.id, title: stage.title, taskType: stage.taskType, task: stage.task, requiresSawaed: Boolean(stage.requiresSawaed), clue: stage.clue || '' }));
      const result = await updateAdminEasterEggStages(payload);
      setStages(result.stages || []);
      setNotice('تم حفظ المراحل وتوليد QR جديد لكل مرحلة. اطبع الأكواد بعد التأكد من الترتيب.');
    } catch (saveError) {
      setError(saveError.message || 'تعذر حفظ المراحل');
    } finally {
      setSaving(false);
    }
  };

  const selfRunCount = stages.filter(stage => !stage.requiresSawaed).length;

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-7xl"><AdminBackLink /><header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-5"><div><h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">إعداد رحلة Easter Egg <QrCode className="text-cyan-300" /></h1><p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-400">اكتب مهمة كل مرحلة وحدد هل تحتاج تدخل السواعد أم سيبحث الفريق عن QR التالي باستخدام clue. عدد الأكواد يساوي عدد المراحل المحفوظة.</p></div><div className="flex flex-wrap gap-2 print:hidden"><button type="button" onClick={addStage} className="btn-ghost min-h-11 !px-4 text-xs"><Plus size={15} /> إضافة مرحلة</button><button type="button" onClick={save} disabled={saving || loading || !stages.length} className="btn-primary min-h-11 !px-4 text-xs"><Save size={15} />{saving ? 'جاري الحفظ...' : 'حفظ وتوليد QR'}</button><button type="button" onClick={() => window.print()} disabled={!stages.length} className="btn-ember min-h-11 !px-4 text-xs"><Printer size={15} /> طباعة QR</button><button type="button" onClick={load} disabled={loading || saving} className="btn-ghost min-h-11 !px-4 text-xs"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button></div></header>
        {!loading && <div className="mb-5 flex flex-wrap gap-2 text-xs font-black text-slate-300"><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5">{stages.length} مرحلة</span><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">{selfRunCount} مرحلة clue</span><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5">{stages.length - selfRunCount} مرحلة مع السواعد</span></div>}
        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
        {notice && <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">{notice}</div>}
        {loading ? <div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل مراحل الرحلة...</div> : !stages.length ? <div className="rounded-3xl border border-dashed border-cyan-400/30 bg-slate-950/40 p-12 text-center"><p className="text-sm font-bold text-slate-300">لا توجد مراحل بعد.</p><button type="button" onClick={addStage} className="btn-primary mt-5 min-h-11 !px-5 text-xs"><Plus size={15} /> أضف أول مرحلة</button></div> : <div className="space-y-5">{stages.map((stage, index) => <article key={stage.id} className="break-inside-avoid rounded-3xl border border-cyan-400/20 bg-slate-950/65 p-5 shadow-xl print:border-slate-300 print:bg-white print:text-black print:shadow-none"><div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 print:border-slate-300"><div className="flex items-center gap-2"><span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200 print:border-slate-400 print:bg-white print:text-black">المرحلة {index + 1}</span><span className="text-[10px] font-bold text-slate-500">QR {stage.qrValue ? 'جاهز' : 'سيُولد بعد الحفظ'}</span></div><div className="flex gap-1 print:hidden"><button type="button" onClick={() => moveStage(index, -1)} disabled={index === 0} aria-label="تحريك المرحلة لأعلى" className="min-h-10 min-w-10 rounded-xl border border-slate-700 text-slate-300 disabled:opacity-30"><ChevronUp size={17} /></button><button type="button" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} aria-label="تحريك المرحلة لأسفل" className="min-h-10 min-w-10 rounded-xl border border-slate-700 text-slate-300 disabled:opacity-30"><ChevronDown size={17} /></button><button type="button" onClick={() => removeStage(index)} disabled={stages.length <= 1} aria-label="حذف المرحلة" className="min-h-10 min-w-10 rounded-xl border border-red-500/25 text-red-300 disabled:opacity-30"><Trash2 size={17} /></button></div></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]"><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-black text-slate-400">اسم المرحلة<input value={stage.title} onChange={event => updateField(index, 'title', event.target.value)} className="ai-input mt-1 w-full text-sm font-black" placeholder="مثال: الشفرة المعكوسة" /></label><label className="block text-xs font-black text-slate-400">نوع المهمة<input value={stage.taskType} onChange={event => updateField(index, 'taskType', event.target.value)} className="ai-input mt-1 w-full" placeholder="مثال: مهمة حركية" /></label></div><label className="block text-xs font-black text-slate-400">المهمة التي ستظهر للفريق<textarea value={stage.task} onChange={event => updateField(index, 'task', event.target.value)} className="ai-input mt-1 min-h-28 w-full resize-y" placeholder="اكتب المطلوب من الفريق بالتفصيل" /></label><label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs font-black text-amber-100"><input type="checkbox" checked={Boolean(stage.requiresSawaed)} onChange={event => updateField(index, 'requiresSawaed', event.target.checked)} className="h-5 w-5 accent-amber-400" />المهمة تحتاج اعتماد وتسليم QR من السواعد</label>{!stage.requiresSawaed && <label className="block text-xs font-black text-slate-400">clue مكان QR التالي{index === stages.length - 1 ? ' (اختياري لأن هذه آخر مرحلة)' : ''}<textarea value={stage.clue} onChange={event => updateField(index, 'clue', event.target.value)} className="ai-input mt-1 min-h-24 w-full resize-y" placeholder="مثال: ابحثوا عن QR بجوار لوحة البرنامج في المنطقة الثانية" /></label>}</div><div className="rounded-2xl border border-white/10 bg-white p-4 text-center print:border-slate-300"><p className="mb-3 text-[10px] font-black text-slate-700">QR المرحلة {index + 1}</p>{stage.qrValue ? <QRCodeSVG value={stage.qrValue} size={180} bgColor="#ffffff" fgColor="#020b0e" level="H" /> : <div className="flex h-44 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500">احفظ المراحل لتوليد QR</div>}{stage.qrValue && <p className="mt-3 break-all font-mono text-[9px] text-slate-500">{stage.qrValue}</p>}</div></div></article>)}</div>}
      </div>
    </main>
  );
};

export default ActivitySetup;
