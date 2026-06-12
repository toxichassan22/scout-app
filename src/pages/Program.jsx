import React, { useState } from 'react';
import { Compass, MapPin, Layers, Calendar, Filter, Sparkles, Info, CheckCircle2 } from 'lucide-react';

const PROGRAM_EVENTS = [
  { id: 1, name: 'حقيقتين وكذبة', type: 'competition', category: 'مسابقة', area: 'مبنى الأنشطة', zone: 'zone-2', time: '09:00 - 10:30', description: 'مسابقة كشفية لاختبار قوة الملاحظة والتفكير النقدي.' },
  { id: 2, name: 'عبقرينو', type: 'competition', category: 'مسابقة', area: 'المبنى الجديد', zone: 'zone-4', time: '11:00 - 12:30', description: 'تحدي الذكاء والمعلومات العامة السريعة.' },
  { id: 3, name: 'الجغرافيا والخرائط', type: 'competition', category: 'مسابقة', area: 'المخيم الكشفي', zone: 'zone-5', time: '14:00 - 15:30', description: 'مسابقة الجغرافيا وأعلام الوطن العربي.' },
  { id: 4, name: 'ورشة الذكاء الاصطناعي', type: 'workshop', category: 'ورشة عمل', area: 'مبنى الإدارة', zone: 'zone-1', time: '16:00 - 17:30', description: 'تعلم توليد الفيديوهات بالذكاء الاصطناعي.' },
  { id: 5, name: 'حفل الافتتاح الكشفي', type: 'ceremony', category: 'حفل', area: 'ملعب كرة القدم', zone: 'zone-6', time: '20:00 - 22:00', description: 'العروض الكشفية الرقمية وتقديم شعار المهرجان.' },
  { id: 6, name: 'تحدي الألوان والرموز', type: 'competition', category: 'مسابقة', area: 'ملعب كرة السلة', zone: 'zone-7', time: '10:30 - 12:00', description: 'اختبار سرعة التنسيق ومطابقة الألوان.' },
  { id: 7, name: 'تحدي فك الشفرات', type: 'competition', category: 'مسابقة', area: 'الملعب الخماسي', zone: 'zone-8', time: '13:00 - 14:30', description: 'محاكاة الهجمات السيبرانية وفك الشفرات.' }
];

const ZONES = [
  { id: 'zone-1', num: '١', name: 'مبنى الإدارة', floors: 'دورين (أرضي + أول)', desc: 'مقر قيادة المعسكر ولجنة التحكيم.', color: '#a855f7', darkColor: '#3b0764' },
  { id: 'zone-2', num: '٢', name: 'مبنى الأنشطة', floors: '3 أدوار + سطح', desc: 'مقر الورش التعليمية والمسابقات الثقافية.', color: '#ec4899', darkColor: '#500724' },
  { id: 'zone-3', num: '٣', name: 'المسجد', floors: 'دور واحد', desc: 'المصلى الرئيسي، وراءه حديقة ألعاب الأطفال.', color: '#34d399', darkColor: '#022c22' },
  { id: 'zone-4', num: '٤', name: 'المبنى الجديد', floors: '4 أدوار + سطح', desc: 'المبنى الخدمي الأكبر وقاعات الاختبارات.', color: '#60a5fa', darkColor: '#172554' },
  { id: 'zone-5', num: '٥', name: 'المخيم الكشفي', floors: 'أرض رملية مفتوحة', desc: 'أرض رملية للخيام والسمر والمسابقات الميدانية.', color: '#f59e0b', darkColor: '#451a03' },
  { id: 'zone-6', num: '٦', name: 'ملعب كرة القدم', floors: 'ملعب كبير', desc: 'الساحة الرياضية الكبرى وحفلات الافتتاح.', color: '#4ade80', darkColor: '#052e16' },
  { id: 'zone-7', num: '٧', name: 'ملعب كرة السلة', floors: 'ملعب متوسط', desc: 'الأنشطة الرياضية ومحطات مسح الرموز.', color: '#fb923c', darkColor: '#431407' },
  { id: 'zone-8', num: '٨', name: 'الملعب الخماسي', floors: 'ملعب صغير', desc: 'ملعب تكتيكي للياقة البدنية والتحديات.', color: '#22d3ee', darkColor: '#083344' },
];

