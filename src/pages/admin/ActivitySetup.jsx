import { useEffect, useState } from 'react';
import { Printer, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import AdminBackLink from '../../components/AdminBackLink';
import { getAdminEasterEggStages } from '../../services/api';

const ActivitySetup = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminEasterEggStages();
      setStages(result.stages || []);
    } catch (loadError) {
      setError(loadError.message || 'تعذر تحميل أكواد الرحلة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="app-shell min-h-screen p-4 text-white sm:p-6 dir-rtl">
      <div className="mx-auto max-w-7xl"><AdminBackLink /><header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-5"><div><h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">تجهيز رحلة Easter Egg <QrCode className="text-cyan-300" /></h1><p className="mt-2 max-w-2xl text-xs font-bold leading-6 text-slate-400">اطبع الأكواد بالترتيب وسلّم كل كود لفريق السواعد بعد اعتماد المهمة السابقة. الأكواد ثابتة ولا تظهر للفرق قبل مسحها.</p></div><div className="flex gap-2 print:hidden"><button type="button" onClick={() => window.print()} disabled={!stages.length} className="btn-primary !px-4 !py-2 text-xs"><Printer size={15} /> طباعة الأكواد</button><button type="button" onClick={load} disabled={loading} className="btn-ghost !px-4 !py-2 text-xs"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث</button></div></header>
        {error && <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
        {loading ? <div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل مراحل الرحلة...</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{stages.map(stage => <article key={stage.id} className="break-inside-avoid rounded-3xl border border-cyan-400/20 bg-slate-950/65 p-5 text-right shadow-xl print:border-slate-300 print:bg-white print:text-black print:shadow-none"><div className="mb-4 flex items-center justify-between gap-3"><span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-200 print:border-slate-400 print:bg-white print:text-black">المرحلة {stage.index + 1}</span><span className="text-[10px] font-bold text-slate-500 print:text-slate-700">{stage.taskType}</span></div><h2 className="text-lg font-black text-white print:text-black">{stage.title}</h2><p className="mt-3 text-xs leading-6 text-slate-400 print:text-slate-700">{stage.task}</p><div className="my-5 flex justify-center rounded-2xl bg-white p-4"><QRCodeSVG value={stage.qrValue} size={180} bgColor="#ffffff" fgColor="#020b0e" level="H" /></div><p className="text-center text-[10px] font-mono break-all text-slate-500 print:text-slate-700">{stage.qrValue}</p></article>)}</div>}
      </div>
    </main>
  );
};

export default ActivitySetup;
