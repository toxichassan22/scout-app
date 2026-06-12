import React, { useState } from 'react';
import { FileText, Send, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const UploadReport = () => {
  const { user } = useAuth();
  const { competitions, submitEntry, submissions } = useCompetitions();
  const [selectedCompId, setSelectedCompId] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Active competitions that can accept reports
  const activeCompetitions = competitions.filter(c => c.isOpen);

  const activeComp = competitions.find(c => c.id === Number(selectedCompId));

  const getDeadlineText = (comp) => {
    if (!comp) return '';
    if (!comp.startTime || !comp.duration) return 'مفتوح (بدون وقت محدد)';
    const end = new Date(comp.startTime).getTime() + comp.duration * 1000;
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    if (left <= 0) return 'منتهي الصلاحية';
    const minutes = Math.floor(left / 60);
    const seconds = left % 60;
    return `متبقي ${minutes} دقيقة و ${seconds} ثانية`;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileInput(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedCompId) {
      setError('يرجى اختيار المسابقة أولاً');
      return;
    }

    const comp = competitions.find(c => c.id === Number(selectedCompId));
    if (!comp) {
      setError('المسابقة غير موجودة');
      return;
    }

    // Verify time limit
    let isLate = false;
    if (comp.startTime && comp.duration) {
      const end = new Date(comp.startTime).getTime() + comp.duration * 1000;
      if (Date.now() > end) {
        isLate = true;
      }
    }

    try {
      submitEntry(comp.id, user.name, {
        title: reportTitle,
        content: reportContent,
        fileName: fileInput ? fileInput.name : '',
        isLate,
        score: 0,
        type: 'report'
      });
      setMessage('تم رفع التقرير بنجاح وأرسل للتقييم!');
      setReportTitle('');
      setReportContent('');
      setFileInput(null);
      setSelectedCompId('');
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء رفع التقرير');
    }
  };

  return (
    <main className="page-shell">
      <div className="tech-panel mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-primary">
            <FileText size={26} />
          </div>
          <div className="text-right">
            <p className="section-kicker">تسليم الأعمال</p>
            <h1 className="section-title">صفحة رفع التقارير</h1>
            <p className="mt-1 text-sm text-slate-400">ارفع تقرير فريقك وحدد المسابقة المعنية لتقييمها من قبل الحكام.</p>
          </div>
        </div>
      </div>

      <div className="card text-right border-slate-800 bg-slate-950/50 p-6 relative mb-6">
        <div className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-amber-500/40" />
        <div className="mb-3 flex items-center justify-end gap-2 text-amber-500">
          <h2 className="font-black text-lg">تعليمات تسليم التقارير</h2>
          <AlertCircle size={20} />
        </div>
        <p className="leading-7 text-slate-300 text-sm">
          تأكد من اختيار المسابقة الصحيحة من القائمة. يتم احتساب توقيت التسليم تلقائياً مقارنة بالوقت المحدد للمسابقة من قبل الأدمن. في حال تأخر التسليم، سيتم تمييز التقرير كـ "تأخير" لدى الحكام.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Team Name (Prefilled) */}
        <div className="text-right">
          <label className="block text-xs font-bold text-slate-400 mb-2">اسم الفريق</label>
          <input
            type="text"
            value={user?.name || ''}
            disabled
            className="input-field bg-slate-900/60 border-slate-800 text-slate-400 font-bold"
          />
        </div>

        {/* Competition Dropdown */}
        <div className="text-right">
          <label className="block text-xs font-bold text-slate-400 mb-2">اسم المسابقة</label>
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            required
            className="input-field bg-slate-900 border-slate-800 text-white font-bold"
          >
            <option value="">-- اختر المسابقة --</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id} disabled={!c.isOpen}>
                {c.name} {!c.isOpen ? '(مغلقة حالياً)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Live Deadline / Status Indicator */}
        {activeComp && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between text-right">
            <span className="text-sm font-black text-primary font-mono">{getDeadlineText(activeComp)}</span>
            <div className="flex items-center gap-2 text-slate-300 text-sm font-bold">
              <span>توقيت رفع تقرير مسابقة {activeComp.name}:</span>
              <Clock size={16} className="text-amber-500" />
            </div>
          </div>
        )}

        {/* Report Title */}
        <div className="text-right">
          <label className="block text-xs font-bold text-slate-400 mb-2">عنوان التقرير</label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            required
            placeholder="مثال: تقرير اليوم الأول لفريقنا الكشفي"
            className="input-field text-right"
          />
        </div>

        {/* Report Content */}
        <div className="text-right">
          <label className="block text-xs font-bold text-slate-400 mb-2">محتوى التقرير أو الإجابة</label>
          <textarea
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            required
            rows={6}
            placeholder="اكتب التقرير بالتفصيل هنا..."
            className="input-field text-right resize-none"
          />
        </div>

        {/* Mock File Upload */}
        <div className="text-right">
          <label className="block text-xs font-bold text-slate-400 mb-2">إرفاق ملف (اختياري)</label>
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer text-sm font-bold text-primary hover:text-primary-light transition">
              {fileInput ? `الملف المختار: ${fileInput.name}` : 'اضغط هنا لاختيار ملف أو صورة التقرير'}
            </label>
          </div>
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm font-medium text-emerald-400 text-right">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm font-medium text-red-400 text-right">
            {error}
          </p>
        )}

        <button type="submit" className="command-button w-full py-3.5 flex items-center justify-center gap-2 text-slate-950 font-black">
          <span>رفع التقرير الآن</span>
          <Send size={18} />
        </button>
      </form>
    </main>
  );
};

export default UploadReport;