/* Reusable zone click handler */
const ZoneRect = ({ zone, x, y, w, h, rx, active, hovered, onSelect, onHover, children }) => {
  const isLit = active || hovered;
  return (
    <g onClick={() => onSelect(zone.id)} onMouseEnter={() => onHover(zone.id)} onMouseLeave={() => onHover(null)} className="cursor-pointer">
      <rect x={x} y={y} width={w} height={h} rx={rx || 8} fill={isLit ? zone.darkColor : '#0a0a0a'} stroke={isLit ? zone.color : zone.color + '40'} strokeWidth={isLit ? 2.5 : 1.5} className="transition-all duration-200" />
      {children}
      {/* Big number badge */}
      <circle cx={x + 22} cy={y + 22} r="14" fill={isLit ? zone.color : zone.color + '30'} />
      <text x={x + 22} y={y + 27} fill={isLit ? '#000' : zone.color} fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">{zone.num}</text>
      {/* Zone name label */}
      <text x={x + w / 2} y={y + h / 2 - 4} fill={zone.color} fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">{zone.name}</text>
      {/* Floors info */}
      <text x={x + w / 2} y={y + h / 2 + 14} fill={zone.color} fontSize="9.5" fontWeight="600" textAnchor="middle" opacity="0.7" fontFamily="sans-serif">{zone.floors}</text>
    </g>
  );
};

