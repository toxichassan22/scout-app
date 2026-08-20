import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  ChevronLeft,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getGpuStatus, 
  startGpuServer, 
  stopGpuServer, 
  checkGpuHealth, 
  generateAiImage, 
  generateAiVideo 
} from '../services/api';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('video'); // Default to video or image
  
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
    if (!isAdmin) return;
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
    <main className="app-shell min-h-screen p-4 sm:p-6 text-right dir-rtl pb-28">
      <div className="mx-auto max-w-7xl">
        
        {/* Header with Navigation */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Link 
                to="/admin/dashboard" 
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-200 backdrop-blur-md transition hover:border-slate-500 hover:bg-slate-700"
              >
                <ArrowRight size={14} />
                <span>العودة للوحة القيادة</span>
              </Link>
            ) : (
              <Link 
                to="/activities" 
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 backdrop-blur-md transition hover:border-emerald-500/50 hover:bg-emerald-500/20"
              >
                <ArrowRight size={14} />
                <span>العودة لساحة الأنشطة</span>
              </Link>
            )}
            <Link 
              to="/home" 
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <span>الرئيسية</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                استوديو الذكاء الاصطناعي للفريق 🎬⚡
              </h1>
              <p className="text-xs text-slate-400">
                توليد فيديوهات سينمائية متحركة (LTX-Video) وصور فائقة الدقة (FLUX.1-dev) عبر معالج Nvidia GPU
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
                    {isServerRunning && '🟢 متصل وجاهز للإنتاج والتوليد'}
                    {isServerPending && '🟡 جارٍ إيقاظ وإقلاع السيرفر...'}
                    {isServerStopping && '🟠 جارٍ إيقاف السيرفر...'}
                    {isServerStopped && '🔴 السيرفر في وضع السكون (توفير التكاليف)'}
                    {!isServerRunning && !isServerPending && !isServerStopping && !isServerStopped && `⚪ الحالة: ${gpuStatus.state || 'مغلق'}`}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                    {gpuStatus.instanceType || 'g5.xlarge GPU'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                  <span>المعالج: <strong className="text-slate-300">NVIDIA A10G Tensor Core</strong></span>
                  <span>•</span>
                  <span>النماذج: <span className="text-cyan-300 font-bold">LTX-Video (فيديو)</span> + <span className="text-emerald-300 font-bold">FLUX.1-dev (صور)</span></span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchStatus}
                disabled={statusLoading}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                title="تحديث الحالة"
              >
                <RefreshCw size={16} className={statusLoading ? 'animate-spin' : ''} />
              </button>

              {(!isServerRunning && !isServerPending) && (
                <button
                  type="button"
                  onClick={handleStartServer}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 transition disabled:opacity-50"
                >
                  <Zap size={16} className="animate-pulse" />
                  <span>{actionLoading ? 'جارٍ التشغيل...' : 'إيقاظ السيرفر وبدء الإنتاج ⚡'}</span>
                </button>
              )}

              {isAdmin && (isServerRunning || isServerPending) && (
                <button
                  type="button"
                  onClick={handleStopServer}
                  disabled={actionLoading || isServerStopping}
                  className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
                  title="خاص بالإدارة فقط لإيقاف السيرفر وتوفير التكاليف"
                >
                  <Power size={16} />
                  <span>إيقاف السيرفر (إدارة)</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Alert Banner if server is stopped */}
          {isServerStopped && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed">
                  <strong>تنبيه:</strong> السيرفر في وضع السكون لتوفير استهلاك السحابة. اضغط على <strong>"إيقاظ السيرفر وبدء الإنتاج ⚡"</strong> أعلاه وسيصبح جاهزاً خلال حوالي 60 ثانية لتوليد الفيديو والصور.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartServer}
                disabled={actionLoading}
                className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
              >
                تشغيل الآن
              </button>
            </div>
          )}

          {statusMessage && (
            <p className="mt-3 text-center text-xs font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 p-2 rounded-xl">
              {statusMessage}
            </p>
          )}
        </section>

        {/* ─── Studio Tabs Header ─── */}
        <div className="mb-6 flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-black transition-all border-b-2 ${
              activeTab === 'video'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Video size={18} className={activeTab === 'video' ? 'text-cyan-400 animate-pulse' : ''} />
            <span>تحريك وتوليد الفيديو 🎬 (LTX-Video HD)</span>
            <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">الأساسي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-sm font-black transition-all border-b-2 ${
              activeTab === 'image'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ImageIcon size={18} className={activeTab === 'image' ? 'text-emerald-400 animate-pulse' : ''} />
            <span>توليد الصور الفائقة (FLUX.1-dev)</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: LTX-Video (Image-to-Video Animation)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'video' && (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            
            {/* Left Control Column (Prompt & Source Image) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Step 1: Select or Upload Source Image */}
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">1</span>
                    اختر أو ارفع الصورة المراد تحريكها
                  </h3>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
                  >
                    <Upload size={14} />
                    <span>رفع صورة من جهازك</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Selected Source Image Preview */}
                {selectedSourceImage ? (
                  <div className="relative rounded-2xl border border-cyan-500/40 bg-black/40 p-3 flex items-center gap-4">
                    <img
                      src={selectedSourceImage.url}
                      alt="الصورة المختارة"
                      className="h-24 w-24 object-cover rounded-xl border border-slate-700 shadow-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          {selectedSourceImage.isLocalUpload ? 'صورة مرفوعة' : 'من استوديو FLUX.1'}
                        </span>
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {selectedSourceImage.fileName || 'صورة جاهزة للتحريك'}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        تم تجهيز أبعاد الصورة بدقة HD لإنتاج مشهد سينمائي 720p ناعم
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-bold text-cyan-400 hover:underline"
                        >
                          تغيير الصورة
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSourceImage(null)}
                          className="text-[11px] font-bold text-red-400 hover:underline"
                        >
                          إلغاء الاختيار
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-8 text-center hover:border-cyan-500/50 hover:bg-cyan-950/10 transition group"
                  >
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition">
                      <Camera size={28} />
                    </div>
                    <p className="text-sm font-black text-slate-200">اضغط لرفع صورة من جهازك، أو اختر من معرض الصور أدناه</p>
                    <p className="mt-1 text-xs text-slate-400">يدعم PNG, JPG, WebP حتى 30MB</p>
                  </div>
                )}

                {/* Quick Selection from Recent Image History */}
                {imageHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-xs font-black text-slate-300 mb-2">أو اختر من آخر صور قمت بتوليدها:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {imageHistory.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSourceImage(item)}
                          className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition ${
                            selectedSourceImage?.url === item.url ? 'border-cyan-400 scale-105' : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <img src={item.url} alt="معاينة" className="h-16 w-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Step 2: Motion Prompt & Settings */}
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">2</span>
                  توجيه حركة الكاميرا والمشهد (Motion Prompt)
                </h3>

                {/* Motion Presets */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-300 mb-2 block">حركات سينمائية جاهزة ومجربة:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MOTION_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setVideoPrompt(preset.prompt)}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-right text-xs font-bold text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200 transition"
                      >
                        <span className="text-cyan-400">🎬 </span>
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    وصف الحركة بالإنجليزية أو العربية:
                  </label>
                  <textarea
                    rows={3}
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="مثال: Cinematic slow camera push-in, campfire sparks glowing, trees swaying in the night wind, smooth 4k..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 leading-relaxed font-sans"
                    dir="auto"
                  />
                </div>

                {/* Negative Prompt Collapsible */}
                <div className="mt-3">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    العناصر المستبعدة (Negative Prompt):
                  </label>
                  <input
                    type="text"
                    value={videoNegativePrompt}
                    onChange={(e) => setVideoNegativePrompt(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                {/* Error Banner */}
                {videoError && (
                  <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                    {videoError}
                  </div>
                )}

                {/* Generate Video Action Button */}
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !selectedSourceImage || !videoPrompt.trim()}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 py-4 text-base font-black text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:brightness-110 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>جارٍ معالجة وتوليد الفيديو السينمائي ({videoElapsed} ثانية)...</span>
                    </>
                  ) : (
                    <>
                      <Film size={20} />
                      <span>توليد الفيديو السينمائي بجودة HD 🎬</span>
                    </>
                  )}
                </button>
              </section>

            </div>

            {/* Right Display Column (Generated Video & Player) */}
            <div className="lg:col-span-5 space-y-6">
              
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Video size={18} className="text-cyan-400" />
                    <span>مشغل الفيديو الناتج</span>
                  </h3>
                  {generatedVideo && (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                      720p HD MP4
                    </span>
                  )}
                </div>

                {/* Generating Loading State */}
                {isGeneratingVideo && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-12 text-center">
                    <div className="relative mb-6">
                      <div className="h-20 w-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                      <Film size={28} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-black text-white">جارٍ التحريك بالذكاء الاصطناعي...</h4>
                    <p className="mt-2 text-xs text-slate-400 max-w-xs">
                      يقوم نموذج LTX-Video بمعالجة الإطارات بدقة عالية على معالج الرسوميات Nvidia Tensor Cores.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-950/80 border border-cyan-800/80 px-4 py-1 text-xs font-mono font-bold text-cyan-300">
                      <Clock size={14} />
                      <span>الوقت المنقضي: {videoElapsed} ثانية</span>
                    </div>
                  </div>
                )}

                {/* Generated Video Player */}
                {!isGeneratingVideo && generatedVideo && (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl">
                      <video
                        src={generatedVideo.url}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full max-h-[420px] rounded-xl object-contain bg-black"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <a
                        href={generatedVideo.url}
                        download={`scout_ai_video_${Date.now()}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-3 text-xs font-black text-cyan-200 hover:bg-cyan-500/20 transition shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      >
                        <Download size={16} />
                        <span>تحميل الفيديو MP4</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + generatedVideo.url);
                          alert('تم نسخ رابط الفيديو إلى الحافظة!');
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-300 hover:text-white transition"
                        title="نسخ رابط الفيديو"
                      >
                        <Copy size={16} />
                      </button>
                    </div>

                    <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <p className="truncate"><strong>الملف:</strong> {generatedVideo.fileName}</p>
                      <p><strong>الدقة:</strong> 720p HD H.264 MP4</p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isGeneratingVideo && !generatedVideo && (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center text-slate-500">
                    <Film size={40} className="mx-auto mb-3 text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">لم يتم توليد فيديو حتى الآن</p>
                    <p className="mt-1 text-xs text-slate-600">اختر صورة واضغط على "توليد الفيديو السينمائي" لإنشاء مشهد متحرك رائع</p>
                  </div>
                )}
              </section>

              {/* Video History Gallery */}
              {videoHistory.length > 1 && (
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <h4 className="text-xs font-black text-slate-300 mb-3">سجل الفيديوهات المنشأة للجلسة:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {videoHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setGeneratedVideo(item)}
                        className={`cursor-pointer overflow-hidden rounded-xl border p-1 transition ${
                          generatedVideo?.url === item.url ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <video src={item.url} className="h-20 w-full object-cover rounded-lg" />
                        <p className="mt-1 text-[10px] text-slate-400 truncate text-center">{item.fileName}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: FLUX.1 (Text-to-Image Generation)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'image' && (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            
            {/* Left Prompt Column */}
            <div className="lg:col-span-7 space-y-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-emerald-400" />
                  <span>وصف المشهد الكشفي (FLUX.1 Prompt)</span>
                </h3>

                {/* Prompt Presets */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-300 mb-2 block">نماذج أفكار كشفية ملهمة جاهزة:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROMPT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImagePrompt(preset.prompt);
                          setImageStyle(preset.style);
                        }}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-right text-xs font-bold text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200 transition"
                      >
                        <span className="text-emerald-400">✨ </span>
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    اكتب وصفاً مفصلاً للصورة المطلوبة:
                  </label>
                  <textarea
                    rows={4}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="مثال: مخيم كشفي ليلي رائع تحت ضوء القمر، شعلة نار المخيم متوهجة مع شرر طائر، جودة سينمائية فائقة 8k..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 leading-relaxed font-sans"
                    dir="auto"
                  />
                </div>

                {/* Style Selection */}
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-300 block mb-2">نمط الإخراج الفني:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Cinematic Photorealistic',
                      '3D Hyperrealistic',
                      'National Geographic Epic',
                      'Dramatic Macro Lighting',
                      'Digital Concept Art',
                      'Vintage Scout Heritage'
                    ].map((styleOption) => (
                      <button
                        key={styleOption}
                        type="button"
                        onClick={() => setImageStyle(styleOption)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          imageStyle === styleOption
                            ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {styleOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {imageError && (
                  <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                    {imageError}
                  </div>
                )}

                {/* Generate Image Button */}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 py-4 text-base font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:brightness-110 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>جارٍ توليد الصورة بدقة 8k بواسطة FLUX.1 ({imageElapsed} ثانية)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>توليد الصورة الفائقة بواسطة FLUX.1 ✨</span>
                    </>
                  )}
                </button>
              </section>
            </div>

            {/* Right Display Column (Generated Image & 1-Click Action) */}
            <div className="lg:col-span-5 space-y-6">
              
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <ImageIcon size={18} className="text-emerald-400" />
                    <span>الصورة الناتجة</span>
                  </h3>
                  {generatedImage && (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                      FLUX.1 PNG 8K
                    </span>
                  )}
                </div>

                {/* Generating Loading State */}
                {isGeneratingImage && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-12 text-center">
                    <div className="relative mb-6">
                      <div className="h-20 w-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                      <Sparkles size={28} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-black text-white">جارٍ رسم وتفصيل المشهد...</h4>
                    <p className="mt-2 text-xs text-slate-400 max-w-xs">
                      يقوم نموذج FLUX.1-dev ببناء التفاصيل الدقيقة والخامات والإضاءة الواقعية.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-950/80 border border-emerald-800/80 px-4 py-1 text-xs font-mono font-bold text-emerald-300">
                      <Clock size={14} />
                      <span>الوقت المنقضي: {imageElapsed} ثانية</span>
                    </div>
                  </div>
                )}

                {/* Generated Image Preview Card */}
                {!isGeneratingImage && generatedImage && (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl group">
                      <img
                        src={generatedImage.url}
                        alt="الصورة المولدة"
                        className="w-full max-h-[420px] rounded-xl object-contain bg-black"
                      />
                    </div>

                    {/* 1-Click Send to Video Button */}
                    <button
                      type="button"
                      onClick={() => handleSendToVideo(generatedImage)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400 bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 py-3.5 text-sm font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 transition"
                    >
                      <Film size={18} />
                      <span>تحريك إلى فيديو سينمائي 🎬 (إرسال إلى LTX-Video)</span>
                    </button>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <a
                        href={generatedImage.url}
                        download={`scout_flux_image_${Date.now()}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-xs font-black text-emerald-200 hover:bg-emerald-500/20 transition"
                      >
                        <Download size={16} />
                        <span>تحميل الصورة PNG</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + generatedImage.url);
                          alert('تم نسخ رابط الصورة إلى الحافظة!');
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-300 hover:text-white transition"
                        title="نسخ رابط الصورة"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isGeneratingImage && !generatedImage && (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center text-slate-500">
                    <ImageIcon size={40} className="mx-auto mb-3 text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">لم يتم توليد صورة حتى الآن</p>
                    <p className="mt-1 text-xs text-slate-600">اكتب وصفاً ثم اضغط على "توليد الصورة الفائقة"</p>
                  </div>
                )}
              </section>

              {/* Image History Gallery */}
              {imageHistory.length > 1 && (
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <h4 className="text-xs font-black text-slate-300 mb-3">سجل الصور السابقة للجلسة:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {imageHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setGeneratedImage(item)}
                        className={`cursor-pointer overflow-hidden rounded-xl border p-1 transition ${
                          generatedImage?.url === item.url ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <img src={item.url} alt="معاينة" className="h-16 w-full object-cover rounded-lg" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

          </div>
        )}

      </div>
    </main>
  );
}
