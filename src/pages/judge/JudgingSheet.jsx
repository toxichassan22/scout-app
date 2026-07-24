import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, Save, ArrowRight, ShieldCheck, Award,
  FileText, ExternalLink, Eye, X, FileCheck, Layers
} from 'lucide-react';
import { getJudgeTeams, submitJudgeScore } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const JudgingSheet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const competition = location.state?.competition;
  const { socket } = useSocket();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!competition) {
      navigate('/judge/passcode', { replace: true });
      return;
    }

    fetchTeams();

    if (socket) {
      socket.on('judge:session:closed', ({ competitionId }) => {
        if (competitionId === competition.id) {
          alert('تم إغلاق التقييم لهذه المسابقة من قِبل الأدمن');
          navigate('/judge/passcode', { replace: true });
        }
      });

      return () => {
        socket.off('judge:session:closed');
      };
    }
  }, [competition, socket]);

  const fetchTeams = async () => {
    try {
      const data = await getJudgeTeams(competition.id);
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        selectTeam(data[0]);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = (team) => {
    setSelectedTeam(team);
    // Populate existing or initial scores
    const initialScores = {};
    (competition.criteria || []).forEach(c => {
      initialScores[c.key] = 0;
    });
    setScores(initialScores);
  };

  const handleScoreChange = (key, val, maxScore) => {
    const num = Math.min(maxScore, Math.max(0, parseFloat(val) || 0));
    setScores(prev => ({ ...prev, [key]: num }));
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
  };

  const handleSubmitScore = async () => {
    if (!selectedTeam) return;
    setSubmitting(true);
    setMessage('');

    const total = calculateTotal();
    try {
      await submitJudgeScore({
        competitionId: competition.id,
        teamId: selectedTeam.id,
        values: scores,
        total
      });

      setMessage('تم حفظ النتيجة وتحديث لوحة الشرف أوتوماتيكياً!');
      setShowConfirm(false);
      await fetchTeams();
    } catch (err) {
      setMessage(err.message || 'فشل في حفظ التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  if (!competition) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 dir-rtl font-sans">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 card p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            استمارة تحكيم رسمية
          </span>
          <h1 className="text-xl font-black mt-2 text-white">{competition.name}</h1>
        </div>

        <button
          onClick={() => navigate('/judge/passcode')}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-2 rounded-xl transition"
        >
          <ArrowRight size={14} />
          خروج للـ Passcode
        </button>
      </div>

      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Teams Sidebar */}
        <div className="card p-4 rounded-2xl border border-slate-800 bg-slate-900/40 text-right">
          <h2 className="text-sm font-bold text-slate-400 mb-3 border-b border-slate-800 pb-2">
            قائمة الفرق ({teams.length})
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">جاري تحميل الفرق...</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTeam(t)}
                  className={`w-full text-right p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    selectedTeam?.id === t.id
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {t.hasSubmitted ? (
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                    )}
                    <span className="truncate">{t.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.report && (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono">
                        📄 تقرير
                      </span>
                    )}
                    {t.hasSubmitted && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{t.existingScore} ن</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Sheet Main Area */}
        <div className="md:col-span-2 card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 text-right">
          {selectedTeam ? (
            <div>
              {/* Header with Report View Button */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    {selectedTeam.hasSubmitted ? 'تم تقييمه سابقاً' : 'في انتظار التقييم'}
                  </span>

                  {/* 📄 Report View Action Button for Judge */}
                  {selectedTeam.report ? (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition shadow-sm"
                    >
                      <Eye size={14} className="text-purple-400" />
                      عرض تقرير الفريق
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700">
                      لا يوجد تقرير مرفوع
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-black text-white">{selectedTeam.label}</h2>
              </div>

              {/* Dynamic Criteria inputs */}
              <div className="space-y-6 mb-8">
                {(competition.criteria || []).length === 0 ? (
                  <p className="text-xs text-slate-500">لا توجد بنود تقييم محددة للمسابقة</p>
                ) : (
                  (competition.criteria || []).map((c) => (
                    <div key={c.key} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-amber-400 font-bold">
                          {scores[c.key] || 0} / {c.maxScore}
                        </span>
                        <label className="text-sm font-bold text-slate-200">{c.label}</label>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max={c.maxScore}
                        step="0.5"
                        value={scores[c.key] || 0}
                        onChange={(e) => handleScoreChange(c.key, e.target.value, c.maxScore)}
                        className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Score summary & action */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between mb-6">
                <span className="text-2xl font-mono font-black text-amber-400">{calculateTotal()} نقطة</span>
                <span className="text-xs font-bold text-amber-300">النتيجة الإجمالية المحسوبة</span>
              </div>

              {message && (
                <p className="mb-4 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                  {message}
                </p>
              )}

              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-glow-amber"
              >
                <Save size={18} />
                اعتماد وحفظ نتيجة الفريق
              </button>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-sm">
              اختر فريقاً من القائمة الجانبية لبدء التقييم
            </div>
          )}
        </div>
      </div>

      {/* ═══ Team Report Viewer Modal for Judge ═══ */}
      {showReportModal && selectedTeam?.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl">
          <div className="card p-6 rounded-3xl bg-slate-900 border border-purple-500/30 max-w-2xl w-full text-right shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2">
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-full font-mono font-bold">
                  ID: #{selectedTeam.report.id?.slice(-6) || 'RPT'}
                </span>
                <h3 className="text-base font-black text-white">
                  تقرير فريق: <span className="text-amber-400">{selectedTeam.label}</span>
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-right">
              <div>
                <span className="text-xs text-slate-400 font-bold block mb-1">اسم المسابقة المعنية:</span>
                <p className="text-sm font-black text-purple-300 bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
                  {selectedTeam.report.title}
                </p>
              </div>

              {selectedTeam.report.content && (
                <div>
                  <span className="text-xs text-slate-400 font-bold block mb-1">محتوى وملخص التقرير:</span>
                  <div className="text-xs leading-relaxed text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap">
                    {selectedTeam.report.content}
                  </div>
                </div>
              )}

              {/* Embedded Document / File Attachment */}
              {selectedTeam.report.fileUrl && (
                <div>
                  <span className="text-xs text-slate-400 font-bold block mb-2">الملف المرفق من الفريق:</span>
                  
                  {/* PDF or Image Viewer Embed */}
                  {selectedTeam.report.fileUrl.endsWith('.pdf') ? (
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 h-80">
                      <iframe
                        src={selectedTeam.report.fileUrl}
                        title="PDF Viewer"
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <a
                      href={selectedTeam.report.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black transition w-full justify-center"
                    >
                      <ExternalLink size={16} />
                      فتح وتنزيل الملف المرفق ({selectedTeam.report.fileUrl.split('.').pop()?.toUpperCase()})
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                تاريخ الرفع: {new Date(selectedTeam.report.createdAt).toLocaleString('ar-EG')}
              </span>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                إغلاق والعودة للدرجات
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="card p-6 rounded-2xl bg-slate-900 border border-slate-700 max-w-sm w-full text-right">
            <h3 className="text-base font-black text-white mb-2">تأكيد اعتماد النتيجة</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              هل أنت متأكد من منح فريق <span className="text-amber-400 font-bold">{selectedTeam?.label}</span> درجة إجمالية قدرها <span className="text-emerald-400 font-bold">{calculateTotal()} نقطة</span>؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSubmitScore}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                {submitting ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgingSheet;
