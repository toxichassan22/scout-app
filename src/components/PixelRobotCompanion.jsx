import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, Shield, RotateCcw, Zap } from 'lucide-react';

export const PixelRobotCompanion = memo(function PixelRobotCompanion() {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [particles, setParticles] = useState([]);
  const [mode, setMode] = useState('guard'); // 'guard' or 'float'

  // --- Canvas Rendering Engine for Guaranteed 100% Visual Robot ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const buffer = document.createElement('canvas');
    buffer.width = 48;
    buffer.height = 48;
    const bCtx = buffer.getContext('2d');
    bCtx.imageSmoothingEnabled = false;

    let animId;
    let blinkTimer = 0;
    let isBlinking = false;
    let lastTime = performance.now();

    function drawScoutRobot(bCtx, time) {
      bCtx.clearRect(0, 0, 48, 48);

      const C = {
        outline: '#020b0e',
        metalMid: '#0f2d27',
        metalLight: '#10b981',
        metalHighlight: '#34d399',
        metalDark: '#04140b',
        visorBg: '#01080b',
        eyeCyan: '#38bdf8',
        chestLed: Math.sin(time * 0.008) > 0 ? '#f59e0b' : '#10b981',
        antennaLed: Math.sin(time * 0.012) > 0 ? '#38bdf8' : '#f59e0b',
        gold: '#f59e0b',
      };

      function rect(x, y, w, h, color) {
        bCtx.fillStyle = color;
        bCtx.fillRect(x, y, w, h);
      }

      // Antenna Shaft & Tip
      rect(23, 3, 2, 6, C.metalDark);
      rect(22, 0, 4, 3, C.antennaLed);

      // Head Base
      rect(11, 8, 26, 17, C.outline);
      rect(12, 9, 24, 15, C.metalMid);
      rect(14, 9, 20, 3, C.metalHighlight);
      rect(12, 12, 3, 10, C.metalLight);

      // Visor Screen
      rect(15, 13, 18, 8, C.visorBg);

      // Blinking Eyes
      if (!isBlinking) {
        rect(17, 15, 4, 4, C.eyeCyan);
        rect(27, 15, 4, 4, C.eyeCyan);
        rect(17, 15, 2, 2, '#ffffff');
        rect(27, 15, 2, 2, '#ffffff');
      } else {
        rect(17, 17, 4, 1, C.eyeCyan);
        rect(27, 17, 4, 1, C.eyeCyan);
      }

      // Scout Neckerchief (ربطة الكشافة الذهبية)
      rect(18, 25, 12, 3, C.gold);
      rect(22, 28, 4, 3, C.gold);

      // Torso Body
      rect(10, 27, 28, 16, C.outline);
      rect(11, 28, 26, 14, C.metalMid);
      rect(13, 28, 22, 3, C.metalHighlight);

      // Chest Power Core
      rect(18, 32, 12, 7, C.visorBg);
      rect(21, 34, 6, 4, C.chestLed);
      rect(23, 35, 2, 2, '#ffffff');

      // Arms & Legs
      const armSway = Math.sin(time * 0.008) * 2;
      rect(5, 30 + armSway, 6, 10, C.outline);
      rect(6, 31 + armSway, 4, 8, C.metalLight);
      rect(37, 30 - armSway, 6, 10, C.outline);
      rect(38, 31 - armSway, 4, 8, C.metalLight);

      // Thruster Nozzles
      rect(14, 42, 6, 4, C.metalDark);
      rect(28, 42, 6, 4, C.metalDark);
      rect(15, 44, 4, 3, '#f59e0b');
      rect(29, 44, 4, 3, '#f59e0b');
    }

    function render(now) {
      animId = requestAnimationFrame(render);
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      blinkTimer += dt;
      if (blinkTimer > 3500) {
        isBlinking = true;
        if (blinkTimer > 3680) {
          isBlinking = false;
          blinkTimer = Math.random() * 1000;
        }
      }

      drawScoutRobot(bCtx, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Particle Trigger
  const triggerCelebration = () => {
    setIsHappy(true);
    setTimeout(() => setIsHappy(false), 1000);

    const newParticles = Array.from({ length: 14 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 120,
      color: ['#f59e0b', '#38bdf8', '#10b981', '#fb923c'][i % 4],
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 900);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] select-none overflow-hidden">

      {/* Floating Sparkle Particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 0.2, x: p.x, y: p.y - 40 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="fixed rounded-full pointer-events-none"
          style={{
            right: '80px',
            bottom: '120px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}`,
          }}
        />
      ))}

      {/* Draggable Scout Robot Companion */}
      <motion.div
        drag
        dragConstraints={{ left: -window.innerWidth + 140, right: 0, top: -window.innerHeight + 160, bottom: 0 }}
        dragElastic={0.15}
        whileDrag={{ scale: 1.12, rotate: 6 }}
        initial={{ y: 0, opacity: 1 }}
        animate={
          isHappy
            ? { y: [0, -30, 0], rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }
            : mode === 'float'
            ? { y: [0, -18, 0], x: [0, -10, 0] }
            : { y: [0, -6, 0] }
        }
        transition={
          isHappy
            ? { duration: 0.7 }
            : mode === 'float'
            ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={triggerCelebration}
        className="pointer-events-auto absolute right-6 sm:right-10 bottom-8 flex flex-col items-center cursor-grab active:cursor-grabbing group"
      >
        {/* Glow Aura Ring */}
        <div
          className={`absolute -inset-4 rounded-full transition-opacity duration-500 blur-xl ${
            isHovered
              ? 'opacity-90 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.6),transparent_70%)]'
              : 'opacity-50 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.4),transparent_70%)]'
          }`}
        />

        {/* Hover Hint Badge */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              className="mb-2 flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.5)] bg-[rgba(2,11,14,0.92)] px-3.5 py-1 text-[11px] font-black text-[#fcd34d] shadow-xl backdrop-blur-xl"
            >
              <Sparkles size={13} className="animate-spin text-[#38bdf8]" />
              <span>الكشاف الرقمي ⚡ اضغط أو اسحبني!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guaranteed 100% Visible Pixel Robot Canvas */}
        <div className="relative flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={120}
            height={120}
            className="h-28 w-28 sm:h-32 sm:w-32 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
          />

          {/* Interactive Pedestal Dock */}
          <div className="mt-[-10px] flex items-center gap-2 rounded-2xl border border-[rgba(16,185,129,0.35)] bg-[rgba(2,11,14,0.9)] px-3 py-1 text-[10px] font-mono font-black text-[#38bdf8] shadow-lg backdrop-blur-md">
            <span className="live-dot" />
            <span>SCOUT BOT</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMode(mode === 'guard' ? 'float' : 'guard');
              }}
              className="mr-1 text-[#f59e0b] hover:text-white transition"
              title="تغيير نمط الحركة"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>
      </motion.div>

    </div>
  );
});

export default PixelRobotCompanion;
