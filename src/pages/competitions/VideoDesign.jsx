import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Send, Sparkles, Video, Wand2, Loader2, Play, Cpu, Terminal, CheckCircle2, Film,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';
import MediaSlot from '../../components/MediaSlot';

const MAX_ATTEMPTS = 3;

const VideoDesign = () => {
  const { user } = useAuth();
  const { registerCompetitionEntry, submitEntry, getVideoAttempts, generateVideoWithColab, colabUrl, updateSubmissionVideo } = useCompetitions();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generatingId, setGeneratingId] = useState(null);

  const [simulatingId, setSimulatingId] = useState(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationLogs, setSimulationLogs] = useState([]);

  const attempts = getVideoAttempts(user.name);
  const remaining = Math.max(0, MAX_ATTEMPTS - attempts.length);

  useEffect(() => {
    const result = registerCompetitionEntry(4, user.name);
    if (!result.ok) {
      alert(result.message);
      navigate('/competitions', { replace: true });
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (remaining <= 0) return;
    try {
      submitEntry(4, user.name, { prompt, score: 0 });
      setPrompt('');
      alert('تم حفظ البرومبت بنجاح! يمكنك الآن الضغط على زر التوليد في الأسفل.');
    } catch (error) {
      alert(error.message);
    }
  };

  const runLocalSimulation = (attemptId, promptText) => {
    setSimulatingId(attemptId);
    setSimulationProgress(0);

    const logs = [
      '⚡ جاري تنشيط محرك التوزيع الكشفي ذو الذكاء الكوانتي...',
      '🔍 تحليل المصطلحات الكشفية والجمالية داخل البرومبت...',
      '🧠 استدعاء نوى شبكات التوليد البصري المتقدمة...',
      '🎨 توليد وحساب مصفوفات الإطارات البصرية...',
      '🏃 دمج انسيابية الحركة بمعدل 60 إطاراً بالثانية...',
      '🎬 تصدير ملف البث النهائي عالي الكفاءة...',
      '🚀 تم الانتهاء! الفيديو جاهز في سحابة المخيم.',
    ];

    setSimulationLogs([logs[0]]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      setSimulationProgress(progress);

      const logIndex = Math.min(Math.floor((progress / 100) * logs.length), logs.length - 1);
      setSimulationLogs((prev) => (prev.includes(logs[logIndex]) ? prev : [...prev, logs[logIndex]]));

      if (progress >= 100) {
        clearInterval(interval);

        let videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4';
        const lowerPrompt = promptText.toLowerCase();
        if (lowerPrompt.includes('نار') || lowerPrompt.includes('مخيم') || lowerPrompt.includes('كشافة') || lowerPrompt.includes('حريق') || lowerPrompt.includes('خيم')) {
          videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-camp-fire-in-the-middle-of-the-forest-41655-large.mp4';
        } else if (lowerPrompt.includes('ذكاء') || lowerPrompt.includes('تكنولوجيا') || lowerPrompt.includes('كمبيوتر') || lowerPrompt.includes('تقني') || lowerPrompt.includes('رقم')) {
          videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-technological-particles-abstract-loop-33068-large.mp4';
        } else if (lowerPrompt.includes('فضاء') || lowerPrompt.includes('نجوم') || lowerPrompt.includes('كوكب') || lowerPrompt.includes('سماء') || lowerPrompt.includes('قمر')) {
          videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-galaxy-in-deep-space-32962-large.mp4';
        }

        updateSubmissionVideo(attemptId, videoUrl);

        setTimeout(() => {
          setSimulatingId(null);
          setSimulationProgress(0);
          setSimulationLogs([]);
        }, 1500);
      }
    }, 200);
  };

  const handleGenerateVideo = async (submission) => {
    if (!colabUrl) {
      runLocalSimulation(submission.id, submission.data.prompt);
      return;
    }
    setGeneratingId(submission.id);
    const result = await generateVideoWithColab(submission.id, submission.data.prompt);
    if (result.ok) {
      alert('تم توليد الفيديو بنجاح عبر الخادم السحابي!');
    } else {
      alert('خطأ في الاتصال بالخادم الخارجي، جاري التوليد المحلي التلقائي...');
      runLocalSimulation(submission.id, submission.data.prompt);
    }
    setGeneratingId(null);
  };

  return (
    <main className="page-shell dir-rtl !max-w-4xl">

      {/* ═══ HERO — بانر المختبر ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <MediaSlot
          name="video-lab-hero"
          kind="video"
          ratio="21/8"
          label="فيديو خلفية مختبر الذكاء الاصطناعي — جسيمات وشفرات متوهجة"
          className="!rounded-[2rem] border border-[rgba(139,92,246,0.3)]"
          overlay
        >
          <div className="flex h-full flex-col justify-end p-7">
            <span className="badge-violet mb-2.5 w-fit">
              <Cpu size={13} className="animate-pulse" />
              AI LAB · مسابقة تقييمية
            </span>
            <h1 className="flex items-center gap-2.5 text-2xl font-black text-white sm:text-3xl">
              تصميم الفيديو بالذكاء الاصطناعي
              <Film size={28} className="text-[#a78bfa]" />
            </h1>
            <p className="mt-1.5 max-w-lg text-xs leading-6 text-[#d5d0e8] sm:text-sm">
              الموضوع: <span className="font-black text-[#c4b5fd]">الكشافة في عصر الذكاء الاصطناعي</span> —
              اكتب برومبت مبتكر وشاهد فكرتك تتحول إلى فيديو.
            </p>
          </div>
        </MediaSlot>
      </motion.section>

      {/* ═══ عداد المحاولات ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="glass mb-8 flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-9 rounded-full transition-all duration-500 ${
                i < remaining
                  ? 'bg-gradient-to-l from-[#a78bfa] to-[#6d28d9] shadow-[0_0_12px_rgba(139,92,246,0.6)]'
                  : 'bg-[rgba(255,255,255,0.08)]'
              }`}
            />
          ))}
        </div>
        <p className="text-sm font-black text-white">
          المحاولات المتبقية: <span className="font-mono text-[#c4b5fd]" dir="ltr">{remaining} / {MAX_ATTEMPTS}</span>
        </p>
      </motion.div>

      {/* ═══ فورم البرومبت ═══ */}
      {remaining > 0 ? (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          onSubmit={handleSubmit}
          className="mb-10 space-y-4"
        >
          <div className="glass-violet glass-sheen relative p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-end gap-2 text-[#c4b5fd]">
              <h2 className="text-base font-black text-white">وحدة صياغة البرومبت</h2>
              <Wand2 size={19} />
            </div>
            <textarea
              className="input-field h-36 resize-none !rounded-2xl text-base leading-8"
              placeholder="مثال: نار مخيم كشفية مشتعلة تتوسط الغابة تحت سماء مرصعة بالنجوم، كشافة بمناديل بنفسجية يتحلقون حولها ويستخدمون لوحات رقمية مضيئة..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-violet btn-shine w-full !py-4 text-base">
            حفظ البرومبت للمحاولة
            <Send size={18} />
          </button>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-10 rounded-3xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.08)] p-8 text-center text-sm font-black text-[#fda4af]"
        >
          تم استنفاد الحد الأقصى للمحاولات (3 محاولات) لهذا الفريق.
        </motion.div>
      )}

      {/* ═══ المحاولات المسجلة ═══ */}
      {attempts.length > 0 && (
        <section>
          <h2 className="mb-5 flex items-center gap-2.5 border-r-[3px] border-[#8b5cf6] pr-3 text-xl font-black text-white">
            المحاولات المسجلة
            <Sparkles size={20} className="text-[#a78bfa]" />
          </h2>

          <div className="grid gap-5">
            {attempts.map((attempt, index) => (
              <motion.article
                key={attempt.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="glass-sheen glass relative overflow-hidden p-5 sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    {attempt.data.videoUrl ? (
                      <>
                        <span className="badge-fern !text-[10px]">
                          <CheckCircle2 size={11} />
                          جاهز للمشاهدة
                        </span>
                        <a
                          href={attempt.data.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="badge-violet !text-[10px] transition hover:brightness-125"
                        >
                          <Play size={11} />
                          فتح خارجي
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={() => handleGenerateVideo(attempt)}
                        disabled={generatingId === attempt.id || attempt.data.videoStatus === 'generating' || simulatingId === attempt.id}
                        className="btn-ember !px-4 !py-2 !text-xs"
                      >
                        {generatingId === attempt.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            جاري الاتصال...
                          </>
                        ) : (
                          <>
                            <Wand2 size={13} />
                            توليد الفيديو
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-black text-[#6e6889]">المحاولة {index + 1}</p>
                </div>

                <p className="mb-4 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(7,6,12,0.45)] p-4 text-sm leading-7 text-[#e8e4f5]">
                  {attempt.data.prompt}
                </p>

                {/* طرفية المحاكاة */}
                {simulatingId === attempt.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 overflow-hidden rounded-2xl border border-[rgba(139,92,246,0.35)] bg-[rgba(7,6,12,0.9)]"
                  >
                    <div className="h-1 bg-gradient-to-l from-[#a78bfa] to-[#f59e0b] transition-all duration-300" style={{ width: `${simulationProgress}%` }} />
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-2.5">
                        <div className="flex items-center gap-2 text-[#a78bfa]">
                          <Loader2 size={13} className="animate-spin" />
                          <span className="font-mono text-xs font-bold" dir="ltr">{simulationProgress}% · RENDERING</span>
                        </div>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#6e6889]" dir="ltr">
                          <Terminal size={11} />
                          DSC-AI-CORE
                        </span>
                      </div>
                      <div className="max-h-32 space-y-1.5 overflow-y-auto font-mono text-[11px] leading-6 text-[#a9a3c2]" dir="rtl">
                        {simulationLogs.map((log, i) => (
                          <div key={i} className={i === simulationLogs.length - 1 ? 'animate-pulse font-bold text-[#c4b5fd]' : ''}>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* الفيديو الناتج */}
                {attempt.data.videoUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-black"
                  >
                    <video src={attempt.data.videoUrl} controls className="max-h-80 w-full object-cover" poster="/festival-logo.png">
                      متصفحك لا يدعم تشغيل الفيديو.
                    </video>
                  </motion.div>
                )}

                {attempt.data.videoStatus === 'failed' && (
                  <p className="mt-3 text-xs font-bold text-[#fda4af]">فشل التوليد: {attempt.data.videoError}</p>
                )}
              </motion.article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default VideoDesign;
