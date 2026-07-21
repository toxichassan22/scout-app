import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Sparkles } from 'lucide-react';
import { getAgenda } from '../services/api';
import { useSocket } from '../context/SocketContext';

const Program = () => {
  const [data, setData] = useState({ zones: [], agenda: [] });
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState('all');
  const { socket } = useSocket();

  const fetchAgendaData = async () => {
    try {
      const res = await getAgenda();
      setData(res);
    } catch (err) {
      console.error('Failed to load agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendaData();

    if (socket) {
      socket.on('agenda:update', () => {
        fetchAgendaData();
      });

      return () => {
        socket.off('agenda:update');
      };
    }
  }, [socket]);

  const filteredAgenda = selectedZone === 'all'
    ? data.agenda
    : data.agenda.filter((item) => item.zoneId === selectedZone);

  return (
    <div className="page-shell text-right dir-rtl">
      {/* Header */}
      <div className="glass-card mb-8 p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-slate-950/70 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Calendar size={14} />
            خريطة المناطق والفعاليات
          </span>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            دليل أنشطة وبرنامج المخيم
          </h1>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
          استعرض مواعيد الورش والمسابقات الميدانية وأماكن توزيع الفرق داخل المركز الكشفي.
        </p>
      </div>

      {/* Zones Filter Pills */}
      <div className="mb-8 flex flex-wrap gap-2.5 justify-start">
        <button
          onClick={() => setSelectedZone('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 ${
            selectedZone === 'all'
              ? 'bg-emerald-500 text-slate-950 shadow-glow-green scale-105'
              : 'glass-card border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          كل المناطق ({data.agenda.length})
        </button>
        {data.zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => setSelectedZone(zone.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 flex items-center gap-2 ${
              selectedZone === zone.id
                ? 'bg-emerald-500 text-slate-950 shadow-glow-green scale-105'
                : 'glass-card border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full inline-block shadow-sm"
              style={{ backgroundColor: zone.colorHex || '#10b981' }}
            />
            <span>{zone.name}</span>
            <span className="opacity-70 text-[10px]">({zone.numberLabel})</span>
          </button>
        ))}
      </div>

      {/* Agenda Items Timeline */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">
          <div className="mx-auto h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
          جاري تحميل جدول الأنشطة...
        </div>
      ) : filteredAgenda.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 rounded-3xl border border-white/5">
          <Sparkles size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="font-bold text-slate-300 text-sm">لا توجد فعاليات مسجلة في هذه المنطقة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAgenda.map((item) => (
            <div
              key={item.id}
              className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 bg-slate-900/40 hover:border-emerald-500/30 transition text-right"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="font-black text-white text-base sm:text-lg">{item.title}</h3>
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto">
                  <Clock size={14} />
                  <span>{item.startTime} - {item.endTime}</span>
                </div>
              </div>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                {item.description}
              </p>

              {item.zone && (
                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2 text-xs font-bold text-slate-400">
                  <span>منطقة الفعالية: {item.zone.name} ({item.zone.numberLabel})</span>
                  <MapPin size={15} className="text-emerald-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Program;
