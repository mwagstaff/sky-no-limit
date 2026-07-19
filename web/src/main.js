import './styles.css';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- header ---------- */

const header = document.getElementById('site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const nav = document.querySelector('.site-nav');
const toggle = document.querySelector('.nav-toggle');
if (nav && toggle) {
  const close = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav-menu a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

/* ---------- scroll reveals ---------- */

const revealables = document.querySelectorAll('.reveal');
if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  revealables.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealables.forEach((el) => io.observe(el));
}

/* ---------- hero starfield ---------- */

const hero = document.querySelector('.hero');
const canvas = document.querySelector('.starfield');

if (hero && canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const STAR_TINTS = ['#cfe6fa', '#cfe6fa', '#cfe6fa', '#eef6ff', '#f6dfc0'];
  let stars = [];
  let glints = []; // brighter stars with diffraction spikes
  let meteors = [];
  let nextMeteorAt = 0;
  let lastT = 0;
  let w = 0;
  let h = 0;
  let raf = 0;
  let visible = true;

  const seed = () => {
    w = hero.clientWidth;
    h = hero.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // two depth layers: far (small, dim, slow) and near (bigger, brighter)
    const count = Math.round((w * h) / 8000);
    stars = Array.from({ length: count }, () => {
      const far = Math.random() < 0.6;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: far ? 0.35 + Math.random() * 0.6 : 0.7 + Math.random() * 1.1,
        a: far ? 0.12 + Math.random() * 0.35 : 0.3 + Math.random() * 0.55,
        tint: STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0],
        tw: 0.4 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
        vx: -(far ? 0.002 : 0.006) - Math.random() * (far ? 0.005 : 0.01),
        vy: (far ? 0.001 : 0.003) + Math.random() * 0.004,
      };
    });
    glints = Array.from({ length: Math.max(4, Math.round(w / 260)) }, () => ({
      // keep bright spiked stars clear of the hero copy (left/middle band)
      ...(Math.random() < 0.7
        ? { x: w * (0.55 + Math.random() * 0.45), y: Math.random() * h * 0.75 }
        : { x: Math.random() * w, y: Math.random() * h * 0.1 }),
      r: 1.1 + Math.random() * 0.9,
      tint: Math.random() < 0.25 ? '#f6dfc0' : '#e8f4ff',
      tw: 0.25 + Math.random() * 0.5,
      ph: Math.random() * Math.PI * 2,
    }));
    meteors = [];
    nextMeteorAt = performance.now() + 3500 + Math.random() * 4000;
  };

  const spawnMeteor = () => {
    const leftward = Math.random() < 0.65;
    const speed = 520 + Math.random() * 380; // px/s
    const angle = (28 + Math.random() * 22) * (Math.PI / 180);
    return {
      x: w * (leftward ? 0.35 + Math.random() * 0.6 : 0.05 + Math.random() * 0.5),
      y: h * (0.02 + Math.random() * 0.4),
      dx: Math.cos(angle) * (leftward ? -1 : 1) * speed,
      dy: Math.sin(angle) * speed,
      len: 90 + Math.random() * 90,
      life: 0,
      ttl: 0.9 + Math.random() * 0.6, // seconds
      warm: Math.random() < 0.3,
    };
  };

  const draw = (t, dt) => {
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(s.ph + t * 0.001 * s.tw));
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -2) s.x = w + 2;
      if (s.y > h + 2) s.y = -2;
    }

    // bright stars: slow deep twinkle with four-point diffraction spikes
    for (const g of glints) {
      const p = 0.5 + 0.5 * Math.sin(g.ph + t * 0.001 * g.tw);
      const alpha = 0.35 + 0.6 * p;
      const spike = g.r * (2.5 + 5 * p);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g.tint;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = g.tint;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(g.x - spike, g.y);
      ctx.lineTo(g.x + spike, g.y);
      ctx.moveTo(g.x, g.y - spike);
      ctx.lineTo(g.x, g.y + spike);
      ctx.stroke();
    }

    // shooting comets: rare, fast, fading tails
    if (dt > 0) {
      if (t >= nextMeteorAt && meteors.length < 2) {
        meteors.push(spawnMeteor());
        nextMeteorAt = t + 4500 + Math.random() * 6500;
      }
      for (const m of meteors) {
        m.life += dt;
        m.x += m.dx * dt;
        m.y += m.dy * dt;
        const fade = Math.sin(Math.min(1, m.life / m.ttl) * Math.PI); // in-out
        const ux = m.dx, uy = m.dy;
        const mag = Math.hypot(ux, uy) || 1;
        const tx = m.x - (ux / mag) * m.len;
        const ty = m.y - (uy / mag) * m.len;
        const tint = m.warm ? '246, 178, 107' : '217, 239, 255';
        const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, `rgba(${tint}, ${0.9 * fade})`);
        grad.addColorStop(1, `rgba(${tint}, 0)`);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      meteors = meteors.filter(
        (m) => m.life < m.ttl && m.x > -m.len && m.x < w + m.len && m.y < h + m.len
      );
    }
    ctx.globalAlpha = 1;
  };

  const loop = (t) => {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    draw(t, dt);
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!raf && visible && !reducedMotion.matches) raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  seed();
  if (reducedMotion.matches) {
    draw(0, 0); // static sky
  } else {
    start();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      seed();
      if (reducedMotion.matches) draw(0, 0);
    }, 150);
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(hero);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      stop();
      draw(0, 0);
      document.querySelector('.orbital')?.pauseAnimations?.();
    } else {
      document.querySelector('.orbital')?.unpauseAnimations?.();
      start();
    }
  });

  /* ---------- cursor parallax (fine pointers only) ---------- */

  const layers = [...document.querySelectorAll('.px-layer')];
  const finePointer = window.matchMedia('(pointer: fine)');
  if (layers.length && finePointer.matches) {
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let pxRaf = 0;

    const apply = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth || 5);
        layer.style.transform = `translate(${(cx * depth).toFixed(2)}px, ${(cy * depth).toFixed(2)}px)`;
      }
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        pxRaf = requestAnimationFrame(apply);
      } else {
        pxRaf = 0;
      }
    };

    hero.addEventListener('pointermove', (e) => {
      if (reducedMotion.matches) return;
      const rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * -1;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * -1;
      if (!pxRaf) pxRaf = requestAnimationFrame(apply);
    });
  }
}

/* ---------- SMIL pause for reduced motion ---------- */

if (reducedMotion.matches) {
  document.querySelector('.orbital')?.pauseAnimations?.();
}
