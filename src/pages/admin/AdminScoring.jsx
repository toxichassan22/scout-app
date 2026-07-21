import React, { useState, useEffect } from 'react';
import { Trophy, Edit3, Save, CheckCircle2 } from 'lucide-react';
import { getAdminLeaderboard, updateScoreOverride } from '../../services/api';

const AdminScoring = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const data = await getAdminLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverride = async (scoreId) => {
    try {
      await updateScoreOverride(scoreId, editValue);
      setEditingScoreId(null);
      fetchLeaderboard();
    } catch (err) {
      alert(err.message || 'فشل تعديل الدرجة');
    }
  };

  return (
    <div className="p-6 text-right dir-rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            لوحة الدرجات الشاملة وتعديل النتائج
            <Trophy size={24} className="text-amber-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">الرؤية الكاملة لأسماء الفرق الحقيقية والدرجات التفصيلية مع إمكانية التعديل الإداري الفوري</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">جاري تحميل لوحة الدرجات...</div>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((team, idx) => (
            <div key={team.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-mono font-black text-amber-400">{team.totalScore} نقطة</span>
                  <span className="text-xs text-slate-500 font-mono">@{team.username}</span>
                </div>

                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">{team.label}</h2>
                  <span className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                </div>
              </div>

              {/* Detailed Competition Scores */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {team.scores.map((sc) => (
                  <div key={sc.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-right space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">{sc.competition?.name || 'مسابقة'}</span>
                      {sc.editedAt && (
                        <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">مُعَدَّل من الأدمن</span>
                      )}
                    </div>

                    {editingScoreId === sc.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveOverride(sc.id)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Save size={12} /> حفظ
                        </button>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="ai-input text-left text-xs font-mono font-bold w-20 py-1"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => { setEditingScoreId(sc.id); setEditValue(sc.total); }}
                          className="text-slate-500 hover:text-amber-400 text-xs flex items-center gap-1"
                        >
                          <Edit3 size={13} /> تعديل
                        </button>
                        <span className="text-sm font-mono font-black text-emerald-400">{sc.total} ن</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminScoring;
