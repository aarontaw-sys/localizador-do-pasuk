/* Cartão "Meu passuk da Amidá": renderizador em canvas (A4 paisagem, 2546 × 1800).
   Camadas: base (fundo e painéis) → enfeites do aluno → textos. A prévia do editor e os
   arquivos exportados usam a mesma função compose(), por isso mostram o mesmo cartão. */
window.Card = (() => {
const W = 2546, H = 1800;

/* ---------- utilidades de texto e desenho ---------- */
function lines(ctx, text, width) { let a = [], line = ''; for (const w of text.split(/\s+/)) { let t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > width && line) { a.push(line); line = w } else line = t } if (line) a.push(line); return a }
// quebra equilibrada: mesma quantidade de linhas, com larguras parecidas
function balanced(ctx, text, width) { const first = lines(ctx, text, width); if (first.length < 2) return first; let lo = width * .4, hi = width; while (hi - lo > 4) { const mid = (lo + hi) / 2; if (lines(ctx, text, mid).length <= first.length) hi = mid; else lo = mid } return lines(ctx, text, hi) }
function rounded(x, l, t, w, h, r, fill, stroke, lw) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); if (fill) { x.fillStyle = fill; x.fill() } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 3; x.stroke() } }
function poly(x, p, fill, stroke, lw) { x.beginPath(); p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); if (fill) { x.fillStyle = fill; x.fill() } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 3; x.lineJoin = 'round'; x.stroke() } }
function circle(x, cx, cy, r, fill, stroke, lw) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); if (fill) { x.fillStyle = fill; x.fill() } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 3; x.stroke() } }
function rng(seed) { return () => (seed = (seed * 9301 + 49297) % 233280) / 233280 }

/* ---------- cores ---------- */
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) };
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)) };
const lum = h => { const [r, g, b] = hex(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }); return .2126 * r + .7152 * g + .0722 * b };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
function ensure(fg, bg, min) { if (contrast(fg, bg) >= min) return fg; const target = lum(bg) > .3 ? '#000000' : '#ffffff'; for (let t = .05; t < 1; t += .05) { const c = mix(fg, target, t); if (contrast(c, bg) >= min) return c } return target }
const best = (bg, a, b) => contrast(a, bg) >= contrast(b, bg) ? a : b;

const PALETTES = {
  classico: { name: 'Noite e ouro', bg: '#f1f8f8', band: '#163e54', accent: '#138c91', accent2: '#ce9324', fixed: { card: '#fffaf0', badge: '#ffd368', onBand2: '#aee3df', line: '#c7dedf', soft1: '#e7f6f5', soft2: '#fff2d2', ink: '#153e53', pt: '#35515e', muted: '#567580', muted2: '#35606d', divider: '#ffd36b' } },
  ceu: { name: 'Céu de Jerusalém', bg: '#fdf3e1', band: '#1f4e79', accent: '#2a8fbd', accent2: '#e08e2b' },
  terra: { name: 'Pergaminho', bg: '#f6ead2', band: '#5c3a1a', accent: '#b5651d', accent2: '#2e6b4f' },
  oliveira: { name: 'Oliveira', bg: '#eef5e6', band: '#2f5d3a', accent: '#6d9a3a', accent2: '#c98f2a' },
  roma: { name: 'Romã', bg: '#fbeef0', band: '#7a1f3d', accent: '#d8434f', accent2: '#e8b54a' },
  lavanda: { name: 'Lavanda', bg: '#f1eefb', band: '#3d2f6b', accent: '#7b61c9', accent2: '#e3a33b' },
  oceano: { name: 'Oceano', bg: '#e8f7f8', band: '#0d4d63', accent: '#12a3a8', accent2: '#f08a4b' },
  sol: { name: 'Pôr do sol', bg: '#fff1e3', band: '#8a3b12', accent: '#ef7d32', accent2: '#2a7f9e' }
};

/* ---------- fontes (os nomes são declarados em style.css) ---------- */
const TITLE_FONTS = [
  { id: 'fredoka', label: 'Fredoka', f: '600 {}px "CardDisplay"', k: 1 },
  { id: 'rubik', label: 'Rubik', f: '{}px "T-Rubik"', k: .96 },
  { id: 'varela', label: 'Varela Round', f: '{}px "T-Varela"', k: 1 },
  { id: 'heebo', label: 'Heebo', f: '{}px "T-Heebo"', k: .98 },
  { id: 'suez', label: 'Suez One', f: '{}px "T-Suez"', k: .94 },
  { id: 'doodle', label: 'Rubik Doodle', f: '{}px "T-Doodle"', k: .92 },
  { id: 'bubbles', label: 'Rubik Bubbles', f: '{}px "T-Bubbles"', k: .92 },
  { id: 'karantina', label: 'Karantina', f: '{}px "T-Karantina"', k: 1.25 },
  { id: 'amatic', label: 'Amatic SC', f: '{}px "T-Amatic"', k: 1.3 },
  { id: 'bellefair', label: 'Bellefair', f: '{}px "T-Bellefair"', k: 1.04 },
  { id: 'david', label: 'David Libre', f: '{}px "CardHebrew"', k: 1.02 }
];
const PASUK_FONTS = [
  { id: 'david', label: 'David Libre', f: '{}px "CardHebrew"', k: 1, lh: 1.62 },
  { id: 'frank', label: 'Frank Ruhl Libre', f: '{}px "P-Frank"', k: .98, lh: 1.62 },
  { id: 'notoserif', label: 'Noto Serif Hebrew', f: '{}px "P-NotoSerif"', k: .9, lh: 1.7 },
  { id: 'notosans', label: 'Noto Sans Hebrew', f: '{}px "P-NotoSans"', k: .9, lh: 1.7 }
];
const PT_SCALES = [.82, 1, 1.18, 1.36, 1.55];
const byId = (list, id) => list.find(f => f.id === id) || list[0];
const font = (def, size) => def.f.replace('{}', Math.round(size * def.k));
const TEXT = s => s + 'px "CardText"', BOLD = s => 'bold ' + s + 'px "CardText"';

/* ---------- paleta final de um modelo, com proteção de contraste ---------- */
function colors(design, tpl) {
  const base = design.palette === 'custom' ? Object.assign({}, PALETTES[tpl.palette], design.custom) : PALETTES[design.palette || tpl.palette] || PALETTES.classico;
  const P = { bg: base.bg, band: base.band, accent: base.accent, accent2: base.accent2 };
  P.card = mix(P.bg, '#ffffff', .78); P.panel = '#ffffff';
  P.badge = mix(P.accent2, '#ffffff', .35); P.onBand = best(P.band, '#ffffff', '#10202b');
  P.onBand2 = contrast(mix(P.accent, '#ffffff', .65), P.band) >= 3 ? mix(P.accent, '#ffffff', .65) : P.onBand;
  P.line = mix(P.accent, '#ffffff', .72); P.soft1 = mix(P.accent, '#ffffff', .88); P.soft2 = mix(P.accent2, '#ffffff', .84);
  P.divider = mix(P.accent2, '#ffffff', .3);
  if (design.palette !== 'custom' && base.fixed) Object.assign(P, base.fixed);
  P.paper = tpl.paper ? tpl.paper(P) : P.panel;
  const guard = (fg, min) => ensure(fg, P.paper, min);
  P.ink = guard(P.ink || mix(P.band, '#000000', .12), 7);
  P.pt = guard(P.pt || mix(P.band, '#5a6a73', .3), 4.5);
  P.acc1 = guard(P.accent, 4.5); P.acc2 = guard(P.accent2, 4.5);
  P.muted = ensure(P.muted || mix(P.ink, '#ffffff', .3), P.card, 4.5);
  P.muted2 = guard(P.muted2 || mix(P.ink, '#ffffff', .2), 4.5);
  P.notes = [];
  if (design.ptColor) { const c = guard(design.ptColor, 4.5); if (c !== design.ptColor.toLowerCase()) P.notes.push('A cor da tradução foi escurecida um pouco para ficar fácil de ler.'); P.pt = c }
  if (design.palette === 'custom' && contrast(design.custom.band, P.paper) < 7) P.notes.push('O passuk usa uma versão mais escura da cor principal para ficar bem legível.');
  return P;
}

/* ---------- desenho de texto com registro das áreas protegidas ---------- */
function measure(x, s) { const m = x.measureText(s); return { w: m.width, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent } }
function protect(c, l, t, w, h, pad = 18) { c.protect.push({ x: l - pad, y: t - pad, w: w + pad * 2, h: h + pad * 2 }) }
function text(c, s, x, y, o) {
  const t = c.t; t.font = o.font; t.fillStyle = o.color; t.textAlign = o.align || 'center'; t.direction = o.rtl ? 'rtl' : 'ltr'; t.fillText(s, x, y);
  const m = measure(t, s), size = o.size || 40, a = isFinite(m.a) && m.a ? m.a : size * .95, d = isFinite(m.d) ? Math.max(m.d, o.rtl ? size * .32 : 0) : size * .4;
  const left = t.textAlign === 'center' ? x - m.w / 2 : t.textAlign === 'left' ? x : x - m.w;
  if (!o.free) protect(c, left, y - a, m.w, a + d);
  return m.w;
}
function fitFont(x, s, def, size, max, min) { for (; ; size -= 2) { x.font = def(size); if (x.measureText(s).width <= max || size <= min) return size } }

