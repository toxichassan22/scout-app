import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Sparkles, Tent, Navigation, Move, Lock, Copy, CheckCheck } from 'lucide-react';
import { getAgenda } from '../services/api';
import { useSocket } from '../context/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import mapBgImage from '../../س.jpeg';

const typeMeta = {
  competition: { label: 'مسابقة ميدانية', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', dot: '#f59e0b' },
  workshop:    { label: 'ورشة / تجميع',   cls: 'border-purple-500/40 bg-purple-500/10 text-purple-300', dot: '#8b5cf6' },
  ceremony:    { label: 'احتفالية / مراسم',cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', dot: '#10b981' },
};

// الإحداثيات الافتراضية — يمكن تعديلها عبر وضع المعايرة
const DEFAULT_POSITIONS = {
  'zone-1': { top: 65.6, left: 79.3, code: 'ZONE-01' },
  'zone-2': { top: 68.2, left: 62.9, code: 'ZONE-02' },
  'zone-3': { top: 57.2, left: 79.1, code: 'ZONE-03' },
  'zone-4': { top: 48.4, left: 73.0, code: 'ZONE-04' },
  'zone-5': { top: 45.1, left: 58.7, code: 'ZONE-05' },
  'zone-6': { top: 38.9, left: 38.3, code: 'ZONE-06' },
  'zone-7': { top: 61.6, left: 43.9, code: 'ZONE-07' },
  'zone-8': { top: 63.6, left: 32.4, code: 'ZONE-08' },
};

const Program = () => {
  const [data, setData]               = useState({ zones: [], agenda: [] });
  const [loading, setLoading]         = useState(true);
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  // ─── Calibration mode ───────────────────────────────────────────────────────
  const [calibrating, setCalibrating] = useState(false);
  const [positions, setPositions]     = useState(DEFAULT_POSITIONS);
  const [copied, setCopied]           = useState(false);
  const dragging                      = useRef(null); // { zoneId, startX, startY, startLeft, startTop }
  const mapRef                        = useRef(null);
  // ────────────────────────────────────────────────────────────────────────────

  const { socket } = useSocket();

  const fetchAgendaData = async () => {
    try {
      const res = await getAgenda();
      setData(res);
      if (res.agenda?.length > 0 && !selectedItem) setSelectedItem(res.agenda[0]);
    } catch (err) {
      console.error('Failed to load agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendaData();
    if (socket) {
      socket.on('agenda:update', fetchAgendaData);
      return () => socket.off('agenda:update');
    }
  }, [socket]);

  // ─── Drag handlers ──────────────────────────────────────────────────────────
  const startDrag = useCallback((e, zoneId) => {
    if (!calibrating) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragging.current = {
      zoneId,
      startX: clientX,
      startY: clientY,
      startLeft: positions[zoneId]?.left ?? 50,
      startTop:  positions[zoneId]?.top  ?? 50,
    };
  }, [calibrating, positions]);

  const onDragMove = useCallback((e) => {
    const d = dragging.current; // capture immediately to avoid null race
    if (!d || !mapRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = mapRef.current.getBoundingClientRect();
    const dx = ((clientX - d.startX) / rect.width)  * 100;
    const dy = ((clientY - d.startY) / rect.height) * 100;
    const newLeft = Math.max(2, Math.min(98, d.startLeft + dx));
    const newTop  = Math.max(2, Math.min(95, d.startTop  + dy));
    setPositions(prev => ({
      ...prev,
      [d.zoneId]: {
        ...prev[d.zoneId],
        left: newLeft,
        top:  newTop,
      }
    }));
  }, []);

  const stopDrag = useCallback(() => { dragging.current = null; }, []);

  const copyPositions = () => {
    const out = Object.entries(positions).map(([id, p]) =>
      `  '${id}': { top: '${p.top.toFixed(1)}%', left: '${p.left.toFixed(1)}%', code: '${p.code}' },`
    ).join('\n');
    navigator.clipboard.writeText(`const ZONE_MAP_POSITIONS = {\n${out}\n};`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleZoneFilter = (zoneId) => {
    if (calibrating) return;
    setSelectedZone(zoneId);
    if (zoneId !== 'all') {
      const first = data.agenda.find(a => a.zoneId === zoneId);
      if (first) setSelectedItem(first);
    }
  };

  const filteredAgenda = selectedZone === 'all'
    ? data.agenda
    : data.agenda.filter(item => item.zoneId === selectedZone);

  const activeZone = selectedItem?.zone
    || data.zones.find(z => z.id === selectedZone)
    || (data.zones.length > 0 ? data.zones[0] : null);

  const activeZonePos = activeZone
    ? positions[activeZone.id] || { top: 50, left: 50, code: 'ZONE' }
    : { top: 50, left: 50, code: 'ZONE' };

  return (
    <main
      className="app-shell dir-rtl min-h-screen p-4 sm:p-6 lg:p-8"
      onMouseMove={onDragMove}
      onMouseUp={stopDrag}
      onTouchMove={onDragMove}
      onTouchEnd={stopDrag}
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ═══ Header ═══ */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-mono font-black text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <Tent size={16} /> المهرجان الكشفي الإرشادي الثلاثون
            </div>
            <h1 className="mt-1 text-2xl sm:text-4xl font-black text-white">
              برنامج المهرجان <span className="text-[#38bdf8] drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]">والخريطة التفاعلية</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              اختر أي مسابقة أو فعالية لعرض موقعها ومبناها فوراً على الخريطة.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Calibration Toggle */}
            <button
              type="button"
              onClick={() => setCalibrating(v => !v)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition-all border ${
                calibrating
                  ? 'border-orange-400 bg-orange-500/20 text-orange-300 shadow-[0_0_15px_rgba(251,146,60,0.4)]'
                  : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              {calibrating ? <><Lock size={13} /> إيقاف المعايرة</> : <><Move size={13} /> معايرة الخريطة</>}
            </button>

            {calibrating && (
              <button
                type="button"
                onClick={copyPositions}
                className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)] transition hover:opacity-90"
              >
                {copied ? <><CheckCheck size={13} /> تم النسخ!</> : <><Copy size={13} /> ثبّت وانسخ الإحداثيات</>}
              </button>
            )}

            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/50 px-4 py-2 text-xs font-mono font-black text-cyan-300">
              {data.agenda.length} فعاليات
            </span>
          </div>
        </header>

        {/* Calibration Mode Banner */}
        {calibrating && (
          <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-200 flex items-center gap-3">
            <Move size={18} className="shrink-0 text-orange-400" />
            <span>
              🟠 <strong>وضع المعايرة مفعّل</strong> — اسحب أي pin بالماوس أو اللمس لتحريكه لمكانه الصح.
              لما تخلّص اضغط <strong>"ثبّت وانسخ الإحداثيات"</strong> وابعتلي النص المنسوخ.
            </span>
          </div>
        )}

        {/* ═══ Two-Column Layout ═══ */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">

          {/* ─── RIGHT: Timeline List ─── */}
          <div className={`lg:col-span-7 space-y-6 transition-opacity duration-300 ${calibrating ? 'opacity-25 pointer-events-none select-none' : ''}`}>
            {/* Zone Filter */}
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              <button type="button" onClick={() => handleZoneFilter('all')}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
                  selectedZone === 'all'
                    ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}>
                كل المناطق ({data.agenda.length})
              </button>
              {data.zones.map((zone) => (
                <button key={zone.id} type="button" onClick={() => handleZoneFilter(zone.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
                    selectedZone === zone.id
                      ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.colorHex || '#38bdf8' }} />
                  {zone.name} ({zone.numberLabel})
                </button>
              ))}
            </div>

            {/* Timeline */}
            {loading ? (
              <LoadingSpinner label="جاري تحميل جدول الأنشطة..." />
            ) : filteredAgenda.length === 0 ? (
              <EmptyState icon={Sparkles} title="لا توجد فعاليات" hint="اختر منطقة أخرى" />
            ) : (
              <div className="relative space-y-4 pr-4">
                <div className="absolute right-1 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-cyan-500 via-teal-500 to-emerald-500 opacity-40" />
                {filteredAgenda.map((item) => {
                  const meta = typeMeta[item.type] || typeMeta.competition;
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <motion.article
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`cursor-pointer relative rounded-2xl border p-5 transition-all duration-300 ${
                        isSelected
                          ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-slate-900/90 shadow-[0_0_25px_rgba(56,189,248,0.25)] scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                      }`}>
                      <span className={`absolute -right-3.5 top-6 h-3.5 w-3.5 rounded-full border-2 border-slate-950 transition-all ${
                        isSelected ? 'bg-cyan-400 shadow-[0_0_12px_#38bdf8] scale-125' : 'bg-slate-700'
                      }`} />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black ${meta.cls}`}>
                            {meta.label}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white">{item.title}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono font-black text-amber-300">
                          <Clock size={13} />
                          <span dir="ltr">{item.startTime} — {item.endTime}</span>
                        </div>
                      </div>
                      {item.description && <p className="text-xs leading-6 text-slate-300 mb-3">{item.description}</p>}
                      {item.zone && (
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1.5 text-cyan-300">
                            <MapPin size={14} /> منطقة {item.zone.name} ({item.zone.numberLabel})
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">انقر لإظهار الموقع 📍</span>
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── LEFT: Interactive Map ─── */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#02131a] shadow-2xl">

              {/* Map Canvas */}
              <div
                ref={mapRef}
                className={`relative h-[460px] sm:h-[540px] w-full overflow-hidden bg-[#041a10] ${calibrating ? 'cursor-crosshair' : ''}`}
                style={{ userSelect: calibrating ? 'none' : 'auto' }}
              >
                <img
                  src={mapBgImage}
                  alt="خريطة المخيم الكشفي"
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ filter: calibrating ? 'brightness(0.95)' : 'brightness(0.85)' }}
                  draggable={false}
                />
                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 50px rgba(2,19,26,0.5)' }} />

                {/* Calibration grid overlay */}
                {calibrating && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)',
                      backgroundSize: '10% 10%',
                    }}
                  />
                )}

                {/* Top badge */}
                <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-black/75 px-3 py-1.5 text-[11px] font-mono text-cyan-300 backdrop-blur-md">
                  <Navigation size={14} className={calibrating ? 'text-orange-400' : 'animate-spin text-cyan-400'} />
                  <span>{calibrating ? '⟡ وضع المعايرة' : `المحيط الميداني — ${activeZonePos.code}`}</span>
                </div>

                {/* Zone Pins */}
                {data.zones.map((z) => {
                  const pos = positions[z.id] || { top: 50, left: 50, code: 'Z' };
                  const isActive = activeZone?.id === z.id;

                  return (
                    <div
                      key={z.id}
                      style={{ top: `${pos.top}%`, left: `${pos.left}%`, position: 'absolute', transform: 'translate(-50%, -100%)', zIndex: isActive ? 30 : 20 }}
                      className={`transition-transform duration-150 ${calibrating ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isActive && !calibrating ? 'scale-125' : 'hover:scale-125'}`}
                      onMouseDown={(e) => { if (calibrating) { startDrag(e, z.id); } else { handleZoneFilter(z.id); } }}
                      onTouchStart={(e) => { if (calibrating) { startDrag(e, z.id); } else { handleZoneFilter(z.id); } }}
                      title={z.name}
                    >
                      {/* Radar pulse for active */}
                      {isActive && !calibrating && (
                        <span className="absolute inset-0 top-auto -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full animate-ping opacity-70" style={{ backgroundColor: z.colorHex || '#38bdf8' }} />
                      )}

                      {/* Pin icon */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full shadow-lg transition-all ${
                            isActive
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                              : calibrating ? 'ring-2 ring-orange-400' : 'ring-1 ring-white/40'
                          }`}
                          style={{ backgroundColor: z.colorHex || '#0284c7' }}
                        >
                          {calibrating
                            ? <Move size={13} className="text-white" />
                            : <MapPin size={13} fill="white" className="text-white" />
                          }
                        </div>
                        {/* Pin stem */}
                        <div className="w-0.5 h-2 rounded-b-full" style={{ backgroundColor: z.colorHex || '#0284c7' }} />
                      </div>
                    </div>
                  );
                })}

                {/* Bottom HUD — hidden in calibration */}
                {!calibrating && (
                  <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl border border-cyan-500/30 bg-[#02131a]/95 px-4 py-2.5 backdrop-blur-xl shadow-xl text-right">
                    {activeZone ? (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: activeZone.colorHex || '#38bdf8' }} />
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-black text-cyan-400">{activeZonePos.code} — منطقة {activeZone.numberLabel}</span>
                            <h4 className="text-sm font-black text-white leading-5 truncate">{activeZone.name}</h4>
                          </div>
                        </div>
                        {selectedItem?.zoneId === activeZone.id && (
                          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/50 px-2.5 py-1.5 text-xs shrink-0">
                            <span className="text-cyan-200 font-bold truncate max-w-[120px]">{selectedItem.title}</span>
                            <span className="font-mono text-[10px] text-amber-300 shrink-0">{selectedItem.startTime}–{selectedItem.endTime}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-1">اختر فعالية لإظهار موقعها على الخريطة</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
};

export default Program;
