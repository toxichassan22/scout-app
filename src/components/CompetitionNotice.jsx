import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CompetitionNotice = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!socket || user?.role !== 'team') return undefined;
    let timer;
    const handleUpdate = payload => {
      if (!payload?.opened) return;
      setNotice({ name: payload.name || 'مسابقة جديدة', competitionId: payload.competitionId });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNotice(null), 9000);
    };
    socket.on('competition:update', handleUpdate);
    return () => {
      window.clearTimeout(timer);
      socket.off('competition:update', handleUpdate);
    };
  }, [socket, user?.role]);

  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[999998] flex justify-center px-4" dir="rtl">
      <div className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl border border-emerald-400/40 bg-[#041a10]/95 px-4 py-3 text-sm font-black text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-xl">
        <BellRing size={19} className="shrink-0 text-emerald-300" />
        <span className="flex-1">بدأت الآن: {notice.name}</span>
        <button type="button" onClick={() => setNotice(null)} className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="إغلاق الإشعار">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default CompetitionNotice;
