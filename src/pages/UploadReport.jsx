import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Send, AlertCircle, Clock, UploadCloud, FileCheck, History,
  CheckCircle, ShieldCheck, Sparkles, FolderPlus, FileCode, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';
import { getMyReportPermissions, getMyReports, resubmitTeamReport, uploadTeamReport, uploadTeamReportFile } from '../services/api';
import { formatDateTime12 } from '../utils/timeFormat';

const REPORT_FIELD_GROUPS = [
  { key: 'scientific', label: 'المجال العلمي', slugs: ['report-scientific-research', 'report-ai-models', 'report-smart-scout'] },
  { key: 'scouting', label: 'المجال الكشفي', slugs: ['report-earth-magazine', 'report-scout-model', 'report-reels'] },
  { key: 'artistic', label: 'المجال الفني', slugs: ['report-campfire', 'report-poster', 'report-exhibition', 'report-art-workshop'] },
  { key: 'cultural', label: 'المجال الثقافي', slugs: ['video_design', 'report-carnival'] },
  { key: 'religious', label: 'المجال الديني', slugs: ['report-surah-al-kahf', 'report-hadith', 'report-worksheet', 'report-tilawa'] },
];
const REPORT_FIELD_BY_SLUG = Object.fromEntries(REPORT_FIELD_GROUPS.flatMap(group => group.slugs.map(slug => [slug, group.key])));

