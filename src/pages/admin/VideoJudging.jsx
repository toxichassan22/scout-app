import { Link } from 'react-router-dom';
import { ChevronLeft, Star, Video, ExternalLink } from 'lucide-react';
import { useCompetitions } from '../../context/CompetitionContext';

const AdminVideoJudging = () => {
  const { submissions, updateSubmissionScore, getLeaderboard } = useCompetitions();
  const videoSubmissions = submissions.filter((submission) => submission.compId === 4);
  const leaderboard = getLeaderboard(4);

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-gray-500">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black">تقييم تصميم الفيديو</h1>
        </header>

        {videoSubmissions.length === 0 ? (
          <div className="card py-16 text-center text-gray-400">لا توجد تسليمات فيديو حتى الآن</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {videoSubmissions.map((submission) => (
              <article key={submission.id} className="card text-right">
                <div className="mb-3 flex items-center justify-between">
                  <Star className={submission.judged ? 'text-yellow-500' : 'text-gray-300'} />
                  <div>
                    <h2 className="font-black">{submission.teamName}</h2>
                    <p className="text-xs text-gray-400">{new Date(submission.timestamp).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                <p className="mb-4 rounded-2xl bg-gray-50 p-4 leading-7 text-gray-700">{submission.data.prompt}</p>

                {submission.data.videoUrl && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-end gap-2 text-accent">
                      <Video size={18} />
                      <span className="text-sm font-bold">الفيديو المُولد</span>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-gray-300 bg-gray-900">
                      <video
                        src={submission.data.videoUrl}
                        controls
                        className="w-full max-h-48"
                        poster="/festival-logo.png"
                      >
                        متصفحك لا يدعم تشغيل الفيديو
                      </video>
                    </div>
                    <a
                      href={submission.data.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      <ExternalLink size={14} />
                      فتح الفيديو في نافذة جديدة
                    </a>
                  </div>
                )}

                {submission.data.videoStatus === 'generating' && (
                  <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-center text-sm text-accent">
                    جاري توليد الفيديو...
                  </div>
                )}

                {submission.data.videoStatus === 'failed' && (
                  <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600">
                    فشل توليد الفيديو: {submission.data.videoError}
                  </div>
                )}

                <label className="mb-2 block text-sm font-bold text-gray-600">التقييم من 0 إلى 100</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-field text-center"
                  value={submission.score || ''}
                  onChange={(event) => updateSubmissionScore(submission.id, Math.min(100, Math.max(0, Number(event.target.value))))}
                />
              </article>
            ))}
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-right text-lg font-black text-primary-dark">ترتيب الفيديو</h2>
          {leaderboard.length === 0 ? (
            <div className="card text-center text-gray-400">لا توجد نتائج بعد</div>
          ) : (
            <div className="grid gap-2">
              {leaderboard.map((item, index) => (
                <div key={item.id} className="card flex items-center justify-between">
                  <span className="text-xl font-black text-primary">{item.score}</span>
                  <span className="font-bold">{index + 1}. {item.teamName}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AdminVideoJudging;
