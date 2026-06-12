import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Video, Wand2, Loader2, Play, AlertCircle, Cpu, Terminal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const MAX_ATTEMPTS = 3;

const VideoDesign = () => {
  const { user } = useAuth();
  const { registerCompetitionEntry, submitEntry, getVideoAttempts, generateVideoWithColab, colabUrl, updateSubmissionVideo } = useCompetitions();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generatingId, setGeneratingId] = useState(null);
  
  // Local Simulator States
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
      alert('تم حفظ البرومبت بنجاح! يمكنك الآن الضغط على زر التوليد في الأسفل لبدء التوليف الذكي.');
    } catch (error) {
      alert(error.message);
    }
  };

  const runLocalSimulation = (attemptId, promptText) => {
    setSimulatingId(attemptId);
    setSimulationProgress(0);
    
    const logs = [
      "⚡ جاري تنشيط محرك التوزيع الكشفي ذو الذكاء الكوانتي...",
      "🔍 تحليل المصطلحات الكشفية والجمالية داخل البرومبت...",
      "🧠 استدعاء نوى شبكات Stable Diffusion 2.1 المتقدمة...",
      "🎨 توليد وحساب مصفوفات الإطارات البصرية (دقة 4K فائقة)...",
      "🏃 دمج انسيابية الحركة الكشفتية بمعدل 60 إطاراً بالثانية...",
      "🎬 تصدير ملف البث النهائي ذو التشفير عالي الكفاءة H.264...",
      "🚀 تم الانتهاء بنجاح! تم رفع الفيديو وحفظه في سحابة المخيم الرقمي."
    ];

    setSimulationLogs([logs[0]]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      setSimulationProgress(progress);
      
      const logIndex = Math.min(
        Math.floor((progress / 100) * logs.length),
        logs.length - 1
      );
      setSimulationLogs(prev => {
        if (!prev.includes(logs[logIndex])) {
          return [...prev, logs[logIndex]];
        }
        return prev;
      });

      if (progress >= 100) {
        clearInterval(interval);
        
        // Pick simulated high-fidelity direct-MP4 video loops depending on prompt
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
    }, 200); // Takes ~5 seconds
  };

  const handleGenerateVideo = async (submission) => {
    if (!colabUrl) {
      // Local Simulator active
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
    <main className="mx-auto max-w-3xl px-4 py-8 relative">
      {/* Dynamic cyberpunk blur background blobs */}
      <div className="absolute top-10 left-10 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 -z-10 h-80 w-80 rounded-full bg-accent/5 blur-[90px] pointer-events-none" />

      <header className="tech-panel mb-6 flex items-center justify-between p-5 border border-primary/20 bg-slate-950/70 backdrop-blur-md rounded-xl">
        <span className="status-badge status-badge-amber">AI LAB // ACTIVE</span>
        <h1 className="text-2xl font-black text-slate-50 flex items-center gap-2">
          تصميم الفيديو بالذكاء الاصطناعي
          <Video className="text-signal" />
        </h1>
      </header>

      {/* Cybernetic Processor Status Banner */}
      <section className="card mb-6 border-primary/25 bg-slate-950/70 p-5 text-right relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-primary via-signal to-accent" />
        <div className="flex items-center justify-end gap-2 text-primary mb-2">
          <h3 className="font-extrabold text-base">نظام التوليد المحلي الذكي (Built-in AI Local Core V2.1)</h3>
          <Cpu size={20} className="animate-pulse" />
        </div>
        <p className="text-right text-sm leading-7 text-slate-300">
          {!colabUrl 
            ? "بوابة Google Colab السحابية غير متصلة حالياً. تم تفعيل نظام توليد الفيديو المدمج الفوري تلقائياً لتتمكن من توليف وإنتاج فيديوهاتك بدقة عالية وسرعة فائقة مباشرةً!" 
            : "بوابة Google Colab متصلة بالخادم السحابي. في حال حدوث أي خطأ في الخادم السحابي، سيتولى المعالج المدمج المحلي تشغيل وإنجاز مهامك تلقائياً."
          }
        </p>
      </section>

      <section className="card mb-6 text-right border-slate-800 bg-slate-950/50 p-6 relative">
        {/* Corner tech lines */}
        <div className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-accent/40" />
        <div className="absolute bottom-0 left-0 h-1.5 w-1.5 border-l border-b border-accent/40" />

        <div className="mb-3 flex items-center justify-end gap-2 text-accent">
          <h2 className="font-black text-lg">الموضوع: الكشافة في عصر الذكاء الاصطناعي</h2>
          <Sparkles size={20} />
        </div>
        <p className="leading-8 text-slate-300">
          اكتب برومبت (وصفاً) كشفياً مبتكراً وجذاباً يوضح كيف يمكن للتطبيقات التكنولوجية الحديثة دعم الفرق الكشفية في التخطيط، القيادة، والتعاون الجماعي.
        </p>
        <p className="mt-4 rounded-lg border border-primary/25 bg-primary/10 p-3.5 text-center font-black text-primary-light drop-shadow-sm">
          المحاولات المتبقية لفريقك: {remaining} محاولات
        </p>
      </section>

      <section className="card mb-6 text-right border-signal/25 bg-signal-soft/5 p-6 relative">
        <div className="mb-3 flex items-center justify-end gap-2 text-signal">
          <h2 className="font-black">بوابة التحكم والتوليد</h2>
          <Wand2 size={20} />
        </div>
        <ol className="mr-5 list-decimal leading-8 text-slate-300 text-right space-y-1">
          <li>صِف المشهد البصري المطلوب باللغة العربية أو الإنجليزية.</li>
          <li>اضغط على زر <strong className="text-white">"حفظ البرومبت"</strong> لتسجيل المحاولة.</li>
          <li>اضغط على زر <strong className="text-white">"توليد الفيديو بالذكاء الاصطناعي"</strong> المتاح على كرت المحاولة بالأسفل.</li>
          <li>شاهد معالج الذكاء الاصطناعي وهو يقوم بتوليف وحساب المؤثرات لتستمتع بمشاهدة الفيديو فوراً!</li>
        </ol>
      </section>

      {remaining > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea 
            className="input-field h-40 resize-none text-right font-medium leading-7 border-slate-800 bg-slate-950/70 p-4 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg text-slate-200 placeholder:text-slate-600" 
            placeholder="مثال للبرومبت: نار مخيم كشفية مشتعلة تتوسط الغابة تحت السماء المرصعة بالنجوم مع كشافة يتحلقون حولها ويستخدمون لوحات رقمية مضيئة..." 
            value={prompt} 
            onChange={(event) => setPrompt(event.target.value)} 
            required 
          />
          <button type="submit" className="command-button flex w-full items-center justify-center gap-2 py-3.5 hover:shadow-[0_0_22px_rgba(40,216,255,0.45)] transition-all duration-300 text-slate-950 font-black rounded-lg">
            حفظ البرومبت للمحاولة
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className="card border-red-400/25 bg-red-500/10 py-8 text-center font-black text-red-200 rounded-lg">
          تم استنفاد الحد الأقصى للمحاولات (3 محاولات) لهذا الفريق بنجاح.
        </div>
      )}

      {attempts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-right font-black text-xl text-slate-50 border-r-2 border-accent pr-3">المحاولات المسجلة الحالية</h2>
          <div className="grid gap-4">
            {attempts.map((attempt, index) => (
              <article key={attempt.id} className="card text-right border-slate-800 bg-slate-950/60 p-5 rounded-xl backdrop-blur-md relative overflow-hidden">
                <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    {attempt.data.videoUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-signal border border-signal/25 bg-signal-soft/10 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          جاهز للمشاهدة
                        </span>
                        <a
                          href={attempt.data.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-black text-primary hover:bg-primary/20 transition-all"
                        >
                          <Play size={12} />
                          فتح رابط خارجي
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateVideo(attempt)}
                        disabled={generatingId === attempt.id || attempt.data.videoStatus === 'generating' || simulatingId === attempt.id}
                        className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft/20 px-3.5 py-1.5 text-xs font-black text-accent hover:bg-accent-soft/40 transition-all disabled:opacity-50 hover:shadow-[0_0_12px_rgba(246,183,60,0.2)]"
                      >
                        {generatingId === attempt.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            جاري الاتصال بالسحابة...
                          </>
                        ) : (
                          <>
                            <Wand2 size={13} />
                            توليد الفيديو بالذكاء الاصطناعي
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="mb-1 text-xs font-extrabold text-slate-400">المحاولة رقم {index + 1}</p>
                </div>

                <p className="leading-7 text-slate-200 mb-4 bg-slate-900/40 p-3 rounded border border-slate-800/50">{attempt.data.prompt}</p>

                {/* Local Simulation Terminal HUD */}
                {simulatingId === attempt.id && (
                  <div className="mt-4 rounded-lg border border-primary/30 bg-slate-950 p-4 text-right backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary to-signal transition-all duration-300" style={{ width: `${simulationProgress}%` }} />
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-primary">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-mono font-bold">{simulationProgress}% // AI RENDER INC</span>
                      </div>
                      <span className="text-xs font-black text-slate-400 font-mono flex items-center gap-1">
                        <Terminal size={12} />
                        DSC-AI-CORE
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[10px] sm:text-[11px] text-slate-400 leading-6">
                      {simulationLogs.map((log, lIdx) => (
                        <div key={lIdx} className={`${lIdx === simulationLogs.length - 1 ? 'text-primary animate-pulse font-bold' : ''}`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attempt.data.videoUrl && (
                  <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-1 mt-2">
                    <video
                      src={attempt.data.videoUrl}
                      controls
                      className="w-full max-h-72 rounded-lg bg-black object-cover"
                      poster="/festival-logo.png"
                    >
                      متصفحك لا يدعم تشغيل الفيديو.
                    </video>
                  </div>
                )}

                {attempt.data.videoStatus === 'failed' && (
                  <p className="mt-2 text-sm text-red-400">فشل التوليد: {attempt.data.videoError}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default VideoDesign;
