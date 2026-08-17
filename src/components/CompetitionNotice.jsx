import { useEffect, useState } from 'react';
import { Trophy, Newspaper, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CompetitionNotice = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [modalNotice, setModalNotice] = useState(null);

  useEffect(() => {
    if (!socket || user?.role !== 'team') return undefined;

    const handleCompAlert = (payload) => {
      if (!payload) return;
      setModalNotice({
        title: payload.title || '🏁 انطلقت مسابقة جديدة!',
        message: payload.message || 'تم فتح باب المشاركة في مسابقة جديدة الآن.',
        type: 'competition',
        competitionId: payload.competitionId
      });
    };

    const handleNewsAlert = (payload) => {
      if (!payload) return;
      setModalNotice({
        title: payload.title || '📢 خبر جديد من الإدارة',
        message: payload.message || 'تم نشر خبر جديد يرجى المتابعة.',
        type: 'news',
        newsId: payload.newsId
      });
    };

    socket.on('competition:mandatory_alert', handleCompAlert);
    socket.on('news:mandatory_alert', handleNewsAlert);

    return () => {
      socket.off('competition:mandatory_alert', handleCompAlert);
      socket.off('news:mandatory_alert', handleNewsAlert);
    };
  }, [socket, user?.role]);

  if (!modalNotice) return null;

  const isComp = modalNotice.type === 'competition';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 dir-rtl animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-purple-500/40 bg-slate-950 p-6 shadow-[0_0_50px_rgba(168,85,247,0.3)] text-right">
        
        {/* Header Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-purple-300 shadow-inner">
          {isComp ? <Trophy size={28} className="animate-bounce" /> : <Newspaper size={28} className="animate-pulse" />}
        </div>

        {/* Title & Message */}
        <h2 className="text-xl font-black text-white text-center mb-2">{modalNotice.title}</h2>
        <p className="text-xs leading-6 text-slate-300 text-center mb-6">{modalNotice.message}</p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const compId = modalNotice.competitionId;
              setModalNotice(null);
              if (isComp && compId) navigate(`/competitions`);
              else navigate('/news');
            }}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-xs font-black"
          >
            <ExternalLink size={15} />
            {isComp ? 'الانتقال للمسابقات' : 'عرض الأخبار'}
          </button>
          
          <button
            type="button"
            onClick={() => setModalNotice(null)}
            className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 text-xs font-bold hover:text-white transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitionNotice;
