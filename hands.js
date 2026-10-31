// Fundo "dot-matrix" da seção Soluções: duas mãos se aproximando, desenhadas como
// meio-tom de pontos em linhas (estilo painel de LED), renderizadas em canvas a cada quadro.
(() => {
  const section = document.getElementById("solucoes");
  const canvas = document.getElementById("handsCanvas");
  if (!section || !canvas) return;

  const SHEET_URL = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_025250_100df7b8-31fd-4614-aa4a-c1b7d5b6b273.png&w=1600&q=85";

  // Recortes da folha 2×2 [x, y, w, h] em frações; pose A = apontando, pose B = mãos abertas
  const SRC = {
    LA: [0, .06, .47, .40],
    RA: [.53, .06, .47, .40],
    LB: [0, .55, .47, .40],
    RB: [.53, .55, .47, .40],
  };
  const LOOP = 20;
  const LEVELS = [0, .26, .52, .78, 1];
  const DOT_COLOR = "#0a0b0d";
  const HAND_ASPECT = (.40 * 1520) / (.47 * 2688);

  const ctx = canvas.getContext("2d");
  const fieldA = document.createElement("canvas");
  const fieldB = document.createElement("canvas");
  const gA = fieldA.getContext("2d", { willReadFrequently: true });
  const gB = fieldB.getContext("2d", { willReadFrequently: true });

  const fract = (x) => x - Math.floor(x);
  const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mixAt = (t, on, off, dur) => smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));

  let tiles = null;
  let W, H, DPR, step, rowStep, cols, rows, R, seeds, narrow, quiet, bandCy, bandH;

  function buildTiles(img) {
    tiles = {};
    for (const [key, [x, y, w, h]] of Object.entries(SRC)) {
      const sw = w * img.naturalWidth;
      const sh = h * img.naturalHeight;
      const tile = document.createElement("canvas");
      tile.width = 420;
      tile.height = Math.round(420 * sh / sw);
      const g = tile.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(img, x * img.naturalWidth, y * img.naturalHeight, sw, sh, 0, 0, tile.width, tile.height);
      tiles[key] = tile;
    }
  }

  function resize() {
    W = section.clientWidth;
    H = section.clientHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    narrow = W < 760;

    // Grade mais fina que a de um hero de tela cheia, porque as mãos ocupam só a faixa
    step = Math.max(4, W / 250);
    rowStep = step * 1.85;
    cols = Math.ceil(W / step);
    rows = Math.ceil(H / rowStep);
    R = step * .46;
    fieldA.width = fieldB.width = cols;
    fieldA.height = fieldB.height = rows;

    seeds = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) seeds[j * cols + i] = .55 * hash(i, j) + .45 * hash(j * 3.1, 7.7);
    }

    // Zona sem pontos atrás do título da seção
    const s = section.getBoundingClientRect();
    const h = section.querySelector(".section__head").getBoundingClientRect();
    quiet = { x0: h.left - s.left, y0: h.top - s.top, x1: h.right - s.left, y1: h.bottom - s.top };

    // As mãos ficam centralizadas na faixa livre entre o título e os cards
    const b = section.querySelector(".hands-band").getBoundingClientRect();
    bandCy = b.top - s.top + b.height / 2;
    bandH = b.height;
  }

  function drawPose(g, leftKey, rightKey, t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, cols, rows);

    const a = 2 * Math.PI * t / LOOP;
    const hw = Math.min(W * (narrow ? .62 : .53), bandH * .9 / HAND_ASPECT);
    const hh = hw * HAND_ASPECT;
    const cy = bandCy;

    for (const left of [true, false]) {
      const ph = left ? 0 : Math.PI;
      const reach = (.035 * Math.sin(a + ph) + .012 * Math.sin(2 * a + 1.3 + ph)) * W;
      const scale = 1 + .07 * Math.sin(a + .9 + ph);
      const rot = (left ? 1 : -1) * .045 * Math.sin(a + 2.1 + ph);
      const x = left ? reach - W * .045 : W - hw + W * .045 - reach;
      const pivotX = left ? 0 : W;

      g.setTransform(cols / W, 0, 0, rows / H, 0, 0);
      g.translate(pivotX, cy);
      g.rotate(rot);
      g.scale(scale, scale);
      g.translate(-pivotX, -cy);
      g.drawImage(tiles[left ? leftKey : rightKey], x, cy - hh / 2, hw, hh);
    }
    return g.getImageData(0, 0, cols, rows).data;
  }

  function render(t) {
    if (!tiles) return;
    t = ((t % LOOP) + LOOP) % LOOP;

    const dataA = drawPose(gA, "LA", "RA", t);
    const dataB = drawPose(gB, "LB", "RB", t);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DOT_COLOR;
    ctx.beginPath();

    const mL = mixAt(t, 6.2, 14.6, 1.6);
    const mR = mixAt(t, 2.4, 10.4, 1.6);
    const tick = Math.floor(t * 7);
    const pad = 48;

    for (let j = 0; j < rows; j++) {
      const shift = hash(j, tick) > .965 ? Math.round((hash(tick, j) - .5) * 8) : 0;
      const yc = (j + .5) * rowStep;

      for (let i = 0; i < cols; i++) {
        const seed = seeds[j * cols + i];
        const m = i < cols / 2 ? mL : mR;
        const si = Math.min(cols - 1, Math.max(0, i - shift));
        const data = seed < m ? dataB : dataA;
        let v = clamp01((1 - data[(j * cols + si) * 4] / 255 - .16) / .42);
        if (v <= 0) continue;

        // Frente da dissolução: pisca e afina enquanto a pose troca
        if (m > .001 && m < .999) {
          const d = Math.abs(seed - m);
          if (d < .12) {
            v *= d / .12;
            if (hash(i + tick, j) <= .4) v *= .3;
          }
        }

        v *= .86 + .14 * Math.sin(t * 3.2 + seed * 40);
        v *= smooth(.035, .11, Math.abs((i + .5) / cols - .5));

        const xc = (i + .5) * step;
        const dx = Math.max(quiet.x0 - xc, 0, xc - quiet.x1);
        const dy = Math.max(quiet.y0 - yc, 0, yc - quiet.y1);
        v *= smooth(0, pad, Math.hypot(dx, dy));

        let level = 0;
        for (let k = LEVELS.length - 1; k > 0; k--) {
          if (v >= LEVELS[k] - .13) { level = k; break; }
        }
        if (!level) continue;

        const r = level === 1 ? R * .38 : R * LEVELS[level];
        ctx.moveTo(xc + r, yc);
        ctx.arc(xc, yc, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
  window.__render = render;

  // Loop: só anima com a seção visível; com "reduzir movimento" desenha um quadro estático
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let visible = false;
  let rafId = 0;

  function frame(now) {
    render((now - t0) / 1000);
    rafId = visible ? requestAnimationFrame(frame) : 0;
  }

  function start() {
    if (reduceMotion) { render(0); return; }
    if (visible && !rafId) rafId = requestAnimationFrame(frame);
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    buildTiles(img);
    resize();
    start();
    if (!visible) render(0);
  };
  img.src = SHEET_URL;

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (tiles) start();
  }).observe(section);

  new ResizeObserver(() => {
    if (!tiles) return;
    resize();
    if (!rafId) render(0);
  }).observe(section);
})();
