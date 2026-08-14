import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Power, 
  RefreshCw, 
  Download, 
  Film, 
  Play, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Zap, 
  ExternalLink,
  Copy,
  Maximize2,
  Upload,
  ArrowRight,
  Flame,
  Camera,
  Layers,
  HelpCircle
} from 'lucide-react';
import AdminBackLink from '../../components/AdminBackLink';
import { 
  getGpuStatus, 
  startGpuServer, 
  stopGpuServer, 
  checkGpuHealth, 
  generateAiImage, 
  generateAiVideo 
} from '../../services/api';

const PROMPT_PRESETS = [
  {
    title: 'مخيم كشفي ليلي',
    prompt: 'مخيم كشفي ليلي رائع تحت سماء مليئة بالنجوم، خيام كشفية مضاءة من الداخل، شعلة نار المخيم تتصاعد منها ألسنة اللهب والشرر، تفاصيل سينمائية فائقة الدقة 8k، إضاءة دافئة وساحرة',
    style: 'Cinematic Photorealistic',
  },
  {
    title: 'شعار كشفي ذهبي 3D',
    prompt: 'شعار الكشافة المصرية ثلاثي الأبعاد مجسم ومصنوع من الذهب الخالص والألياف الزجاجية مع تفاصيل نيون متوهجة، خلفية داكنة فخمة مع انعكاسات ضوئية سينمائية 3D Render 8k',
    style: '3D Hyperrealistic',
  },
  {
    title: 'مغامرة كشفية في الصحراء',
    prompt: 'مجموعة من الكشافة الشباب في زي الكشافة الكامل يصعدون كثيباً رملياً وقت الغروب الذهبي في الصحراء المصرية، أعلام كشفية ترفرف، تصوير فوتوغرافي ناشيونال جيوغرافيك ملحمي',
    style: 'National Geographic Epic',
  },
  {
    title: 'شعلة النار الكشفية',
    prompt: 'لقطة مقربة سينمائية مذهلة لشعلة نار مخيم كشفي في الغابة مع حطب متوهج وشرر يتطاير في الهواء الليلي المظلم، إضاءة درامية حية فائقة الدقة HDR',
    style: 'Dramatic Macro Lighting',
  },
];

const MOTION_PRESETS = [
  {
    title: 'اقتراب سينمائي + حركة اللهب',
    prompt: 'Cinematic slow camera push-in, campfire flames flickering realistically, glowing sparks rising into the night air, trees gently swaying in the breeze, ultra smooth 4k motion',
  },
  {
    title: 'تحليق درون فوق المخيم',
    prompt: 'Cinematic drone flyover slowly ascending, flags waving in the wind, dynamic lighting shifts, atmospheric dust particles floating in golden hour sunlight',
  },
  {
    title: 'حركة بطيئة للرياح والأعلام',
    prompt: 'Slow motion breeze blowing through scout neckerchiefs and flags, subtle ambient movement, cinematic lighting reflections, shallow depth of field',
  },
  {
    title: 'دوران ناعم 360 حول المجسم',
    prompt: 'Smooth slow orbit camera movement around the central subject, shimmering golden highlights, cinematic studio lighting transition',
  },
];