/* ---------- nome, letras e versículo ---------- */
function lettersLine(c, cx, y, name, color, accent) {
  const p = Pasuk.letters(name), t = c.t, pf = byId(PASUK_FONTS, c.design.pasukFont);
  const parts = [['Primeira ', TEXT(26), c.P.muted2], [p[0], font(pf, 44), accent], ['   ·   Última ', TEXT(26), c.P.muted2], [p.at(-1), font(pf, 44), accent]];
  let total = 0; parts.forEach(q => { t.font = q[1]; q.w = t.measureText(q[0]).width; total += q.w });
  let x = cx - total / 2; t.textAlign = 'left'; t.direction = 'ltr';
  for (const q of parts) { t.font = q[1]; t.fillStyle = q[2]; t.fillText(q[0], x, y); x += q.w }
  protect(c, cx - total / 2, y - 44, total, 60);
}
// variante "row": rótulo à esquerda, nome no centro, letras à direita (cartão original)
function nameRow(c, e, i, b, accent) {
  const t = c.t, tf = byId(TITLE_FONTS, c.design.titleFont), cx = b.x + b.w / 2, p = Pasuk.letters(e.name), pf = byId(PASUK_FONTS, c.design.pasukFont);
  text(c, c.n === 2 ? 'NOME ' + (i + 1) : 'MEU NOME', b.x + 29, b.y + 42, { font: BOLD(23), color: accent, align: 'left', size: 23 });
  const size = fitFont(t, e.name, s => font(tf, s), 70, b.w - 410, 36);
  text(c, e.name, cx, b.y + 93, { font: font(tf, size), color: c.P.ink, rtl: true, size });
  text(c, 'Primeira / última', b.x + b.w - 31, b.y + 42, { font: TEXT(22), color: c.P.muted2, align: 'right', size: 22 });
  text(c, p[0], b.x + b.w - 166, b.y + 98, { font: font(pf, 43), color: accent, size: 43 });
  text(c, '/', b.x + b.w - 109, b.y + 98, { font: TEXT(27), color: accent, size: 27 });
  text(c, p.at(-1), b.x + b.w - 52, b.y + 98, { font: font(pf, 43), color: accent, size: 43 });
}
// variante "stack": rótulo, nome e letras centralizados (altura 190)
function nameStack(c, e, i, b, accent, o = {}) {
  const t = c.t, tf = byId(TITLE_FONTS, c.design.titleFont), cx = b.x + b.w / 2;
  if (!o.noLabel) text(c, c.n === 2 ? 'NOME ' + (i + 1) : 'MEU NOME', cx, b.y + 30, { font: BOLD(23), color: accent, size: 23 });
  const size = fitFont(t, e.name, s => font(tf, s), o.size || 74, b.w - (o.side || 120), 36);
  text(c, e.name, cx, b.y + 112, { font: font(tf, size), color: o.nameColor || c.P.ink, rtl: true, size });
  if (o.flourish) { t.strokeStyle = o.flourish; t.lineWidth = 4; const w = t.measureText(e.name).width / 2 + 40; for (const s of [-1, 1]) { t.beginPath(); t.moveTo(cx + s * w, b.y + 80); t.lineTo(cx + s * (w + 120), b.y + 80); t.stroke(); c.t.fillStyle = o.flourish; t.beginPath(); t.arc(cx + s * (w + 134), b.y + 80, 8, 0, 7); t.fill() } }
  lettersLine(c, cx, b.y + 172, e.name, c.P.muted2, accent);
}
// encaixe: reduz o hebraico até um limite confortável, depois a tradução, sem cortar texto
function fit(c, e, w, h, o) {
  const x = c.t, pf = byId(PASUK_FONTS, c.design.pasukFont), he = Pasuk.divine(e.v.he), want = Math.round(o.pt * PT_SCALES[c.design.ptScale ?? 1]);
  let size = o.he, pt = want, m;
  const run = () => { x.font = font(pf, size); const hl = lines(x, he, w); x.font = TEXT(pt); const pl = o.ptW === 0 ? [] : lines(x, e.v.translation, o.ptW || w); m = { hl, pl, total: hl.length * size * pf.lh + (o.gap ?? 120) + pl.length * pt * 1.45 }; return m.total > h };
  run();
  while (run() && size > o.comfort) size -= 2;
  while (run() && pt > o.ptMin) pt -= 1;
  while (run() && size > o.heMin) size -= 2;
  while (run() && size > 34) { size -= 2; if (pt > 22) pt-- }
  x.font = font(pf, size); m.hl = balanced(x, he, w); if (o.ptW !== 0) { x.font = TEXT(pt); m.pl = balanced(x, e.v.translation, o.ptW || w) }
  return { size, pt, he: m.hl, pt_lines: m.pl, total: m.total, maxH: h, ptReduced: pt < want, fits: m.total <= h, pf };
}
function drawHebrew(c, f, cx, y, w) { const lh = f.size * f.pf.lh; let maxW = 0; c.t.font = font(f.pf, f.size); for (const l of f.he) { maxW = Math.max(maxW, text(c, l, cx, y + f.size, { font: font(f.pf, f.size), color: c.P.ink, rtl: true, size: f.size, free: true })); y += lh } return { y, maxW } }
function drawTranslation(c, f, cx, y, lines_, size) { let maxW = 0; for (const l of lines_) { maxW = Math.max(maxW, text(c, l, cx, y, { font: TEXT(size), color: c.P.pt, size, free: true })); y += size * 1.45 } return { y, maxW } }
function verse(c, e, f, cx, top, accent, o = {}) {
  let y = top + Math.max(0, (f.maxH - f.total) / 2), y0 = y;
  const h = drawHebrew(c, f, cx, y); y = h.y;
  const ref = `${e.v.book} ${e.v.chapter}:${e.v.verse}`;
  const rw = text(c, ref, cx, y + 28, { font: BOLD(28), color: accent, size: 28, free: true }); y += 70;
  c.t.fillStyle = o.divider || c.P.divider; c.t.fillRect(cx - 50, y, 100, 5); y += 49;
  const tr = drawTranslation(c, f, cx, y, f.pt_lines, f.pt);
  const mw = Math.max(h.maxW, rw, tr.maxW); protect(c, cx - mw / 2, y0, mw, tr.y - 1.1 * f.pt - y0);
  c.ptReduced = c.ptReduced || f.ptReduced;
}
function footer(c, cx, y1, y2, y3, color, muted) {
  text(c, 'Na Amidá: recite antes do último “Yihyu leratzon”.', cx, y1, { font: BOLD(29), color, size: 29 });
  text(c, 'Guarde seu cartão com respeito. Pergunte ao professor sobre guenizá.', cx, y2, { font: TEXT(25), color, size: 25 });
  text(c, 'Localizador do Pasuk  •  Hebraico: Wikisource (CC BY-SA 4.0)  •  Tradução própria e simplificada', cx, y3, { font: TEXT(22), color: muted, size: 22 });
}
function title(c, x, y, size, color, align = 'left', maxW = 1700) {
  const tf = byId(TITLE_FONTS, c.design.titleFont), s = fitFont(c.t, 'Meu passuk da Amidá', v => font(tf, v), size, maxW, 50);
  text(c, 'Meu passuk da Amidá', x, y, { font: font(tf, s), color, align, size: s });
}

/* ---------- texturas e pequenos desenhos ---------- */
const TEX = {};
function loadTextures(base = 'textures/') { return Promise.all(['paper', 'blotch', 'grain', 'stone'].map(n => TEX[n] ? 0 : new Promise(res => { const i = new Image(); i.onload = () => { TEX[n] = i; res() }; i.onerror = res; i.src = base + n + '.png' }))) }
// aplica uma textura em tons de cinza sobre a área recortada atual
function tex(x, name, alpha, scale = 1, mode = 'multiply') { const img = TEX[name]; if (!img) return; const p = x.createPattern(img, 'repeat'); if (scale !== 1 && p.setTransform) p.setTransform(new DOMMatrix().scale(scale)); x.save(); x.globalAlpha = alpha; x.globalCompositeOperation = mode; x.fillStyle = p; x.fillRect(0, 0, W, H); x.restore() }
function clipped(x, path, fn) { x.save(); x.beginPath(); path(x); x.clip(); fn(); x.restore() }
const rr = (l, t, w, h, r) => x => { x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath() };
function shadowed(x, color, blur, ox, oy, fn) { x.save(); x.shadowColor = color; x.shadowBlur = blur; x.shadowOffsetX = ox; x.shadowOffsetY = oy; fn(); x.restore() }
function grad(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g }
function hexagram(x, cx, cy, r, fill, stroke, lw) { const tri = a => { x.beginPath(); for (let k = 0; k < 3; k++) { const t = (a + 120 * k) * Math.PI / 180, px = cx + r * Math.cos(t), py = cy + r * Math.sin(t); k ? x.lineTo(px, py) : x.moveTo(px, py) } x.closePath() }; for (const a of [-90, 90]) { tri(a); if (fill) { x.fillStyle = fill; x.fill() } } if (stroke) for (const a of [-90, 90]) { tri(a); x.strokeStyle = stroke; x.lineWidth = lw || 3; x.lineJoin = 'round'; x.stroke() } }
function tape(x, cx, cy, w, h, rot, color = '#efe2bd') { x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = .82; x.fillStyle = color; x.beginPath(); x.moveTo(-w / 2, -h / 2); for (let i = 1; i <= 8; i++) x.lineTo(-w / 2 + (i % 2 ? 7 : 0), -h / 2 + i * h / 8); for (let i = 7; i >= 0; i--) x.lineTo(w / 2 - (i % 2 ? 7 : 0), -h / 2 + i * h / 8); x.closePath(); x.fill(); x.globalAlpha = .25; x.fillStyle = '#ffffff'; x.fillRect(-w / 2 + 10, -h / 2 + 6, w - 20, h * .25); x.restore() }
function wood(x, l, t, w, h, base, r = 0, vertical = false) { clipped(x, rr(l, t, w, h, r), () => { x.fillStyle = base; x.fillRect(l, t, w, h); if (vertical) { x.save(); x.translate(l + w / 2, t + h / 2); x.rotate(Math.PI / 2); x.translate(-(l + w / 2), -(t + h / 2)); tex(x, 'grain', .55, 1.4); x.restore() } else tex(x, 'grain', .55, 1.4); x.fillStyle = grad(x, 0, t, 0, t + h, [[0, '#ffffff22'], [.5, '#ffffff00'], [1, '#00000026']]); x.fillRect(l, t, w, h) }) }
function fingerprint(x, cx, cy, r, color) { x.save(); x.strokeStyle = color; x.lineWidth = 3; for (let k = 1; k <= 8; k++) { x.beginPath(); x.ellipse(cx, cy, r * k / 8, r * k / 6.2, .25, Math.PI * (.05 + k * .03), Math.PI * (1.85 - k * .02)); x.stroke() } x.restore() }
function archPath(l, t, w, h, rad) { return x => { x.moveTo(l, t + h); x.lineTo(l, t + rad); x.ellipse(l + w / 2, t + rad, w / 2, rad, 0, Math.PI, 0); x.lineTo(l + w, t + h); x.closePath() } }

