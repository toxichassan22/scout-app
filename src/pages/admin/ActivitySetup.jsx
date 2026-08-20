import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Printer, QrCode, RefreshCw, Save, Trash2, ShieldCheck, Compass, Download, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import AdminBackLink from '../../components/AdminBackLink';
import { getAdminEasterEggStages, updateAdminEasterEggStages } from '../../services/api';
import { printQrCards } from '../../utils/printQrSheet';

function createStage(index) {
  const num = String(index + 1).padStart(2, '0');
  return {
    id: `stage-${num}`,
    title: `المرحلة ${index + 1}`,
    taskType: 'مهمة سواعد',
    task: '',
    requiresSawaed: true,
    clue: '',
    qrCode: `SCOUT-EASTER:stage-${num}`,
  };
}

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

const ActivitySetup = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState(null);

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

  const initTenStages = () => {
    if (stages.length > 0 && !window.confirm('هل تريد إعادة تعيين المراحل إلى 10 مراحل قياسية ثابتة؟ (الأكواد ستكون ثابتة جاهزة للطباعة)')) {
      return;
    }
    const standard = Array.from({ length: 10 }, (_, i) => createStage(i));
    setStages(standard);
  };

  const removeStage = index => {
    if (stages.length <= 1) return;
    setStages(previous => previous.filter((_, stageIndex) => stageIndex !== index));
  };

  const copyQr = (val, id) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = stages.map((stage, index) => {
        const num = String(index + 1).padStart(2, '0');
        const fallbackQr = `SCOUT-EASTER:${stage.id || `stage-${num}`}`;
        return {
          id: stage.id || `stage-${num}`,
          title: stage.title || `المرحلة ${index + 1}`,
          taskType: stage.taskType || (stage.requiresSawaed ? 'مهمة سواعد' : 'بحث واستكشاف'),
          task: stage.task || (stage.requiresSawaed ? 'نفذوا المهمة أمام السواعد' : (stage.clue || 'ابحثوا عن QR المرحلة التالية')),
          requiresSawaed: Boolean(stage.requiresSawaed),
          clue: stage.clue || '',
          qrCode: stage.qrCode || stage.qrValue || fallbackQr,
        };
      });
      const result = await updateAdminEasterEggStages(payload);
      setStages(result.stages || []);
      setNotice('✅ تم حفظ المراحل والأكواد بنجاح! الأكواد ثابتة ويمكنك طباعتها أو تعديل محتوى المهمة لاحقاً.');
    } catch (saveError) {
      setError(saveError.message || 'تعذر حفظ المراحل');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!stages || stages.length === 0) return;
    
    // Minimal cards for Easter Egg — only stage title & big QR
    const cards = stages.map((stage, index) => {
      const num = String(index + 1).padStart(2, '0');
      const qrVal = stage.qrCode || stage.qrValue || `SCOUT-EASTER:${stage.id || `stage-${num}`}`;
      const svgEl = document.getElementById(`easter-qr-svg-${index}`);
      const svgHtml = svgEl ? svgEl.outerHTML : '';

      return {
        title: stage.title || `المرحلة ${index + 1}`,
        qrValue: qrVal,
        svgHtml: svgHtml,
        minimal: true,
      };
    });

    printQrCards({
      title: 'المخيم الكشفي الرقمي • كروت رحلة Easter Egg',
      subtitle: 'أكواد QR الثابتة للمراحل — جاهزة للقص والتثبيت في أرض المهرجان',
      cards,
    });
  };

  const selfRunCount = stages.filter(stage => !stage.requiresSawaed).length;

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-7xl">
        <AdminBackLink />
        
        {/* Header - Screen Only */}
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-5 print:hidden">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              إعداد رحلة Easter Egg <QrCode className="text-cyan-300" />
            </h1>
            <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-400">
              💡 <strong>نظام الـ QR الثابت:</strong> يمكنك طباعة كروت الـ QR وتوزيعها أو لصقها في أرض المخيم الآن، وتستطيع كتابة أو تعديل محتوى ومهمة كل مرحلة في أي وقت لاحقاً وستظهر للفرق فور مسح الكود!
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addStage} className="btn-ghost min-h-11 !px-3 text-xs">
              <Plus size={15} /> إضافة مرحلة
            </button>
            <button type="button" onClick={initTenStages} className="btn-ghost min-h-11 !px-3 text-xs text-amber-300 border-amber-500/30">
              تجهيز 10 مراحل جاهزة
            </button>
            <button type="button" onClick={save} disabled={saving || loading || !stages.length} className="btn-primary min-h-11 !px-4 text-xs">
              <Save size={15} />{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button type="button" onClick={handlePrint} disabled={!stages.length} className="btn-ember min-h-11 !px-4 text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
              <Printer size={16} /> طباعة كروت الـ QR (A4)
            </button>
            <button type="button" onClick={load} disabled={loading || saving} className="btn-ghost min-h-11 !px-3 text-xs">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث
            </button>
          </div>
        </header>

        {/* Badges - Screen Only */}
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

        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200 print:hidden">{error}</div>}
        {notice && <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100 print:hidden">{notice}</div>}

        {/* Screen Stage Editor List */}
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400 print:hidden">جاري تحميل مراحل الرحلة...</div>
        ) : !stages.length ? (
          <div className="rounded-3xl border border-dashed border-cyan-400/30 bg-slate-950/40 p-12 text-center print:hidden">
            <p className="text-sm font-bold text-slate-300">لا توجد مراحل بعد.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={initTenStages} className="btn-ember min-h-11 !px-5 text-xs">
                تجهيز 10 مراحل قياسية
              </button>
              <button type="button" onClick={addStage} className="btn-primary min-h-11 !px-5 text-xs">
                <Plus size={15} /> أضف مرحلة جديدة
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 print:hidden">
            {stages.map((stage, index) => {
              const isLast = index === stages.length - 1;
              const isSawaed = Boolean(stage.requiresSawaed);
              const num = String(index + 1).padStart(2, '0');
              const qrVal = stage.qrCode || stage.qrValue || `SCOUT-EASTER:${stage.id || `stage-${num}`}`;
              const svgId = `easter-qr-svg-${index}`;

              return (
                <article key={stage.id || index} className="rounded-3xl border border-cyan-400/20 bg-slate-950/65 p-5 shadow-xl">
                  
                  {/* Top Bar for Editor */}
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-1 text-xs font-black text-cyan-200">
                        المرحلة {index + 1} {stage.title ? `— ${stage.title}` : ''}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${isSawaed ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                        {isSawaed ? '🛡️ تسليم سواعد' : '🔍 بحث ذاتي (Clue)'}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveStage(index, -1)} disabled={index === 0} aria-label="تحريك لأعلى" className="min-h-10 min-w-10 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 flex items-center justify-center">
                        <ChevronUp size={17} />
                      </button>
                      <button type="button" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} aria-label="تحريك لأسفل" className="min-h-10 min-w-10 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 flex items-center justify-center">
                        <ChevronDown size={17} />
                      </button>
                      <button type="button" onClick={() => removeStage(index)} disabled={stages.length <= 1} aria-label="حذف المرحلة" className="min-h-10 min-w-10 rounded-xl border border-red-500/25 text-red-300 hover:bg-red-500/10 disabled:opacity-30 flex items-center justify-center">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    
                    {/* Form Inputs */}
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-black text-slate-400">
                          عنوان المرحلة
                          <input
                            value={stage.title}
                            onChange={event => updateField(index, 'title', event.target.value)}
                            className="ai-input mt-1 w-full text-sm font-black"
                            placeholder={`مثال: المرحلة ${index + 1} / لغز السارية`}
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

                      {/* Type Switch */}
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
                            className="ai-input mt-1 min-h-20 w-full resize-y border-amber-500/30 focus:border-amber-400"
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
                            className="ai-input mt-1 min-h-20 w-full resize-y border-emerald-500/30 focus:border-emerald-400"
                            placeholder={isLast ? "مثال: مبروك وصولكم للمرحلة الأخيرة! ابحثوا عن الكود الختامي بجوار سارية العلم" : "مثال: ابحثوا عن كود الـ QR خلف لوحة المخيم الكبرى بجوار المعرض الكشفي"}
                          />
                        </div>
                      )}

                      {/* Custom QR override if desired */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400">
                          رمز الـ QR الثابت (المطبوع على الكرت):
                        </label>
                        <input
                          value={stage.qrCode || qrVal}
                          onChange={e => updateField(index, 'qrCode', e.target.value)}
                          className="ai-input mt-1 w-full font-mono text-xs text-cyan-300"
                          placeholder={`افتراضي: SCOUT-EASTER:stage-${num}`}
                        />
                      </div>
                    </div>

                    {/* QR Code Preview & Actions Card */}
                    <div className="flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-white p-4 text-center text-slate-900 shadow-md">
                      <div className="w-full border-b border-slate-200 pb-2">
                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black text-white">
                          المرحلة {index + 1}
                        </span>
                        <p className="mt-1 text-xs font-bold text-slate-800 truncate">
                          {stage.title || `مرحلة #${index + 1}`}
                        </p>
                      </div>

                      <div className="my-3 flex justify-center bg-white p-2 rounded-xl border border-slate-200">
                        <QRCodeSVG id={svgId} value={qrVal} size={150} bgColor="#ffffff" fgColor="#020b0e" level="H" />
                      </div>

                      <div className="w-full space-y-2">
                        <p className="break-all font-mono text-[9px] font-bold text-slate-500 bg-slate-100 p-1.5 rounded">
                          {qrVal}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadSvgAsPng(svgId, `EasterEgg_Stage_${index + 1}`)}
                            className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Download size={13} /> تحميل PNG
                          </button>
                          <button
                            type="button"
                            onClick={() => copyQr(qrVal, stage.id || index)}
                            className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            {copiedId === (stage.id || index) ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copiedId === (stage.id || index) ? 'تم النسخ' : 'نسخ الكود'}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            DEDICATED IN-PAGE PRINT SHEET (Minimalist)
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:w-full print:bg-white print:text-black">
          <div className="mb-6 text-center border-b-2 border-black pb-4">
            <h1 className="text-2xl font-black">المخيم الكشفي الرقمي • كروت رحلة Easter Egg</h1>
            <p className="text-xs mt-1 text-slate-600">أكواد QR الثابتة للمراحل — جاهزة للقص والتثبيت في أرض المهرجان</p>
          </div>

          <div className="qr-printable-grid">
            {stages.map((stage, index) => {
              const num = String(index + 1).padStart(2, '0');
              const qrVal = stage.qrCode || stage.qrValue || `SCOUT-EASTER:${stage.id || `stage-${num}`}`;

              return (
                <div
                  key={stage.id || index}
                  className="qr-printable-card"
                  style={{ padding: '16px' }}
                >
                  <div style={{ width: '100%', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#000', margin: 0 }}>
                      {stage.title || `المرحلة ${index + 1}`}
                    </h2>
                  </div>

                  <div style={{ margin: '12px 0', display: 'flex', justifyContent: 'center' }}>
                    <QRCodeSVG value={qrVal} size={185} bgColor="#ffffff" fgColor="#000000" level="H" />
                  </div>

                  <div style={{ width: '100%', textAlign: 'center', marginTop: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold', color: '#666' }} dir="ltr">
                      {qrVal}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: '8px', fontSize: '9px', color: '#888', borderTop: '1px dotted #ccc', width: '100%', paddingTop: '4px' }}>
                    ✂️ قص من هنا
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
};

export default ActivitySetup;