export default function AiStudio() {
  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'video'
  
  // GPU Status State
  const [gpuStatus, setGpuStatus] = useState({
    state: 'unknown',
    publicIp: '52.21.126.195',
    instanceId: 'i-00b3cf16ddd411b8f',
    instanceType: 'g5.xlarge',
    health: { ready: false, status: 'checking' }
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('Cinematic Photorealistic');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageElapsed, setImageElapsed] = useState(0);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [imageHistory, setImageHistory] = useState([]);

  // Video Generation State
  const [selectedSourceImage, setSelectedSourceImage] = useState(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoNegativePrompt, setVideoNegativePrompt] = useState('blurry, jittery, distorted, morphing, low quality, jerky camera');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoElapsed, setVideoElapsed] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [videoHistory, setVideoHistory] = useState([]);

  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  // Poll GPU Status
  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await getGpuStatus();
      if (res && res.success) {
        setGpuStatus(res);
      }
    } catch (err) {
      console.warn('Failed to fetch GPU status', err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh status every 15s
    pollingRef.current = setInterval(fetchStatus, 15000);
    return () => clearInterval(pollingRef.current);
  }, []);

  // Timer effect for image generation
  useEffect(() => {
    let timer;
    if (isGeneratingImage) {
      setImageElapsed(0);
      timer = setInterval(() => setImageElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isGeneratingImage]);

  // Timer effect for video generation
  useEffect(() => {
    let timer;
    if (isGeneratingVideo) {
      setVideoElapsed(0);
      timer = setInterval(() => setVideoElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isGeneratingVideo]);

  const handleStartServer = async () => {
    try {
      setActionLoading(true);
      setStatusMessage('جارٍ إرسال أمر تشغيل السيرفر إلى AWS...');
      const res = await startGpuServer();
      setStatusMessage(res.message || 'تم إرسال أمر التشغيل بنجاح! يستغرق الإقلاع ~ دقيقة واحدة.');
      fetchStatus();
    } catch (err) {
      alert(err.message || 'فشل تشغيل السيرفر');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopServer = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في إيقاف سيرفر الـ GPU لتوفير التكاليف؟')) return;
    try {
      setActionLoading(true);
      setStatusMessage('جارٍ إرسال أمر إيقاف السيرفر إلى AWS...');
      const res = await stopGpuServer();
      setStatusMessage(res.message || 'تم إيقاف السيرفر بنجاح!');
      fetchStatus();
    } catch (err) {
      alert(err.message || 'فشل إيقاف السيرفر');
    } finally {
      setActionLoading(false);
    }
  };

  // Image Generation Action
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      setImageError('يرجى كتابة وصف للصورة أولاً');
      return;
    }
    setImageError('');
    setIsGeneratingImage(true);
    try {
      const res = await generateAiImage({
        prompt: imagePrompt.trim(),
        style: imageStyle,
      });
      if (res.success && res.url) {
        setGeneratedImage(res);
        setImageHistory(prev => [res, ...prev.filter(item => item.url !== res.url)]);
      } else {
        setImageError(res.error || 'تعذر توليد الصورة');
      }
    } catch (err) {
      setImageError(err.message || 'فشل الاتصال بسيرفر الذكاء الاصطناعي');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Switch to Video tab with selected image
  const handleSendToVideo = (imageItem) => {
    setSelectedSourceImage(imageItem);
    setActiveTab('video');
    if (!videoPrompt) {
      setVideoPrompt('Cinematic slow zoom in, natural ambient lighting movement, ultra smooth 4k');
    }
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Handle local image file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setSelectedSourceImage({
      url: previewUrl,
      file,
      fileName: file.name,
      isLocalUpload: true,
    });
  };

  // Video Generation Action
  const handleGenerateVideo = async () => {
    if (!selectedSourceImage) {
      setVideoError('يرجى اختيار أو رفع صورة مصدرية أولاً');
      return;
    }
    if (!videoPrompt.trim()) {
      setVideoError('يرجى تحديد وصف لحركة الكاميرا والمشهد');
      return;
    }

    setVideoError('');
    setIsGeneratingVideo(true);

    try {
      let res;
      if (selectedSourceImage.file) {
        const formData = new FormData();
        formData.append('file', selectedSourceImage.file);
        formData.append('prompt', videoPrompt.trim());
        if (videoNegativePrompt.trim()) {
          formData.append('negative_prompt', videoNegativePrompt.trim());
        }
        res = await generateAiVideo(formData);
      } else {
        res = await generateAiVideo({
          imageUrl: selectedSourceImage.url,
          imageFileName: selectedSourceImage.fileName,
          prompt: videoPrompt.trim(),
          negative_prompt: videoNegativePrompt.trim(),
        });
      }

      if (res.success && res.url) {
        setGeneratedVideo(res);
        setVideoHistory(prev => [res, ...prev.filter(item => item.url !== res.url)]);
      } else {
        setVideoError(res.error || 'تعذر توليد الفيديو');
      }
    } catch (err) {
      setVideoError(err.message || 'فشل الاتصال بسيرفر توليد الفيديو');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const isServerRunning = gpuStatus.state === 'running';
  const isServerPending = gpuStatus.state === 'pending';
  const isServerStopping = gpuStatus.state === 'stopping';
  const isServerStopped = gpuStatus.state === 'stopped';

  return (
    <main className="app-shell min-h-screen p-4 sm:p-6 text-right dir-rtl pb-24">
      <div className="mx-auto max-w-7xl">
        
        {/* Header with Navigation */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <AdminBackLink to="/admin/dashboard" label="العودة للوحة القيادة" />
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                استوديو الذكاء الاصطناعي (GPU Studio)
              </h1>
              <p className="text-xs text-slate-400">
                FLUX.1-dev للصور الفائقة و LTX-Video لتحريك الفيديو السينمائي على كارت Nvidia GPU
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-violet-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Sparkles size={26} className="animate-pulse" />
            </div>
          </div>
        </header>

        {/* ─── GPU Server Control & Status Bar ─── */}
        <section className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Status Details */}
            <div className="flex items-center gap-4">
              <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                isServerRunning 
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                  : isServerPending 
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'border-red-500/40 bg-red-500/10 text-red-400'
              }`}>
                <Cpu size={26} />
                <span className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                  isServerRunning ? 'bg-emerald-400 animate-ping' : isServerPending ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
                }`} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-black border ${
                    isServerRunning 
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' 
                      : isServerPending 
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 animate-pulse'
                      : isServerStopping
                      ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                      : 'border-red-500/40 bg-red-500/15 text-red-300'
                  }`}>
                    {isServerRunning && '🟢 متصل وجاهز للإنتاج'}
                    {isServerPending && '🟡 جارٍ تشغيل وإقلاع السيرفر...'}
                    {isServerStopping && '🟠 جارٍ إيقاف السيرفر...'}
                    {isServerStopped && '🔴 في وضع السكون (توفير التكاليف)'}
                    {!isServerRunning && !isServerPending && !isServerStopping && !isServerStopped && `⚪ الحالة: ${gpuStatus.state || 'مغلق'}`}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                    {gpuStatus.instanceType || 'g5.xlarge'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                  <span>المعرف: <code className="text-slate-300">{gpuStatus.instanceId}</code></span>
                  <span>•</span>
                  <span>المنطقة: <code className="text-slate-300">us-east-1</code></span>
                  <span>•</span>
                  <span>العنوان: <code className="text-cyan-300">{gpuStatus.publicIp}:8000</code></span>
                </p>
              </div>
            </div>

            {/* Server Controls */}
            <div className="flex items-center flex-wrap gap-2.5">
              <button
                type="button"
                onClick={fetchStatus}
                disabled={statusLoading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50 active:scale-95"
                title="تحديث حالة السيرفر"
              >
                <RefreshCw size={15} className={statusLoading ? 'animate-spin text-cyan-400' : ''} />
                تحديث
              </button>

              {!isServerRunning && (
                <button
                  type="button"
                  onClick={handleStartServer}
                  disabled={actionLoading || isServerPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
                >
                  <Zap size={16} className="fill-current" />
                  {isServerPending ? 'جارٍ الإقلاع (~1 دقيقة)...' : 'تشغيل السيرفر ⚡'}
                </button>
              )}

              {isServerRunning && (
                <button
                  type="button"
                  onClick={handleStopServer}
                  disabled={actionLoading || isServerStopping}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  <Power size={15} />
                  {isServerStopping ? 'جارٍ الإيقاف...' : 'إيقاف السيرفر 🛑'}
                </button>
              )}
            </div>
          </div>

          {/* Polite Sleeping Notice when offline */}
          {!isServerRunning && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                <span>
                  💡 <strong>ملاحظة التكلفة:</strong> سيرفر كارت الشاشة (GPU) في وضع السكون لتوفير التكاليف. اضغط على <strong>"تشغيل السيرفر ⚡"</strong> لبدء تشغيله (~1 دقيقة) قبل إرسال طلبات التوليد.
                </span>
              </div>
              {!isServerPending && (
                <button
                  type="button"
                  onClick={handleStartServer}
                  className="rounded-lg bg-amber-400 px-3 py-1 font-black text-slate-950 transition hover:bg-amber-300"
                >
                  تشغيل الآن
                </button>
              )}
            </div>
          )}

          {statusMessage && (
            <p className="mt-3 text-xs font-bold text-cyan-300 bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
              ℹ️ {statusMessage}
            </p>
          )}
        </section>

        {/* ─── Navigation Tabs ─── */}
        <div className="mb-8 flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-black transition relative ${
              activeTab === 'image'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon size={18} />
            <span>استوديو الصور (FLUX.1-dev)</span>
            {activeTab === 'image' && (
              <motion.div 
                layoutId="activeTabPill" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400" 
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-black transition relative ${
              activeTab === 'video'
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video size={18} />
            <span>تحريك الفيديو (LTX-Video)</span>
            {activeTab === 'video' && (
              <motion.div 
                layoutId="activeTabPill" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400" 
              />
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 1: FLUX.1 IMAGE STUDIO
           ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'image' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Input Form */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400">اكتب وصف المشهد الذي ترغب في توليده بدقة:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      FLUX.1-dev
                    </span>
                  </div>
                </div>

                {/* Prompt Presets */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map(preset => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        setImagePrompt(preset.prompt);
                        setImageStyle(preset.style);
                      }}
                      className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                      ✨ {preset.title}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div className="relative mb-4">
                  <textarea
                    rows={4}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="مثال: مخيم كشفي ليلي رائع مع شعلة نار تتطاير منها ألسنة اللهب وخيام مضاءة في الغابة، 8k بدقة سينمائية..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-500">
                    {imagePrompt.length} حرف
                  </span>
                </div>

                {/* Style Selector */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    'Cinematic Photorealistic',
                    '3D Hyperrealistic',
                    'National Geographic Epic',
                    'Scout Vintage Poster',
                    'Dramatic Campfire Night',
                    'None / Raw Prompt',
                  ].map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setImageStyle(style)}
                      className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                        imageStyle === style
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>

                {imageError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                    ⚠️ {imageError}
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-4 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:opacity-95 active:scale-98 disabled:opacity-50"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>جارٍ توليد الصورة بـ FLUX.1 ({imageElapsed} ثانية)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="fill-current" />
                      <span>توليد الصورة بـ FLUX.1-dev 🎨</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Preview & Handoff */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between min-h-[440px]">
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                      <ImageIcon size={18} className="text-emerald-400" />
                      معاينة الصورة المولدة
                    </h3>
                    {generatedImage && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {Math.round((generatedImage.sizeBytes || 0) / 1024)} KB • PNG
                      </span>
                    )}
                  </div>

                  {/* Image Display */}
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group">
                    {isGeneratingImage ? (
                      <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                          <Sparkles size={24} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                        </div>
                        <p className="text-sm font-black text-slate-200">الـ GPU يقوم بمعالجة مصفوفات FLUX.1...</p>
                        <p className="text-xs text-slate-400">استغرق حتى الآن: {imageElapsed} ثانية</p>
                      </div>
                    ) : generatedImage ? (
                      <>
                        <img 
                          src={generatedImage.url} 
                          alt="Generated AI" 
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end justify-between">
                          <p className="text-xs text-slate-200 line-clamp-2">{generatedImage.prompt}</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-600 p-8 text-center">
                        <ImageIcon size={48} className="stroke-1 opacity-50" />
                        <p className="text-xs font-bold text-slate-500">لم يتم توليد أي صورة بعد</p>
                        <p className="text-[11px] text-slate-600">اكتب الوصف واضغط توليد لبدء المعالجة</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                {generatedImage && !isGeneratingImage && (
                  <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <a
                        href={generatedImage.url}
                        download={generatedImage.fileName || 'flux-scout-image.png'}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                      >
                        <Download size={15} />
                        تحميل PNG
                      </a>
                      <a
                        href={generatedImage.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                        title="فتح بدقة كاملة"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>

                    {/* Important Handoff to Video Tab */}
                    <button
                      type="button"
                      onClick={() => handleSendToVideo(generatedImage)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-400 transition"
                    >
                      <Film size={16} />
                      <span>تحريك إلى فيديو سينمائي 🎬</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery of Session Images */}
            {imageHistory.length > 1 && (
              <div className="lg:col-span-12 mt-6">
                <h3 className="text-sm font-black text-slate-300 mb-4 flex items-center gap-2">
                  <Layers size={16} className="text-emerald-400" />
                  معرض صور هذه الجلسة ({imageHistory.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {imageHistory.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setGeneratedImage(item)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border cursor-pointer group transition ${
                        generatedImage?.url === item.url ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={item.url} alt="thumbnail" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSendToVideo(item); }}
                          className="rounded-lg bg-cyan-400 p-1.5 text-slate-950 font-bold text-[10px]"
                          title="تحريك إلى فيديو"
                        >
                          🎬 تحريك
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 2: LTX-VIDEO STUDIO
           ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Source Image & Motion Prompt */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Source Image Selector */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                    <Camera size={18} className="text-cyan-400" />
                    1. الصورة المصدرية (Input Frame)
                  </h3>
                  {selectedSourceImage && (
                    <button
                      type="button"
                      onClick={() => setSelectedSourceImage(null)}
                      className="text-xs font-bold text-red-400 hover:underline"
                    >
                      تغيير الصورة
                    </button>
                  )}
                </div>

                {selectedSourceImage ? (
                  <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                    <img 
                      src={selectedSourceImage.url} 
                      alt="Source" 
                      className="h-20 w-20 rounded-xl object-cover border border-cyan-500/40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-200 truncate">
                        {selectedSourceImage.fileName || 'صورة مختارة من FLUX.1'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {selectedSourceImage.isLocalUpload ? 'ملف مرفوع محلياً' : 'مولدة من استوديو FLUX.1'}
                      </p>
                      <span className="mt-1 inline-block text-[10px] text-emerald-400 font-bold">
                        ✓ جاهزة للتحريك بـ LTX-Video
                      </span>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition cursor-pointer text-center"
                  >
                    <Upload size={32} className="text-cyan-400 mb-2" />
                    <p className="text-xs font-bold text-slate-200">اسحب صورة هنا أو اضغط للاختيار من جهازك</p>
                    <p className="text-[11px] text-slate-500 mt-1">يدعم PNG, JPG حتى 30MB</p>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </div>
                )}

                {/* Quick select from recent images if no image is selected */}
                {!selectedSourceImage && imageHistory.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-slate-400 mb-2">أو اختر من صور FLUX.1 المولدة مؤخراً:</p>
                    <div className="flex gap-2.5 overflow-x-auto pb-2">
                      {imageHistory.slice(0, 5).map((item, idx) => (
                        <img
                          key={idx}
                          src={item.url}
                          alt="recent"
                          onClick={() => setSelectedSourceImage(item)}
                          className="h-16 w-16 rounded-xl object-cover border border-slate-700 hover:border-cyan-400 cursor-pointer transition shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Motion & Camera Prompt */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                    <Film size={18} className="text-cyan-400" />
                    2. وصف حركة الكاميرا والمشهد (Motion Prompt)
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    LTX-Video (720p HD)
                  </span>
                </div>

                {/* Motion Presets */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {MOTION_PRESETS.map(preset => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => setVideoPrompt(preset.prompt)}
                      className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
                    >
                      🎬 {preset.title}
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <textarea
                    rows={3}
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="اكتب تفاصيل حركة الكاميرا والعناصر بالإنجليزية أو العربية (مثال: Cinematic slow camera push-in, fire flames moving, wind blowing flags)..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                {/* Negative Prompt */}
                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    الوصف السلبي (Negative Prompt - ما ترغب في تجنبه):
                  </label>
                  <input
                    type="text"
                    value={videoNegativePrompt}
                    onChange={(e) => setVideoNegativePrompt(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-300 outline-none focus:border-slate-600"
                  />
                </div>

                {videoError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                    ⚠️ {videoError}
                  </div>
                )}

                {/* Generate Video Button */}
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !selectedSourceImage || !videoPrompt.trim()}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 p-4 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:opacity-95 active:scale-98 disabled:opacity-50"
                >
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>جارٍ رندرة وتوليد الفيديو بـ LTX ({videoElapsed} ثانية)...</span>
                    </>
                  ) : (
                    <>
                      <Video size={20} className="fill-current" />
                      <span>توليد فيديو سينمائي عالي الدقة HD 720p 🎬</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Video Player & Output */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between min-h-[440px]">
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                      <Film size={18} className="text-cyan-400" />
                      معاينة الفيديو السينمائي الناتج
                    </h3>
                    {generatedVideo && (
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                        720p HD • MP4
                      </span>
                    )}
                  </div>

                  {/* Video Player Box */}
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {isGeneratingVideo ? (
                      <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                          <Video size={24} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
                        </div>
                        <p className="text-sm font-black text-slate-200">الـ GPU يقوم بإنشاء الإطارات بـ LTX-Video...</p>
                        <p className="text-xs text-slate-400">الوقت المنقضي: {videoElapsed} ثانية (يستغرق عادة 20-45 ثانية)</p>
                      </div>
                    ) : generatedVideo ? (
                      <video 
                        src={generatedVideo.url} 
                        controls 
                        autoPlay 
                        loop 
                        playsInline
                        className="h-full w-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-600 p-8 text-center">
                        <Video size={48} className="stroke-1 opacity-50" />
                        <p className="text-xs font-bold text-slate-500">لم يتم توليد أي فيديو بعد</p>
                        <p className="text-[11px] text-slate-600">اختر صورة وحدد حركة الكاميرا واضغط توليد</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Actions */}
                {generatedVideo && !isGeneratingVideo && (
                  <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <a
                        href={generatedVideo.url}
                        download={generatedVideo.fileName || 'ltx-scout-video.mp4'}
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-300 transition"
                      >
                        <Download size={15} />
                        تحميل الفيديو MP4
                      </a>
                      <a
                        href={generatedVideo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                        title="فتح في تبويب مستقل"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1 max-w-[200px]">
                      {generatedVideo.prompt}
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* Video History */}
            {videoHistory.length > 1 && (
              <div className="lg:col-span-12 mt-6">
                <h3 className="text-sm font-black text-slate-300 mb-4 flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  سجل الفيديوهات المولدة في هذه الجلسة ({videoHistory.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {videoHistory.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setGeneratedVideo(item)}
                      className={`rounded-2xl overflow-hidden border p-3 bg-slate-900/60 cursor-pointer transition ${
                        generatedVideo?.url === item.url ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <video src={item.url} muted className="w-full aspect-video rounded-xl object-cover mb-2" />
                      <p className="text-xs text-slate-300 line-clamp-1">{item.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}
