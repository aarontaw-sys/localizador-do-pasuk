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

/* ---------- os cinco modelos ---------- */
const TEMPLATES = {
  detetive: {
    name: 'Detetive', palette: 'classico', titleFont: 'fredoka',
    spots: n => [[2380, 1450, 200], [170, 1450, 200], [1273, 1460, 160], [1790, 200, 150]],
    draw(c, entries, art) {
      const { b, P } = c; b.fillStyle = P.bg; b.fillRect(0, 0, W, H);
      rounded(b, 28, 28, 2490, 1744, 42, P.card); rounded(b, 58, 58, 2430, 286, 35, P.band);
      rounded(b, 104, 87, 480, 47, 23, P.badge);
      text(c, 'LOCALIZADOR DO PASUK', 129, 119, { font: BOLD(24), color: ensure(P.band, P.badge, 4.5), align: 'left', size: 24 });
      title(c, 100, 231, 87, P.onBand, 'left', 1740);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 105, 294, { font: TEXT(32), color: P.onBand2, align: 'left', size: 32 });
      if (art) { b.save(); rounded(b, 1886, 77, 581, 248, 25); b.clip(); const aw = art.naturalWidth || art.width, ah = art.naturalHeight || art.height, ratio = 581 / 248, sw = aw, sh = sw / ratio; b.drawImage(art, 0, Math.max(0, (ah - sh) / 2), sw, sh, 1886, 77, 581, 248); b.restore() }
      const n = entries.length, w = n === 2 ? 1164 : 2384;
      entries.forEach((e, i) => {
        const left = 80 + i * 1222, top = 390, cx = left + w / 2, accent = i ? P.acc2 : P.acc1, textW = n === 2 ? w - 126 : 1970;
        rounded(b, left, top, w, 1110, 32, P.panel, P.line); rounded(b, left + 24, top + 24, w - 48, 158, 24, i ? P.soft2 : P.soft1);
        nameRow(c, e, i, { x: left + 24, y: top + 24, w: w - 48 }, accent);
        const f = fit(c, e, textW, 820, { he: n === 2 ? 94 : 114, comfort: 52, heMin: 52, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 212, accent);
        c.blocks.push(f);
      });
      rounded(b, 80, 1532, 2384, 114, 25, P.soft1);
      footer(c, 1273, 1579, 1621, 1694, P.ink, P.muted);
    }
  },

  jerusalem: {
    name: 'Jerusalém', palette: 'ceu', titleFont: 'suez',
    paper: P => mix(P.bg, '#fffdf7', .8),
    spots: n => [[150, 1700, 150], [2396, 1700, 150], [1273, 1500, 0], [600, 1500, 0]],
    draw(c, entries) {
      const { b, P } = c, sky1 = mix(P.band, '#ffffff', .78), sky2 = mix(P.accent2, '#ffffff', .7);
      let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky1); g.addColorStop(.75, sky2); g.addColorStop(1, sky2); b.fillStyle = g; b.fillRect(0, 0, W, H);
      g = b.createRadialGradient(2160, 300, 20, 2160, 300, 420); g.addColorStop(0, mix(P.accent2, '#ffffff', .55)); g.addColorStop(1, mix(P.accent2, '#ffffff', .55) + '00'); b.fillStyle = g; b.fillRect(1600, 0, 946, 900);
      // silhueta da Cidade Velha dos dois lados do título
      const stone = mix('#e6c98f', P.accent2, .2), stone2 = mix(stone, '#7a5a2a', .25), ol = mix(P.band, '#000000', .2), dome = mix(P.band, '#ffffff', .65), tree = mix(P.accent, '#2f5d3a', .6);
      b.fillStyle = mix(P.accent2, sky2, .45); b.beginPath(); b.moveTo(0, 352); b.bezierCurveTo(500, 316, 900, 362, 1273, 340); b.bezierCurveTo(1700, 318, 2100, 360, W, 330); b.lineTo(W, 420); b.lineTo(0, 420); b.fill();
      const house = (x, y, w, h) => { rounded(b, x, y, w, h, 4, stone, ol, 6); for (let k = x + 28; k < x + w - 30; k += 64) rounded(b, k, y + 34, 24, 40, 12, ol) };
      const cypress = (x, y, h) => { b.fillStyle = tree; b.beginPath(); b.ellipse(x, y - h / 2, 30, h / 2, 0, 0, 7); b.fill(); b.strokeStyle = ol; b.lineWidth = 5; b.stroke() };
      cypress(46, 352, 190); house(80, 215, 170, 140); rounded(b, 270, 200, 210, 155, 4, stone, ol, 6);
      b.fillStyle = dome; b.beginPath(); b.ellipse(375, 202, 104, 108, 0, Math.PI, 0); b.closePath(); b.fill(); b.strokeStyle = ol; b.lineWidth = 6; b.stroke(); rounded(b, 362, 70, 26, 30, 4, dome, ol, 5);
      for (const x of [300, 352, 404]) rounded(b, x, 250, 26, 60, 13, ol);
      house(500, 240, 170, 115); cypress(708, 356, 170);
      rounded(b, 1830, 130, 150, 225, 4, stone, ol, 6); for (let k = 0; k < 4; k++) rounded(b, 1824 + k * 44, 98, 30, 40, 3, stone, ol, 5); rounded(b, 1890, 190, 30, 64, 15, ol);
      cypress(1800, 356, 160); house(2000, 225, 200, 130); house(2220, 255, 170, 100); cypress(2440, 356, 200); cypress(2500, 356, 150);
      // muralha
      b.fillStyle = stone; b.beginPath(); b.moveTo(0, 1500); for (let x = 0; x < W; x += 92) { b.lineTo(x, 1460); b.lineTo(x + 46, 1460); b.lineTo(x + 46, 1500); b.lineTo(x + 92, 1500) } b.lineTo(W, H); b.lineTo(0, H); b.closePath(); b.fill(); b.strokeStyle = ol; b.lineWidth = 6; b.stroke();
      b.strokeStyle = stone2; b.lineWidth = 4; for (let y = 1560, r = 0; y < H; y += 60, r++) for (let x = r % 2 ? 0 : 70; x < W; x += 140) { b.beginPath(); b.moveTo(x, y); b.lineTo(x + 110, y); b.stroke() }
      // título
      const tc = ensure(P.band, sky1, 4.5);
      title(c, 1273, 190, 100, tc, 'center', 1000);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 262, { font: TEXT(34), color: ensure(mix(P.band, '#000', .1), sky1, 4.5), size: 34 });
      b.fillStyle = P.accent2; for (const s of [-1, 1]) { b.fillRect(1273 + s * 120 - (s < 0 ? 220 : 0), 296, 220, 5); b.save(); b.translate(1273 + s * 360, 298); b.rotate(Math.PI / 4); b.fillRect(-11, -11, 22, 22); b.restore() }
      // janelas em arco
      const n = entries.length, top = 400, h = 1045, arc = 120;
      const boxes = n === 2 ? [[150, 1093], [1303, 1093]] : [[330, 1886]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        const arch = (inset, fill, stroke, lw) => { b.beginPath(); b.moveTo(x + inset, top + h - inset); b.lineTo(x + inset, top + arc + inset); b.ellipse(cx, top + arc + inset, w / 2 - inset, arc, 0, Math.PI, 0); b.lineTo(x + w - inset, top + h - inset); b.closePath(); if (fill) { b.fillStyle = fill; b.fill() } if (stroke) { b.strokeStyle = stroke; b.lineWidth = lw; b.stroke() } };
        b.save(); b.shadowColor = '#00000030'; b.shadowBlur = 30; b.shadowOffsetY = 12; arch(0, P.paper); b.restore();
        arch(0, null, stone2, 14); arch(22, null, P.accent2, 3);
        nameStack(c, e, i, { x, y: top + 70, w }, accent, { side: 200 });
        const f = fit(c, e, w - (n === 2 ? 110 : 220), 720, { he: n === 2 ? 90 : 110, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 280, accent);
        c.blocks.push(f);
      });
      rounded(b, 330, 1556, 1886, 118, 59, P.paper, stone2, 6);
      footer(c, 1273, 1603, 1645, 1750, ensure(P.band, P.paper, 7), ensure(mix(P.band, '#000', .3), stone, 4.5));
    }
  },

  pergaminho: {
    name: 'Pergaminho', palette: 'terra', titleFont: 'bellefair',
    paper: P => mix('#f5e6c4', P.bg, .15),
    spots: n => [[110, 1730, 0], [1273, 1500, 150], [430, 1520, 150], [2116, 1520, 150], [430, 300, 150], [2116, 300, 150]],
    draw(c, entries) {
      const { b, P } = c, par = P.paper, par2 = mix(par, '#8a5a2b', .28), wood = mix('#8a5a2b', P.band, .25), wood2 = mix(wood, '#000', .35);
      b.fillStyle = P.bg; b.fillRect(0, 0, W, H);
      b.strokeStyle = mix(P.bg, P.accent, .12); b.lineWidth = 14; for (let x = -H; x < W; x += 90) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x + H, H); b.stroke() }
      // folha
      let g = b.createRadialGradient(1273, 900, 300, 1273, 900, 1400); g.addColorStop(0, mix(par, '#ffffff', .35)); g.addColorStop(1, par); b.save(); b.shadowColor = '#00000040'; b.shadowBlur = 40; b.shadowOffsetY = 14; b.fillStyle = g; b.fillRect(230, 175, 2086, 1450); b.restore();
      b.strokeStyle = par2; b.lineWidth = 3; b.strokeRect(290, 225, 1966, 1350); b.strokeRect(306, 241, 1934, 1318);
      // rolos laterais com cabos de madeira
      for (const x of [160, 2386]) {
        for (const [y1, y2] of [[50, 190], [1610, 1750]]) { rounded(b, x - 24, y1, 48, y2 - y1, 22, wood, wood2, 5); circle(b, x, y1 < 900 ? y1 : y2, 30, mix(P.accent2, '#e8b54a', .5), wood2, 5) }
        g = b.createLinearGradient(x - 90, 0, x + 90, 0); g.addColorStop(0, par2); g.addColorStop(.45, mix(par, '#ffffff', .4)); g.addColorStop(1, par2);
        rounded(b, x - 90, 150, 180, 1500, 60, g, wood2, 5);
        for (const y of [200, 1600]) { b.fillStyle = mix(P.accent2, '#e8b54a', .5); b.beginPath(); b.ellipse(x, y, 110, 26, 0, 0, 7); b.fill(); b.strokeStyle = wood2; b.lineWidth = 5; b.stroke() }
      }
      // faixa do título
      const band = P.band, band2 = mix(P.band, '#000', .3);
      poly(b, [[620, 110], [800, 110], [800, 290], [620, 290], [670, 200]], band2); poly(b, [[1926, 110], [1746, 110], [1746, 290], [1926, 290], [1876, 200]], band2);
      rounded(b, 740, 80, 1066, 200, 18, band); b.strokeStyle = mix(P.accent2, '#ffffff', .3); b.lineWidth = 4; b.strokeRect(764, 100, 1018, 160);
      title(c, 1273, 210, 96, P.onBand, 'center', 960);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 352, { font: TEXT(32), color: ensure(P.band, par, 7), size: 32 });
      const n = entries.length, top = 400, boxes = n === 2 ? [[330, 913], [1303, 913]] : [[380, 1786]];
      if (n === 2) { b.strokeStyle = mix(P.accent2, par, .2); b.lineWidth = 4; b.beginPath(); b.moveTo(1273, 430); b.lineTo(1273, 1400); b.stroke(); b.save(); b.translate(1273, 915); b.rotate(Math.PI / 4); b.fillStyle = P.accent2; b.fillRect(-16, -16, 32, 32); b.restore() }
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        nameStack(c, e, i, { x, y: top, w }, accent, { flourish: mix(P.accent2, par, .2), side: 360 });
        const f = fit(c, e, w - 40, 820, { he: n === 2 ? 92 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 222, accent, { divider: P.accent2 });
        c.blocks.push(f);
      });
      b.strokeStyle = par2; b.lineWidth = 3; b.beginPath(); b.moveTo(700, 1468); b.lineTo(1846, 1468); b.stroke();
      footer(c, 1273, 1512, 1552, 1765, ensure(P.band, par, 7), ensure(mix(P.band, '#000', .2), P.bg, 4.5));
    }
  },

  geometrico: {
    name: 'Geométrico colorido', palette: 'lavanda', titleFont: 'bubbles',
    spots: n => [[1960, 200, 190], [2330, 205, 170], [120, 1700, 0], [2440, 1700, 0]],
    draw(c, entries) {
      const { b, P } = c, r = rng(11), cols = [mix(P.accent, '#ffffff', .55), mix(P.accent2, '#ffffff', .5), mix(P.band, '#ffffff', .7), mix(P.accent, '#ffffff', .75)];
      b.fillStyle = P.bg; b.fillRect(0, 0, W, H);
      b.fillStyle = mix(P.band, P.bg, .9); for (let y = 30; y < H; y += 60) for (let x = (y / 60 % 2) * 30; x < W; x += 60) { b.beginPath(); b.arc(x, y, 5, 0, 7); b.fill() }
      circle(b, 2330, 120, 300, cols[0]); circle(b, 90, 1700, 260, cols[1]);
      poly(b, [[2546, 1250], [2546, 1800], [2000, 1800]], cols[2]); poly(b, [[0, 300], [220, 520], [0, 740]], cols[3]);
      for (let k = 0; k < 14; k++) { const x = r() * W, y = r() * H, s = 30 + r() * 50, col = cols[k % 4]; if (k % 3 === 0) circle(b, x, y, s * .6, col); else if (k % 3 === 1) poly(b, [[x, y - s], [x + s, y + s * .7], [x - s, y + s * .7]], col); else { b.save(); b.translate(x, y); b.rotate(r() * 3); b.fillStyle = col; b.fillRect(-s / 2, -s / 2, s, s); b.restore() } }
      // cabeçalho com sombra sólida
      rounded(b, 98, 88, 1650, 262, 40, P.accent2); rounded(b, 80, 70, 1650, 262, 40, P.band);
      title(c, 140, 212, 96, P.onBand, 'left', 1520);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 142, 288, { font: TEXT(32), color: P.onBand2, align: 'left', size: 32 });
      circle(b, 1960, 200, 110, P.accent, P.band, 10); poly(b, [[2160, 330], [2260, 120], [2360, 330]], P.accent2, P.band, 10); b.save(); b.translate(2400, 330); b.rotate(.3); rounded(b, -60, -60, 120, 120, 16, mix(P.band, '#ffffff', .4), P.band, 10); b.restore();
      const n = entries.length, top = 440, h = 1040, boxes = n === 2 ? [[110, 1128], [1308, 1128]] : [[110, 2326]];
      entries.forEach((e, i) => {
        const [x, w] = boxes[i], cx = x + w / 2, accent = i ? P.acc2 : P.acc1, fill = i ? P.accent2 : P.accent;
        rounded(b, x + 22, top + 22, w, h, 36, fill); rounded(b, x, top, w, h, 36, P.panel, P.band, 8);
        const label = n === 2 ? 'NOME ' + (i + 1) : 'MEU NOME'; c.t.font = BOLD(26); const lw = c.t.measureText(label).width + 80;
        rounded(b, x + 50, top - 40, lw, 76, 38, fill, P.band, 6);
        text(c, label, x + 50 + lw / 2, top + 9, { font: BOLD(26), color: best(fill, '#ffffff', '#10202b'), size: 26 });
        nameStack(c, e, i, { x, y: top + 10, w }, accent, { noLabel: true, side: 160 });
        const f = fit(c, e, n === 2 ? w - 110 : 1970, 800, { he: n === 2 ? 92 : 112, comfort: 52, heMin: 50, pt: 34, ptMin: 27 });
        verse(c, e, f, cx, top + 220, accent);
        c.blocks.push(f);
      });
      rounded(b, 230, 1552, 2086, 110, 55, P.band);
      footer(c, 1273, 1598, 1638, 1730, P.onBand, ensure(P.band, P.bg, 4.5));
    }
  },

  biblioteca: {
    name: 'Biblioteca de Torá', palette: 'classico', titleFont: 'heebo',
    paper: P => mix('#fbf4e2', P.bg, .1),
    spots: n => [[90, 900, 0], [2456, 900, 0], [300, 1720, 0], [2246, 1720, 0], [250, 170, 170], [2296, 170, 170]],
    draw(c, entries) {
      const { b, P } = c, wall = ensure(mix(P.band, '#000000', .25), '#ffffff', 9), wood = mix('#7a4a22', P.band, .15), wood2 = mix(wood, '#000', .4), page = P.paper, r = rng(5);
      b.fillStyle = wall; b.fillRect(0, 0, W, H);
      b.fillStyle = '#ffffff10'; for (let x = 0; x < W; x += 180) b.fillRect(x, 0, 6, H);
      // estante com livros
      const spines = [P.accent, P.accent2, mix(P.accent, '#000', .35), mix(P.accent2, '#000', .3), '#e9dfc8', mix(P.band, '#ffffff', .25)];
      for (let x = 30; x < W - 40;) { const w = 46 + r() * 50, h = 170 + r() * 90, col = spines[Math.floor(r() * spines.length)]; rounded(b, x, 300 - h, w, h, 6, col, wood2, 4); b.fillStyle = mix(P.accent2, '#ffe9a8', .5); b.fillRect(x + 6, 300 - h + 24, w - 12, 6); b.fillRect(x + 6, 270, w - 12, 6); x += w + 4 }
      rounded(b, 0, 296, W, 44, 6, wood, wood2, 4);
      // plaquinha do título
      rounded(b, 653, 56, 1240, 222, 30, page, P.accent2, 10); rounded(b, 675, 78, 1196, 178, 20, null, mix(P.accent2, page, .4), 3);
      title(c, 1273, 178, 92, ensure(P.band, page, 7), 'center', 1120);
      text(c, 'Meu nome. Minhas letras. Minha descoberta.', 1273, 238, { font: TEXT(30), color: P.muted2, size: 30 });
      // livro aberto
      rounded(b, 140, 372, 2266, 1190, 34, mix(P.band, '#000', .15));
      for (let k = 3; k >= 1; k--) { b.fillStyle = mix(page, '#b89a6a', .25 + k * .08); b.beginPath(); b.moveTo(170, 400 + k * 10); b.lineTo(170, 1515 + k * 9); b.bezierCurveTo(600, 1490 + k * 9, 1000, 1500 + k * 9, 1273, 1540 + k * 9); b.bezierCurveTo(1546, 1500 + k * 9, 1946, 1490 + k * 9, 2376, 1515 + k * 9); b.lineTo(2376, 400 + k * 10); b.fill() }
      for (const s of [-1, 1]) { const g = b.createLinearGradient(1273, 0, 1273 + s * 1100, 0); g.addColorStop(0, mix(page, '#b89a6a', .35)); g.addColorStop(.12, page); g.addColorStop(1, page); b.fillStyle = g; b.beginPath(); b.moveTo(1273, 440); b.bezierCurveTo(1273 + s * 300, 390, 1273 + s * 800, 380, 1273 + s * 1103, 400); b.lineTo(1273 + s * 1103, 1510); b.bezierCurveTo(1273 + s * 800, 1490, 1273 + s * 300, 1500, 1273, 1540); b.closePath(); b.fill(); b.strokeStyle = mix(page, '#8a6a3a', .35); b.lineWidth = 3; b.stroke() }
      poly(b, [[1293, 1500], [1293, 1640], [1318, 1615], [1343, 1640], [1343, 1500]], P.accent, mix(P.accent, '#000', .3), 3);
      // mesa e rodapé
      b.fillStyle = wood; b.fillRect(0, 1600, W, 200); b.fillStyle = wood2; b.fillRect(0, 1600, W, 10);
      const n = entries.length;
      if (n === 2) entries.forEach((e, i) => {
        const x = i ? 1346 : 240, w = 960, cx = x + w / 2, accent = i ? P.acc2 : P.acc1;
        nameStack(c, e, i, { x, y: 450, w }, accent, { side: 140 });
        const f = fit(c, e, w - 40, 820, { he: 88, comfort: 50, heMin: 48, pt: 33, ptMin: 26 });
        verse(c, e, f, cx, 660, accent, { divider: P.accent2 });
        c.blocks.push(f);
      });
      else {
        const e = entries[0], accent = P.acc1;
        nameStack(c, e, 0, { x: 1346, y: 450, w: 960 }, accent, { side: 140 });
        const f = fit(c, e, 900, 820, { he: 104, comfort: 52, heMin: 48, pt: 34, ptMin: 26, ptW: 0, gap: 40 });
        let y = 660 + Math.max(0, (820 - f.total) / 2), y0 = y; const h = drawHebrew(c, f, 1826, y); y = h.y;
        const ref = `${e.v.book} ${e.v.chapter}:${e.v.verse}`; const rw = text(c, ref, 1826, y + 30, { font: BOLD(30), color: accent, size: 30, free: true });
        protect(c, 1826 - Math.max(h.maxW, rw) / 2, y0, Math.max(h.maxW, rw), y + 40 - y0);
        // página da tradução
        const want = Math.round(46 * PT_SCALES[c.design.ptScale ?? 1]); let pt = want, pl; c.t.font = TEXT(pt);
        for (; ; pt--) { c.t.font = TEXT(pt); pl = lines(c.t, e.v.translation, 860); if (pl.length * pt * 1.45 <= 700 || pt <= 24) break } pl = balanced(c.t, e.v.translation, 860);
        text(c, 'TRADUÇÃO', 760, 520, { font: BOLD(24), color: P.acc2, size: 24 });
        c.t.fillStyle = P.accent2; c.t.fillRect(710, 548, 100, 5);
        let ty = 640 + Math.max(0, (700 - pl.length * pt * 1.45) / 2) + pt; const tr = drawTranslation(c, f, 760, ty, pl, pt);
        protect(c, 760 - tr.maxW / 2, ty - pt, tr.maxW, tr.y - ty);
        c.ptReduced = pt < want; c.blocks.push(Object.assign({}, f, { pt, ptPage: { lines: pl.length, total: pl.length * pt * 1.45, maxH: 700 } }));
      }
      footer(c, 1273, 1672, 1714, 1770, ensure('#fbf1dc', wood, 7), ensure('#e7d3b0', wood, 4.5));
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
return { W, H, draw, render, compose, layout, pdf, download, lines, defaults, effective, TEMPLATES, PALETTES, TITLE_FONTS, PASUK_FONTS, PT_SCALES, contrast, ensure, colors, font, byId };
})();