/* ---------- os cinco modelos ---------- */
const TEMPLATES = {
  /* 1. Detetive: a base do cartão original, agora como pasta de investigação */
  detetive: {
    name: 'Detetive', palette: 'classico', titleFont: 'fredoka',
    spots: n => [[175, 1705, 0], [1273, 1712, 0], [2380, 1450, 0], [1790, 360, 0]],
    draw(c, entries, art) {
      const { b, P } = c, kraft = mix('#dcb97f', P.accent2, .15), kraft2 = mix(kraft, '#5a3c14', .28);
      b.fillStyle = mix(P.bg, P.band, .1); b.fillRect(0, 0, W, H); tex(b, 'blotch', .3, 2); tex(b, 'paper', .7);
      // pasta de arquivo com uma folha por trás
      shadowed(b, '#00000040', 26, 0, 10, () => { b.save(); b.translate(1273, 900); b.rotate(-.006); rounded(b, -1243, -862, 2486, 1730, 30, kraft2); b.restore() });
      shadowed(b, '#00000033', 18, 0, 6, () => rounded(b, 28, 28, 2490, 1744, 30, kraft));
      clipped(b, rr(28, 28, 2490, 1744, 30), () => { tex(b, 'blotch', .55, 1.3); tex(b, 'paper', .9); b.strokeStyle = '#00000014'; b.lineWidth = 2; for (let y = 60; y < H; y += 7) { b.beginPath(); b.moveTo(28, y); b.lineTo(2518, y + 3); b.stroke() } });
      // faixa azul do título
      clipped(b, rr(58, 58, 2430, 286, 35), () => { b.fillStyle = P.band; b.fillRect(58, 58, 2430, 286); b.strokeStyle = '#ffffff0d'; b.lineWidth = 14; for (let k = -300; k < 2600; k += 42) { b.beginPath(); b.moveTo(k, 58); b.lineTo(k + 286, 344); b.stroke() } tex(b, 'paper', .35) });
      b.save(); b.setLineDash([16, 12]); b.strokeStyle = mix(P.accent2, '#ffffff', .25); b.lineWidth = 3; rounded(b, 74, 74, 2398, 254, 26, null, b.strokeStyle, 3); b.restore();
      rounded(b, 104, 87, 480, 47, 23, P.badge);
      text(c, 'LOCALIZADOR DO PASUK', 129, 119, { font: BOLD(24), color: ensure(P.band, P.badge, 4.5), align: 'left', size: 24 });
      title(c, 100, 231, 87, P.onBand, 'left', 1720);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 105, 294, { font: TEXT(32), color: P.onBand2, align: 'left', size: 32 });
      // foto do detetive presa com fita
      if (art) { const aw = art.naturalWidth || art.width, ah = art.naturalHeight || art.height; b.save(); b.translate(2170, 214); b.rotate(.035); shadowed(b, '#00000055', 22, 4, 10, () => { b.fillStyle = '#fbfaf5'; b.fillRect(-300, -150, 600, 318) }); const sw = aw, sh = aw * 282 / 564; b.drawImage(art, 0, Math.max(0, (ah - sh) / 2), sw, sh, -282, -132, 564, 262); b.restore(); tape(b, 2170, 64, 170, 44, -.05) }
      const n = entries.length, w = n === 2 ? 1164 : 2384;
      entries.forEach((e, i) => {
        const left = 80 + i * 1222, top = 390, cx = left + w / 2, accent = i ? P.acc2 : P.acc1, textW = n === 2 ? w - 126 : 1970;
        shadowed(b, '#0000002e', 20, 0, 8, () => rounded(b, left, top, w, 1110, 18, P.panel));
        clipped(b, rr(left, top, w, 1110, 18), () => { b.strokeStyle = mix(P.line, '#ffffff', .35); b.lineWidth = 2; for (let y = top + 236; y < top + 1090; y += 58) { b.beginPath(); b.moveTo(left, y); b.lineTo(left + w, y); b.stroke() } b.strokeStyle = '#e8a0a0'; b.beginPath(); b.moveTo(left + 18, top); b.lineTo(left + 18, top + 1110); b.stroke(); tex(b, 'paper', .35) });
        rounded(b, left + 24, top + 24, w - 48, 158, 20, i ? P.soft2 : P.soft1);
        tape(b, left + 60, top + 8, 150, 42, -.45); tape(b, left + w - 60, top + 8, 150, 42, .45);
        nameRow(c, e, i, { x: left + 24, y: top + 24, w: w - 48 }, accent);
        const f = fit(c, e, textW, 820, { he: n === 2 ? 94 : 114, comfort: 52, heMin: 52, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 212, accent);
        c.blocks.push(f);
      });
      // etiqueta do rodapé, carimbo e pistas
      shadowed(b, '#00000026', 10, 0, 4, () => rounded(b, 80, 1532, 2384, 114, 16, '#fffdf6'));
      b.save(); b.setLineDash([12, 9]); rounded(b, 92, 1544, 2360, 90, 12, null, mix(P.line, P.band, .3), 3); b.restore();
      b.save(); b.translate(2235, 1690); b.rotate(-.13); b.globalAlpha = .82; const red = '#c0392b'; rounded(b, -200, -50, 400, 100, 14, null, red, 7); rounded(b, -186, -37, 372, 74, 9, null, red, 3); b.fillStyle = red; b.font = 'bold 44px "CardText"'; b.textAlign = 'center'; b.fillText('CASO RESOLVIDO', 0, 16); b.restore();
      fingerprint(b, 180, 1705, 48, mix(kraft2, '#3a2508', .3) + '88');
      footer(c, 1273, 1579, 1621, 1694, P.ink, ensure(P.muted, kraft, 4.5));
    }
  },

  /* 2. Jerusalém: pôr do sol, muralha de pedra e janelas em arco */
  jerusalem: {
    name: 'Jerusalém', palette: 'ceu', titleFont: 'suez',
    paper: P => mix(P.bg, '#fffaf0', .82),
    spots: n => [[110, 380, 0], [2436, 380, 0], [430, 1720, 0], [2116, 1720, 0]],
    draw(c, entries) {
      const { b, P } = c, sky1 = mix(P.band, '#ffffff', .42), sky2 = mix(P.accent2, '#ffffff', .5), hor = mix('#ffd29a', P.accent2, .2);
      b.fillStyle = grad(b, 0, 0, 0, 1450, [[0, sky1], [.55, sky2], [1, hor]]); b.fillRect(0, 0, W, H);
      let g = b.createRadialGradient(2080, 330, 30, 2080, 330, 620); g.addColorStop(0, '#fff7dccc'); g.addColorStop(.3, mix('#ffe0a0', P.accent2, .2) + '88'); g.addColorStop(1, '#ffe0a000'); b.fillStyle = g; b.fillRect(0, 0, W, 1300);
      circle(b, 2080, 330, 115, '#fff3cf');
      // nuvens e pássaros
      for (const [x, y, s] of [[260, 170, 1], [700, 300, .7], [1650, 150, .8], [2350, 560, .6], [1180, 90, .55]]) { b.fillStyle = '#ffffff4d'; for (const [dx, dy, rx, ry] of [[0, 0, 160, 34], [90, -22, 110, 36], [-90, -12, 100, 28], [40, 14, 170, 26]]) { b.beginPath(); b.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, 7); b.fill() } }
      b.strokeStyle = mix(P.band, '#000000', .3) + 'aa'; b.lineWidth = 5; b.lineCap = 'round';
      for (const [x, y, s] of [[480, 240, 1], [540, 280, .8], [1830, 470, .9], [1890, 430, .7], [300, 330, .6]]) { b.beginPath(); b.moveTo(x - 26 * s, y - 8 * s); b.quadraticCurveTo(x - 12 * s, y - 20 * s, x, y); b.quadraticCurveTo(x + 12 * s, y - 20 * s, x + 26 * s, y - 8 * s); b.stroke() }
      // colinas e cidade ao longe
      const hill = (y, color, amp, seed) => { const r = rng(seed); b.fillStyle = color; b.beginPath(); b.moveTo(0, H); b.lineTo(0, y); for (let x = 0; x <= W; x += 160) b.quadraticCurveTo(x + 80, y - amp * r(), x + 160, y - amp * .4 + amp * .8 * r()); b.lineTo(W, H); b.fill() };
      hill(1060, mix(P.band, sky2, .6) + 'aa', 90, 3); hill(1150, mix(P.accent2, '#9b7a4a', .45) + 'cc', 70, 9);
      const far = mix(P.band, hor, .5), r = rng(21);
      b.fillStyle = far; for (let x = 0; x < W; x += 70 + r() * 60) { const h = 60 + r() * 120, w = 60 + r() * 70; b.fillRect(x, 1250 - h, w, h + 300); if (r() > .7) { b.beginPath(); b.ellipse(x + w / 2, 1250 - h, w / 2.2, w / 2.2, 0, Math.PI, 0); b.fill() } }
      // torres em pedra dos dois lados
      const stone = mix('#ead2a0', P.accent2, .12), stone2 = mix(stone, '#7a5a2a', .3), ol = mix(P.band, '#000000', .35);
      const block = (l, t, w, h) => { clipped(b, x => x.rect(l, t, w, h), () => { b.fillStyle = stone; b.fillRect(l, t, w, h); tex(b, 'stone', .55); b.strokeStyle = stone2; b.lineWidth = 3; for (let y = t + 46, k = 0; y < t + h; y += 46, k++) { b.beginPath(); b.moveTo(l, y); b.lineTo(l + w, y); b.stroke(); for (let x = l + (k % 2 ? 40 : 0); x < l + w; x += 80) { b.beginPath(); b.moveTo(x, y); b.lineTo(x, y + 46); b.stroke() } } }); b.strokeStyle = ol; b.lineWidth = 6; b.strokeRect(l, t, w, h) };
      const crenel = (l, t, w) => { for (let x = l; x < l + w - 10; x += 52) block(x, t - 34, 30, 36) };
      block(40, 760, 250, 700); crenel(40, 760, 250); rounded(b, 140, 900, 50, 110, 25, ol); rounded(b, 140, 1120, 50, 110, 25, ol);
      block(2260, 980, 250, 480); b.fillStyle = mix(P.band, '#ffffff', .62); b.beginPath(); b.ellipse(2385, 982, 118, 128, 0, Math.PI, 0); b.closePath(); b.fill(); b.strokeStyle = ol; b.lineWidth = 6; b.stroke(); rounded(b, 2372, 836, 26, 30, 4, mix(P.band, '#ffffff', .62), ol, 5);
      const tree = mix(P.accent, '#2f5d3a', .65); for (const [x, y, h] of [[330, 1460, 330], [2220, 1460, 260]]) { b.fillStyle = tree; b.beginPath(); b.ellipse(x, y - h / 2, 36, h / 2, 0, 0, 7); b.fill(); b.strokeStyle = ol; b.lineWidth = 5; b.stroke() }
      // título com brilho
      const plate = mix(sky1, '#ffffff', .72); shadowed(b, '#0000001f', 24, 0, 6, () => rounded(b, 680, 60, 1186, 222, 111, plate + 'e6')); title(c, 1273, 178, 100, ensure(P.band, plate, 7), 'center', 1080); text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 246, { font: BOLD(30), color: ensure(mix(P.band, '#000', .15), plate, 4.5), size: 30 });
      // janelas em arco feitas de pedra
      const n = entries.length, top = 372, h = 1068, arc = 200, ring = 54;
      const boxes = n === 2 ? [[130, 1113], [1303, 1113]] : [[360, 1826]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        shadowed(b, '#00000040', 30, 0, 12, () => { b.beginPath(); archPath(x - ring, top - ring, w + ring * 2, h + ring, arc + ring)(b); b.fillStyle = stone; b.fill() });
        clipped(b, archPath(x - ring, top - ring, w + ring * 2, h + ring, arc + ring), () => { tex(b, 'stone', .6); b.strokeStyle = stone2; b.lineWidth = 4; for (let a = 0; a <= 180; a += 9) { const t = Math.PI + a * Math.PI / 180; b.beginPath(); b.moveTo(cx + (w / 2) * Math.cos(t), top + arc + arc * Math.sin(t)); b.lineTo(cx + (w / 2 + ring) * Math.cos(t), top + arc + (arc + ring) * Math.sin(t)); b.stroke() } for (let y = top + arc + 80; y < top + h; y += 80) for (const sx of [x - ring, x + w]) { b.beginPath(); b.moveTo(sx, y); b.lineTo(sx + ring, y); b.stroke() } });
        b.beginPath(); archPath(x - ring, top - ring, w + ring * 2, h + ring, arc + ring)(b); b.strokeStyle = ol; b.lineWidth = 5; b.stroke();
        // pedra-chave com Magen David
        rounded(b, cx - 50, top - ring - 18, 100, ring + 40, 10, mix(stone, '#ffffff', .2), ol, 5); hexagram(b, cx, top - ring / 2 + 2, 26, null, stone2, 4);
        clipped(b, archPath(x, top, w, h, arc), () => { b.fillStyle = P.paper; b.fillRect(x, top, w, h); tex(b, 'paper', .5); tex(b, 'blotch', .12); b.strokeStyle = '#00000024'; b.lineWidth = 26; b.beginPath(); archPath(x, top, w, h, arc)(b); b.stroke() });
        b.beginPath(); archPath(x + 22, top + 22, w - 44, h - 22, arc - 22)(b); b.strokeStyle = P.accent2; b.lineWidth = 3; b.stroke();
        nameStack(c, e, i, { x, y: top + 95, w }, accent, { side: 220 });
        const f = fit(c, e, w - (n === 2 ? 110 : 220), 730, { he: n === 2 ? 90 : 110, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 300, accent);
        c.blocks.push(f);
      });
      // muralha na frente
      b.save(); b.beginPath(); b.moveTo(0, 1470); for (let x = 0; x < W; x += 104) { b.lineTo(x, 1430); b.lineTo(x + 52, 1430); b.lineTo(x + 52, 1470); b.lineTo(x + 104, 1470) } b.lineTo(W, H); b.lineTo(0, H); b.closePath(); b.fillStyle = stone; b.fill(); b.clip(); tex(b, 'stone', .6); b.strokeStyle = stone2; b.lineWidth = 4; for (let y = 1520, k = 0; y < H; y += 62, k++) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); for (let x = k % 2 ? 0 : 75; x < W; x += 150) { b.beginPath(); b.moveTo(x, y); b.lineTo(x, y + 62); b.stroke() } } b.fillStyle = grad(b, 0, 1430, 0, H, [[0, '#ffffff00'], [1, '#00000033']]); b.fillRect(0, 1430, W, 370); b.restore();
      b.strokeStyle = ol; b.lineWidth = 6; b.beginPath(); b.moveTo(0, 1470); for (let x = 0; x < W; x += 104) { b.lineTo(x, 1430); b.lineTo(x + 52, 1430); b.lineTo(x + 52, 1470); b.lineTo(x + 104, 1470) } b.stroke();
      for (const gx of [250, 2296]) { b.fillStyle = mix(ol, '#000', .2); b.beginPath(); archPath(gx - 70, 1580, 140, 220, 70)(b); b.fill() }
      shadowed(b, '#00000040', 16, 0, 6, () => rounded(b, 590, 1544, 1366, 176, 22, mix(stone, '#ffffff', .55)));
      rounded(b, 606, 1560, 1334, 144, 14, null, stone2, 4);
      footer(c, 1273, 1600, 1642, 1690, ensure(P.band, mix(stone, '#ffffff', .55), 7), ensure(mix(P.band, '#000', .3), mix(stone, '#ffffff', .55), 4.5));
    }
  },

  /* 3. Pergaminho: rolo de pergaminho sobre tecido, com selo de cera */
  pergaminho: {
    name: 'Pergaminho', palette: 'terra', titleFont: 'bellefair',
    paper: P => mix('#f1dcae', P.bg, .12),
    spots: n => [[110, 110, 0], [2436, 110, 0], [110, 1690, 0], [2436, 1690, 0], [1273, 1730, 0]],
    draw(c, entries) {
      const { b, P } = c, par = P.paper, burn = mix('#8a5a24', P.band, .2), cloth = mix(P.band, '#000000', .3);
      if (!c.design.ptColor) c.P.pt = ensure(mix('#5a3d1e', P.band, .3), par, 4.5);
      c.P.ink = ensure(mix('#2e1c0c', P.band, .25), par, 7);
      // tecido de veludo
      b.fillStyle = cloth; b.fillRect(0, 0, W, H); tex(b, 'blotch', .45, 2.5); tex(b, 'paper', .5);
      let g = b.createRadialGradient(1273, 900, 400, 1273, 900, 1600); g.addColorStop(0, '#ffffff14'); g.addColorStop(1, '#00000080'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      // folha com bordas irregulares
      const r = rng(4), edge = []; for (let x = 250; x <= 2296; x += 46) edge.push([x, 150 + (r() - .5) * 16]); const bottom = []; for (let x = 2296; x >= 250; x -= 46) bottom.push([x, 1660 + (r() - .5) * 16]);
      const sheet = x => { x.moveTo(250, 150); edge.forEach(p => x.lineTo(...p)); x.lineTo(2296, 1660); bottom.forEach(p => x.lineTo(...p)); x.closePath() };
      shadowed(b, '#000000a0', 50, 0, 18, () => { b.beginPath(); sheet(b); b.fillStyle = par; b.fill() });
      clipped(b, sheet, () => { tex(b, 'blotch', .65, 1.2); tex(b, 'paper', .9); g = b.createRadialGradient(1273, 905, 500, 1273, 905, 1250); g.addColorStop(0, burn + '00'); g.addColorStop(.75, burn + '22'); g.addColorStop(1, burn + '88'); b.fillStyle = g; b.fillRect(0, 0, W, H); b.strokeStyle = burn + '66'; b.lineWidth = 18; b.beginPath(); sheet(b); b.stroke() });
      // margens e ornamentos de canto
      const ink = mix(burn, '#3a2410', .5); b.strokeStyle = ink + '99'; b.lineWidth = 3; b.strokeRect(330, 280, 1886, 1290); b.lineWidth = 1.5; b.strokeRect(344, 294, 1858, 1262);
      const curl = (x, y, sx, sy) => { b.save(); b.translate(x, y); b.scale(sx, sy); b.strokeStyle = mix(P.accent2, ink, .3); b.lineWidth = 5; b.beginPath(); b.moveTo(0, 90); b.bezierCurveTo(0, 20, 20, 0, 90, 0); b.stroke(); b.beginPath(); b.moveTo(20, 120); b.bezierCurveTo(20, 50, 50, 20, 120, 20); b.stroke(); b.beginPath(); b.arc(52, 52, 18, 0, 6.3); b.stroke(); b.fillStyle = mix(P.accent2, ink, .3); b.beginPath(); b.arc(52, 52, 6, 0, 7); b.fill(); b.restore() };
      curl(318, 268, 1, 1); curl(2228, 268, -1, 1); curl(318, 1582, 1, -1); curl(2228, 1582, -1, -1);
      // rolos com cabos de madeira torneada
      const woodC = mix('#8a5426', P.band, .15), woodD = mix(woodC, '#000', .4), gold = mix('#d9a441', P.accent2, .3);
      for (const x of [205, 2341]) {
        for (const [y0, dir] of [[150, -1], [1660, 1]]) { const y = y0 + dir * 26; rounded(b, x - 24, Math.min(y, y + dir * 84), 48, 84, 16, woodC, woodD, 4); b.fillStyle = gold; b.beginPath(); b.ellipse(x, y0 + dir * 8, 96, 22, 0, 0, 7); b.fill(); b.strokeStyle = woodD; b.lineWidth = 4; b.stroke(); b.fillStyle = woodC; b.beginPath(); b.ellipse(x, y + dir * 56, 38, 16, 0, 0, 7); b.fill(); b.stroke(); circle(b, x, y + dir * 100, 28, woodC, woodD, 4); circle(b, x - 8, y + dir * 100 - 8, 8, '#ffffff40') }
        b.fillStyle = grad(b, x - 75, 0, x + 75, 0, [[0, mix(par, burn, .5)], [.35, mix(par, '#ffffff', .35)], [1, mix(par, burn, .6)]]);
        b.beginPath(); b.roundRect ? b.roundRect(x - 75, 150, 150, 1510, 40) : b.rect(x - 75, 150, 150, 1510); b.fill(); b.strokeStyle = burn; b.lineWidth = 4; b.stroke();
        clipped(b, x2 => x2.rect(x - 75, 150, 150, 1510), () => tex(b, 'blotch', .4, 1.2));
      }
      // faixa do título
      const rib = mix(P.accent, P.band, .35), rib2 = mix(rib, '#000', .35);
      poly(b, [[600, 112], [790, 112], [790, 282], [600, 282], [655, 197]], rib2); poly(b, [[1946, 112], [1756, 112], [1756, 282], [1946, 282], [1891, 197]], rib2);
      shadowed(b, '#00000055', 16, 0, 8, () => rounded(b, 720, 78, 1106, 190, 12, rib));
      b.strokeStyle = gold; b.lineWidth = 4; b.strokeRect(742, 96, 1062, 154); b.lineWidth = 1.5; b.strokeRect(752, 106, 1042, 134);
      title(c, 1273, 205, 94, best(rib, '#fff8e8', '#1a1008'), 'center', 980);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 340, { font: TEXT(32), color: c.P.ink, size: 32 });
      const n = entries.length, top = 390, boxes = n === 2 ? [[360, 900], [1286, 900]] : [[400, 1746]];
      if (n === 2) { b.strokeStyle = ink + 'aa'; b.lineWidth = 3; b.beginPath(); b.moveTo(1273, 420); b.lineTo(1273, 1400); b.stroke(); hexagram(b, 1273, 910, 26, par, ink, 3) }
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        nameStack(c, e, i, { x, y: top, w }, accent, { flourish: mix(P.accent2, ink, .25), side: 360, nameColor: c.P.ink });
        const f = fit(c, e, w - 40, 830, { he: n === 2 ? 92 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 222, accent, { divider: mix(P.accent2, ink, .3) });
        c.blocks.push(f);
      });
      // selo de cera
      const wax = '#a3262a', sx = 2080, sy = 1535; b.save(); b.fillStyle = wax; for (const [dx, dy] of [[0, 92], [-30, 88], [32, 86]]) { b.beginPath(); b.moveTo(sx + dx - 18, sy); b.lineTo(sx + dx - 18, sy + dy + 40); b.lineTo(sx + dx, sy + dy + 22); b.lineTo(sx + dx + 18, sy + dy + 40); b.lineTo(sx + dx + 18, sy); b.fillStyle = mix(P.accent, '#7a1f2a', .6); b.fill() } b.restore();
      shadowed(b, '#00000066', 12, 0, 6, () => { b.beginPath(); for (let a = 0; a <= 360; a += 15) { const rr2 = 74 + (a % 30 ? 6 : -3); b.lineTo(sx + rr2 * Math.cos(a * Math.PI / 180), sy + rr2 * Math.sin(a * Math.PI / 180)) } b.closePath(); b.fillStyle = wax; b.fill() });
      circle(b, sx, sy, 52, null, '#7a1518', 5); hexagram(b, sx, sy, 32, null, '#7a1518', 5); circle(b, sx - 22, sy - 26, 12, '#ffffff33');
      b.strokeStyle = ink + '88'; b.lineWidth = 3; b.beginPath(); b.moveTo(700, 1470); b.lineTo(1846, 1470); b.stroke();
      footer(c, 1273, 1512, 1552, 1765, c.P.ink, ensure('#e9dcc0', cloth, 4.5));
    }
  },

  /* 4. Geométrico colorido: mosaico de triângulos e Maguen David */
  geometrico: {
    name: 'Geométrico colorido', palette: 'lavanda', titleFont: 'bubbles',
    spots: n => [[1950, 205, 0], [2370, 200, 0], [120, 1700, 0], [2436, 1700, 0]],
    draw(c, entries) {
      const { b, P } = c, r = rng(17), cols = [mix(P.accent, '#ffffff', .25), mix(P.accent2, '#ffffff', .2), mix(P.band, '#ffffff', .35), mix(P.accent, '#ffffff', .6), mix(P.accent2, '#ffffff', .6), mix(P.bg, '#ffffff', .3)];
      b.fillStyle = mix(P.bg, '#ffffff', .4); b.fillRect(0, 0, W, H);
      // mosaico de triângulos
      const s = 132, hgt = s * Math.sqrt(3) / 2;
      for (let row = -1, y = -hgt; y < H + hgt; row++, y += hgt) for (let k = -2; k < W / (s / 2) + 2; k++) {
        const x = k * s / 2 + (row % 2 ? s / 2 : 0), up = (k + row) % 2 === 0, d = Math.hypot((x - 1273) / 1.3, y - 900);
        const pick = r(), col = d < 650 ? cols[5] : pick < .25 ? cols[0] : pick < .45 ? cols[1] : pick < .6 ? cols[2] : pick < .78 ? cols[3] : cols[4];
        poly(b, up ? [[x, y + hgt], [x + s / 2, y], [x + s, y + hgt]] : [[x, y], [x + s, y], [x + s / 2, y + hgt]], col, '#ffffff', 5);
      }
      tex(b, 'paper', .45);
      for (const [x, y, rad, i] of [[2390, 1560, 120, 0], [150, 330, 90, 1], [2440, 760, 70, 2], [90, 1180, 60, 0]]) hexagram(b, x, y, rad, [P.accent, P.accent2, mix(P.band, '#ffffff', .3)][i], P.band, 8);
      // cabeçalho com sombra sólida
      b.save(); b.translate(930, 205); b.rotate(-.018); rounded(b, -850, -135, 1700, 270, 40, P.accent2); b.restore();
      rounded(b, 70, 62, 1700, 270, 40, P.band); b.save(); b.setLineDash([2, 18]); b.lineCap = 'round'; rounded(b, 92, 84, 1656, 226, 28, null, mix(P.band, '#ffffff', .4), 6); b.restore();
      title(c, 140, 210, 98, P.onBand, 'left', 1540);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 142, 286, { font: TEXT(32), color: P.onBand2, align: 'left', size: 32 });
      circle(b, 1960, 200, 112, P.accent, P.band, 10); hexagram(b, 1960, 200, 62, '#ffffff', null);
      b.save(); b.translate(2280, 205); b.rotate(.25); rounded(b, -95, -95, 190, 190, 30, P.accent2, P.band, 10); b.restore(); circle(b, 2280, 205, 34, '#ffffff');
      const n = entries.length, top = 440, h = 1040, boxes = n === 2 ? [[110, 1128], [1308, 1128]] : [[110, 2326]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1, fill = i ? P.accent2 : P.accent;
        rounded(b, x + 26, top + 26, w, h, 40, fill); rounded(b, x, top, w, h, 40, P.panel, P.band, 10);
        clipped(b, rr(x, top, w, h, 40), () => { b.fillStyle = mix(fill, '#ffffff', .82); b.fillRect(x, top, w, 26); tex(b, 'paper', .25) });
        for (const [px, py] of [[x + w - 50, top + 50], [x + 50, top + h - 50], [x + w - 50, top + h - 50]]) hexagram(b, px, py, 22, mix(fill, '#ffffff', .3), null);
        const label = n === 2 ? 'NOME ' + (i + 1) : 'MEU NOME'; c.t.font = BOLD(26); const lw = c.t.measureText(label).width + 80;
        rounded(b, x + 50, top - 40, lw, 76, 38, fill, P.band, 6);
        text(c, label, x + 50 + lw / 2, top + 9, { font: BOLD(26), color: best(fill, '#ffffff', '#10202b'), size: 26 });
        nameStack(c, e, i, { x, y: top + 14, w }, accent, { noLabel: true, side: 200 });
        const f = fit(c, e, n === 2 ? w - 130 : 1970, 790, { he: n === 2 ? 92 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 222, accent);
        c.blocks.push(f);
      });
      rounded(b, 248, 1570, 2086, 110, 55, P.accent2); rounded(b, 230, 1552, 2086, 110, 55, P.band);
      footer(c, 1273, 1598, 1638, 1740, P.onBand, ensure(P.band, mix(P.bg, '#ffffff', .4), 4.5));
      // fundo claro atrás dos créditos para garantir leitura
      rounded(b, 720, 1712, 1106, 42, 21, '#ffffffd9');
    }
  },

  /* 5. Biblioteca de Torá: estante, abajur e um livro aberto sobre a mesa */
  biblioteca: {
    name: 'Biblioteca de Torá', palette: 'classico', titleFont: 'heebo',
    paper: P => mix('#fbf3df', P.bg, .08),
    spots: n => [[2440, 1640, 0], [120, 900, 0], [2430, 900, 0], [250, 160, 0], [2296, 160, 0]],
    draw(c, entries) {
      const { b, P } = c, wall = ensure(mix(P.band, '#000000', .3), '#ffffff', 9), page = P.paper, r = rng(5), woodC = mix('#7a4a22', P.band, .12), woodD = mix(woodC, '#000', .45), brass = mix('#d6a945', P.accent2, .25);
      // parede de madeira em tábuas
      b.fillStyle = wall; b.fillRect(0, 0, W, H);
      b.save(); b.globalAlpha = .5; for (let x = 0; x < W; x += 212) { wood(b, x, 0, 206, H, mix(wall, '#6b4422', .35), 0, true) } b.restore();
      let g = b.createRadialGradient(330, 1050, 60, 330, 1050, 1100); g.addColorStop(0, '#ffd98a55'); g.addColorStop(1, '#ffd98a00'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      // estante com livros
      const spines = [P.accent, P.accent2, mix(P.accent, '#000', .35), mix(P.accent2, '#000', .3), '#e6d8bb', mix(P.band, '#ffffff', .2), '#7a1f2a', '#2f5d3a'];
      for (let x = 24; x < W - 40;) {
        if (r() < .08) { const w = 250; for (let k = 0; k < 3; k++) { const col = spines[Math.floor(r() * spines.length)]; rounded(b, x + k * 6, 292 - (k + 1) * 46, w - k * 12, 44, 6, col, woodD, 3) } x += w + 10; continue }
        const w = 44 + r() * 46, h = 160 + r() * 95, col = spines[Math.floor(r() * spines.length)], lean = r() < .07;
        b.save(); if (lean) { b.translate(x, 292); b.rotate(-.18); b.translate(-x, -292) }
        b.fillStyle = grad(b, x, 0, x + w, 0, [[0, mix(col, '#000', .3)], [.35, mix(col, '#ffffff', .15)], [1, mix(col, '#000', .4)]]); b.beginPath(); b.roundRect ? b.roundRect(x, 292 - h, w, h, 6) : b.rect(x, 292 - h, w, h); b.fill(); b.strokeStyle = woodD; b.lineWidth = 3; b.stroke();
        b.fillStyle = brass; b.fillRect(x + 5, 292 - h + 22, w - 10, 5); b.fillRect(x + 5, 292 - h + 34, w - 10, 3); b.fillRect(x + 5, 260, w - 10, 5); if (h > 200) rounded(b, x + w * .25, 292 - h * .62, w * .5, 46, 4, mix(brass, '#ffffff', .2));
        b.restore(); x += w + (lean ? 26 : 3);
      }
      wood(b, 0, 290, W, 46, woodC); b.fillStyle = '#00000055'; b.fillRect(0, 336, W, 14);
      // placa de latão
      shadowed(b, '#00000077', 18, 0, 8, () => rounded(b, 653, 52, 1240, 226, 22, brass));
      b.fillStyle = grad(b, 0, 52, 0, 278, [[0, '#ffffff55'], [.5, '#ffffff00'], [1, '#00000033']]); b.beginPath(); rr(653, 52, 1240, 226, 22)(b); b.fill();
      rounded(b, 677, 76, 1192, 178, 14, mix(page, brass, .15), mix(brass, '#000', .35), 3);
      for (const [x, y] of [[680, 80], [1866, 80], [680, 250], [1866, 250]]) { circle(b, x, y, 9, mix(brass, '#000', .25)); b.strokeStyle = '#ffffff66'; b.lineWidth = 2; b.beginPath(); b.moveTo(x - 5, y); b.lineTo(x + 5, y); b.stroke() }
      title(c, 1273, 180, 92, ensure(P.band, mix(page, brass, .15), 7), 'center', 1120);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 236, { font: TEXT(30), color: ensure(P.muted2, mix(page, brass, .15), 4.5), size: 30 });
      // mesa
      wood(b, 0, 1585, W, 215, woodC); b.fillStyle = mix(woodC, '#ffffff', .25); b.fillRect(0, 1585, W, 8);
      // abajur à esquerda e tinteiro à direita
      const lampC = mix(P.accent, '#1f5a3a', .4);
      b.fillStyle = brass; b.fillRect(122, 1180, 16, 400); rounded(b, 60, 1560, 140, 34, 12, brass, mix(brass, '#000', .4), 3);
      b.fillStyle = grad(b, 40, 0, 220, 0, [[0, mix(lampC, '#000', .3)], [.5, mix(lampC, '#ffffff', .25)], [1, mix(lampC, '#000', .35)]]); b.beginPath(); b.moveTo(30, 1250); b.quadraticCurveTo(130, 1120, 230, 1250); b.closePath(); b.fill(); b.strokeStyle = brass; b.lineWidth = 6; b.stroke();
      g = b.createRadialGradient(130, 1260, 10, 130, 1400, 420); g.addColorStop(0, '#fff2c0aa'); g.addColorStop(1, '#fff2c000'); b.fillStyle = g; b.beginPath(); b.moveTo(40, 1250); b.lineTo(-200, 1585); b.lineTo(480, 1585); b.lineTo(220, 1250); b.fill();
      rounded(b, 2400, 1500, 110, 90, 18, '#1d2630', '#000', 3); rounded(b, 2425, 1480, 60, 26, 8, '#2c3946'); b.strokeStyle = '#f4efe4'; b.lineWidth = 9; b.lineCap = 'round'; b.beginPath(); b.moveTo(2455, 1480); b.quadraticCurveTo(2480, 1380, 2530, 1300); b.stroke();
      // livro aberto
      const L = 260, R = 2286, M = 1273, T = 390, B = 1555;
      shadowed(b, '#00000088', 40, 0, 20, () => rounded(b, L - 40, T - 18, R - L + 80, B - T + 50, 26, mix(P.band, '#000', .1)));
      b.save(); b.setLineDash([14, 10]); rounded(b, L - 24, T - 2, R - L + 48, B - T + 20, 18, null, brass + 'aa', 3); b.restore();
      for (let k = 3; k >= 1; k--) { b.fillStyle = mix(page, '#b89a6a', .2 + k * .08); b.beginPath(); b.moveTo(L - 6, T + 20 + k * 8); b.lineTo(L - 6, B - 30 + k * 8); b.bezierCurveTo(L + 400, B - 50 + k * 8, M - 300, B - 40 + k * 8, M, B + k * 8); b.bezierCurveTo(M + 300, B - 40 + k * 8, R - 400, B - 50 + k * 8, R + 6, B - 30 + k * 8); b.lineTo(R + 6, T + 20 + k * 8); b.fill() }
      for (const sgn of [-1, 1]) {
        const edge = M + sgn * (M - L), path = x => { x.moveTo(M, T + 50); x.bezierCurveTo(M + sgn * 300, T, M + sgn * 700, T - 10, edge, T + 18); x.lineTo(edge, B - 34); x.bezierCurveTo(M + sgn * 700, B - 52, M + sgn * 300, B - 44, M, B); x.closePath() };
        clipped(b, path, () => { b.fillStyle = page; b.fillRect(0, 0, W, H); tex(b, 'paper', .55); tex(b, 'blotch', .12); b.fillStyle = grad(b, M, 0, M + sgn * 260, 0, [[0, '#7a5a2a55'], [1, '#7a5a2a00']]); b.fillRect(Math.min(M, M + sgn * 260), 0, 260, H) });
        b.beginPath(); path(b); b.strokeStyle = mix(page, '#7a5a2a', .4); b.lineWidth = 3; b.stroke();
      }
      poly(b, [[M + 22, B - 20], [M + 22, B + 66], [M + 46, B + 48], [M + 70, B + 66], [M + 70, B - 20]], P.accent, mix(P.accent, '#000', .35), 3);
      const n = entries.length;
      if (n === 2) entries.forEach((e, i) => {
        const x = i ? 1346 : 240, w = 960, cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        nameStack(c, e, i, { x, y: 440, w }, accent, { side: 160 });
        const f = fit(c, e, w - 70, 820, { he: 88, comfort: 50, heMin: 48, pt: 33, ptMin: 26 });
        verse(c, e, f, cx, 650, accent, { divider: P.accent2 });
        c.blocks.push(f);
      });
      else {
        const e = entries[0], accent = P.acc1, cxR = 1785, cxL = 761;
        nameStack(c, e, 0, { x: 1325, y: 440, w: 920 }, accent, { side: 140 });
        const f = fit(c, e, 860, 820, { he: 104, comfort: 52, heMin: 48, pt: 34, ptMin: 26, ptW: 0, gap: 40 });
        let y = 650 + Math.max(0, (820 - f.total) / 2), y0 = y; const hh = drawHebrew(c, f, cxR, y); y = hh.y;
        const ref = `${e.v.book} ${e.v.chapter}:${e.v.verse}`; const rw = text(c, ref, cxR, y + 30, { font: BOLD(30), color: accent, size: 30, free: true });
        protect(c, cxR - Math.max(hh.maxW, rw) / 2, y0, Math.max(hh.maxW, rw), y + 40 - y0);
        const want = Math.round(46 * PT_SCALES[c.design.ptScale ?? 1]); let pt = want, pl;
        for (; ; pt--) { c.t.font = TEXT(pt); pl = lines(c.t, e.v.translation, 820); if (pl.length * pt * 1.45 <= 700 || pt <= 24) break } pl = balanced(c.t, e.v.translation, 820);
        text(c, 'TRADUÇÃO', cxL, 520, { font: BOLD(24), color: P.acc2, size: 24 });
        c.t.fillStyle = P.accent2; c.t.fillRect(cxL - 50, 548, 100, 5);
        let ty = 640 + Math.max(0, (700 - pl.length * pt * 1.45) / 2) + pt; const tr = drawTranslation(c, f, cxL, ty, pl, pt);
        protect(c, cxL - tr.maxW / 2, ty - pt, tr.maxW, tr.y - ty);
        c.ptReduced = pt < want; c.blocks.push(Object.assign({}, f, { pt, ptPage: { lines: pl.length, total: pl.length * pt * 1.45, maxH: 700 } }));
      }
      footer(c, 1273, 1672, 1714, 1770, ensure('#fbf1dc', woodC, 7), ensure('#e7d3b0', woodC, 4.5));
    }
  },

  /* 6. Noite estrelada: céu de estrelas, lua e constelação (as estrelas de Avraham) */
  estrelas: {
    name: 'Noite estrelada', palette: 'lavanda', titleFont: 'varela',
    paper: P => mix('#f8f6ff', P.bg, .15),
    spots: n => [[150, 140, 0], [2396, 1700, 0], [150, 1700, 0], [700, 150, 0]],
    draw(c, entries) {
      const { b, P } = c, top = mix(P.band, '#000000', .62), mid = mix(P.band, '#0b1030', .25), low = mix(P.accent, P.band, .4), r = rng(31);
      b.fillStyle = grad(b, 0, 0, 0, H, [[0, top], [.6, mid], [1, low]]); b.fillRect(0, 0, W, H);
      // via láctea
      b.save(); b.translate(1273, 760); b.rotate(-.32); b.beginPath(); b.ellipse(0, 0, 1800, 230, 0, 0, 7); b.restore(); b.save(); b.clip(); tex(b, 'blotch', .2, 2.2, 'screen'); tex(b, 'paper', .25, 1, 'screen'); b.restore();
      for (let i = 0; i < 520; i++) { const x = r() * W, y = r() * 1500, s = r() < .9 ? .8 + r() * 1.8 : 2.6 + r() * 1.8; b.globalAlpha = .35 + r() * .65; circle(b, x, y, s, r() < .8 ? '#ffffff' : mix(P.accent2, '#ffffff', .4)) } b.globalAlpha = 1;
      const sparkle = (x, y, s, col) => { b.fillStyle = col; b.beginPath(); b.moveTo(x, y - s); b.quadraticCurveTo(x, y, x + s, y); b.quadraticCurveTo(x, y, x, y + s); b.quadraticCurveTo(x, y, x - s, y); b.quadraticCurveTo(x, y, x, y - s); b.fill() };
      for (let i = 0; i < 26; i++) sparkle(r() * W, r() * 1400, 10 + r() * 22, i % 3 ? '#ffffff' : mix(P.accent2, '#ffffff', .3));
      // constelação
      const cs = [[300, 120], [420, 190], [560, 150], [640, 260], [520, 330], [400, 300]]; b.strokeStyle = '#ffffff55'; b.lineWidth = 3; b.beginPath(); cs.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); b.closePath(); b.stroke(); cs.forEach(([x, y]) => { circle(b, x, y, 14, '#ffffff22'); circle(b, x, y, 6, '#ffffff') });
      // lua crescente com brilho
      let g = b.createRadialGradient(2230, 210, 60, 2230, 210, 330); g.addColorStop(0, '#fff6d655'); g.addColorStop(1, '#fff6d600'); b.fillStyle = g; b.fillRect(1800, 0, 746, 600);
      clipped(b, x => x.arc(2230, 210, 118, 0, 7), () => { b.beginPath(); b.arc(2230, 210, 118, 0, 7); b.arc(2290, 175, 108, 0, 7); b.fillStyle = '#fdf1c4'; b.fill('evenodd'); tex(b, 'blotch', .25, .8) });
      // colinas com casinhas iluminadas
      const hill = (y, col, amp, seed) => { const rr2 = rng(seed); b.fillStyle = col; b.beginPath(); b.moveTo(0, H); b.lineTo(0, y); for (let x = 0; x <= W; x += 200) b.quadraticCurveTo(x + 100, y - amp * rr2(), x + 200, y - amp * .3 + amp * .6 * rr2()); b.lineTo(W, H); b.fill() };
      hill(1440, mix(P.band, '#000', .45), 90, 4); hill(1530, mix(P.band, '#000', .62), 70, 8);
      const house = (x, y, w, h) => { b.fillStyle = mix(P.band, '#000', .7); b.fillRect(x, y - h, w, h); b.beginPath(); b.moveTo(x - 12, y - h); b.lineTo(x + w / 2, y - h - w * .45); b.lineTo(x + w + 12, y - h); b.fill(); b.fillStyle = '#ffd77a'; b.fillRect(x + w * .3, y - h * .65, w * .22, h * .28); b.fillRect(x + w * .58, y - h * .65, w * .22, h * .28) };
      house(60, 1560, 120, 100); house(210, 1580, 90, 80); house(2250, 1560, 120, 100); house(2400, 1585, 95, 75);
      title(c, 1273, 190, 102, '#ffffff', 'center', 1300);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 262, { font: TEXT(32), color: mix(P.accent2, '#ffffff', .55), size: 32 });
      const n = entries.length, top0 = 350, h = 1090, boxes = n === 2 ? [[150, 1093], [1303, 1093]] : [[250, 2046]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        shadowed(b, mix(P.accent, '#ffffff', .4) + 'cc', 60, 0, 0, () => rounded(b, x, top0, w, h, 44, P.paper));
        clipped(b, rr(x, top0, w, h, 44), () => { tex(b, 'paper', .35); b.fillStyle = grad(b, 0, top0, 0, top0 + 200, [[0, mix(P.accent, '#ffffff', .82)], [1, P.paper + '00']]); b.fillRect(x, top0, w, 200) });
        b.save(); b.setLineDash([4, 14]); b.lineCap = 'round'; rounded(b, x + 18, top0 + 18, w - 36, h - 36, 30, null, mix(P.accent2, P.paper, .2), 5); b.restore();
        for (const [px, py] of [[x + 46, top0 + 46], [x + w - 46, top0 + 46], [x + 46, top0 + h - 46], [x + w - 46, top0 + h - 46]]) sparkle(px, py, 20, P.accent2);
        nameStack(c, e, i, { x, y: top0 + 40, w }, accent, { side: 200 });
        const f = fit(c, e, w - (n === 2 ? 130 : 230), 790, { he: n === 2 ? 92 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top0 + 252, accent);
        c.blocks.push(f);
      });
      const hillC = mix(P.band, '#000', .62);
      footer(c, 1273, 1612, 1652, 1745, ensure('#f4f0ff', hillC, 7), ensure(mix(P.accent2, '#ffffff', .5), hillC, 4.5));
    }
  },

  /* 7. Jardim das sete espécies: videira, romãs, trigo, cevada, oliveira, figos e tamareira */
  jardim: {
    name: 'Jardim das sete espécies', palette: 'oliveira', titleFont: 'bellefair',
    paper: P => mix('#fffdf2', P.bg, .1),
    spots: n => [[130, 1640, 0], [2416, 1640, 0], [1273, 1740, 0], [130, 420, 0]],
    draw(c, entries) {
      const { b, P } = c, r = rng(12), leafC = [mix('#5f8f32', P.accent, .25), mix('#7aa844', P.accent, .2), mix('#466f26', P.band, .2)], stemC = mix('#6b4a24', P.band, .2);
      b.fillStyle = grad(b, 0, 0, 0, H, [[0, mix(P.bg, '#ffffff', .55)], [.7, mix(P.bg, '#e9f2d8', .5)], [1, mix('#b7d68a', P.accent, .25)]]); b.fillRect(0, 0, W, H); tex(b, 'paper', .5);
      const leaf = (x, y, len, ang, col) => { b.save(); b.translate(x, y); b.rotate(ang); b.fillStyle = col; b.beginPath(); b.moveTo(0, 0); b.quadraticCurveTo(len * .5, -len * .32, len, 0); b.quadraticCurveTo(len * .5, len * .32, 0, 0); b.fill(); b.strokeStyle = '#ffffff55'; b.lineWidth = 2; b.beginPath(); b.moveTo(4, 0); b.lineTo(len - 6, 0); b.stroke(); b.restore() };
      const grapes = (x, y, s, col) => { for (let row = 0; row < 5; row++) for (let k = 0; k <= 4 - row; k++) { const gx = x + (k - (4 - row) / 2) * s * 1.7, gy = y + row * s * 1.5; circle(b, gx, gy, s, col); circle(b, gx - s * .3, gy - s * .3, s * .3, '#ffffff55') } };
      const pom = (x, y, s) => { b.strokeStyle = stemC; b.lineWidth = 4; b.beginPath(); b.moveTo(x, y - s - 40); b.lineTo(x, y - s); b.stroke(); circle(b, x, y, s, mix('#c8323f', P.accent2, .1)); poly(b, [[x - s * .35, y - s * .85], [x - s * .2, y - s * 1.25], [x, y - s * .95], [x + s * .2, y - s * 1.25], [x + s * .35, y - s * .85]], '#9e2338'); circle(b, x - s * .35, y - s * .3, s * .25, '#ffffff44') };
      const fig = (x, y, s) => { b.fillStyle = '#6d3e5c'; b.beginPath(); b.moveTo(x, y - s * 1.3); b.quadraticCurveTo(x + s * 1.1, y - s * .2, x, y + s); b.quadraticCurveTo(x - s * 1.1, y - s * .2, x, y - s * 1.3); b.fill(); circle(b, x - s * .3, y, s * .22, '#ffffff33') };
      const stalk = (x, y, h, ang, col, barley) => { b.save(); b.translate(x, y); b.rotate(ang); b.strokeStyle = col; b.lineWidth = 5; b.beginPath(); b.moveTo(0, 0); b.quadraticCurveTo(10, -h * .5, 0, -h); b.stroke(); for (let k = 0; k < 9; k++) { const yy = -h + k * 22; for (const sd of [-1, 1]) { b.save(); b.translate(0, yy); b.rotate(sd * .5); b.fillStyle = col; b.beginPath(); b.ellipse(sd * 12, 0, 13, 7, 0, 0, 7); b.fill(); if (barley) { b.strokeStyle = col; b.lineWidth = 2; b.beginPath(); b.moveTo(sd * 22, 0); b.lineTo(sd * 60, -30); b.stroke() } b.restore() } } b.restore() };
      // colinas
      b.fillStyle = mix('#9cc76a', P.accent, .3); b.beginPath(); b.moveTo(0, H); b.lineTo(0, 1560); b.quadraticCurveTo(640, 1460, 1273, 1540); b.quadraticCurveTo(1900, 1610, W, 1500); b.lineTo(W, H); b.fill();
      b.fillStyle = mix('#7fb251', P.accent, .3); b.beginPath(); b.moveTo(0, H); b.lineTo(0, 1650); b.quadraticCurveTo(900, 1580, 1600, 1660); b.quadraticCurveTo(2100, 1700, W, 1620); b.lineTo(W, H); b.fill();
      // tamareira e oliveira nas laterais
      b.strokeStyle = stemC; b.lineWidth = 26; b.beginPath(); b.moveTo(2440, H); b.quadraticCurveTo(2470, 1100, 2420, 700); b.stroke(); for (let k = 0; k < 9; k++) { const a = -Math.PI + k * Math.PI / 8; b.save(); b.translate(2420, 700); b.rotate(a); for (let j = 0; j < 12; j++) leaf(40 + j * 22, 0, 70, (j % 2 ? .6 : -.6), leafC[(k + j) % 3]); b.restore() }
      for (const [x, y] of [[2380, 760], [2410, 780], [2440, 765]]) circle(b, x, y, 14, '#a8641f');
      b.strokeStyle = stemC; b.lineWidth = 9; b.beginPath(); b.moveTo(40, 1500); b.quadraticCurveTo(160, 1100, 90, 760); b.stroke(); for (let k = 0; k < 16; k++) { const t = k / 16, y = 1480 - t * 700, x = 40 + Math.sin(t * 3) * 60 + t * 60; leaf(x, y, 70, (k % 2 ? -.4 : Math.PI + .4), mix('#8aa36a', leafC[k % 3], .5)); if (k % 4 === 1) circle(b, x + 18, y + 22, 10, '#3f3a4d') }
      // trigo e cevada
      for (let k = 0; k < 6; k++) stalk(150 + k * 34, 1800, 360 + (k % 3) * 40, -.25 + k * .08, mix('#d9b04a', P.accent2, .2), k % 2);
      for (let k = 0; k < 5; k++) stalk(2180 + k * 36, 1800, 340 + (k % 2) * 50, -.15 + k * .07, mix('#c9a03d', P.accent2, .2), (k + 1) % 2);
      // videira no alto com uvas, romãs e figos
      b.strokeStyle = stemC; b.lineWidth = 12; b.beginPath(); b.moveTo(0, 90); for (let x = 0; x <= W; x += 140) b.quadraticCurveTo(x + 70, 90 + (x / 140 % 2 ? 50 : -30), x + 140, 95); b.stroke();
      for (let x = 30; x < W; x += 72) { leaf(x, 92 + Math.sin(x / 90) * 25, 88, -.9 + r() * .5, leafC[Math.floor(r() * 3)]); leaf(x + 20, 100 + Math.sin(x / 90) * 25, 80, .9 + r() * .5, leafC[Math.floor(r() * 3)]) }
      for (const [x, k] of [[260, 0], [560, 1], [1990, 0], [2290, 1]]) { if (k) pom(x, 225, 42); else grapes(x, 160, 17, mix('#5b2a6e', P.band, .15)) }
      fig(400, 205, 34); fig(2140, 200, 34);
      // placa de madeira pendurada
      b.strokeStyle = stemC; b.lineWidth = 6; b.beginPath(); b.moveTo(900, 100); b.lineTo(960, 150); b.moveTo(1646, 100); b.lineTo(1586, 150); b.stroke();
      shadowed(b, '#00000040', 14, 0, 6, () => wood(b, 740, 140, 1066, 190, mix('#b07a3e', P.accent2, .1), 20));
      b.strokeStyle = mix('#5a3a18', P.band, .1); b.lineWidth = 4; rounded(b, 760, 158, 1026, 154, 14, null, b.strokeStyle, 4);
      const signC = mix('#b07a3e', P.accent2, .1);
      title(c, 1273, 262, 92, ensure('#fff6e2', signC, 4.5), 'center', 960);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 384, { font: BOLD(30), color: ensure(mix(P.band, '#000', .1), mix(P.bg, '#ffffff', .55), 4.5), size: 30 });
      const n = entries.length, top0 = 430, h = 1030, boxes = n === 2 ? [[230, 1023], [1293, 1023]] : [[330, 1886]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        shadowed(b, '#0000002e', 24, 0, 10, () => rounded(b, x, top0, w, h, 30, P.paper));
        clipped(b, rr(x, top0, w, h, 30), () => tex(b, 'paper', .5));
        rounded(b, x + 14, top0 + 14, w - 28, h - 28, 22, null, leafC[0], 4); rounded(b, x + 24, top0 + 24, w - 48, h - 48, 16, null, mix(leafC[0], P.paper, .5), 2);
        for (const [px, py, a] of [[x + 20, top0 + 20, .8], [x + w - 20, top0 + 20, 2.35], [x + 20, top0 + h - 20, -.8], [x + w - 20, top0 + h - 20, -2.35]]) { leaf(px, py, 70, a, leafC[1]); leaf(px, py, 56, a + .5, leafC[0]); leaf(px, py, 56, a - .5, leafC[2]) }
        nameStack(c, e, i, { x, y: top0 + 40, w }, accent, { side: 220, flourish: leafC[0] });
        const f = fit(c, e, w - (n === 2 ? 130 : 230), 760, { he: n === 2 ? 90 : 110, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top0 + 246, accent);
        c.blocks.push(f);
      });
      shadowed(b, '#00000030', 12, 0, 5, () => rounded(b, 520, 1580, 1506, 176, 24, mix(P.paper, '#ffffff', .3)));
      rounded(b, 534, 1594, 1478, 148, 16, null, leafC[0], 3);
      footer(c, 1273, 1634, 1676, 1724, ensure(P.band, P.paper, 7), ensure(mix(P.band, '#000', .2), P.paper, 4.5));
    }
  },

  /* 8. Mar e farol: bandeirinhas, veleiro, farol, ondas e praia */
  mar: {
    name: 'Mar e farol', palette: 'oceano', titleFont: 'rubik',
    paper: P => mix('#fffdf7', P.bg, .1),
    spots: n => [[110, 1720, 0], [1273, 1735, 0], [2440, 1720, 0], [130, 330, 0]],
    draw(c, entries) {
      const { b, P } = c, r = rng(8), sea1 = mix(P.accent, '#1b6fa0', .4), sea2 = mix(P.band, '#0c3d5c', .3), sand = mix('#f1d9a6', P.bg, .15);
      b.fillStyle = grad(b, 0, 0, 0, 1080, [[0, mix(P.accent, '#ffffff', .55)], [1, mix(P.bg, '#ffffff', .6)]]); b.fillRect(0, 0, W, H);
      let g = b.createRadialGradient(2150, 300, 40, 2150, 300, 400); g.addColorStop(0, '#fff6c8'); g.addColorStop(.3, '#ffe99a99'); g.addColorStop(1, '#ffe99a00'); b.fillStyle = g; b.fillRect(1700, 0, 846, 800); circle(b, 2150, 300, 95, '#fff3b8');
      for (const [x, y, s] of [[420, 520, 1], [520, 470, .8], [1850, 560, .9]]) { b.strokeStyle = '#33465a'; b.lineWidth = 5; b.lineCap = 'round'; b.beginPath(); b.moveTo(x - 30 * s, y - 8 * s); b.quadraticCurveTo(x - 14 * s, y - 24 * s, x, y); b.quadraticCurveTo(x + 14 * s, y - 24 * s, x + 30 * s, y - 8 * s); b.stroke() }
      // mar com ondas
      b.fillStyle = grad(b, 0, 1080, 0, 1640, [[0, sea1], [1, sea2]]); b.fillRect(0, 1080, W, 600);
      for (let k = 0; k < 9; k++) { const y = 1110 + k * 62; b.strokeStyle = k % 2 ? '#ffffff55' : '#ffffff33'; b.lineWidth = 6 + k; b.beginPath(); for (let x = -40; x <= W + 40; x += 20) { const yy = y + Math.sin(x / (90 + k * 12) + k) * (8 + k * 2); x < 0 ? b.moveTo(x, yy) : b.lineTo(x, yy) } b.stroke() }
      // veleiro e farol
      b.fillStyle = mix(P.band, '#000', .2); b.beginPath(); b.moveTo(140, 1100); b.lineTo(360, 1100); b.lineTo(330, 1140); b.lineTo(170, 1140); b.fill(); b.fillRect(246, 880, 8, 220); poly(b, [[262, 890], [262, 1090], [380, 1090]], '#ffffff', mix(P.band, '#000', .2), 3); poly(b, [[240, 920], [240, 1090], [150, 1090]], P.accent2, mix(P.band, '#000', .2), 3);
      poly(b, [[2250, 1300], [2530, 1300], [2546, 1400], [2230, 1400]], '#6f6a62'); poly(b, [[2300, 1300], [2330, 760], [2450, 760], [2480, 1300]], '#ffffff', '#33465a', 5);
      clipped(b, x => { x.moveTo(2300, 1300); x.lineTo(2330, 760); x.lineTo(2450, 760); x.lineTo(2480, 1300); x.closePath() }, () => { b.fillStyle = mix('#d23b3b', P.accent2, .15); for (let y = 800; y < 1300; y += 150) b.fillRect(2280, y, 220, 70) });
      rounded(b, 2318, 690, 144, 74, 8, '#fff2a8', '#33465a', 5); poly(b, [[2300, 690], [2390, 620], [2480, 690]], mix('#d23b3b', P.accent2, .15), '#33465a', 5);
      g = b.createRadialGradient(2390, 727, 10, 2390, 727, 260); g.addColorStop(0, '#fff6c888'); g.addColorStop(1, '#fff6c800'); b.fillStyle = g; b.fillRect(2100, 450, 446, 560);
      // praia com conchas e estrela-do-mar
      b.fillStyle = sand; b.beginPath(); b.moveTo(0, H); b.lineTo(0, 1640); for (let x = 0; x <= W; x += 100) b.quadraticCurveTo(x + 50, 1620 + (x / 100 % 2 ? 18 : -10), x + 100, 1636); b.lineTo(W, H); b.fill(); clipped(b, x => x.rect(0, 1610, W, 190), () => tex(b, 'stone', .35, .7));
      const star = (x, y, s, col) => { b.fillStyle = col; b.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? s * .42 : s; b.lineTo(x + rr2 * Math.cos(a), y + rr2 * Math.sin(a)) } b.closePath(); b.fill() };
      star(330, 1740, 44, mix('#f08a4b', P.accent2, .2)); star(2210, 1730, 36, mix('#f0b44b', P.accent2, .2));
      for (const [x, y] of [[520, 1760], [1990, 1765]]) { b.fillStyle = '#f6e3d3'; b.beginPath(); b.arc(x, y, 30, Math.PI, 0); b.lineTo(x, y + 8); b.closePath(); b.fill(); b.strokeStyle = '#d4a98a'; b.lineWidth = 3; for (let k = -2; k <= 2; k++) { b.beginPath(); b.moveTo(x, y + 6); b.lineTo(x + k * 13, y - 26 + Math.abs(k) * 6); b.stroke() } }
      // bandeirinhas
      const flags = [P.accent, P.accent2, '#ffffff', mix(P.band, '#ffffff', .2)]; b.strokeStyle = '#33465a'; b.lineWidth = 4; b.beginPath(); b.moveTo(0, 30); b.quadraticCurveTo(1273, 140, W, 30); b.stroke();
      for (let k = 0, x = 40; x < W - 40; x += 92, k++) { const t = x / W, y = 30 + 2 * t * (1 - t) * 110; poly(b, [[x - 34, y], [x + 34, y + 4], [x, y + 74]], flags[k % 4], '#33465a', 2) }
      const plate = mix(P.accent, '#ffffff', .82);
      shadowed(b, '#0000001f', 18, 0, 6, () => rounded(b, 640, 150, 1266, 196, 98, plate));
      title(c, 1273, 258, 96, ensure(P.band, plate, 7), 'center', 1120);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 318, { font: BOLD(28), color: ensure(mix(P.band, '#000', .1), plate, 4.5), size: 28 });
      const n = entries.length, top0 = 400, h = 1060, boxes = n === 2 ? [[170, 1083], [1293, 1083]] : [[300, 1946]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        shadowed(b, '#00000038', 26, 0, 12, () => rounded(b, x, top0, w, h, 34, P.paper));
        clipped(b, rr(x, top0, w, h, 34), () => tex(b, 'paper', .4));
        // moldura de corda
        rounded(b, x + 16, top0 + 16, w - 32, h - 32, 24, null, '#c9a46a', 14); b.save(); b.setLineDash([10, 10]); rounded(b, x + 16, top0 + 16, w - 32, h - 32, 24, null, '#8d6a3a', 7); b.restore();
        // boia no canto
        const bx = x + w - 60, by = top0 + 60; for (let k = 0; k < 8; k++) { b.beginPath(); b.arc(bx, by, 52, k * Math.PI / 4, (k + 1) * Math.PI / 4); b.arc(bx, by, 28, (k + 1) * Math.PI / 4, k * Math.PI / 4, true); b.closePath(); b.fillStyle = k % 2 ? '#ffffff' : '#d23b3b'; b.fill() } circle(b, bx, by, 52, null, '#33465a', 3); circle(b, bx, by, 28, null, '#33465a', 3);
        nameStack(c, e, i, { x, y: top0 + 44, w }, accent, { side: 300 });
        const f = fit(c, e, w - (n === 2 ? 140 : 240), 780, { he: n === 2 ? 90 : 110, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top0 + 256, accent);
        c.blocks.push(f);
      });
      footer(c, 1273, 1688, 1726, 1772, ensure(P.band, sand, 7), ensure(mix(P.band, '#000', .3), sand, 4.5));
    }
  },

  /* 9. Quadro da sala: lousa verde, desenhos de giz e folhas presas com ímãs */
  lousa: {
    name: 'Quadro da sala', palette: 'classico', titleFont: 'amatic',
    paper: P => '#fffefa',
    spots: n => [[200, 220, 0], [2346, 220, 0], [200, 1500, 0], [2346, 1500, 0]],
    draw(c, entries) {
      const { b, P } = c, board = mix('#2c4a3c', P.band, .12), chalk = '#f3f1e8', r = rng(19), woodC = mix('#a0703a', P.accent2, .15);
      b.fillStyle = P.bg; b.fillRect(0, 0, W, H);
      shadowed(b, '#00000055', 30, 0, 12, () => wood(b, 24, 24, W - 48, H - 48, woodC, 22));
      clipped(b, x => x.rect(74, 74, W - 148, H - 148), () => { b.fillStyle = board; b.fillRect(0, 0, W, H); tex(b, 'blotch', .16, 1.6, 'screen'); tex(b, 'paper', .5); b.fillStyle = '#ffffff10'; for (let k = 0; k < 6; k++) { b.beginPath(); b.ellipse(300 + r() * 1900, 300 + r() * 1100, 260, 70, r() * 3, 0, 7); b.fill() } });
      b.strokeStyle = '#00000055'; b.lineWidth = 6; b.strokeRect(74, 74, W - 148, H - 148);
      // desenhos de giz
      b.save(); b.strokeStyle = chalk; b.globalAlpha = .4; b.lineWidth = 6; b.lineCap = 'round';
      b.beginPath(); b.arc(2240, 260, 70, 0, 7); b.stroke(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; b.beginPath(); b.moveTo(2240 + 95 * Math.cos(a), 260 + 95 * Math.sin(a)); b.lineTo(2240 + 130 * Math.cos(a), 260 + 130 * Math.sin(a)); b.stroke() }
      b.beginPath(); for (let k = 0; k < 60; k++) { const a = k * .3, rr2 = 4 + k * 1.6; b.lineTo(300 + rr2 * Math.cos(a), 1380 + rr2 * Math.sin(a)) } b.stroke();
      hexagram(b, 2280, 1380, 70, null, chalk, 6); hexagram(b, 290, 250, 56, null, chalk, 6);
      b.beginPath(); b.moveTo(150, 900); b.quadraticCurveTo(220, 820, 160, 740); b.moveTo(150, 750); b.lineTo(160, 738); b.lineTo(178, 752); b.stroke();
      b.font = '150px "CardHebrew"'; b.fillStyle = chalk; b.globalAlpha = .22; b.textAlign = 'center'; b.direction = 'rtl';
      for (const [l, x, y] of [['א', 170, 640], ['ב', 2380, 640], ['ג', 2380, 1060], ['ד', 170, 1140]]) b.fillText(l, x, y);
      b.restore();
      title(c, 1273, 230, 120, chalk, 'center', 1500);
      b.save(); b.strokeStyle = chalk; b.globalAlpha = .7; b.lineWidth = 6; b.lineCap = 'round'; b.beginPath(); for (let x = 760; x <= 1786; x += 20) b.lineTo(x, 262 + Math.sin(x / 26) * 6); b.stroke(); b.restore();
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 322, { font: TEXT(32), color: ensure(mix(chalk, P.accent2, .25), board, 4.5), size: 32 });
      const n = entries.length, top0 = 380, h = 1060, boxes = n === 2 ? [[190, 1063], [1293, 1063]] : [[300, 1946]], mag = [P.accent, P.accent2, mix(P.band, '#ffffff', .3), '#d8434f'];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        shadowed(b, '#00000066', 22, 6, 12, () => { b.fillStyle = P.paper; b.fillRect(x, top0, w, h) });
        clipped(b, x2 => x2.rect(x, top0, w, h), () => { b.strokeStyle = '#d7e4ef'; b.lineWidth = 2; for (let gx = x; gx < x + w; gx += 46) { b.beginPath(); b.moveTo(gx, top0); b.lineTo(gx, top0 + h); b.stroke() } for (let gy = top0; gy < top0 + h; gy += 46) { b.beginPath(); b.moveTo(x, gy); b.lineTo(x + w, gy); b.stroke() } tex(b, 'paper', .4) });
        for (const [k, mx] of [[0, x + 70], [1, x + w - 70]]) { shadowed(b, '#00000055', 8, 3, 5, () => circle(b, mx, top0 + 8, 30, mag[(i * 2 + k) % 4])); circle(b, mx - 9, top0 - 1, 9, '#ffffff77') }
        nameStack(c, e, i, { x, y: top0 + 44, w }, accent, { side: 200 });
        const f = fit(c, e, w - (n === 2 ? 130 : 230), 790, { he: n === 2 ? 90 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top0 + 250, accent);
        c.blocks.push(f);
      });
      // apoio do giz com apagador
      wood(b, 74, 1626, W - 148, 50, mix(woodC, '#000', .1)); for (const [x, col] of [[600, '#ffffff'], [680, '#f6d36b'], [760, '#9fd3ea']]) rounded(b, x, 1608, 60, 20, 8, col);
      rounded(b, 1900, 1586, 220, 48, 10, mix(P.accent, '#000', .2)); rounded(b, 1900, 1618, 220, 18, 6, '#e8e3d4');
      footer(c, 1273, 1512, 1552, 1756, ensure(chalk, board, 7), ensure('#fdf3df', woodC, 4.5));
    }
  },

  /* 10. Gibi: história em quadrinhos com retícula, explosão e quadros de borda preta */
  gibi: {
    name: 'Gibi', palette: 'roma', titleFont: 'karantina',
    paper: P => '#ffffff',
    spots: n => [[2120, 200, 0], [120, 1700, 0], [2440, 1700, 0], [2440, 380, 0]],
    draw(c, entries) {
      const { b, P } = c, ink = '#14161c', yellow = mix('#ffe04a', P.accent2, .25);
      b.fillStyle = mix(P.bg, '#ffffff', .3); b.fillRect(0, 0, W, H);
      // raios saindo do centro
      for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18; b.fillStyle = k % 2 ? mix(P.accent2, '#ffffff', .72) : mix(P.accent, '#ffffff', .82); b.beginPath(); b.moveTo(1273, 900); b.lineTo(1273 + 3000 * Math.cos(a), 900 + 3000 * Math.sin(a)); b.lineTo(1273 + 3000 * Math.cos(a + Math.PI / 18), 900 + 3000 * Math.sin(a + Math.PI / 18)); b.fill() }
      // retícula de pontinhos
      const dot = mix(P.accent, '#ffffff', .45) + '88'; for (let y = 0; y < H; y += 34) for (let x = (y / 34 % 2) * 17; x < W; x += 34) { const d = Math.hypot(x - 1273, y - 900) / 1500; circle(b, x, y, 2 + d * 7, dot) }
      // explosão do título
      const pts = [], L = 90, T = 46, Wd = 1560, Ht = 300; for (let k = 0; k <= 40; k++) pts.push([L + Wd * k / 40, T + (k % 2 ? 0 : 26)]); for (let k = 0; k <= 8; k++) pts.push([L + Wd + (k % 2 ? 30 : 0), T + Ht * k / 8]); for (let k = 40; k >= 0; k--) pts.push([L + Wd * k / 40, T + Ht - (k % 2 ? 0 : 26)]); for (let k = 8; k >= 0; k--) pts.push([L - (k % 2 ? 30 : 0), T + Ht * k / 8]);
      b.save(); b.translate(18, 18); poly(b, pts, ink); b.restore(); poly(b, pts, yellow, ink, 8);
      title(c, 160, 232, 118, ink, 'left', 1420);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 164, 300, { font: BOLD(32), color: ink, align: 'left', size: 32 });
      // balão "UAU!"
      b.save(); b.translate(2090, 200); poly(b, [[-40, 90], [-110, 175], [20, 110]], '#ffffff', ink, 7); b.beginPath(); b.ellipse(0, 0, 250, 135, 0, 0, 7); b.fillStyle = '#ffffff'; b.fill(); b.lineWidth = 7; b.strokeStyle = ink; b.stroke(); b.fillStyle = '#ffffff'; b.fillRect(-60, 92, 70, 30); b.restore();
      b.save(); b.font = '120px "T-Karantina"'; b.textAlign = 'center'; b.fillStyle = mix(P.accent, '#000', .1); b.fillText('UAU!', 2090, 240); b.restore();
      const n = entries.length, top0 = 430, h = 1060, boxes = n === 2 ? [[100, 1133], [1313, 1133]] : [[110, 2326]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        b.fillStyle = ink; b.fillRect(x + 20, top0 + 20, w, h); b.fillStyle = P.paper; b.fillRect(x, top0, w, h); b.strokeStyle = ink; b.lineWidth = 12; b.strokeRect(x, top0, w, h);
        const label = n === 2 ? 'NOME ' + (i + 1) : 'MEU NOME'; c.t.font = BOLD(28); const lw = c.t.measureText(label).width + 60;
        b.fillStyle = yellow; b.fillRect(x - 6, top0 - 6, lw, 66); b.strokeStyle = ink; b.lineWidth = 7; b.strokeRect(x - 6, top0 - 6, lw, 66);
        text(c, label, x - 6 + lw / 2, top0 + 38, { font: BOLD(28), color: ink, size: 28 });
        nameStack(c, e, i, { x, y: top0 + 30, w }, accent, { noLabel: true, side: 2 * lw + 40 });
        const f = fit(c, e, w - (n === 2 ? 130 : 240), 800, { he: n === 2 ? 92 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top0 + 240, accent);
        c.blocks.push(f);
      });
      b.fillStyle = ink; b.fillRect(430, 1590, 1706, 112); b.fillStyle = '#ffffff'; b.fillRect(420, 1580, 1706, 112); b.strokeStyle = ink; b.lineWidth = 7; b.strokeRect(420, 1580, 1706, 112);
      footer(c, 1273, 1626, 1666, 1752, ink, ink);
      rounded(b, 740, 1724, 1066, 42, 6, '#ffffffe6');
    }
  }
};

