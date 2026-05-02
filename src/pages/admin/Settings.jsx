import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ChevronLeft, Cog, KeyRound, Link2, Loader2, Server, Video, XCircle } from 'lucide-react';
import { useCompetitions } from '../../context/CompetitionContext';
import { fetchHealth, isVideoApiConfigured } from '../../utils/videoApi';

const initialStatus = { state: 'idle', message: '', detail: null };

const AdminSettings = () => {
  const { settings, updateSettings } = useCompetitions();
  const [form, setForm] = useState({
    videoApiBaseUrl: settings.videoApiBaseUrl || '',
    videoApiToken: settings.videoApiToken || '',
    videoNumFrames: settings.videoNumFrames || 56,
  });
  const [status, setStatus] = useState(initialStatus);
  const [saved, setSaved] = useState(false);

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setSaved(false);
    setStatus(initialStatus);
  };

  const save = (event) => {
    event.preventDefault();
    updateSettings({
      videoApiBaseUrl: form.videoApiBaseUrl.trim(),
      videoApiToken: form.videoApiToken.trim(),
      videoNumFrames: Math.max(24, Math.min(600, Number(form.videoNumFrames) || 56)),
    });
    setSaved(true);
  };

  const test = async () => {
    setStatus({ state: 'loading', message: 'جارٍ الاتصال بالخادم...', detail: null });
    try {
      const payload = await fetchHealth({
        baseUrl: form.videoApiBaseUrl,
        token: form.videoApiToken,
      });
      setStatus({ state: 'success', message: 'الخادم يستجيب بنجاح', detail: payload });
    } catch (error) {
      setStatus({ state: 'error', message: error.message || 'فشل الاتصال', detail: null });
    }
  };

  const configured = isVideoApiConfigured(settings);

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-signal">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-50">
            الإعدادات
            <Cog className="text-accent" />
          </h1>
        </header>

        <section className="card mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-bold ${
                configured
                  ? 'border-primary/30 bg-primary/10 text-emerald-200'
                  : 'border-rose-400/25 bg-rose-500/10 text-rose-200'
              }`}
            >
              {configured ? 'مُعدّ' : 'غير مُعدّ'}
              {configured ? <CheckCircle size={14} /> : <XCircle size={14} />}
            </span>
            <div className="text-right">
              <p className="section-kicker">مسابقة تصميم الفيديو</p>
              <h2 className="section-title flex items-center justify-end gap-2">
                خادم StreamingT2V
                <Video className="text-signal" size={22} />
              </h2>
            </div>
          </div>

          <p className="mb-4 rounded-lg border border-signal/20 bg-signal/10 p-3 text-right text-sm leading-7 text-slate-200">
            شغّل دفتر <span className="font-mono">colab/StreamingT2V_Server.ipynb</span> على Google Colab، انسخ رابط ngrok العام
            (مثال: <span className="font-mono">https://abcd.ngrok-free.app</span>) والصقه هنا. إذا فعّلت <span className="font-mono">SCOUT_API_TOKEN</span> في Colab، أدخِله أيضًا في حقل
            "توكن الحماية".
          </p>

          <form onSubmit={save} className="space-y-4 text-right">
            <label className="block text-sm font-bold text-slate-300">
              <span className="mb-2 flex items-center justify-end gap-2">
                رابط الـ API
                <Link2 size={16} className="text-accent" />
              </span>
              <input
                type="url"
                dir="ltr"
                value={form.videoApiBaseUrl}
                onChange={handleChange('videoApiBaseUrl')}
                placeholder="https://abcd-1234.ngrok-free.app"
                className="input-field text-left"
              />
            </label>

            <label className="block text-sm font-bold text-slate-300">
              <span className="mb-2 flex items-center justify-end gap-2">
                توكن الحماية (اختياري)
                <KeyRound size={16} className="text-accent" />
              </span>
              <input
                type="password"
                dir="ltr"
                value={form.videoApiToken}
                onChange={handleChange('videoApiToken')}
                placeholder="نفس قيمة SCOUT_API_TOKEN"
                className="input-field text-left"
                autoComplete="off"
              />
            </label>

            <label className="block text-sm font-bold text-slate-300">
              <span className="mb-2 flex items-center justify-end gap-2">
                عدد الإطارات الافتراضي
                <Server size={16} className="text-accent" />
              </span>
              <input
                type="number"
                min="24"
                max="600"
                step="8"
                value={form.videoNumFrames}
                onChange={handleChange('videoNumFrames')}
                className="input-field text-center"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="submit" className="btn-primary">
                حفظ الإعدادات
              </button>
              <button
                type="button"
                onClick={test}
                disabled={!form.videoApiBaseUrl || status.state === 'loading'}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.state === 'loading' ? (
                  <span className="inline-flex items-center gap-2">
                    جارٍ الفحص
                    <Loader2 size={18} className="animate-spin" />
                  </span>
                ) : (
                  'اختبار الاتصال'
                )}
              </button>
            </div>

            {saved && (
              <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-center font-bold text-emerald-200">
                تم حفظ الإعدادات بنجاح
              </p>
            )}

            {status.state === 'success' && (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-right text-sm text-emerald-200">
                <p className="font-bold">{status.message}</p>
                {status.detail && (
                  <pre dir="ltr" className="overflow-x-auto rounded-lg bg-slate-950/70 p-3 text-left text-xs text-slate-200">
                    {JSON.stringify(status.detail, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {status.state === 'error' && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-right font-bold text-rose-200">
                {status.message}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
};

export default AdminSettings;