const UploadReport = () => {
  const { user } = useAuth();
  const { submitEntry } = useCompetitions();
  const [permissions, setPermissions] = useState([]);
  const [backendReports, setBackendReports] = useState([]);
  const [competitions, setCompetitions] = useState([]);

  useEffect(() => {
    const fetchComps = async () => {
      try {
        const [permissionRows, reportRows] = await Promise.all([getMyReportPermissions(), getMyReports()]);
        setPermissions(permissionRows);
        setBackendReports(reportRows);
        setCompetitions(permissionRows.map(row => row.competition));
      } catch (err) {
        console.error('Failed to load competitions:', err);
      }
    };
    fetchComps();
  }, []);

  // Dynamic MAX_REPORTS based on manual report competitions
  const reportCompetitions = competitions.filter((c) => c.type === 'manual_judged' || !c.type || c.type === 'video');
  const MAX_REPORTS = reportCompetitions.length || 1;

  // Selected state
  const [selectedCompId, setSelectedCompId] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Auto-detect team name
  const teamName = user?.label || user?.name || user?.username || 'فرقة الصقور';

  // Submissions for this team
  const myReports = backendReports.map(report => ({
    ...report,
    data: { title: report.title, fileName: report.fileName, reportIndex: 1, isLate: false },
    competitionName: report.competition?.name || competitions.find(c => c.id === report.competitionId)?.name || 'مسابقة',
    timestamp: report.uploadedAt
  }));

  const reportCount = myReports.length;
  const currentReportNumber = Math.min(reportCount + 1, MAX_REPORTS);
  const progressPercent = Math.round((reportCount / MAX_REPORTS) * 100);

  const sameId = (a, b) => String(a) === String(b);
  const activeComp = competitions.find((c) => sameId(c.id, selectedCompId));
  const activePermission = permissions.find(p => sameId(p.competitionId, selectedCompId));
  const existingReport = backendReports.find(r => sameId(r.competitionId, selectedCompId));
  const groupedPermissions = REPORT_FIELD_GROUPS.map(group => ({
    ...group,
    rows: permissions.filter(permission => REPORT_FIELD_BY_SLUG[permission.competition?.slug] === group.key),
  })).filter(group => group.rows.length > 0);
  const deadlineExpired = Boolean(activePermission?.deadline && new Date(activePermission.deadline) < new Date());
  const canSubmit = Boolean(activePermission?.canSubmit && !deadlineExpired && (!activePermission.hasReport || activePermission.reopened));

  const getDeadlineText = () => {
    if (!activePermission?.deadline) return 'لا يوجد موعد نهائي محدد';
    if (deadlineExpired) return 'انتهى موعد التسليم';
    return `متاح حتى ${formatDateTime12(activePermission.deadline)}`;
  };

  const MAX_FILE_SIZE_GB = 50;
  const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'ppt', 'docx', 'doc'];

  const pickFile = (file) => {
    if (!file) return;
    setError('');

    // Check size limit (50GB)
    const fileSizeGB = file.size / (1024 ** 3);
    if (fileSizeGB > MAX_FILE_SIZE_GB) {
      setError(`حجم الملف كبير جداً (${fileSizeGB.toFixed(2)}GB). الحد الأقصى المسموح به هو 50GB.`);
      return;
    }

    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`نوع الملف غير مسموح. الأنواع المسموحة هي: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    setFileInput(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedCompId) {
      setError('يرجى اختيار المسابقة/النشاط أولاً');
      return;
    }

    const comp = competitions.find((c) => sameId(c.id, selectedCompId));
    if (!comp) { setError('المسابقة غير موجودة'); return; }
    if (!canSubmit) { setError(deadlineExpired ? 'انتهى موعد التسليم' : existingReport ? 'تم التسليم مرة واحدة ولا يمكن إعادة الإرسال إلا بعد فتحه من الإدارة' : 'لا تملك صلاحية التسليم لهذه المسابقة'); return; }
    if (existingReport && fileInput) { setError('إعادة الإرسال عبر PATCH تدعم تعديل العنوان والمحتوى فقط؛ الملف السابق سيظل محفوظاً'); return; }
    const isLate = false;

    setSubmitting(true);

    try {
      const reportPayload = {
        title: reportTitle || comp.name,
        content: reportContent || `تقرير مسابقة ${comp.name} لفرقة ${teamName}`,
        competitionId: String(comp.id),
      };
      if (existingReport) {
        await resubmitTeamReport(existingReport.id, {
          title: reportPayload.title,
          content: reportPayload.content,
          fileName: existingReport.fileName
        });
      } else if (fileInput) {
        await uploadTeamReportFile({ ...reportPayload, file: fileInput });
      } else {
        await uploadTeamReport({ ...reportPayload, fileName: '' });
      }

      // 2️⃣ Local state persistence
      submitEntry(comp.id, teamName, {
        title: reportTitle || comp.name,
        content: reportContent || `تقرير مسابقة ${comp.name} لفرقة ${teamName}`,
        fileName: fileInput ? fileInput.name : '',
        reportIndex: currentReportNumber,
        isLate,
        score: 0,
        type: 'report',
      });

      setMessage(existingReport ? 'تمت إعادة إرسال التقرير المفتوح بنجاح.' : `تم رفع التقرير رقم #${currentReportNumber} بنجاح وأُرسل للجنة التحكيم ولـ Google Drive!`);
      const [permissionRows, reportRows] = await Promise.all([getMyReportPermissions(), getMyReports()]);
      setPermissions(permissionRows); setBackendReports(reportRows); setCompetitions(permissionRows.map(row => row.competition));
      setReportTitle('');
      setReportContent('');
      setFileInput(null);
      setSelectedCompId('');
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء رفع التقرير للسيرفر');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell dir-rtl !max-w-4xl relative min-h-screen">
      {/* ═══ HERO — بانر تسليم التقارير الكشفية ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[rgba(245,158,11,0.3)] shadow-[0_0_50px_-15px_rgba(245,158,11,0.2)]">
          {/* background image & video overlay slot */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80"
              alt="كشافة المهرجان"
              className="h-full w-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07060c] via-[#07060c]/80 to-[#07060c]/40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_70%)]" />
          </div>

          <div className="relative z-10 flex flex-col justify-end p-7 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="badge-ember flex items-center gap-1.5 px-4 py-1.5 text-xs">
                <Sparkles size={15} />
                المنظومة الرقمية للتقارير ({MAX_REPORTS} تقرير لكل فريق)
              </span>
              <span className="font-mono text-xs font-black text-[#a78bfa] bg-[rgba(139,92,246,0.15)] px-3 py-1 rounded-full border border-[rgba(139,92,246,0.3)]" dir="ltr">
                REPORTS SYSTEM • {MAX_REPORTS} SLOTS
              </span>
            </div>

            <h1 className="text-3xl font-black text-white sm:text-4xl leading-snug">
              منصة رفع التقارير <span className="text-fire">الرقمية</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#d5d0e8]">
              يُمكّن فريقك من توثيق حتى {MAX_REPORTS} تقريراً كشفياً وتقنياً خلال فترة المهرجان. يتم التوليد والأرشفة التلقائية باسم الفريق.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ═══ بطاقات الحالة: اسم الفريق المكتشف + عداد التقارير ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {/* بطاقة الفريق المتصل — تلقائي */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="glass-violet glass-sheen flex items-center gap-4 p-5"
        >
          <div className="glow-violet flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.15)] text-[#a78bfa]">
            <ShieldCheck size={28} />
          </div>
          <div className="min-w-0 text-right">
            <span className="text-[10px] font-extrabold text-[#6e6889]">الفريق المكتشف تلقائياً</span>
            <h3 className="truncate text-xl font-black text-white">{teamName}</h3>
            <p className="text-[11px] text-[#6ee7b7] font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle size={13} />
              هوية الفريق موثّقة في السجل
            </p>
          </div>
        </motion.div>

        {/* بطاقة عداد التقارير */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass-ember glass-sheen flex flex-col justify-between p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-[#fcd34d]">إنجاز تقارير الفريق</span>
            <span className="font-mono text-sm font-black text-white" dir="ltr">
              {reportCount} / {MAX_REPORTS}
            </span>
          </div>

          {/* شريط التقدم */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.5)] border border-[rgba(245,158,11,0.2)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] shadow-[0_0_12px_#f59e0b]"
            />
          </div>

          <p className="mt-2 text-[11px] text-[#a9a3c2] text-right font-bold">
            التقرير التالي القادم هو: <span className="text-[#fcd34d] font-black font-mono" dir="ltr">#{currentReportNumber}</span> من أصل {MAX_REPORTS} تقريراً.
          </p>
        </motion.div>
      </div>

      {/* ═══ شبكة خانات التقارير (Visualizer) ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="glass mb-8 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FolderPlus size={20} className="text-[#fcd34d]" />
            سجل الخانات الرقمية ({MAX_REPORTS} تقرير)
          </h3>
          <span className="text-xs font-mono text-[#a9a3c2]">مرفوع: {reportCount} | المتبقي: {MAX_REPORTS - reportCount}</span>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
          {Array.from({ length: MAX_REPORTS }).map((_, idx) => {
            const num = idx + 1;
            const isUploaded = num <= reportCount;
            const isCurrent = num === currentReportNumber && reportCount < MAX_REPORTS;

            return (
              <div
                key={num}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-300 ${isUploaded
                    ? 'border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]'
                    : isCurrent
                      ? 'border-[rgba(245,158,11,0.6)] bg-[rgba(245,158,11,0.2)] text-[#fcd34d] animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.4)] text-[#6e6889]'
                  }`}
              >
                <span className="font-mono text-xs font-black">{num}</span>
                <span className="text-[9px] font-bold mt-0.5">
                  {isUploaded ? 'مكتمل' : isCurrent ? 'التالي' : 'متاح'}
                </span>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ═══ تنبيه إرشادي ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="glass-ember mb-7 flex items-start gap-3.5 p-5"
      >
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-[#fcd34d]" />
        <p className="text-xs leading-6 text-[#e8e4f5]">
          تلقائياً يُربط هذا التقرير بـ <span className="font-black text-white">{teamName}</span> وتحصل على الرقم المتسلسل التلقائي.
          لا يلزم تحديد اليوم، فقط حدد المسابقة المعنية وارفق التقرير ليتم تسليمه مباشرة للجنة التحكيم.
        </p>
      </motion.div>

      {/* ═══ نموذج الرفع ═══ */}
      <motion.form
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.55 }}
        onSubmit={handleSubmit}
        className="glass p-7 sm:p-9 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 mb-2">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileCode size={20} className="text-[#a78bfa]" />
            نموذج تقديم التقرير رقم <span className="text-[#fcd34d] font-mono" dir="ltr">#{currentReportNumber}</span>
          </h2>
          <span className="badge-violet font-mono text-[11px]" dir="ltr">
            SLOT #{currentReportNumber} OF {MAX_REPORTS}
          </span>
        </div>

        {/* اختيار المسابقة */}
        <div className="text-right">
          <label className="mb-2 block text-xs font-black text-[#a9a3c2]">اختر المسابقة / النشاط المعني بالتقرير</label>
          <select
            value={selectedCompId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCompId(val);
              const comp = competitions.find((c) => sameId(c.id, val));
              if (comp) {
                setReportTitle(comp.name);
                setReportContent(`تقرير مسابقة ${comp.name} لفرقة ${teamName}`);
              }
            }}
            required
            className="input-field appearance-none"
          >
            <option value="">— اختر المسابقة المعنية بهذا التقرير —</option>
            {groupedPermissions.map(group => (
              <optgroup key={group.key} label={group.label}>
                {group.rows.map(p => (
                  <option key={p.competitionId} value={p.competitionId} disabled={!p.canSubmit || (p.hasReport && !p.reopened)}>
                    {p.competition.name} {p.hasReport ? (p.reopened ? '— إعادة إرسال مفتوحة' : '— تم التسليم') : ''} {!p.canSubmit ? '— غير مسموح' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* مؤشر الموعد */}
        {activeComp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between rounded-2xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.07)] p-4"
          >
            <span className={`font-mono text-sm font-black ${canSubmit ? 'text-[#6ee7b7]' : 'text-[#fda4af]'}`}>{getDeadlineText()} • {canSubmit ? (existingReport ? 'إعادة الإرسال مسموحة' : 'مسموح بالتسليم') : 'التسليم غير متاح'}</span>
            <div className="flex items-center gap-2 text-xs font-bold text-[#a9a3c2]">
              <span>توقيت تسليم {activeComp.name}</span>
              <Clock size={15} className="text-[#fcd34d]" />
            </div>
          </motion.div>
        )}

        {/* Dropzone رفع الملفات */}
        <div className="text-right">
          <label className="mb-2 block text-xs font-black text-[#a9a3c2]">إرفاق ملف التقرير / الصور / الفيديو (اختياري)</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 ${dragging
                ? 'border-[rgba(139,92,246,0.6)] bg-[rgba(139,92,246,0.1)]'
                : fileInput
                  ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.06)]'
                  : 'border-[rgba(255,255,255,0.12)] bg-[rgba(7,6,12,0.4)] hover:border-[rgba(139,92,246,0.4)]'
              }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.pptx,.ppt,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={(e) => pickFile(e.target.files?.[0])}
              className="hidden"
            />
            <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-3">
              {fileInput ? (
                <>
                  <FileCheck size={40} className="text-[#6ee7b7]" />
                  <p className="text-sm font-black text-[#6ee7b7]" dir="ltr">{fileInput.name}</p>
                  <p className="text-[11px] text-[#6e6889]">اضغط لتغيير الملف المرفق</p>
                </>
              ) : (
                <>
                  <UploadCloud size={40} className="text-[#a78bfa]" />
                  <p className="text-sm font-black text-white">اسحب الملف هنا أو اضغط للتصفح</p>
                  <p className="text-[11px] text-[#6e6889]">يدعم ملفات PDF وعروض PPTX/PPT ومستندات DOCX/DOC حتى 50GB</p>
                </>
              )}
            </label>
          </div>
        </div>

        {/* الرسائل والنتائج */}
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] p-4 text-sm font-black text-[#6ee7b7]"
          >
            {message}
          </motion.p>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.1)] p-4 text-sm font-bold text-[#fda4af]"
          >
            {error}
          </motion.p>
        )}

        <button type="submit" disabled={!canSubmit || submitting} className="btn-ember btn-shine w-full !py-4 text-base font-black disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? 'جاري الإرسال...' : existingReport ? 'إعادة إرسال التقرير المفتوح' : `تسليم التقرير رسمياً (#${currentReportNumber})`}
          <Send size={19} />
        </button>
      </motion.form>

      {/* ═══ قائمة التقارير السابقة المرفوعة ═══ */}
      {myReports.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="glass mt-8 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-black text-white">
              <History size={20} className="text-[#a78bfa]" />
              أرشيف تقارير {teamName} ({myReports.length})
            </div>
            <span className="text-xs font-mono text-[#6e6889]">أحدث التقارير</span>
          </div>

          <div className="space-y-3">
            {myReports.map((report, idx) => (
              <div key={report.id || idx} className="flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(7,6,12,0.5)] p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] text-[#6ee7b7] font-mono text-sm font-black">
                    #{report.data?.reportIndex || myReports.length - idx}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{report.data?.title || 'تقرير كشفي'}</p>
                    <p className="text-[11px] text-[#a9a3c2]">{report.competitionName} • {formatDateTime12(report.timestamp)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {report.data?.fileName && (
                    <span className="badge-mute !text-[10px] hidden sm:inline-flex" dir="ltr">
                      {report.data.fileName}
                    </span>
                  )}
                  <span className={`badge ${report.data?.isLate ? 'badge-danger' : 'badge-fern'} !text-[10px]`}>
                    {report.data?.isLate ? 'متأخر' : 'في الموعد'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </main>
  );
};

export default UploadReport;
