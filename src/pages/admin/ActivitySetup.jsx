import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Printer, QrCode, RefreshCw, Save, Trash2, ShieldCheck, Compass, Info } from 'lucide-react';
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

  const updateField = (index, field, value) => {
    setStages(previous => previous.map((stage, stageIndex) => {
      if (stageIndex !== index) return stage;
      return { ...stage, [field]: value };
    }));
  };

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
      const payload = stages.map(stage => ({
        id: stage.id,
        title: stage.title,
        taskType: stage.taskType || (stage.requiresSawaed ? 'مهمة سواعد' : 'بحث واستكشاف'),
        task: stage.requiresSawaed ? stage.task : (stage.task || stage.clue || 'ابحثوا عن QR المرحلة التالية'),
        requiresSawaed: Boolean(stage.requiresSawaed),
        clue: stage.clue || '',
      }));
      const result = await updateAdminEasterEggStages(payload);
      setStages(result.stages || []);
      setNotice('تم حفظ المراحل وتوليد QR جديد لكل مرحلة. يمكنك طباعة الأكواد الورقية الآن.');
    } catch (saveError) {
      setError(saveError.message || 'تعذر حفظ المراحل');
    } finally {
      setSaving(false);
    }
  };

  const selfRunCount = stages.filter(stage => !stage.requiresSawaed).length;

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-7xl">
        <AdminBackLink />
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              إعداد رحلة Easter Egg <QrCode className="text-cyan-300" />
            </h1>
            <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-400">
              حدد لكل مرحلة: هل هي <strong>مهمة ينفذها الفريق أمام السواعد</strong> ليستلم منهم كود الـ QR، أم <strong>بحث حر بالـ (Clue)</strong> يظهر لهم لغز مكان الـ QR التالي في أرض المهرجان.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={addStage} className="btn-ghost min-h-11 !px-4 text-xs">
              <Plus size={15} /> إضافة مرحلة
            </button>
            <button type="button" onClick={save} disabled={saving || loading || !stages.length} className="btn-primary min-h-11 !px-4 text-xs">
              <Save size={15} />{saving ? 'جاري الحفظ...' : 'حفظ وتوليد QR'}
            </button>
            <button type="button" onClick={() => window.print()} disabled={!stages.length} className="btn-ember min-h-11 !px-4 text-xs">
              <Printer size={15} /> طباعة كروت الـ QR
            </button>
            <button type="button" onClick={load} disabled={loading || saving} className="btn-ghost min-h-11 !px-4 text-xs">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث
            </button>
          </div>
        </header>

        {!loading && (
          <div className="mb-5 flex flex-wrap gap-2 text-xs font-black text-slate-300 print:hidden">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5">{stages.length} مرحلة إجمالاً</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 flex items-center gap-1.5">
              <Compass size={14} className="text-emerald-400" />
              {selfRunCount} مرحلة بحث ذاتي (Clue)
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-amber-400" />
              {stages.length - selfRunCount} مرحلة تسليم من السواعد
            </span>
          </div>
        )}

        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
        {notice && <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">{notice}</div>}

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل مراحل الرحلة...</div>
        ) : !stages.length ? (
          <div className="rounded-3xl border border-dashed border-cyan-400/30 bg-slate-950/40 p-12 text-center">
            <p className="text-sm font-bold text-slate-300">لا توجد مراحل بعد.</p>
            <button type="button" onClick={addStage} className="btn-primary mt-5 min-h-11 !px-5 text-xs">
              <Plus size={15} /> أضف أول مرحلة
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {stages.map((stage, index) => {
              const isLast = index === stages.length - 1;
              const isSawaed = Boolean(stage.requiresSawaed);

              return (
                <article key={stage.id} className="break-inside-avoid rounded-3xl border border-cyan-400/20 bg-slate-950/65 p-5 shadow-xl print:border-2 print:border-slate-800 print:bg-white print:text-black print:p-6 print:m-4">
                  
                  {/* Top Bar for Editor and Print */}
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 print:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-1 text-xs font-black text-cyan-200 print:border-slate-800 print:bg-slate-100 print:text-black">
                        المرحلة {index + 1} {stage.title ? `— ${stage.title}` : ''}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${isSawaed ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 print:text-amber-900' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 print:text-emerald-900'}`}>
                        {isSawaed ? '🛡️ تسليم سواعد' : '🔍 بحث ذاتي (Clue)'}
                      </span>
                    </div>

                    <div className="flex gap-1 print:hidden">
                      <button type="button" onClick={() => moveStage(index, -1)} disabled={index === 0} aria-label="تحريك المرحلة لأعلى" className="min-h-10 min-w-10 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30">
                        <ChevronUp size={17} />
                      </button>
                      <button type="button" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} aria-label="تحريك المرحلة لأسفل" className="min-h-10 min-w-10 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30">
                        <ChevronDown size={17} />
                      </button>
                      <button type="button" onClick={() => removeStage(index)} disabled={stages.length <= 1} aria-label="حذف المرحلة" className="min-h-10 min-w-10 rounded-xl border border-red-500/25 text-red-300 hover:bg-red-500/10 disabled:opacity-30">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                    
                    {/* Left/Form Inputs (hidden during print) */}
                    <div className="space-y-4 print:hidden">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-black text-slate-400">
                          عنوان المرحلة
                          <input
                            value={stage.title}
                            onChange={event => updateField(index, 'title', event.target.value)}
                            className="ai-input mt-1 w-full text-sm font-black"
                            placeholder="مثال: نداء البداية / لغز الشجرة"
                          />
                        </label>

                        <label className="block text-xs font-black text-slate-400">
                          تصنيف المهمة
                          <input
                            value={stage.taskType}
                            onChange={event => updateField(index, 'taskType', event.target.value)}
                            className="ai-input mt-1 w-full"
                            placeholder={isSawaed ? "مثال: مهمة حركية / فك شفرة" : "مثال: بحث واستكشاف"}
                          />
                        </label>
                      </div>

                      {/* Type Switch / Checkbox */}
                      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3.5">
                        <label className="flex cursor-pointer items-center gap-3 text-xs font-black text-white">
                          <input
                            type="checkbox"
                            checked={isSawaed}
                            onChange={event => updateField(index, 'requiresSawaed', event.target.checked)}
                            className="h-5 w-5 accent-amber-400 rounded cursor-pointer"
                          />
                          <span className={isSawaed ? 'text-amber-300' : 'text-slate-300'}>
                            المهمة تحتاج اعتماد وتسليم QR من السواعد
                          </span>
                        </label>
                        <p className="mt-1.5 mr-8 text-[11px] text-slate-400 leading-5">
                          {isSawaed
                            ? '✅ سيكتب الأدمن مهمة يقوم بها الفريق أمام الساعد، والساعد هو من يسلّمهم كود الـ QR التالي.'
                            : '🔍 لا تحتاج سواعد؛ سيظهر للفريق تلميح (Clue) يبحثون به عن كود الـ QR المعلق في الموقع بأنفسهم.'}
                        </p>
                      </div>

                      {/* Dynamic Field: Task vs Clue */}
                      {isSawaed ? (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <ShieldCheck size={14} />
                            المهمة التي ستظهر للفريق لتنفيذها أمام السواعد
                          </label>
                          <textarea
                            value={stage.task}
                            onChange={event => updateField(index, 'task', event.target.value)}
                            className="ai-input mt-1 min-h-24 w-full resize-y border-amber-500/30 focus:border-amber-400"
                            placeholder="مثال: غنّوا مقطعاً من أغنية المهرجان أو فكوا الشفرة أمام الساعد لاستلام كود المرحلة التالية"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-emerald-300 flex items-center gap-1.5">
                            <Compass size={14} />
                            تلميح ولغز مكان الـ QR التالي (Clue)
                            {isLast && <span className="text-[10px] text-slate-400">(المرحلة الختامية)</span>}
                          </label>
                          <textarea
                            value={stage.clue}
                            onChange={event => updateField(index, 'clue', event.target.value)}
                            className="ai-input mt-1 min-h-24 w-full resize-y border-emerald-500/30 focus:border-emerald-400"
                            placeholder={isLast ? "مثال: مبروك وصولكم للمرحلة الأخيرة! ابحثوا عن الكود الختامي بجوار سارية العلم" : "مثال: ابحثوا عن كود الـ QR خلف لوحة المخيم الكبرى بجوار المعرض الكشفي"}
                          />
                          <p className="text-[10px] text-emerald-400/80 font-bold flex items-center gap-1">
                            <Info size={12} /> هذا التلميح سيظهر للفريق في الشاشة بعد مسح الكود الحالي ليدلهم على الكود التالي.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* QR Code Container (Printable Paper Card) */}
                    <div className="rounded-2xl border border-white/10 bg-white p-4 text-center text-slate-900 shadow-sm print:border-0 print:p-2">
                      <div className="mb-2 border-b border-slate-200 pb-2">
                        <p className="text-xs font-black text-slate-900">
                          Easter Egg • المرحلة {index + 1}
                        </p>
                        <p className="text-[10px] font-bold text-slate-600">
                          {stage.title || `مرحلة #${index + 1}`}
                        </p>
                      </div>

                      <div className="flex justify-center my-2">
                        {stage.qrValue ? (
                          <QRCodeSVG value={stage.qrValue} size={180} bgColor="#ffffff" fgColor="#020b0e" level="H" />
                        ) : (
                          <div className="flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500">
                            احفظ لتوليد QR
                          </div>
                        )}
                      </div>

                      <div className="mt-2 rounded-lg bg-slate-100 p-2 text-right">
                        <p className="text-[10px] font-black text-slate-800">
                          {isSawaed ? '🛡️ كود خاص بالسواعد' : '📍 كود معلق في الموقع'}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-0.5 leading-4">
                          {isSawaed
                            ? 'يسلّم للفريق بعد أداء المهمة.'
                            : (stage.clue ? `الموقع: ${stage.clue}` : 'يُعلّق في الموقع المخصص بالـ Clue.')}
                        </p>
                      </div>

                      {stage.qrValue && (
                        <p className="mt-2 break-all font-mono text-[8px] text-slate-400">
                          {stage.qrValue}
                        </p>
                      )}
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

export default ActivitySetup;
