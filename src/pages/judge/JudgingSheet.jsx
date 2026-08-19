import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, Save, ArrowRight, ShieldCheck, Award,
  FileText, ExternalLink, Eye, X, FileCheck
} from 'lucide-react';
import { claimJudgeTeam, getJudgeTeams, releaseJudgeTeamClaim, submitJudgeScore, fetchReportFile } from '../../services/api';
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
  const [openingReport, setOpeningReport] = useState(false);

  // Teams keep their finalised rows in the API response; the sheet only lists
  // the ones still awaiting a score so a judged team disappears from the table.
  const pendingTeams = teams.filter(t => !t.isFinal);

  useEffect(() => {
    if (!competition) {
      navigate('/judge/passcode', { replace: true });
      return;
    }

    fetchTeams();

    if (!socket) return undefined;
    const handleSessionClosed = ({ competitionId }) => {
      if (competitionId === competition.id) {
        alert('تم إغلاق التقييم لهذه المسابقة من قِبل الأدمن');
        navigate('/judge/passcode', { replace: true });
      }
    };
    const refreshClaims = ({ competitionId }) => {
      if (competitionId === competition.id) fetchTeams();
    };
    socket.on('judge:session:closed', handleSessionClosed);
    socket.on('judge:team:claimed', refreshClaims);
    socket.on('judge:team:released', refreshClaims);

    return () => {
      socket.off('judge:session:closed', handleSessionClosed);
      socket.off('judge:team:claimed', refreshClaims);
      socket.off('judge:team:released', refreshClaims);
    };
  }, [competition, socket]);

  const fetchTeams = async (completedTeamId = null) => {
    try {
      const data = await getJudgeTeams(competition.id);
      setTeams(data);
      if (completedTeamId) {
        if (!data.some(t => !t.isFinal)) navigate('/judge/passcode', { replace: true });
        else { setSelectedTeam(null); setScores({}); }
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!competition || !selectedTeam) return undefined;
    const renewClaim = () => {
      claimJudgeTeam(competition.id, selectedTeam.id).catch(error => {
        setMessage(error.message || 'انتهى حجز الفريق؛ اختره مرة أخرى');
        setSelectedTeam(null);
        setScores({});
      });
    };
    const interval = setInterval(renewClaim, 60_000);
    return () => {
      clearInterval(interval);
      releaseJudgeTeamClaim(competition.id, selectedTeam.id).catch(() => {});
    };
  }, [competition?.id, selectedTeam?.id]);

  const leaveSheet = async () => {
    if (competition && selectedTeam) await releaseJudgeTeamClaim(competition.id, selectedTeam.id).catch(() => {});
    navigate('/judge/passcode', { replace: true });
  };

  // Open report file directly in a new browser tab
  const openReport = useCallback(async () => {
    const reportId = selectedTeam?.report?.id;
    if (!reportId) return;
    setOpeningReport(true);
    try {
      const blob = await fetchReportFile(reportId);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      // Revoke after a delay so the new tab has time to load
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch (err) {
      alert(err.message || 'تعذر تحميل ملف التقرير');
    } finally {
      setOpeningReport(false);
    }
  }, [selectedTeam?.report?.id]);

  const selectTeam = async team => {
    if (team.isFinal) return;
    try {
      await claimJudgeTeam(competition.id, team.id);
      setSelectedTeam(team);
      setMessage('تم حجز الفريق لك مؤقتاً؛ يمكنك إلغاء الاختيار في أي وقت.');
      const initialScores = {};
      (competition.criteria || []).forEach(c => {
        initialScores[c.key] = 0;
      });
      setScores(initialScores);
    } catch (error) {
      setMessage(error.message || 'الفريق مفتوح عند محكم آخر؛ حدّث القائمة واختر فريقاً آخر.');
      fetchTeams();
    }
  };

  const releaseSelectedTeam = async () => {
    if (!selectedTeam) return;
    await releaseJudgeTeamClaim(competition.id, selectedTeam.id).catch(() => {});
    setSelectedTeam(null);
    setScores({});
    setMessage('تم إلغاء حجز الفريق ويمكن لمحكم آخر فتحه.');
    fetchTeams();
  };

  const handleScoreChange = (key, val, maxScore) => {
    const num = Math.min(maxScore, Math.max(0, parseFloat(val) || 0));
    setScores(prev => ({ ...prev, [key]: num }));
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
  };

  const maxTotal = (competition.criteria || []).reduce((sum, criterion) => sum + (Number(criterion.maxScore) || 0), 0);

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

      const completedId = selectedTeam.id;
      setMessage('تم اعتماد النتيجة نهائياً، ويمكنك اختيار الفريق التالي المتاح.');
      setShowConfirm(false);
      setScores({});
      setSelectedTeam(null);
      await fetchTeams(completedId);
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
          onClick={leaveSheet}
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
            الفرق في انتظار التقييم ({pendingTeams.length})
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">جاري تحميل الفرق...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto">
              {pendingTeams.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-400">
                  تم تقييم كل الفرق في هذه المسابقة
                </div>
              ) : pendingTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTeam(t)}
                  className={`w-full min-h-16 text-right p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${selectedTeam?.id === t.id
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <AlertCircle size={15} className="text-amber-500 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.report && (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono">
                        📄 تقرير
                      </span>
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
                    في انتظار التقييم
                  </span>

                  {/* 📄 Report View Action Button for Judge */}
                  {selectedTeam.report ? (
                    <button
                      onClick={openReport}
                      disabled={openingReport}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition shadow-sm"
                    >
                      <ExternalLink size={14} className="text-purple-400" />
                      {openingReport ? 'جاري فتح التقرير...' : '📄 فتح تقرير الفريق ↗'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700">
                      لا يوجد تقرير مرفوع
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-black text-white">{selectedTeam.label}</h2>
              </div>

              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs">
                <button type="button" onClick={releaseSelectedTeam} className="rounded-lg bg-slate-800 px-3 py-2 font-bold text-slate-300 hover:bg-slate-700">
                  إلغاء اختيار الفريق
                </button>
                <span className="text-cyan-200">الفريق محجوز لك مؤقتاً، ويتحرر تلقائياً عند انتهاء المهلة.</span>
              </div>

              {/* Dynamic Criteria inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {(competition.criteria || []).length === 0 ? (
                  <p className="text-xs text-slate-500 col-span-full">لا توجد بنود تقييم محددة للمسابقة</p>
                ) : (
                  (competition.criteria || []).map((c) => (
                    <div key={c.key} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between">
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
                        className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer h-2 mt-2"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Score summary & action */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between mb-6">
                <span className="text-2xl font-mono font-black text-amber-400">{calculateTotal()} / {maxTotal} نقطة</span>
                <span className="text-xs font-bold text-amber-300">الإجمالي — الحد الأقصى ثابت</span>
              </div>

              {message && (
                <p className="mb-4 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                  {message}
                </p>
              )}

              <button
                onClick={() => setShowConfirm(true)}
                disabled={selectedTeam.isFinal || submitting}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-glow-amber"
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