/* ---------- API ---------- */
const pool = {};
function surface(name) { let s = pool[name]; if (!s) s = pool[name] = document.createElement('canvas'); if (s.width !== W) { s.width = W; s.height = H } const x = s.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); return s }
function defaults(template = 'detetive') { return { template, palette: null, custom: null, titleFont: null, pasukFont: 'david', ptColor: null, ptScale: 1, stickers: [] } }
function effective(design) { const tpl = TEMPLATES[design.template] || TEMPLATES.detetive; return Object.assign({}, design, { palette: design.palette || tpl.palette, titleFont: design.titleFont || tpl.titleFont }) }
function render(entries, art, design) {
  if (!entries.length || entries.length > 2) throw new Error('Informe um ou dois nomes.');
  design = effective(design || defaults()); const tpl = TEMPLATES[design.template] || TEMPLATES.detetive;
  const base = surface('base'), txt = surface('text');
  const c = { b: base.getContext('2d'), t: txt.getContext('2d'), design, n: entries.length, protect: [], blocks: [], ptReduced: false };
  c.P = colors(design, tpl);
  tpl.draw(c, entries, art);
  // limites da página também protegem o texto de enfeites que saiam da folha
  return { base, text: txt, protect: c.protect, blocks: c.blocks, notes: c.P.notes, ptReduced: c.ptReduced, spots: tpl.spots(entries.length), colors: c.P };
}
function compose(r, stickers, images, out, opts = {}) {
  const x = out.getContext('2d'), k = out.width / W; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, out.width, out.height);
  x.imageSmoothingQuality = 'high'; x.drawImage(r.base, 0, 0, out.width, out.height);
  for (const s of stickers || []) { const img = images && images[s.id]; if (!img) continue; x.save(); x.translate(s.x * k, s.y * k); x.rotate(s.r * Math.PI / 180); x.drawImage(img, -s.s * k / 2, -s.s * k / 2, s.s * k, s.s * k); x.restore() }
  x.drawImage(r.text, 0, 0, out.width, out.height);
  if (opts.debug) { x.strokeStyle = '#ff0000'; x.lineWidth = 2; for (const p of r.protect) x.strokeRect(p.x * k, p.y * k, p.w * k, p.h * k) }
  return out;
}
// compatível com a versão anterior: Card.draw(entries, art) devolve o cartão Detetive pronto
function draw(entries, art, design, images) { const r = render(entries, art, design); const out = document.createElement('canvas'); out.width = W; out.height = H; compose(r, design && design.stickers, images, out); out.cardLayout = r.blocks.map(b => ({ size: b.size, ptSize: b.pt, height: b.total, maxHeight: b.maxH, fits: b.fits })); out.cardProtect = r.protect; return out }
function layout(ctx, entries) { const r = render(entries, null, defaults()); return r.blocks }
function pdf(canvas) { const bytes = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', .95).split(',')[1]), c => c.charCodeAt(0)); const enc = new TextEncoder(), parts = [], offset = [0]; let len = 0; function add(s) { const b = typeof s === 'string' ? enc.encode(s) : s; parts.push(b); len += b.length } function obj(n, s) { offset[n] = len; add(n + ' 0 obj\n' + s + '\nendobj\n') } add('%PDF-1.4\n'); obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'); obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'); offset[4] = len; add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`); add(bytes); add('\nendstream\nendobj\n'); let content = 'q 841.89 0 0 595.28 0 0 cm /Im0 Do Q'; obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`); const start = len; add('xref\n0 6\n0000000000 65535 f \n'); for (let i = 1; i <= 5; i++)add(String(offset[i]).padStart(10, '0') + ' 00000 n \n'); add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`); return new Blob(parts, { type: 'application/pdf' }) }
function download(blob, name) { let a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000) }
return { W, H, loadTextures, draw, render, compose, layout, pdf, download, lines, defaults, effective, TEMPLATES, PALETTES, TITLE_FONTS, PASUK_FONTS, PT_SCALES, contrast, ensure, colors, font, byId };
})();
