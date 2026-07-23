(function () {
  'use strict';

  // Prevent multiple injections
  if (document.getElementById('pixel-robot-canvas-overlay')) return;

  // --- Extension State & Settings ---
  const settings = {
    enabled: true,
    speed: 0.08, // Lerp speed (0.04 slow, 0.08 normal, 0.15 fast)
    scale: 2.5,   // Pixel scale factor (32x32 -> 80x80)
    trailMode: 'cyan', // 'cyan', 'ember', 'rainbow'
    targetOffset: { x: 35, y: 35 }, // Floating offset relative to cursor
  };

  // Load user settings if available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['robotEnabled', 'robotSpeed', 'robotTrail'], (res) => {
      if (res.robotEnabled !== undefined) settings.enabled = res.robotEnabled;
      if (res.robotSpeed !== undefined) settings.speed = res.robotSpeed;
      if (res.robotTrail !== undefined) settings.trailMode = res.robotTrail;
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.robotEnabled) settings.enabled = changes.robotEnabled.newValue;
      if (changes.robotSpeed) settings.speed = changes.robotSpeed.newValue;
      if (changes.robotTrail) settings.trailMode = changes.robotTrail.newValue;
    });
  }

  // --- Canvas & Context Setup ---
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.id = 'pixel-robot-canvas-overlay';
  document.documentElement.appendChild(overlayCanvas);

  const ctx = overlayCanvas.getContext('2d');

  // Off-screen 32x32 pixel buffer for crisp pixel art rendering
  const bufferCanvas = document.createElement('canvas');
  bufferCanvas.width = 32;
  bufferCanvas.height = 32;
  const bCtx = bufferCanvas.getContext('2d');
  bCtx.imageSmoothingEnabled = false;

  function resizeCanvas() {
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // --- Mouse & Physics Variables ---
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const robot = {
    x: window.innerWidth / 2 + 50,
    y: window.innerHeight / 2 + 50,
    vx: 0,
    vy: 0,
    facingRight: true,
    isIdle: true,
    bobTimer: 0,
    blinkTimer: 0,
    isBlinking: false,
    hopY: 0,
    hopVy: 0,
    rotation: 0,
    reactionTextTimer: 0,
  };

  const particles = [];
  let lastTime = performance.now();

  // Mouse Listener
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Click Reaction Listener
  window.addEventListener('click', (e) => {
    if (!settings.enabled) return;

    // Check distance to robot
    const dx = e.clientX - robot.x;
    const dy = e.clientY - robot.y;
    const dist = Math.hypot(dx, dy);

    // If clicked near robot or clicked anywhere, trigger happy hop!
    if (dist < 120 || Math.random() < 0.3) {
      triggerHappyHop(e.clientX, e.clientY);
    }
  });

  function triggerHappyHop(clickX, clickY) {
    robot.hopVy = -8; // Jump velocity
    robot.reactionTextTimer = 60; // Show speech bubble for 60 frames

    // Burst of colorful star particles
    const colors = ['#00f3ff', '#ff2a6d', '#ffbe0b', '#00ff9d', '#ffffff', '#a55eea'];
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5);
      const speed = Math.random() * 4 + 2;
      particles.push({
        x: robot.x,
        y: robot.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: Math.random() * 30 + 20,
        sparkle: true,
      });
    }

    // Create floating DOM text badge
    createPopupBadge(clickX || robot.x, (clickY || robot.y) - 30);
  }

  function createPopupBadge(x, y) {
    const phrases = ['⚡ BEEP BOOP!', '✨ HELLO!', '🤖 ROBO-SYNC!', '💖 BEEP!', '🚀 HOVER!'];
    const text = phrases[Math.floor(Math.random() * phrases.length)];

    const badge = document.createElement('div');
    badge.className = 'pixel-robot-click-burst';
    badge.style.left = x + 'px';
    badge.style.top = y + 'px';
    badge.style.color = '#00f3ff';
    badge.style.textShadow = '0 0 8px #00f3ff, 2px 2px 0px #000';
    badge.style.fontSize = '14px';
    badge.innerText = text;

    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 1000);
  }

  // --- Programmatic Pixel Art Robot Drawing ---
  function drawPixelRobot(bCtx, time) {
    bCtx.clearRect(0, 0, 32, 32);

    // Color Palette
    const C = {
      outline: '#101820',
      metalLight: '#4a6572',
      metalMid: '#34495e',
      metalDark: '#232f3e',
      metalHighlight: '#6c8b99',
      visorBg: '#09151e',
      eyeCyan: '#00f3ff',
      eyeGlow: 'rgba(0,243,255,0.6)',
      chestLed: (Math.sin(time * 0.008) > 0) ? '#ff2a6d' : '#00ff9d',
      antennaLed: (Math.sin(time * 0.012) > 0) ? '#00f3ff' : '#ff2a6d',
      flame1: '#ff9f43',
      flame2: '#ff5252',
      flame3: '#ffbe0b',
    };

    // Helper to draw filled rectangle on pixel grid
    function rect(x, y, w, h, color) {
      bCtx.fillStyle = color;
      bCtx.fillRect(x, y, w, h);
    }

    // --- Antenna (Top) ---
    rect(15, 2, 2, 4, C.metalDark); // Shaft
    rect(14, 0, 4, 2, C.antennaLed); // Glowing Tip LED

    // --- Head (x: 8 to 23, y: 6 to 16) ---
    rect(7, 5, 18, 12, C.outline);       // Head Outline
    rect(8, 6, 16, 10, C.metalMid);       // Head Base
    rect(9, 6, 14, 2, C.metalHighlight);  // Top Highlight
    rect(8, 8, 2, 7, C.metalLight);       // Left Highlight

    // Visor Screen
    rect(10, 9, 12, 5, C.visorBg);

    // Blinking Eyes
    if (!robot.isBlinking) {
      rect(11, 10, 3, 3, C.eyeCyan); // Left Eye
      rect(18, 10, 3, 3, C.eyeCyan); // Right Eye
      // Eye Highlights
      rect(11, 10, 1, 1, '#ffffff');
      rect(18, 10, 1, 1, '#ffffff');
    } else {
      // Closed Eye Slits
      rect(11, 11, 3, 1, C.eyeCyan);
      rect(18, 11, 3, 1, C.eyeCyan);
    }

    // Ear Bolts
    rect(6, 9, 2, 4, C.metalDark);
    rect(24, 9, 2, 4, C.metalDark);

    // --- Neck ---
    rect(13, 16, 6, 2, C.metalDark);

    // --- Body / Torso (x: 7 to 24, y: 18 to 27) ---
    rect(6, 17, 20, 11, C.outline);      // Body Outline
    rect(7, 18, 18, 9, C.metalMid);       // Body Base
    rect(8, 18, 16, 2, C.metalHighlight); // Chest Highlight
    rect(7, 20, 2, 6, C.metalLight);      // Left Highlight

    // Chest Screen / Core Light
    rect(12, 20, 8, 5, C.visorBg);
    rect(14, 21, 4, 3, C.chestLed); // Pulsing Core
    rect(15, 22, 2, 1, '#ffffff');

    // --- Arms (Left & Right) ---
    const armBob = Math.sin(time * 0.01) * 1;
    // Left Arm
    rect(3, 19 + armBob, 4, 7, C.outline);
    rect(4, 20 + armBob, 2, 5, C.metalLight);
    // Right Arm
    rect(25, 19 - armBob, 4, 7, C.outline);
    rect(26, 20 - armBob, 2, 5, C.metalLight);

    // --- Jetpack Thruster Nozzles (Bottom) ---
    rect(9, 27, 4, 3, C.metalDark);  // Left Nozzle
    rect(19, 27, 4, 3, C.metalDark); // Right Nozzle

    // --- Thruster Flames (Animated when moving or hovering) ---
    const flameStep = Math.floor((time / 80) % 3);
    const isMovingFast = Math.hypot(robot.vx, robot.vy) > 1.5;
    const flameLength = isMovingFast ? 5 : 3;

    if (flameStep === 0) {
      rect(10, 30, 2, flameLength, C.flame1);
      rect(20, 30, 2, flameLength, C.flame1);
      rect(11, 30 + flameLength, 1, 2, C.flame3);
      rect(21, 30 + flameLength, 1, 2, C.flame3);
    } else if (flameStep === 1) {
      rect(9, 30, 4, flameLength + 1, C.flame2);
      rect(19, 30, 4, flameLength + 1, C.flame2);
      rect(10, 30 + flameLength, 2, 2, C.flame1);
      rect(20, 30 + flameLength, 2, 2, C.flame1);
    } else {
      rect(10, 30, 2, flameLength + 2, C.flame3);
      rect(20, 30, 2, flameLength + 2, C.flame3);
      rect(9, 30, 4, flameLength, C.flame1);
      rect(19, 30, 4, flameLength, C.flame1);
    }
  }

  // --- Main Animation Loop ---
  function animate(now) {
    requestAnimationFrame(animate);

    if (!settings.enabled) {
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      return;
    }

    const dt = Math.min(32, now - lastTime);
    lastTime = now;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // 1. Target Position Calculation (Mouse + Offset)
    const targetX = mouse.x + settings.targetOffset.x;
    const targetY = mouse.y + settings.targetOffset.y;

    // 2. Physics & Smooth Lerp Movement
    const prevX = robot.x;
    const prevY = robot.y;

    robot.x += (targetX - robot.x) * settings.speed;
    robot.y += (targetY - robot.y) * settings.speed;

    // Calculate Velocity
    robot.vx = robot.x - prevX;
    robot.vy = robot.y - prevY;
    const speed = Math.hypot(robot.vx, robot.vy);

    // Determine Facing Direction
    if (Math.abs(robot.vx) > 0.3) {
      robot.facingRight = robot.vx > 0;
    }

    // Determine Idle State & Bobbing
    robot.isIdle = speed < 0.4;
    robot.bobTimer += now * 0.001;
    const bobOffsetY = robot.isIdle ? Math.sin(now * 0.004) * 5 : 0;

    // Handle Hop Jump Animation
    if (robot.hopY !== 0 || robot.hopVy !== 0) {
      robot.hopY += robot.hopVy;
      robot.hopVy += 0.5; // Gravity
      if (robot.hopY >= 0) {
        robot.hopY = 0;
        robot.hopVy = 0;
      }
    }

    // Blink Logic
    robot.blinkTimer += dt;
    if (robot.blinkTimer > 3500) {
      robot.isBlinking = true;
      if (robot.blinkTimer > 3680) {
        robot.isBlinking = false;
        robot.blinkTimer = Math.random() * 1000;
      }
    }

    // 3. Spawn Particle Trail (Behind Thrusters)
    if (speed > 0.5 || Math.random() < 0.3) {
      const particleColors = {
        cyan: ['#00f3ff', '#0284c7', '#ffffff', '#7dd3fc'],
        ember: ['#ff9f43', '#ff5252', '#ffbe0b', '#ffffff'],
        rainbow: ['#00f3ff', '#ff2a6d', '#ffbe0b', '#00ff9d', '#a55eea'],
      }[settings.trailMode] || ['#00f3ff', '#ffffff'];

      const spawnCount = speed > 2 ? 2 : 1;
      for (let i = 0; i < spawnCount; i++) {
        particles.push({
          x: robot.x + (Math.random() - 0.5) * 12,
          y: robot.y + 25 + bobOffsetY,
          vx: -robot.vx * 0.2 + (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2 + 1,
          size: Math.random() * 3 + 2,
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
          life: 1,
          maxLife: Math.random() * 25 + 15,
        });
      }
    }

    // 4. Update & Render Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;
      const currentSize = Math.max(0.5, p.size * (1 - progress * 0.5));

      if (progress >= 1) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.sparkle ? 8 : 4;

      // Draw square pixel particle
      ctx.fillRect(
        Math.round(p.x - currentSize / 2),
        Math.round(p.y - currentSize / 2),
        Math.round(currentSize),
        Math.round(currentSize)
      );
      ctx.restore();
    }

    // 5. Render Pixel Robot
    drawPixelRobot(bCtx, now);

    ctx.save();
    const renderX = robot.x;
    const renderY = robot.y + bobOffsetY + robot.hopY;

    ctx.translate(renderX, renderY);

    // Flip Horizontally if facing left
    if (!robot.facingRight) {
      ctx.scale(-1, 1);
    }

    // Tilt slightly based on velocity X
    const tiltAngle = Math.max(-0.2, Math.min(0.2, robot.vx * 0.03));
    ctx.rotate(tiltAngle);

    // Draw scaled pixelated buffer canvas centered
    const scaledSize = 32 * settings.scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      bufferCanvas,
      -scaledSize / 2,
      -scaledSize / 2,
      scaledSize,
      scaledSize
    );

    ctx.restore();
  }

  // Start Animation Loop
  requestAnimationFrame(animate);

  console.log('[Pixel Robot Extension] Overlay Initialized Successfully! 🤖✨');
})();
