import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Send, Sparkles, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';
import {
  buildVideoUrl,
  fetchJobStatus,
  generateVideo,
  isVideoApiConfigured,
} from '../../utils/videoApi';

const MAX_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 3000;

const STATUS_LABELS = {
  queued: 'في قائمة الانتظار',
  processing: 'جارٍ توليد الفيديو الآن',
  done: 'اكتمل التوليد',
  failed: 'فشل التوليد',
};

const VideoDesign = () => {
  const { user } = useAuth();
  const {
    registerCompetitionEntry,
    submitEntry,
    updateSubmissionData,
    getVideoAttempts,
    settings,
  } = useCompetitions();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const attempts = getVideoAttempts(user.name);
  const remaining = Math.max(0, MAX_ATTEMPTS - attempts.length);
  const apiReady = isVideoApiConfigured(settings);

  const pendingSubmission = useMemo(
    () =>
      attempts.find((attempt) => {
        const status = attempt.data?.status;
        return status === 'queued' || status === 'processing';
      }),
    [attempts],
  );

  const pollersRef = useRef(new Map());

  useEffect(() => {
    const result = registerCompetitionEntry(4, user.name);
    if (!result.ok) {
      alert(result.message);
      navigate('/competitions', { replace: true });
    }
  }, []);

  useEffect(() => () => {
    pollersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pollersRef.current.clear();
  }, []);

  useEffect(() => {
    if (!apiReady) return;
    attempts.forEach((attempt) => {
      const status = attempt.data?.status;
      const jobId = attempt.data?.jobId;
      if (!jobId || (status !== 'queued' && status !== 'processing')) return;
      if (pollersRef.current.has(attempt.id)) return;

      const poll = async () => {
        try {
          const payload = await fetchJobStatus({
            baseUrl: settings.videoApiBaseUrl,
            token: settings.videoApiToken,
            jobId,
          });
          const nextStatus = payload?.status || 'queued';
          const patch = {
            status: nextStatus,
            queuePosition: payload?.queue_position ?? null,
            error: payload?.error || '',
          };
          if (nextStatus === 'done') {
            patch.videoUrl = buildVideoUrl(settings.videoApiBaseUrl, jobId);
            patch.finishedAt = new Date().toISOString();
          }
          if (nextStatus === 'failed') {
            patch.finishedAt = new Date().toISOString();
          }
          updateSubmissionData(attempt.id, patch);
          if (nextStatus !== 'done' && nextStatus !== 'failed') {
            const timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
            pollersRef.current.set(attempt.id, timeoutId);
          } else {
            pollersRef.current.delete(attempt.id);
          }
        } catch (error) {
          updateSubmissionData(attempt.id, {
            status: 'failed',
            error: error.message || 'تعذّر الاتصال بالخادم',
          });
          pollersRef.current.delete(attempt.id);
        }
      };

      const timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
      pollersRef.current.set(attempt.id, timeoutId);
    });
  }, [apiReady, attempts, settings.videoApiBaseUrl, settings.videoApiToken, updateSubmissionData]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (remaining <= 0 || isSending || pendingSubmission) return;
    if (!apiReady) {
      setSubmissionError('خدمة توليد الفيديو غير مُعدّة بعد. تواصل مع الأدمن.');
      return;
    }
    setSubmissionError('');
    setIsSending(true);
    try {
      const response = await generateVideo({
        baseUrl: settings.videoApiBaseUrl,
        token: settings.videoApiToken,
        prompt,
        teamName: user.name,
        numFrames: settings.videoNumFrames,
      });
      const jobId = response?.job_id;
      if (!jobId) throw new Error('استجابة الخادم لا تحوي رقم مهمة');
      submitEntry(4, user.name, {
        prompt,
        score: 0,
        jobId,
        status: response?.status || 'queued',
        queuePosition: response?.queue_position ?? null,
        startedAt: new Date().toISOString(),
        videoUrl: '',
      });
      setPrompt('');
    } catch (error) {
      setSubmissionError(error.message || 'فشل بدء توليد الفيديو');
    } finally {
      setIsSending(false);
    }
  };

  const reversedAttempts = useMemo(
    () => [...attempts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [attempts],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="tech-panel mb-6 flex items-center justify-between p-5">
        <Video className="text-signal" />
        <h1 className="text-xl font-black text-slate-50">تصميم الفيديو</h1>
      </header>

      <section className="card mb-6 text-right">
        <div className="mb-3 flex items-center justify-end gap-2 text-accent">
          <h2 className="font-black">الموضوع: الكشافة في عصر الذكاء الاصطناعي</h2>
          <Sparkles size={20} />
        </div>
        <p className="leading-8 text-slate-300">
          اكتب برومبت واضحاً لفيديو قصير يشرح كيف تساعد التكنولوجيا الفرق الكشفية في التنظيم، التعلم، والعمل الجماعي. سيتم
          توليد الفيديو فعلياً بنموذج <span className="font-mono text-signal">StreamingT2V</span> المستضاف على Google Colab.
        </p>
        <p className="mt-4 rounded-lg border border-primary/25 bg-primary/10 p-3 text-center font-black text-primary-light">
          المحاولات المتبقية: {remaining}
        </p>
      </section>

      {!apiReady && (
        <div className="card mb-6 border-rose-400/30 bg-rose-500/10 text-right">
          <p className="flex items-center justify-end gap-2 font-bold text-rose-200">
            خدمة توليد الفيديو غير مُعدّة بعد. ينبغي على الأدمن تشغيل دفتر StreamingT2V على Colab وإدخال الرابط في الإعدادات.
            <AlertTriangle className="text-rose-300" />
          </p>
        </div>
      )}

      {pendingSubmission && (
        <section className="card mb-6 border-signal/40 bg-signal/10 text-right">
          <div className="mb-3 flex items-center justify-end gap-2 text-signal">
            <h3 className="font-black">{STATUS_LABELS[pendingSubmission.data?.status] || 'جارٍ المعالجة'}</h3>
            <Loader2 className="animate-spin" />
          </div>
          <p className="leading-7 text-slate-200">{pendingSubmission.data?.prompt}</p>
          {pendingSubmission.data?.queuePosition ? (
            <p className="mt-3 text-sm text-slate-400">
              ترتيبك في الطابور: {pendingSubmission.data.queuePosition}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            قد يستغرق التوليد عدّة دقائق. يمكنك ترك الصفحة مفتوحة وستتحدث تلقائياً.
          </p>
        </section>
      )}

      {remaining > 0 && !pendingSubmission ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="input-field h-44 resize-none text-right"
            placeholder="اكتب البرومبت هنا..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            required
            disabled={isSending || !apiReady}
          />
          {submissionError && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-right font-bold text-rose-200">
              {submissionError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSending || !apiReady}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? (
              <>
                جارٍ الإرسال
                <Loader2 size={18} className="animate-spin" />
              </>
            ) : (
              <>
                إرسال للتوليد
                <Send size={18} />
              </>
            )}
          </button>
        </form>
      ) : remaining === 0 ? (
        <div className="card border-rose-400/25 bg-rose-500/10 py-10 text-center font-black text-rose-200">
          تم استنفاد المحاولات الثلاث لهذا الفريق
        </div>
      ) : null}

      {reversedAttempts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-right font-black text-slate-50">محاولاتك السابقة</h2>
          <div className="grid gap-3">
            {reversedAttempts.map((attempt, index) => {
              const data = attempt.data || {};
              const status = data.status || 'queued';
              const order = reversedAttempts.length - index;
              return (
                <article key={attempt.id} className="card text-right">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                        status === 'done'
                          ? 'border-primary/30 bg-primary/15 text-emerald-200'
                          : status === 'failed'
                            ? 'border-rose-400/30 bg-rose-500/15 text-rose-200'
                            : 'border-signal/30 bg-signal/15 text-signal'
                      }`}
                    >
                      {STATUS_LABELS[status] || status}
                    </span>
                    <p className="text-xs font-bold text-slate-400">المحاولة {order}</p>
                  </div>
                  <p className="leading-7 text-slate-300">{data.prompt}</p>
                  {status === 'failed' && data.error && (
                    <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-200">
                      {data.error}
                    </p>
                  )}
                  {status === 'done' && data.videoUrl && (
                    <video
                      src={data.videoUrl}
                      controls
                      playsInline
                      className="mt-4 w-full rounded-lg border border-slate-700 bg-black"
                    />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default VideoDesign;
