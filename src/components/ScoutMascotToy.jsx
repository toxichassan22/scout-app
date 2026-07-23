import { memo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   ScoutMascotToy — رفيق الكشاف التفاعلي (Procedural Engine)
   ممنوع الظهور في: صفحة الإقلاع/الاندينج (/)، وداخل صفحات المسابقات والاختبارات التفصيلية (/competition/*)
   مسموح الظهور في: التاب الرئيسي للمسابقات (/activities)، والصفحة الرئيسية (/home)، والبرنامج (/program) وباقي الأقسام.
═══════════════════════════════════════════════════════════════ */

export const ScoutMascotToy = memo(function ScoutMascotToy() {
  const canvasRef = useRef(null);
  const location = useLocation();

  // Route visibility rules
  const isHidden =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname.startsWith('/competition') ||
    location.pathname === '/upload-report' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/judge');

  useEffect(() => {
    if (isHidden) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const buf = document.createElement('canvas');
    buf.width = 128; buf.height = 128;
    const bCtx = buf.getContext('2d');
    bCtx.imageSmoothingEnabled = false;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    const groundY = () => window.innerHeight - 55;

    /* ═══ 25+ PROCEDURAL PROPS / ITEMS ═══ */
    const PROPS = [
      'NONE', 'BOW', 'SOCCER_BALL', 'FLOWER', 'PROPELLER', 'FISHING', 'TORCH',
      'SKATEBOARD', 'MAGIC_WAND', 'KITE', 'TELESCOPE', 'BALLOON', 'FLAG',
      'CAMERA', 'LANTERN', 'TROPHY', 'ICE_CREAM', 'PIZZA', 'COMPASS',
      'GUITAR', 'SWORD', 'UMBRELLA', 'ROCKET', 'TRUMPET', 'PAINT_BRUSH', 'POPCORN',
    ];

    /* ═══ 12 PROCEDURAL EYE STYLES ═══ */
    const EYES = ['NORMAL', 'STARS', 'HEARTS', 'SPIRAL', 'SLEEPY', 'WINK', 'WIDE', 'CYCLOPS', 'SUNGLASSES', 'HAPPY_ARC', 'X_EYES', 'GLOW_LASER'];

    /* ═══ 15 PROCEDURAL TRAJECTORIES ═══ */
    const TRAJECTORIES = [
      'STATIONARY', 'WALK_FLAT', 'BOUNCE_HOP', 'SPIRAL_FLY', 'ZIGZAG_DASH',
      'MOONWALK_BACK', 'FLOOR_SLIDE', 'OLLIE_FLIP', 'NINJA_STEALTH', 'DISCO_SWAY',
      'JETPACK_SWOOP', 'TIPTOE_SNEAK', 'BACKFLIP_JUMP', 'BREAKDANCE_ROTATE', 'SQUAT_PULSE',
    ];

    const m = {
      x: window.innerWidth * 0.7, y: 0,
      vx: 0, vy: 0, radius: 36,
      scaleX: 1, scaleY: 1, rotation: 0, vRot: 0,
      isDragging: false, dragX: 0, dragY: 0, prevMX: 0, prevMY: 0,
      isGrounded: false, facingRight: false,
      st: 0, sd: 120, // stateTimer, stateDuration
      blinkT: 0, isBlinking: false, eyeX: 0, eyeY: 0,
      armL: 0, armR: 0, walkCycle: 0, walkSpd: 1, targetX: 0,
      sitAmt: 0, phase: 0, bodyOffY: 0, headTilt: 0,
      trail: [], mouthOpen: false, propY: 0, propAngle: 0,

      // Procedurally Generated Action Parameters (Infinite Combinations!)
      currentProp: 'NONE',
      currentEyes: 'NORMAL',
      currentTrajectory: 'STATIONARY',
      armWaveFreqL: 0.1, armWaveAmpL: 3,
      armWaveFreqR: 0.1, armWaveAmpR: 3,
      particleType: 'SPARK', // 'SPARK' | 'CONFETTI' | 'STARS' | 'HEARTS' | 'ZZZ' | 'SWEAT' | 'MUSIC' | 'DUST'
      particleRate: 20,
    };

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, moved: false };
    const particles = [];
    let animId, lastTime = performance.now();

    /* ── Particles ── */
    function spark(x, y, count = 8, scale = 1, colors) {
      const C = colors || ['#f59e0b', '#38bdf8', '#10b981', '#fff', '#fb923c'];
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
        const s = (Math.random() * 4 + 2) * scale;
        particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1,
          size: Math.random()*3+2, color: C[i%C.length], life: 0, max: Math.random()*25+15 });
      }
    }

    function confetti(x, y) {
      const C = ['#f59e0b','#38bdf8','#10b981','#ef4444','#a855f7','#ec4899','#14b8a6'];
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 5 + 3;
        particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 4 - Math.random()*3,
          size: Math.random()*4+2, color: C[i%C.length], life: 0, max: 40+Math.random()*20 });
      }
    }

    function zzz(x, y) {
      particles.push({ x: x - 10, y: y - 30, vx: -0.3, vy: -0.8,
        size: 6, color: '#38bdf8', life: 0, max: 50, text: 'Z' });
    }

    function sweat(x, y) {
      particles.push({ x: x + 15, y: y - 20, vx: 0.5, vy: -1.5,
        size: 4, color: '#38bdf8', life: 0, max: 25 });
    }

    function hearts(x, y) {
      for (let i = 0; i < 3; i++) {
        particles.push({ x: x + (Math.random()-0.5)*20, y: y - 25,
          vx: (Math.random()-0.5)*1.5, vy: -1 - Math.random()*1.5,
          size: 5, color: '#ef4444', life: 0, max: 35, text: '♥' });
      }
    }

    function stars(x, y) {
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x, y: y - 20, vx: Math.cos(a)*2, vy: Math.sin(a)*2 - 1,
          size: 5, color: '#f59e0b', life: 0, max: 30, text: '★' });
      }
    }

    function dust(x, y) {
      for (let i = 0; i < 5; i++) {
        particles.push({ x: x+(Math.random()-0.5)*15, y,
          vx: (Math.random()-0.5)*2, vy: -Math.random()*1.5,
          size: Math.random()*3+1, color: '#8b7355', life: 0, max: 18 });
      }
    }

    function musical(x, y) {
      const notes = ['♪','♫','♬'];
      for (let i = 0; i < 3; i++) {
        particles.push({ x: x + (i-1)*12, y: y - 30,
          vx: (Math.random()-0.5)*1, vy: -1.2 - Math.random(),
          size: 7, color: ['#f59e0b','#38bdf8','#10b981'][i], life: 0, max: 40,
          text: notes[i] });
      }
    }

    /* ═══ PROCEDURAL ACTION GENERATOR ENGINE (OVER 200,000 COMBINATIONS!) ═══ */
    function generateNextProceduralAction() {
      // 1. Pick Random Prop (Item)
      m.currentProp = PROPS[Math.floor(Math.random() * PROPS.length)];

      // 2. Pick Random Eye Expression Style
      m.currentEyes = EYES[Math.floor(Math.random() * EYES.length)];

      // 3. Pick Random Movement Trajectory
      m.currentTrajectory = TRAJECTORIES[Math.floor(Math.random() * TRAJECTORIES.length)];

      // 4. Procedural Arm Wave Parameters
      m.armWaveFreqL = 0.05 + Math.random() * 0.25;
      m.armWaveAmpL = (Math.random() - 0.5) * 16;
      m.armWaveFreqR = 0.05 + Math.random() * 0.25;
      m.armWaveAmpR = (Math.random() - 0.5) * 16;

      // 5. Procedural Particle Style
      const partTypes = ['SPARK', 'CONFETTI', 'STARS', 'HEARTS', 'ZZZ', 'SWEAT', 'MUSIC', 'DUST'];
      m.particleType = partTypes[Math.floor(Math.random() * partTypes.length)];
      m.particleRate = Math.floor(15 + Math.random() * 35);

      // Reset timers, posture & rotation
      m.st = 0;
      m.sd = Math.floor(90 + Math.random() * 160);
      m.phase = 0;
      m.rotation = 0;
      m.bodyOffY = 0;
      m.headTilt = 0;
      m.targetX = 80 + Math.random() * (window.innerWidth - 160);
      m.walkSpd = 0.8 + Math.random() * 1.4;
      m.facingRight = Math.random() > 0.5;

      // Initial spark on new procedural action!
      if (Math.random() < 0.4) {
        spark(m.x, m.y - 20, 6, 0.6);
      }
    }

    /* ── Mouse Handlers ── */
    const getHitRadius = () => (m.radius + 14) * (window.innerWidth < 640 ? 0.75 : 1.0);

    const onDown = (e) => {
      const dx = e.clientX - m.x, dy = e.clientY - m.y;
      if (Math.hypot(dx, dy) <= getHitRadius()) {
        m.isDragging = true;
        m.currentTrajectory = 'THROWN';
        m.dragX = dx; m.dragY = dy;
        m.prevMX = e.clientX; m.prevMY = e.clientY;
        m.vx = 0; m.vy = 0; m.vRot = 0;
        m.scaleX = 1.12; m.scaleY = 0.88;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        window.getSelection()?.removeAllRanges();
        if (e.cancelable) e.preventDefault();
      }
    };

    const onMove = (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true;
      if (m.isDragging) {
        m.vx = (e.clientX - m.prevMX) * 0.85;
        m.vy = (e.clientY - m.prevMY) * 0.85;
        m.x = e.clientX - m.dragX; m.y = e.clientY - m.dragY;
        m.prevMX = e.clientX; m.prevMY = e.clientY;
        if (Math.abs(m.vx) > 0.5) m.facingRight = m.vx > 0;
        document.body.style.cursor = 'grabbing';
        window.getSelection()?.removeAllRanges();
        if (e.cancelable) e.preventDefault();
      } else {
        const dx = e.clientX - m.x, dy = e.clientY - m.y;
        if (Math.hypot(dx, dy) <= getHitRadius()) {
          document.body.style.cursor = 'grab';
        } else if (document.body.style.cursor === 'grab' || document.body.style.cursor === 'grabbing') {
          document.body.style.cursor = '';
        }
      }
    };

    const onUp = () => {
      if (m.isDragging) {
        m.isDragging = false;
        m.currentTrajectory = 'THROWN';
        m.st = 0; m.sd = 999;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        m.vRot = m.vx * 0.04;
        if (Math.hypot(m.vx, m.vy) > 3) spark(m.x, m.y, 12, 1.2);
      }
    };

    const onDbl = (e) => {
      const dx = e.clientX - m.x, dy = e.clientY - m.y;
      if (Math.hypot(dx, dy) <= getHitRadius()) {
        m.currentTrajectory = 'THROWN';
        m.vy = -13;
        m.vRot = m.facingRight ? 0.3 : -0.3;
        m.st = 0; m.sd = 999; spark(m.x, m.y, 14, 1.4);
      }
    };

    /* ── Touch Handlers for Mobile Devices ── */
    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - m.x, dy = touch.clientY - m.y;
      if (Math.hypot(dx, dy) <= getHitRadius() + 18) {
        m.isDragging = true;
        m.currentTrajectory = 'THROWN';
        m.dragX = dx; m.dragY = dy;
        m.prevMX = touch.clientX; m.prevMY = touch.clientY;
        m.vx = 0; m.vy = 0; m.vRot = 0;
        m.scaleX = 1.12; m.scaleY = 0.88;
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchMove = (e) => {
      if (!m.isDragging || !e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      mouse.x = touch.clientX; mouse.y = touch.clientY; mouse.moved = true;
      m.vx = (touch.clientX - m.prevMX) * 0.85;
      m.vy = (touch.clientY - m.prevMY) * 0.85;
      m.x = touch.clientX - m.dragX; m.y = touch.clientY - m.dragY;
      m.prevMX = touch.clientX; m.prevMY = touch.clientY;
      if (Math.abs(m.vx) > 0.5) m.facingRight = m.vx > 0;
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      onUp();
    };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('dblclick', onDbl);

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    /* ── Draw Scout Pixel Art Matrix ── */
    function drawScout(t) {
      bCtx.clearRect(0, 0, 128, 128);
      const C = {
        ol: '#020b0e', mm: '#0f2d27', ml: '#10b981', mh: '#34d399',
        md: '#04140b', vb: '#01080b', ec: '#38bdf8', gold: '#f59e0b',
        cl: Math.sin(t*0.006)>0 ? '#f59e0b' : '#10b981',
        al: Math.sin(t*0.01)>0 ? '#38bdf8' : '#f59e0b',
        f1: '#f59e0b', f2: '#ff7700',
      };
      const offX = 40, offY = 38;
      const r = (x,y,w,h,c) => { bCtx.fillStyle=c; bCtx.fillRect(x + offX, y + offY, w, h); };
      const sOff = m.sitAmt * 4;
      const bY = sOff + m.bodyOffY;

      // 🚁 PROPELLER TOP 🚁
      if (m.currentProp === 'PROPELLER') {
        m.propAngle += 0.4;
        const propW = Math.abs(Math.sin(m.propAngle)) * 14 + 4;
        r(24 - Math.round(propW/2), 0+bY, Math.round(propW), 2, '#38bdf8');
        r(23, 2+bY, 2, 2, C.md);
      }

      // Antenna
      r(23, 3+bY, 2, 6, C.md);
      r(22, 0+bY, 4, 3, C.al);

      // Head
      bCtx.save();
      if (Math.abs(m.headTilt) > 0.01) {
        bCtx.translate(24 + offX, 16 + bY + offY);
        bCtx.rotate(m.headTilt);
        bCtx.translate(-(24 + offX), -(16 + bY + offY));
      }
      r(11, 8+bY, 26, 17, C.ol);
      r(12, 9+bY, 24, 15, C.mm);
      r(14, 9+bY, 20, 3, C.mh);
      r(12, 12+bY, 3, 10, C.ml);

      // Visor
      r(15, 13+bY, 18, 8, C.vb);

      // 👁️ PROCEDURAL EYE RENDERING (12 STYLES) 👁️
      const eOff = Math.round(m.eyeX * 2);
      const eOffY = Math.round(m.eyeY * 1);

      switch (m.currentEyes) {
        case 'SPIRAL': {
          const sp = Math.floor((t/80)%2);
          r(17, 15+bY, 4, 4, sp ? '#f59e0b' : '#38bdf8');
          r(27, 15+bY, 4, 4, sp ? '#38bdf8' : '#f59e0b');
          r(18+sp, 16+bY+sp, 2, 2, '#fff');
          r(28+sp, 16+bY+sp, 2, 2, '#fff');
          break;
        }
        case 'HEARTS':
          r(17, 15+bY, 4, 4, '#ef4444');
          r(27, 15+bY, 4, 4, '#ef4444');
          break;
        case 'STARS':
          r(16, 14+bY, 6, 6, '#f59e0b');
          r(26, 14+bY, 6, 6, '#f59e0b');
          r(18, 16+bY, 2, 2, '#fff');
          r(28, 16+bY, 2, 2, '#fff');
          break;
        case 'SLEEPY':
          r(17, 17+bY, 4, 2, C.ec);
          r(27, 17+bY, 4, 2, C.ec);
          break;
        case 'WINK':
          r(17+eOff, 15+bY, 4, 4, C.ec);
          r(17+eOff, 15+bY, 2, 2, '#fff');
          r(27, 17+bY, 4, 1, C.ec);
          break;
        case 'WIDE':
          r(16+eOff, 14+bY, 5, 5, C.ec);
          r(26+eOff, 14+bY, 5, 5, C.ec);
          r(17+eOff, 15+bY, 2, 2, '#fff');
          r(27+eOff, 15+bY, 2, 2, '#fff');
          break;
        case 'CYCLOPS':
          r(21+eOff, 14+bY, 6, 6, '#38bdf8');
          r(23+eOff, 16+bY, 2, 2, '#fff');
          break;
        case 'SUNGLASSES':
          r(15, 14+bY, 18, 5, '#020b0e');
          r(16, 15+bY, 7, 3, '#10b981');
          r(25, 15+bY, 7, 3, '#10b981');
          break;
        case 'HAPPY_ARC':
          r(17, 15+bY, 4, 2, C.ec);
          r(27, 15+bY, 4, 2, C.ec);
          r(18, 14+bY, 2, 1, C.ec);
          r(28, 14+bY, 2, 1, C.ec);
          break;
        case 'X_EYES':
          r(17, 15+bY, 4, 4, '#ef4444');
          r(27, 15+bY, 4, 4, '#ef4444');
          r(18, 16+bY, 2, 2, '#fff');
          r(28, 16+bY, 2, 2, '#fff');
          break;
        case 'GLOW_LASER':
          r(15, 15+bY, 18, 3, '#ef4444');
          r(16, 16+bY, 16, 1, '#ffffff');
          break;
        default:
          if (!m.isBlinking) {
            r(17+eOff, 15+bY+eOffY, 4, 4, C.ec);
            r(27+eOff, 15+bY+eOffY, 4, 4, C.ec);
            r(17+eOff, 15+bY+eOffY, 2, 2, '#fff');
            r(27+eOff, 15+bY+eOffY, 2, 2, '#fff');
          } else {
            r(17, 17+bY, 4, 1, C.ec);
            r(27, 17+bY, 4, 1, C.ec);
          }
      }

      if (m.mouthOpen) {
        r(21, 19+bY, 6, 2, '#020b0e');
        r(22, 19+bY, 4, 1, '#ef4444');
      }

      bCtx.restore();

      // Neckerchief
      r(18, 25+bY, 12, 3, C.gold);
      r(22, 28+bY, 4, 2, C.gold);

      // Torso
      const tH = m.currentTrajectory === 'SQUAT_PULSE' ? 12 : 16;
      r(10, 27+bY, 28, tH, C.ol);
      r(11, 28+bY, 26, tH-2, C.mm);
      r(13, 28+bY, 22, 3, C.mh);
      r(18, 32+bY, 12, 7, C.vb);
      r(21, 34+bY, 6, 4, C.cl);
      r(23, 35+bY, 2, 2, '#fff');

      // Arms
      r(5, 30+bY+m.armL, 6, 10, C.ol);
      r(6, 31+bY+m.armL, 4, 8, C.ml);
      r(37, 30+bY+m.armR, 6, 10, C.ol);
      r(38, 31+bY+m.armR, 4, 8, C.ml);

      /* ═══ 25+ PROCEDURAL PROPS DRAWING IN HAND ═══ */
      switch (m.currentProp) {
        case 'FLOWER':
          r(40, 24+bY+m.armR, 2, 8, '#10b981');
          r(39, 21+bY+m.armR, 4, 4, '#ec4899');
          r(40, 22+bY+m.armR, 2, 2, '#f59e0b');
          break;
        case 'MAGIC_WAND':
          r(40, 20+bY+m.armR, 2, 12, '#8b5cf6');
          r(39, 18+bY+m.armR, 4, 4, '#f59e0b');
          break;
        case 'TORCH': {
          r(40, 22+bY+m.armR, 3, 10, '#78350f');
          const tf = Math.floor((t/60)%2);
          r(39, 17+bY+m.armR, 5, 5, tf===0?'#f59e0b':'#ff7700');
          break;
        }
        case 'BOW':
          r(3, 24+bY+m.armL, 2, 16, '#78350f');
          r(4, 25+bY+m.armL, 1, 14, '#fff');
          r(2, 31+bY+m.armL, 10, 1, '#f59e0b');
          break;
        case 'FISHING':
          r(40, 16+bY+m.armR, 2, 18, '#78350f');
          r(42, 16+bY+m.armR, 6, 1, '#fff');
          break;
        case 'TELESCOPE':
          r(36, 20+bY+m.armR, 10, 4, '#f59e0b');
          r(44, 19+bY+m.armR, 3, 6, '#38bdf8');
          break;
        case 'BALLOON':
          r(40, 14+bY+m.armR, 1, 16, '#fff');
          r(37, 8+bY+m.armR, 7, 8, '#ef4444');
          break;
        case 'FLAG':
          r(40, 18+bY+m.armR, 2, 14, '#78350f');
          r(32, 18+bY+m.armR, 8, 6, '#f59e0b');
          break;
        case 'CAMERA':
          r(36, 26+bY+m.armR, 8, 6, '#020b0e');
          r(38, 27+bY+m.armR, 4, 4, '#38bdf8');
          break;
        case 'LANTERN':
          r(39, 26+bY+m.armR, 5, 7, '#f59e0b');
          r(40, 28+bY+m.armR, 3, 3, '#fff');
          break;
        case 'TROPHY':
          r(37, 24+bY+m.armR, 8, 8, '#f59e0b');
          r(39, 32+bY+m.armR, 4, 3, '#78350f');
          break;
        case 'ICE_CREAM':
          r(40, 26+bY+m.armR, 3, 6, '#f59e0b');
          r(39, 22+bY+m.armR, 5, 5, '#ec4899');
          break;
        case 'PIZZA':
          r(37, 24+bY+m.armR, 7, 6, '#f59e0b');
          r(39, 26+bY+m.armR, 2, 2, '#ef4444');
          break;
        case 'COMPASS':
          r(38, 25+bY+m.armR, 6, 6, '#38bdf8');
          r(40, 26+bY+m.armR, 2, 4, '#ef4444');
          break;
        case 'GUITAR':
          r(34, 26+bY+m.armR, 12, 6, '#78350f');
          r(42, 22+bY+m.armR, 3, 10, '#f59e0b');
          break;
        case 'SWORD':
          r(40, 16+bY+m.armR, 2, 14, '#38bdf8');
          r(38, 26+bY+m.armR, 6, 2, '#f59e0b');
          break;
        case 'UMBRELLA':
          r(40, 18+bY+m.armR, 2, 14, '#020b0e');
          r(33, 16+bY+m.armR, 16, 4, '#10b981');
          break;

        case 'ROCKET':
          r(38, 20+bY+m.armR, 6, 12, '#ef4444');
          r(40, 18+bY+m.armR, 2, 3, '#fff');
          break;
        case 'TRUMPET':
          r(36, 25+bY+m.armR, 10, 4, '#f59e0b');
          r(44, 23+bY+m.armR, 3, 8, '#f59e0b');
          break;
        case 'PAINT_BRUSH':
          r(40, 20+bY+m.armR, 2, 12, '#78350f');
          r(39, 18+bY+m.armR, 4, 3, '#38bdf8');
          break;
        case 'POPCORN':
          r(38, 24+bY+m.armR, 7, 8, '#ef4444');
          r(39, 21+bY+m.armR, 5, 4, '#fff');
          break;
      }

      // Legs
      const lp = ['WALK_FLAT', 'MOONWALK_BACK', 'TIPTOE_SNEAK', 'NINJA_STEALTH', 'OLLIE_FLIP'].includes(m.currentTrajectory)
        ? Math.sin(m.walkCycle*0.2)*2.5 : 0;
      r(14, 42+bY, 6, 5, C.ol); r(15, 42+bY+lp, 4, 4, C.ml);
      r(28, 42+bY, 6, 5, C.ol); r(29, 42+bY-lp, 4, 4, C.ml);

      // Skateboard
      if (m.currentProp === 'SKATEBOARD') {
        r(8, 46+bY, 32, 4, '#10b981');
        r(11, 50+bY, 4, 2, '#f59e0b');
        r(33, 50+bY, 4, 2, '#f59e0b');
      }

      // Jetpack flames
      if (!m.isGrounded && (m.currentTrajectory === 'THROWN' || m.currentTrajectory === 'JETPACK_SWOOP' || m.currentProp === 'PROPELLER')) {
        const f = Math.floor((t/60)%2);
        r(15, 46+bY, 4, 5, f===0?C.f1:C.f2);
        r(29, 46+bY, 4, 5, f===0?C.f2:C.f1);
      }
    }

    /* ═══ PROCEDURAL BEHAVIOR SIMULATION ENGINE ═══ */
    function updateBehavior(t, dt) {
      const gY = groundY();
      m.st++; m.phase++;

      // ── THROWN: Physics ──
      if (m.currentTrajectory === 'THROWN' && !m.isDragging) {
        m.vy += 0.42; m.x += m.vx; m.y += m.vy;
        m.rotation += m.vRot; m.vx *= 0.985; m.vRot *= 0.96;
        if (m.y >= gY) {
          m.y = gY; m.isGrounded = true;
          if (Math.abs(m.vy) > 2) {
            m.scaleY = Math.max(0.65,1-Math.abs(m.vy)*0.03);
            m.scaleX = Math.min(1.35,1+Math.abs(m.vy)*0.03);
            if (Math.abs(m.vy) > 5) spark(m.x, m.y, 8);
          }
          m.vy = -m.vy*0.55; if (Math.abs(m.vy)<1) m.vy=0;
          m.vx *= 0.9; m.vRot *= 0.7;
          if (Math.abs(m.vx)<0.3 && Math.abs(m.vy)<0.3) {
            m.rotation=0; m.vRot=0; generateNextProceduralAction();
          }
        } else { m.isGrounded = false; }
        if (m.x<50){m.x=50;m.vx=Math.abs(m.vx)*0.6;}
        if (m.x>window.innerWidth-50){m.x=window.innerWidth-50;m.vx=-Math.abs(m.vx)*0.6;}
        if (m.y<40){m.y=40;m.vy=Math.abs(m.vy)*0.4;}
        return;
      }

      if (m.isDragging) { m.isGrounded = false; return; }

      // Autonomous
      m.isGrounded = true; m.y = gY; m.vy = 0;
      m.rotation += (0 - m.rotation) * 0.15;

      if (m.st >= m.sd) {
        generateNextProceduralAction(); return;
      }

      m.x = Math.max(50, Math.min(window.innerWidth - 50, m.x));
      const p = m.phase;
      const sin = Math.sin, cos = Math.cos;

      // 1. Procedural Arm Waves
      m.armL = sin(p * m.armWaveFreqL) * m.armWaveAmpL;
      m.armR = cos(p * m.armWaveFreqR) * m.armWaveAmpR;

      // 2. Procedural Trajectory Simulation
      switch (m.currentTrajectory) {
        case 'WALK_FLAT': {
          const diff = m.targetX - m.x;
          m.facingRight = diff > 0; m.walkCycle++;
          m.vx += Math.sign(diff)*m.walkSpd*0.08;
          m.vx = Math.max(-m.walkSpd, Math.min(m.walkSpd, m.vx));
          m.x += m.vx;
          if (Math.abs(diff)<6) generateNextProceduralAction();
          break;
        }
        case 'BOUNCE_HOP':
          m.bodyOffY = -Math.abs(sin(p * 0.15)) * 14;
          if (p % 12 === 0) spark(m.x, m.y, 3, 0.3);
          break;

        case 'SPIRAL_FLY':
          m.isGrounded = false;
          m.y = gY - Math.abs(sin(p * 0.05)) * 50;
          m.x += sin(p * 0.1) * 2;
          break;

        case 'ZIGZAG_DASH':
          m.facingRight = Math.sin(p * 0.1) > 0;
          m.x += Math.sin(p * 0.1) * 3;
          if (p % 6 === 0) dust(m.x, m.y);
          break;

        case 'MOONWALK_BACK': {
          const diff = m.targetX - m.x; m.walkCycle++;
          m.x += Math.sign(diff) * 0.8; m.facingRight = Math.sign(diff) < 0;
          if (Math.abs(diff)<6) generateNextProceduralAction();
          break;
        }
        case 'FLOOR_SLIDE':
          m.x += (m.facingRight?1:-1) * 2.5;
          m.bodyOffY = 3; m.scaleY = 0.88;
          if (p % 8 === 0) dust(m.x, m.y);
          break;

        case 'OLLIE_FLIP':
          if (p > 20 && p < 45) {
            m.bodyOffY = -sin((p-20)/25 * Math.PI) * 16;
            m.rotation = sin((p-20)/25 * Math.PI) * (m.facingRight?0.3:-0.3);
          }
          break;

        case 'NINJA_STEALTH':
          m.x += (m.facingRight?1:-1) * 2.2;
          m.bodyOffY = -3;
          if (p % 4 === 0) m.trail.push({x:m.x, y:m.y, alpha:0.5});
          break;

        case 'DISCO_SWAY':
          m.bodyOffY = sin(p * 0.2) * 2;
          m.scaleX = 1 + sin(p * 0.2) * 0.05;
          break;

        case 'JETPACK_SWOOP':
          m.isGrounded = false;
          m.y = gY - Math.abs(sin(p * 0.06)) * 70;
          m.x += cos(p * 0.06) * 2;
          break;

        case 'TIPTOE_SNEAK':
          m.x += (m.facingRight?1:-1) * 0.4;
          m.bodyOffY = -2 + sin(p * 0.15) * 0.5;
          break;

        case 'BACKFLIP_JUMP':
          if (p === 1) { m.vy = -12; spark(m.x, m.y, 10, 1); }
          m.vy += 0.45; m.y += m.vy; m.rotation += m.facingRight ? 0.25 : -0.25;
          if (m.y >= gY) { m.y = gY; m.vy = 0; m.rotation = 0; generateNextProceduralAction(); }
          break;

        case 'BREAKDANCE_ROTATE':
          m.rotation += 0.2;
          m.bodyOffY = 4;
          break;

        case 'SQUAT_PULSE':
          m.bodyOffY = Math.max(0, sin(p * 0.1) * 6);
          break;

        default:
          m.vx *= 0.88;
      }

      // 3. Procedural Particle Emission
      if (p % m.particleRate === 0) {
        switch (m.particleType) {
          case 'SPARK': spark(m.x, m.y - 15, 3, 0.4); break;
          case 'CONFETTI': confetti(m.x, m.y - 20); break;
          case 'STARS': stars(m.x, m.y - 20); break;
          case 'HEARTS': hearts(m.x, m.y - 20); break;
          case 'ZZZ': zzz(m.x, m.y); break;
          case 'SWEAT': sweat(m.x, m.y); break;
          case 'MUSIC': musical(m.x, m.y); break;
          case 'DUST': dust(m.x, m.y); break;
        }
      }
    }

    /* ── Main Loop ── */
    function render(now) {
      animId = requestAnimationFrame(render);
      const dt = Math.min(32, now - lastTime);
      lastTime = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      updateBehavior(now, dt);

      m.scaleX += (1-m.scaleX)*0.12; m.scaleY += (1-m.scaleY)*0.12;

      // Blink
      m.blinkT += dt;
      if (m.blinkT > 3200+Math.random()*800) {
        m.isBlinking = true;
        if (m.blinkT > 3400+Math.random()*200) { m.isBlinking=false; m.blinkT=0; }
      }

      // Trail
      for (let i = m.trail.length-1; i >= 0; i--) {
        const tr = m.trail[i]; tr.alpha -= 0.025;
        if (tr.alpha <= 0) { m.trail.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = tr.alpha * 0.3;
        ctx.translate(tr.x, tr.y); ctx.scale(m.facingRight?1:-1, 1);
        ctx.drawImage(buf, -112, -112, 224, 224); ctx.restore();
      }

      // Particles
      for (let i = particles.length-1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.04;
        p.life++; const pr = p.life / p.max;
        if (pr >= 1) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = 1 - pr;
        if (p.text) {
          ctx.font = `${p.size*2}px monospace`; ctx.fillStyle = p.color;
          ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size));
        }
        ctx.restore();
      }

      // ⚽ SOCCER BALL WORLD RENDER ⚽
      if (m.currentProp === 'SOCCER_BALL') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.x + (m.facingRight?15:-15), m.y - 25 - Math.abs(Math.sin(m.phase*0.25))*25, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#020b0e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 🎯 ARCHERY TARGET BOARD RENDER 🎯
      if (m.currentProp === 'BOW') {
        ctx.save();
        const targetX = m.x + (m.facingRight ? 55 : -55);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(targetX, m.y - 15, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(targetX, m.y - 15, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(targetX, m.y - 15, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      // 🪁 KITE WORLD RENDER 🪁
      if (m.currentProp === 'KITE') {
        ctx.save();
        const kiteX = m.x + (m.facingRight ? 40 : -40);
        const kiteY = m.y - 70;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(m.x + (m.facingRight?15:-15), m.y - 15);
        ctx.lineTo(kiteX, kiteY); ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(kiteX, kiteY - 12); ctx.lineTo(kiteX + 10, kiteY);
        ctx.lineTo(kiteX, kiteY + 12); ctx.lineTo(kiteX - 10, kiteY);
        ctx.fill();
        ctx.restore();
      }

      const isMobile = window.innerWidth < 640;
      const mascotScale = isMobile ? 0.75 : 1.0;
      const breathY = m.isGrounded && m.currentTrajectory !== 'THROWN' ? Math.sin(now*0.003)*1.5 : 0;

      // Draw scout
      drawScout(now);

      // Render with 0.75 Mobile Scale
      ctx.save();
      ctx.translate(m.x, m.y + breathY);
      ctx.rotate(m.rotation);
      ctx.scale(m.scaleX * mascotScale * (m.facingRight?1:-1), m.scaleY * mascotScale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, -112, -112, 224, 224);
      ctx.restore();

      // Shadow
      const gYVal = groundY();
      ctx.save();
      ctx.globalAlpha = m.isGrounded ? 0.2 : Math.max(0.05, 0.2-(gYVal-m.y)*0.001);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      const sw = (m.isGrounded ? 26 : Math.max(10, 26-(gYVal-m.y)*0.05)) * mascotScale;
      ctx.ellipse(m.x, gYVal+38*mascotScale, sw, 4*mascotScale, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      document.body.style.cursor = '';
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('dblclick', onDbl);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isHidden]);

  if (isHidden) return null;

  return (
    <canvas ref={canvasRef} style={{ pointerEvents: 'none' }}
      className="fixed inset-0 z-[999999] h-full w-full overflow-hidden select-none" />
  );
});

export default ScoutMascotToy;
