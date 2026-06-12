import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, Clock, QrCode, ToggleLeft, ToggleRight, Trophy, Video, Save, CheckCircle } from 'lucide-react';
import { useCompetitions } from '../../context/CompetitionContext';

const AdminCompetitions = () => {
  const { competitions, openCompetition, closeCompetition, updateCompetition, getLeaderboard, colabUrl, setColabApiUrl } = useCompetitions();
  const [selectedQr, setSelectedQr] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [newColabUrl, setNewColabUrl] = useState(colabUrl || '');
  const [saved, setSaved] = useState(false);

  const toggle = (competition) => {
    if (competition.isOpen) closeCompetition(competition.id);
    else openCompetition(competition.id);
  };

  const board = selectedBoard ? getLeaderboard(selectedBoard.id) : [];

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-gray-500">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black">إدارة المسابقات</h1>
        </header>

        {/* إعدادات Google Colab للفيديو AI */}
        <section className="mb-6 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 p-6">
          <div className="mb-4 flex items-center justify-end gap-2 text-yellow-400">
            <Video size={24} />
            <h2 className="text-xl font-black">⚠️ إعدادات توليد الفيديو بالذكاء الاصطناعي</h2>
          </div>
          <p className="mb-4 text-right text-sm text-white">
            <strong>ضع رابط Google Colab ngrok هنا</strong> ليتم استخدامه من جميع الفرق في مسابقة تصميم الفيديو.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setColabApiUrl(newColabUrl);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="rounded-lg bg-yellow-500 px-4 py-2 font-bold text-black hover:bg-yellow-400 flex items-center gap-2 whitespace-nowrap"
            >
              {saved ? (
                <>
                  <CheckCircle size={18} />
                  تم الحفظ
                </>
              ) : (
                <>
                  <Save size={18} />
                  حفظ
                </>
              )}
            </button>
            <input
              type="url"
              value={newColabUrl}
              onChange={(e) => setNewColabUrl(e.target.value)}
              placeholder="https://xxxx.ngrok.io"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-left text-white placeholder-slate-400"
            />
          </div>
          {colabUrl && (
            <p className="mt-3 text-right text-sm text-yellow-300">
              ✅ الرابط الحالي: <span className="font-mono">{colabUrl}</span>
            </p>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {competitions.map((competition) => (
            <article key={competition.id} className="card">
              <div className="mb-5 flex items-center justify-between">
                <button type="button" onClick={() => toggle(competition)} aria-label="تبديل حالة المسابقة">
                  {competition.isOpen ? <ToggleRight size={48} className="text-green-500" /> : <ToggleLeft size={48} className="text-gray-300" />}
                </button>
                <div className="text-right">
                  <h2 className="text-xl font-black">{competition.name}</h2>
                  <p className="text-sm text-gray-500">{competition.isOpen ? 'مفتوحة' : 'مغلقة'}</p>
                </div>
              </div>

              <label className="mb-2 block text-right text-sm font-bold text-gray-600">المدة بالثواني</label>
              <div className="mb-5 flex items-center gap-3">
                <Clock className="text-primary" />
                <input
                  type="number"
                  min="30"
                  className="input-field text-center"
                  value={competition.duration || ''}
                  placeholder="غير محدد"
                  onChange={(event) => updateCompetition(competition.id, { duration: event.target.value ? Number(event.target.value) : null })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSelectedQr(competition)} className="rounded-xl bg-primary/10 py-3 font-bold text-primary">
                  <span className="inline-flex items-center gap-2">
                    QR
                    <QrCode size={18} />
                  </span>
                </button>
                <button type="button" onClick={() => setSelectedBoard(competition)} className="rounded-xl bg-gray-100 py-3 font-bold text-gray-700">
                  <span className="inline-flex items-center gap-2">
                    النتائج
                    <Trophy size={18} />
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setSelectedQr(null)}>
          <div className="rounded-3xl bg-white p-8 text-center" onClick={(event) => event.stopPropagation()}>
            <h2 className="mb-6 text-xl font-black">{selectedQr.name}</h2>
            <QRCodeSVG value={selectedQr.qrCode} size={240} />
            <p className="mt-4 font-mono text-gray-500">{selectedQr.qrCode}</p>
          </div>
        </div>
      )}

      {selectedBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setSelectedBoard(null)}>
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <h2 className="mb-5 text-right text-xl font-black">ترتيب {selectedBoard.name}</h2>
            {board.length === 0 ? (
              <p className="py-12 text-center text-gray-400">لا توجد نتائج بعد</p>
            ) : (
              <>
                <div className="mb-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={board.map((item) => ({ team: item.teamName, score: item.score }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="score" fill="#2D6A4F" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2">
                  {board.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                      <span className="font-black text-primary">{item.score}</span>
                      <span className="font-bold">{index + 1}. {item.teamName}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminCompetitions;
