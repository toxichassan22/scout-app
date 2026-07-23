import { memo, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   ScoutCampfireScene — مشهد المخيم الكشفي وسماء الليل التفاعلية
   - خيم كشفية (Pixel Scout Tents ⛺) دافئة ومضيئة حول نار المخيم.
   - درون بكسل كشفي (Pixel Scout Drone 🛸) يطير بشكل دوري في السماء بين الأشجار ويختفي.
   - شهاب ناري متوهج (Shooting Star Meteor 🌠) يمر فجأة بالسماء ليلاً.
   - برج إشارة لاسلكي كشفي (Pixel Signal Radio Tower 🗼) على اليمين بجانب الأشجار بضوء تنبيه وموجات إشارة.
   - غابة صنوبر كشفية، ونار مخيم سمر متوهجة مع جمر متطاير.
═══════════════════════════════════════════════════════════════ */

export const ScoutCampfireScene = memo(function ScoutCampfireScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Rising Bonfire Embers ---
    const emberCount = 20;
    const embers = Array.from({ length: emberCount }).map(() => ({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 120,
      y: window.innerHeight - 20,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 1.5 - 1.0,
      size: Math.random() * 3 + 2,
      color: Math.random() > 0.5 ? '#f59e0b' : '#fb923c',
      life: Math.random() * 60,
      maxLife: Math.random() * 80 + 40,
    }));

    // 🛸 --- Ambient Pixel Scout Drone State --- 🛸
    const drone = {
      active: false,
      x: -100,
      y: 90,
      vx: 1.4,
      timer: 0,
      nextSpawn: 120,
    };

    // 🌠 --- Ambient Shooting Star Meteors State --- 🌠
    const meteors = [];
    let meteorTimer = 0;
    let nextMeteorTime = 180 + Math.floor(Math.random() * 250);

    let animId;
    let time = 0;

    // 🛸 --- Draw Pixel Scout Drone --- 🛸
    function drawPixelDrone(ctx, x, y, t) {
      const px = (dx, dy, w, h, col) => {
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h);
      };

      px(-12, -4, 24, 8, '#020b0e');
      px(-10, -3, 20, 6, '#0f2d27');
      px(-6, -1, 12, 3, '#10b981');

      const blink = Math.floor((t / 200) % 2);
      px(-1, -5, 3, 2, blink === 0 ? '#ef4444' : '#38bdf8');

      const pF = Math.floor((t / 40) % 2);
      const pCol = '#38bdf8';

      px(-18, -6, 6, 2, '#020b0e');
      px(-22, -8, 10, 2, pF === 0 ? pCol : '#ffffff');

      px(12, -6, 6, 2, '#020b0e');
      px(12, -8, 10, 2, pF === 0 ? pCol : '#ffffff');

      px(-2, 3, 4, 3, '#f59e0b');
    }

    // ⛺ --- Draw Pixel Scout Tent --- ⛺
    function drawPixelScoutTent(ctx, x, bottomY, width, height, mainColor, accentColor) {
      const halfW = width / 2;
      const topY = bottomY - height;

      // Triangular Tent Body (A-Frame Canvas)
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(x - halfW, bottomY);
      ctx.lineTo(x, topY);
      ctx.lineTo(x + halfW, bottomY);
      ctx.closePath();
      ctx.fill();

      // Tent Shading (Darker side fold)
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x + halfW, bottomY);
      ctx.lineTo(x, bottomY);
      ctx.closePath();
      ctx.fill();

      // Tent Entrance Opening (Warm Golden Glow Inside)
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(x - halfW * 0.35, bottomY);
      ctx.lineTo(x, bottomY - height * 0.55);
      ctx.lineTo(x + halfW * 0.35, bottomY);
      ctx.closePath();
      ctx.fill();

      // Ridge Wooden Pole Tip
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.round(x - 1.5), Math.round(topY - 4), 3, 5);

      // Guy Ropes & Wooden Pegs
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x - halfW - 6, bottomY);
      ctx.moveTo(x, topY);
      ctx.lineTo(x + halfW + 6, bottomY);
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.round(x - halfW - 8), Math.round(bottomY - 3), 3, 4);
      ctx.fillRect(Math.round(x + halfW + 5), Math.round(bottomY - 3), 3, 4);
    }

    // 🗼 --- Draw Pixel Scout Signal Radio Tower --- 🗼
    function drawPixelSignalTower(ctx, x, bottomY, time) {
      const h = 135;
      const topY = bottomY - h;

      ctx.strokeStyle = '#041814';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - 22, bottomY);
      ctx.lineTo(x - 4, topY + 22);
      ctx.lineTo(x + 4, topY + 22);
      ctx.lineTo(x + 22, bottomY);
      ctx.stroke();

      ctx.strokeStyle = '#0f2d27';
      ctx.lineWidth = 1.8;
      const levels = 5;
      for (let i = 0; i < levels; i++) {
        const y1 = bottomY - (i * (h / levels));
        const y2 = bottomY - ((i + 1) * (h / levels));
        const w1 = 22 * (1 - i / levels);
        const w2 = 22 * (1 - (i + 1) / levels);

        ctx.beginPath();
        ctx.moveTo(x - w1, y1);
        ctx.lineTo(x + w1, y1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - w1, y1);
        ctx.lineTo(x + w2, y2);
        ctx.moveTo(x + w1, y1);
        ctx.lineTo(x - w2, y2);
        ctx.stroke();
      }

      ctx.fillStyle = '#10b981';
      ctx.fillRect(x - 2, topY, 4, 24);

      const blink = Math.floor((time / 350) % 2);
      const beaconColor = blink === 0 ? '#ef4444' : '#f59e0b';
      ctx.fillStyle = beaconColor;
      ctx.beginPath();
      ctx.arc(x, topY - 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      const waveRadius = (time * 0.04) % 40;
      const alpha = 1 - (waveRadius / 40);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha * 0.75);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, topY - 2, waveRadius, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
      ctx.restore();
    }

    // --- Draw Pixel Pine Tree ---
    function drawPixelPineTree(ctx, x, bottomY, width, height, color) {
      ctx.fillStyle = color;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const stepY = bottomY - height + (i * (height / steps));
        const stepW = width * ((i + 1) / steps);
        ctx.fillRect(x - stepW / 2, stepY, stepW, height / steps + 2);
      }
      ctx.fillStyle = '#020b0e';
      ctx.fillRect(x - 3, bottomY - 12, 6, 12);
    }

    // --- Draw Pixel Campfire & Flames ---
    function drawPixelCampfire(ctx, centerX, bottomY, time) {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(centerX - 18, bottomY - 8, 36, 6);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(centerX - 14, bottomY - 12, 28, 5);

      const flameStep = Math.floor((time / 80) % 3);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(centerX - 10, bottomY - 24, 20, 14);
      ctx.fillRect(centerX - (flameStep === 0 ? 12 : 8), bottomY - 32, 16, 10);
      ctx.fillRect(centerX - (flameStep === 1 ? 6 : 4), bottomY - 38, 10, 8);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(centerX - 5, bottomY - 20, 10, 10);
      ctx.fillRect(centerX - (flameStep === 2 ? 4 : 2), bottomY - 28, 6, 8);
    }

    // --- Main Animation Loop ---
    function render() {
      animId = requestAnimationFrame(render);
      time += 16;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gY = window.innerHeight - 50;
      const centerX = canvas.width * 0.5;
      const fireX = Math.max(160, centerX - 180);
      const towerX = Math.min(canvas.width - 90, canvas.width * 0.88);

      // Left & Right Tent positions relative to campfire
      const tentLeftX = fireX - 75;
      const tentRightX = fireX + 75;

      // Solid Forest Ground Floor below gY
      ctx.fillStyle = '#020b0e';
      ctx.fillRect(0, gY, canvas.width, 50);

      // 1. Ambient Warm Bonfire Glow at fireX
      const glowGrad = ctx.createRadialGradient(fireX, gY, 10, fireX, gY, 340);
      glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, gY - 340, canvas.width, 340);

      // 🌠 2. Update & Render Ambient Shooting Stars (Meteors 🌠)
      meteorTimer++;
      if (meteorTimer >= nextMeteorTime) {
        meteors.push({
          x: Math.random() * canvas.width * 0.85,
          y: Math.random() * (canvas.height * 0.35),
          length: Math.random() * 90 + 70,
          speed: Math.random() * 14 + 10,
          life: 0,
          maxLife: 22,
          color: Math.random() > 0.5 ? '#f59e0b' : '#38bdf8',
        });
        meteorTimer = 0;
        nextMeteorTime = 250 + Math.floor(Math.random() * 450);
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life++;
        m.x += m.speed;
        m.y += m.speed * 0.55;
        const progress = m.life / m.maxLife;

        if (progress >= 1) {
          meteors.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.sin(progress * Math.PI);
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.length, m.y - m.length * 0.55);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 3, 3);
        ctx.restore();
      }

      // 🛸 3. Update & Render Ambient Pixel Scout Drone 🛸
      drone.timer++;
      if (!drone.active && drone.timer >= drone.nextSpawn) {
        drone.active = true;
        drone.x = -80;
        drone.y = 60 + Math.random() * (canvas.height * 0.25);
        drone.timer = 0;
      }

      if (drone.active) {
        drone.x += drone.vx;
        drone.y += Math.sin(drone.x * 0.015) * 0.5;
        drawPixelDrone(ctx, drone.x, drone.y, time);

        if (drone.x > canvas.width + 100) {
          drone.active = false;
          drone.timer = 0;
          drone.nextSpawn = 550 + Math.floor(Math.random() * 550);
        }
      }

      // 4. Pixel Pine Trees Forest Horizon
      const backForestColor = '#041c16';
      const frontForestColor = '#062c23';

      for (let x = 40; x < canvas.width; x += 90) {
        if (
          Math.abs(x - fireX) > 110 &&
          Math.abs(x - towerX) > 40
        ) {
          drawPixelPineTree(ctx, x, gY, 44, 90, backForestColor);
        }
      }
      for (let x = 80; x < canvas.width; x += 130) {
        if (
          Math.abs(x - fireX) > 120 &&
          Math.abs(x - towerX) > 45
        ) {
          drawPixelPineTree(ctx, x, gY, 56, 115, frontForestColor);
        }
      }

      // 🌲 5. Pine Tree on Left & Pixel Scout Tent on Right ⛺
      drawPixelPineTree(ctx, fireX - 85, gY, 54, 110, frontForestColor);
      drawPixelScoutTent(ctx, tentRightX, gY, 48, 36, '#064e3b', '#f59e0b');

      // 6. Pixel Campfire Bonfire
      drawPixelCampfire(ctx, fireX, gY, time);

      // 🗼 7. Pixel Scout Signal Radio Tower Grounded on Right Side 🗼
      drawPixelSignalTower(ctx, towerX, gY, time);

      // 8. Update & Render Rising Embers
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y += e.vy;
        e.x += e.vx + Math.sin(time * 0.005 + i) * 0.4;
        e.life++;

        if (e.life >= e.maxLife || e.y < gY - 300) {
          e.x = fireX + (Math.random() - 0.5) * 40;
          e.y = gY - 10;
          e.life = 0;
          e.vy = -Math.random() * 1.5 - 1.0;
        }

        const alpha = 1 - (e.life / e.maxLife);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = e.color;
        ctx.fillRect(Math.round(e.x), Math.round(e.y), Math.round(e.size), Math.round(e.size));
        ctx.restore();
      }
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ pointerEvents: 'none' }}
      className="fixed inset-0 z-0 h-full w-full overflow-hidden select-none"
    />
  );
});

export default ScoutCampfireScene;