const Program = () => {
  const [activeZone, setActiveZone] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [areaFilter, setAreaFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  const filteredEvents = PROGRAM_EVENTS.filter(e => {
    const a = areaFilter === 'all' || e.zone === areaFilter;
    const p = programFilter === 'all' || e.type === programFilter;
    return a && p;
  });

  const activeData = ZONES.find(z => z.id === activeZone);

  return (
    <main className="page-shell pb-28">
      {/* Header */}
      <div className="tech-panel mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-primary"><Compass size={26} /></div>
          <div className="text-right">
            <p className="section-kicker">الخرائط والأنشطة الميدانية</p>
            <h1 className="section-title">خريطة مركز شباب منشية التحرير</h1>
            <p className="mt-1 text-sm text-slate-400">اضغط على أي منطقة في الخريطة أو القائمة الجانبية لمعرفة تفاصيلها</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Legend */}
        <section className="card lg:col-span-1 border-slate-800 bg-slate-950/40 p-4 text-right">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-mono font-bold">8 مناطق</span>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">دليل الخريطة <Info size={16} className="text-primary" /></h2>
          </div>
          <div className="grid gap-2 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
            {ZONES.map(z => {
              const isActive = activeZone === z.id;
              return (
                <div key={z.id} onClick={() => setActiveZone(z.id)} onMouseEnter={() => setHoveredZone(z.id)} onMouseLeave={() => setHoveredZone(null)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isActive ? 'border-primary bg-primary-soft/10 shadow-glow-green' : 'border-slate-800/80 bg-slate-950/20 hover:border-slate-700'}`}>
                  <span className="h-9 w-9 rounded-full flex items-center justify-center font-black text-sm shrink-0" style={{ background: isActive ? z.color : z.color + '20', color: isActive ? '#000' : z.color, border: `2px solid ${z.color}` }}>{z.num}</span>
                  <div className="text-right flex-1 min-w-0">
                    <span className="font-extrabold text-sm text-white block">{z.name}</span>
                    <span className="text-[11px] text-slate-400 block truncate">{z.floors} — {z.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Map */}
        <section className="card lg:col-span-2 overflow-hidden border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between text-right">
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse" /> تفاعلي — اضغط على أي منطقة
            </span>
            <h2 className="text-base font-black text-white flex items-center gap-2">المخطط <MapPin size={18} className="text-primary" /></h2>
          </div>
          <div className="relative bg-slate-900/70 rounded-xl overflow-hidden border border-slate-800/80 p-2 md:p-4 h-[380px] lg:h-[500px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.015)_1.5px,transparent_1.5px)] bg-[size:20px_20px]" />
            <svg viewBox="0 0 820 560" className="w-full h-full select-none">
              {/* Compound wall */}
              <rect x="60" y="20" width="700" height="440" rx="14" fill="#030806" stroke="#1a3a1e" strokeWidth="2" />

              {/* ZONE 6: ملعب كرة القدم */}
              <ZoneRect zone={ZONES[5]} x={80} y={40} w={200} h={230} active={activeZone === 'zone-6'} hovered={hoveredZone === 'zone-6'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <rect x={95} y={55} width={170} height={200} fill="none" stroke={ZONES[5].color + '30'} strokeWidth="1" />
                <circle cx={180} cy={155} r={28} fill="none" stroke={ZONES[5].color + '30'} strokeWidth="1" />
                <line x1={80} y1={155} x2={280} y2={155} stroke={ZONES[5].color + '30'} strokeWidth="1" />
                <line x1={155} y1={40} x2={205} y2={40} stroke={ZONES[5].color} strokeWidth="3" />
                <line x1={155} y1={270} x2={205} y2={270} stroke={ZONES[5].color} strokeWidth="3" />
              </ZoneRect>

              {/* ZONE 8: الملعب الخماسي */}
              <ZoneRect zone={ZONES[7]} x={80} y={290} w={100} h={155} active={activeZone === 'zone-8'} hovered={hoveredZone === 'zone-8'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <line x1={80} y1={367} x2={180} y2={367} stroke={ZONES[7].color + '30'} strokeWidth="1" />
                <circle cx={130} cy={367} r={14} fill="none" stroke={ZONES[7].color + '30'} strokeWidth="1" />
              </ZoneRect>

              {/* ZONE 7: ملعب كرة السلة */}
              <ZoneRect zone={ZONES[6]} x={195} y={290} w={90} h={155} active={activeZone === 'zone-7'} hovered={hoveredZone === 'zone-7'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <line x1={195} y1={367} x2={285} y2={367} stroke={ZONES[6].color + '30'} strokeWidth="1" />
                <circle cx={240} cy={367} r={14} fill="none" stroke={ZONES[6].color + '30'} strokeWidth="1" />
              </ZoneRect>

              {/* ZONE 5: المخيم الكشفي - بين المبنى الجديد والملعب الكبير */}
              <ZoneRect zone={ZONES[4]} x={300} y={40} w={175} h={120} active={activeZone === 'zone-5'} hovered={hoveredZone === 'zone-5'} onSelect={setActiveZone} onHover={setHoveredZone}>
                {/* Sand texture dots */}
                {[310,330,350,370,390,410,430,450].map((cx,i) => [55,70,85,100,115,130,145].map((cy,j) => (i+j)%3===0 ? <circle key={`s${i}${j}`} cx={cx} cy={cy} r="1" fill="#ca8a04" opacity="0.25" /> : null))}
                {/* Tent */}
                <polygon points="385,115 409,115 397,98" fill="#d97706" stroke="#92400e" strokeWidth="1" opacity="0.6" />
                {/* Fire */}
                <circle cx={397} cy={130} r="4" fill="#ef4444" opacity="0.5">
                  <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                </circle>
              </ZoneRect>

              {/* ZONE 4: المبنى الجديد */}
              <ZoneRect zone={ZONES[3]} x={490} y={40} w={240} h={120} active={activeZone === 'zone-4'} hovered={hoveredZone === 'zone-4'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <line x1={570} y1={40} x2={570} y2={160} stroke={ZONES[3].color + '25'} strokeWidth="1" />
                <line x1={650} y1={40} x2={650} y2={160} stroke={ZONES[3].color + '25'} strokeWidth="1" />
                <line x1={490} y1={100} x2={730} y2={100} stroke={ZONES[3].color + '25'} strokeWidth="1" />
              </ZoneRect>

              {/* ZONE 3: المسجد */}
              <ZoneRect zone={ZONES[2]} x={580} y={185} w={100} h={100} rx={50} active={activeZone === 'zone-3'} hovered={hoveredZone === 'zone-3'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <circle cx={630} cy={235} r="8" fill={ZONES[2].color + '15'} stroke={ZONES[2].color + '40'} strokeWidth="1" />
              </ZoneRect>

              {/* حديقة ألعاب أطفال - ورا المسجد */}
              <g className="pointer-events-none">
                <rect x={693} y={190} width={60} height={55} rx="6" fill="#065f46" opacity="0.15" stroke="#059669" strokeWidth="1" strokeDasharray="3 3" />
                <text x={723} y={222} fill="#34d399" fontSize="9" fontWeight="700" textAnchor="middle">🎠 حديقة أطفال</text>
              </g>

              {/* النافورة */}
              <g className="pointer-events-none">
                <circle cx={530} cy={265} r="12" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx={530} cy={265} r="5" fill="#0ea5e9">
                  <animate attributeName="r" values="4;7;4" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <text x={530} y={288} fill="#38bdf8" fontSize="9" fontWeight="700" textAnchor="middle">💧 النافورة</text>
              </g>

              {/* ZONE 1: مبنى الإدارة */}
              <ZoneRect zone={ZONES[0]} x={640} y={300} w={90} h={145} active={activeZone === 'zone-1'} hovered={hoveredZone === 'zone-1'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <rect x={652} y={330} width={25} height={25} fill="none" stroke={ZONES[0].color + '25'} strokeWidth="1" />
                <rect x={685} y={330} width={25} height={25} fill="none" stroke={ZONES[0].color + '25'} strokeWidth="1" />
              </ZoneRect>

              {/* مظلات استراحة - تحت المخيم الكشفي */}
              <g className="pointer-events-none">
                {[310,335,360,385].map((rx, i) => <rect key={`r${i}`} x={rx} y={172} width={14} height={14} rx="3" fill="#000" stroke="#6b7280" strokeWidth="1" />)}
                <text x={348} y={199} fill="#9ca3af" fontSize="8" fontWeight="600" textAnchor="middle">مظلات استراحة</text>
              </g>

              {/* ZONE 2: مبنى الأنشطة */}
              <ZoneRect zone={ZONES[1]} x={300} y={290} w={200} h={115} active={activeZone === 'zone-2'} hovered={hoveredZone === 'zone-2'} onSelect={setActiveZone} onHover={setHoveredZone}>
                <line x1={370} y1={290} x2={370} y2={405} stroke={ZONES[1].color + '25'} strokeWidth="1" />
                <line x1={440} y1={290} x2={440} y2={405} stroke={ZONES[1].color + '25'} strokeWidth="1" />
              </ZoneRect>

              {/* البوابة */}
              <g className="pointer-events-none">
                <rect x={620} y={440} width={40} height={20} rx="3" fill="#022c22" stroke="#10b981" strokeWidth="2" />
                <text x={640} y={454} fill="#10b981" fontSize="9" fontWeight="900" textAnchor="middle">🚪</text>
                <text x={640} y={435} fill="#10b981" fontSize="10" fontWeight="800" textAnchor="middle">البوابة ↑</text>
              </g>

              {/* Street */}
              <g>
                <rect x={60} y={462} width={700} height={45} rx="6" fill="#0a0a0a" stroke="#1f1f1f" strokeWidth="1" />
                {[100,200,300,400,500,600,700].map(x => <line key={x} x1={x-25} y1={485} x2={x+25} y2={485} stroke="#fef08a" strokeWidth="2" strokeDasharray="8 8" opacity="0.4" />)}
                <text x={400} y={490} fill="#64748b" fontSize="13" fontWeight="800" textAnchor="middle">🛣️ شارع متحف المطرية</text>
              </g>

              {/* Active radar */}
              {activeZone && (() => {
                const pts = { 'zone-1':[685,372], 'zone-2':[400,347], 'zone-3':[630,235], 'zone-4':[610,100], 'zone-5':[388,100], 'zone-6':[180,155], 'zone-7':[240,367], 'zone-8':[130,367] };
                const p = pts[activeZone];
                const z = ZONES.find(z => z.id === activeZone);
                if (!p || !z) return null;
                return (
                  <g transform={`translate(${p[0]},${p[1]})`} className="pointer-events-none">
                    <circle r="10" fill="none" stroke={z.color} strokeWidth="2.5">
                      <animate attributeName="r" values="8;28;8" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle r="4" fill={z.color} />
                  </g>
                );
              })()}
            </svg>
          </div>
        </section>
      </div>

      {/* Detail Card */}
      {activeData && (
        <section className="card mb-6 border-slate-800 bg-slate-950/40 p-5 text-right flex items-start gap-4 flex-row-reverse animate-fade-in">
          <div className="rounded-xl p-3 mt-1 border shrink-0" style={{ background: activeData.color + '15', borderColor: activeData.color + '30', color: activeData.color }}>
            <Compass size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2 justify-end">
              {activeData.name}
              <span className="text-xs px-3 py-1 rounded-full font-black" style={{ background: activeData.color + '20', color: activeData.color, border: `1px solid ${activeData.color}30` }}>المنطقة {activeData.num}</span>
            </h3>
            <p className="text-sm text-slate-300 mt-1">{activeData.desc}</p>
            <p className="text-xs mt-1" style={{ color: activeData.color }}>{activeData.floors}</p>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="card text-right">
          <div className="flex items-center justify-end gap-2 text-primary mb-3"><span className="text-sm font-bold">نوع الفعالية</span><Filter size={16} /></div>
          <div className="flex gap-2 justify-end flex-wrap">
            {[['all','الكل'],['competition','مسابقات'],['workshop','ورش عمل'],['ceremony','حفلات']].map(([k,v]) => (
              <button key={k} onClick={() => setProgramFilter(k)} className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${programFilter===k?'bg-primary text-white shadow-glow-green':'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="card text-right">
          <div className="flex items-center justify-end gap-2 text-amber-500 mb-3"><span className="text-sm font-bold">تصفية بالمنطقة</span><Layers size={16} /></div>
          <div className="flex gap-2 justify-end flex-wrap max-h-32 overflow-y-auto scrollbar-thin">
            <button onClick={() => setAreaFilter('all')} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${areaFilter==='all'?'bg-amber-500 text-slate-950':'bg-white/5 text-slate-400 hover:bg-white/10'}`}>الكل</button>
            {ZONES.map(z => <button key={z.id} onClick={() => setAreaFilter(z.id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${areaFilter===z.id?'bg-amber-500 text-slate-950':'bg-white/5 text-slate-400 hover:bg-white/10'}`}>{z.num} {z.name}</button>)}
          </div>
        </div>
      </section>

      {/* Events */}
      <section>
        <h2 className="text-right font-black text-xl text-slate-100 mb-4 border-r-2 border-primary pr-3">جدول الفعاليات</h2>
        <div className="grid gap-3">
          {filteredEvents.map(ev => {
            const hl = activeZone === ev.zone;
            return (
              <article key={ev.id} onClick={() => setActiveZone(ev.zone)} className={`card text-right transition-all cursor-pointer ${hl?'border-primary bg-primary-soft/10 shadow-glow-green':'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 font-mono bg-white/5 px-2.5 py-1 rounded-full flex items-center gap-1"><Calendar size={12} />{ev.time}</span>
                    <span className={`status-badge ${ev.type==='competition'?'status-badge-open':'status-badge-amber'}`}>{ev.category}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">{ev.name}{hl && <CheckCircle2 size={14} className="text-primary" />}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-2">{ev.description}</p>
                <div className="flex items-center justify-end gap-1 text-slate-500 text-xs mt-2"><span>📍 {ev.area}</span></div>
              </article>
            );
          })}
          {filteredEvents.length === 0 && <div className="text-center py-8 text-slate-500 text-sm">لا توجد فعاليات تطابق الفلتر الحالي</div>}
        </div>
      </section>
    </main>
  );
};

export default Program;
