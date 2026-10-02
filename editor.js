/* Editor "Personalizar meu cartão": modelos, enfeites, cores, letras e tradução.
   Tudo acontece no aparelho do aluno; nada é enviado ou guardado no servidor. */
window.Editor = (() => {
const $ = s => document.querySelector(s), W = Card.W, H = Card.H;
const STICKERS_JUDAISMO = [['estrela-de-david', 'Estrela de Davi'], ['menora', 'Menorá'], ['rolo-de-tora', 'Rolo de Torá'], ['livro-aberto', 'Livro aberto'], ['tabuas-da-alianca', 'Tábuas da aliança'], ['jerusalem', 'Jerusalém'], ['kotel', 'Kotel'], ['roma', 'Romã'], ['ramo-de-oliveira', 'Ramo de oliveira'], ['shofar', 'Shofar'], ['taca-de-kidush', 'Taça de kidush'], ['coroa', 'Coroa'], ['lupa', 'Lupa'], ['pena', 'Pena'], ['pergaminho', 'Pergaminho'], ['bandeira-de-israel', 'Bandeira de Israel'], ['kipa', 'Kipá'], ['talit', 'Talit'], ['tefilin', 'Tefilin'], ['chala', 'Chalá'], ['vela-de-havdala', 'Vela de havdalá'], ['besamim', 'Besamim'], ['lulav-e-etrog', 'Lulav e etrog'], ['suca', 'Sucá'], ['caixa-de-tsedaca', 'Caixa de tsedacá']];
const STICKER_GROUPS = [
  ['Judaísmo e Israel', STICKERS_JUDAISMO],
  ['Esportes', [['bola-de-futebol', 'Bola de futebol'], ['bola-de-basquete', 'Bola de basquete'], ['bola-de-volei', 'Bola de vôlei'], ['raquete-de-tenis', 'Tênis'], ['ping-pong', 'Pingue-pongue'], ['oculos-de-natacao', 'Natação'], ['skate', 'Skate'], ['bicicleta', 'Bicicleta'], ['trofeu', 'Troféu']]],
  ['Jogos e brinquedos', [['controle-de-videogame', 'Videogame'], ['cubo-magico', 'Cubo mágico'], ['blocos-de-montar', 'Blocos de montar'], ['robo', 'Robô'], ['carro-de-corrida', 'Carro de corrida']]],
  ['Música e arte', [['violao', 'Violão'], ['tambor', 'Tambor'], ['fones-de-ouvido', 'Fones de ouvido'], ['caixa-de-som', 'Caixa de som'], ['paleta-de-pintura', 'Pintura'], ['lapis-de-cor', 'Lápis de cor'], ['camera', 'Câmera']]],
  ['Aventura e ciência', [['foguete', 'Foguete'], ['planeta', 'Planeta'], ['bussola', 'Bússola'], ['mochila', 'Mochila']]]
];
const STICKERS = STICKER_GROUPS.flatMap(g => g[1]);
const PT_COLORS = ['#1b3548', '#0e6b70', '#2f5d3a', '#7a1f3d', '#b03030', '#8a4b0f', '#4b3a8c', '#000000'];
const SWATCHES = ['#f1f8f8', '#fdf3e1', '#fff1e3', '#fbeef0', '#f1eefb', '#eef5e6', '#e8f7f8', '#ffffff', '#163e54', '#1f4e79', '#3d2f6b', '#7a1f3d', '#2f5d3a', '#5c3a1a', '#0d4d63', '#8a3b12', '#138c91', '#2a8fbd', '#7b61c9', '#d8434f', '#6d9a3a', '#ef7d32', '#e8b54a', '#ce9324'];
const K = .44, MIN = 110, MAX = 700, esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let entries = [], art, design = null, r = null, imgs = {}, history = [], future = [], selected = null, drag = null, uid = 1, built = false, frame = 0, tab = 'modelo';
const pointers = new Map();

/* ---------- estado e histórico ---------- */
const snap = () => JSON.stringify(design);
function commit(prev) { history.push(prev); if (history.length > 80) history.shift(); future = []; buttons() }
function buttons() { $('#undo').disabled = !history.length; $('#redo').disabled = !future.length }
function note(s) { $('#edNote').textContent = s || '' }
function notes() { const a = r.notes.slice(); if (r.ptReduced) a.push('A tradução foi ajustada para caber inteira no cartão.'); return a.join(' ') }

async function fonts(d) {
  const e = Card.effective(d), tf = Card.byId(Card.TITLE_FONTS, e.titleFont), pf = Card.byId(Card.PASUK_FONTS, e.pasukFont);
  await Promise.all([Card.font(tf, 40), Card.font(pf, 40), '40px "CardText"', 'bold 40px "CardText"'].map(f => document.fonts.load(f, 'אבג Meu á')));
}
async function images(ids) {
  await Promise.all([...new Set(ids)].filter(id => !imgs[id]).map(id => new Promise(res => { const i = new Image(); i.onload = () => { imgs[id] = i; res() }; i.onerror = res; i.src = 'stickers/' + id + '.png' })));
}
function layout() { r = Card.render(entries, art, design) }

/* ---------- geometria dos enfeites ---------- */
const half = s => { const a = s.r * Math.PI / 180; return s.s * K * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) };
const hits = (s, p) => { const h = half(s); return s.x + h > p.x && s.x - h < p.x + p.w && s.y + h > p.y && s.y - h < p.y + p.h };
function inPage(s) { const h = Math.min(half(s), W / 2 - 12), m = 12; s.x = Math.min(Math.max(s.x, h + m), W - h - m); s.y = Math.min(Math.max(s.y, h + m), H - h - m); return s }
function free(s) { return !r.protect.some(p => hits(s, p)) }
// empurra o enfeite para fora das áreas de texto; devolve null se não houver saída próxima
function resolve(s) {
  let best = null, bestD = Infinity;
  const walk = (t, depth) => {
    inPage(t); const p = r.protect.find(p => hits(t, p));
    if (!p) { const d = Math.hypot(t.x - s.x, t.y - s.y); if (d < bestD) { bestD = d; best = t } return }
    if (!depth) return;
    const h = half(t);
    for (const [dx, dy] of [[p.x - h - 1 - t.x, 0], [p.x + p.w + h + 1 - t.x, 0], [0, p.y - h - 1 - t.y], [0, p.y + p.h + h + 1 - t.y]]) walk(Object.assign({}, t, { x: t.x + dx, y: t.y + dy }), depth - 1);
  };
  walk(Object.assign({}, s), 4);
  return best;
}
function overlap(a, b) { const ha = half(a), hb = half(b), w = Math.min(a.x + ha, b.x + hb) - Math.max(a.x - ha, b.x - hb), h = Math.min(a.y + ha, b.y + hb) - Math.max(a.y - ha, b.y - hb); return w > 0 && h > 0 ? w * h / (4 * ha * ha) : 0 }
// procura um lugar livre: primeiro os cantos sugeridos pelo modelo, depois uma grade
function place(s, near) {
  const grid = []; for (let y = 90; y < H; y += 70) for (let x = 90; x < W; x += 70) grid.push([x, y]);
  const spots = r.spots.map(p => [p[0], p[1]]), others = design.stickers.filter(o => o !== s);
  const sizes = []; for (let v = s.s; v > MIN; v *= .88) sizes.push(v); sizes.push(MIN);
  for (const size of sizes) {
    let bestC = null, bestScore = Infinity;
    [...spots, ...grid].forEach(([x, y], i) => {
      const c = inPage(Object.assign({}, s, { x, y, s: size })); if (!free(c)) return;
      const crowd = others.reduce((t, o) => t + overlap(c, o), 0);
      const score = crowd * 5000 + (near ? Math.hypot(c.x - near.x, c.y - near.y) : (i < spots.length ? i * 50 : 400 + Math.min(c.x, W - c.x, c.y, H - c.y)));
      if (score < bestScore) { bestScore = score; bestC = c }
    });
    if (bestC && (bestScore < 5000 * .35 || size === MIN)) return bestC;
  }
  return null;
}
// depois de mudar modelo, fontes ou tamanhos, mantém cada enfeite fora dos textos
function settle() {
  let lost = 0;
  design.stickers = design.stickers.filter(s => {
    const t = resolve(s); if (t && Math.hypot(t.x - s.x, t.y - s.y) < 500) { Object.assign(s, t); return true }
    const p = place(s, s); if (p) { Object.assign(s, p); return true }
    lost++; return false;
  });
  if (lost) note(lost === 1 ? 'Um enfeite não coube neste modelo e saiu do cartão. Toque em Desfazer para trazê-lo de volta.' : lost + ' enfeites não couberam neste modelo. Toque em Desfazer para trazê-los de volta.');
  if (selected && !design.stickers.find(s => s.k === selected)) selected = null;
}

/* ---------- desenho da prévia ---------- */
function size() { const c = $('#edCanvas'), w = c.clientWidth, dpr = Math.min(2, window.devicePixelRatio || 1); const pw = Math.round(w * dpr), ph = Math.round(pw * H / W); if (c.width !== pw) { c.width = pw; c.height = ph } }
let cache = null;
function scaled(src, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h); return c }
function draw() {
  size(); const c = $('#edCanvas'), x = c.getContext('2d'), k = c.width / W;
  if (!cache || cache.r !== r || cache.w !== c.width) cache = { r, w: c.width, base: scaled(r.base, c.width, c.height), text: scaled(r.text, c.width, c.height) };
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); x.drawImage(cache.base, 0, 0);
  for (const s of design.stickers) { const img = imgs[s.id]; if (!img) continue; x.save(); x.translate(s.x * k, s.y * k); x.rotate(s.r * Math.PI / 180); x.drawImage(img, -s.s * k / 2, -s.s * k / 2, s.s * k, s.s * k); x.restore() }
  x.drawImage(cache.text, 0, 0); overlay();
}
function paint() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw) }
function overlay() {
  const box = $('#sel'), s = design.stickers.find(s => s.k === selected);
  box.hidden = !s; if (!s) return;
  const k = $('#edCanvas').clientWidth / W, side = Math.max(64, s.s * K * 2 * k);
  box.classList.toggle('warn', !free(s));
  const cw = $('#edCanvas').clientWidth, ch = $('#edCanvas').clientHeight, l = s.x * k - side / 2, t = s.y * k - side / 2;
  box.classList.toggle('flipv', t < 80); box.classList.toggle('flipr', l + side > cw - 30); box.classList.toggle('flipl', l < 30); box.classList.toggle('flipb', t + side > ch - 30);
  box.style.width = box.style.height = side + 'px'; box.style.left = (s.x * k - side / 2) + 'px'; box.style.top = (s.y * k - side / 2) + 'px'; box.style.transform = `rotate(${s.r}deg)`;
}
function point(e) { const b = $('#edCanvas').getBoundingClientRect(), k = W / b.width; return { x: (e.clientX - b.left) * k, y: (e.clientY - b.top) * k } }
function hit(p) { for (let i = design.stickers.length - 1; i >= 0; i--) { const s = design.stickers[i], a = -s.r * Math.PI / 180, dx = p.x - s.x, dy = p.y - s.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a); if (Math.abs(lx) <= s.s * .46 && Math.abs(ly) <= s.s * .46) return s } return null }

/* ---------- alterações ---------- */
async function change(fn, relayout = true) {
  const prev = snap(); note(''); fn(design);
  if (relayout) { await fonts(design); layout(); settle() }
  if (snap() !== prev) commit(prev);
  if (!$('#edNote').textContent) note(notes());
  paint(); sync();
}
async function restore(state) { design = JSON.parse(state); await fonts(design); layout(); note(notes()); paint(); sync(); buttons() }
function sticker(s) { return design.stickers.find(x => x.k === selected) }
// encaixe ao soltar: desliza (animado) para o espaço livre mais próximo
function land(s, done, floor) {
  let t = null;
  // ao aumentar sem espaço, fica no maior tamanho que cabe ali, nunca menor que antes do gesto
  if (floor && s.s > floor) for (let v = s.s; v >= floor; v = v > floor ? Math.max(floor, v * .94) : floor - 1) { const c = resolve(Object.assign({}, s, { s: v })); if (c && Math.hypot(c.x - s.x, c.y - s.y) < 160) { t = c; break } }
  if (!t) t = resolve(s); if (!t || Math.hypot(t.x - s.x, t.y - s.y) > 700) t = place(s, s) || t || place(Object.assign({}, s, { s: MIN }), s);
  if (!t) { done(); return }
  const moved = Math.hypot(t.x - s.x, t.y - s.y) > 6 || Math.abs(t.s - s.s) > 2;
  if (moved) note('O enfeite foi para o espaço livre mais próximo, sem cobrir o texto.');
  const from = { x: s.x, y: s.y, s: s.s }, t0 = performance.now();
  let finished = false; const finish = () => { if (finished) return; finished = true; Object.assign(s, { x: t.x, y: t.y, s: t.s }); paint(); done() };
  const step = now => { if (finished) return; const k = Math.min(1, (now - t0) / 180), q = 1 - Math.pow(1 - k, 3); s.x = from.x + (t.x - from.x) * q; s.y = from.y + (t.y - from.y) * q; s.s = from.s + (t.s - from.s) * q; draw(); if (k < 1) requestAnimationFrame(step); else finish() };
  if (moved) { requestAnimationFrame(step); setTimeout(finish, 260) } else finish()
}
function tweak(fn) {
  const s = sticker(); if (!s) return; const prev = snap(), before = Object.assign({}, s); fn(s); s.s = Math.max(MIN, Math.min(MAX, s.s));
  const t = resolve(s); if (t) Object.assign(s, t); else { Object.assign(s, before); note('Não há espaço livre para isso aqui. Arraste o enfeite para um lugar vazio.') }
  if (snap() !== prev) { commit(prev); if (t) note('') } paint();
}

/* ---------- interface ---------- */
function build() {
  if (built) return; built = true;
  const tray = list => list.map(([id, l]) => `<button type="button" class="stk" data-sticker="${id}"><img src="stickers/${id}.png" alt="" loading="lazy"><span>${l}</span></button>`).join('');
  $('#stickerList').innerHTML = STICKER_GROUPS.map(([g, list]) => `<h4 class="stkgroup">${g}</h4>${tray(list)}`).join('');
  $('#paletteList').innerHTML = Object.entries(Card.PALETTES).map(([id, p]) => `<button type="button" class="pal" data-palette="${id}"><span class="chips">${[p.band, p.accent, p.accent2, p.bg].map(c => `<i style="background:${c}"></i>`).join('')}</span>${esc(p.name)}</button>`).join('') + `<button type="button" class="pal" data-palette="custom"><span class="chips rainbow"><i></i><i></i><i></i><i></i></span>Minhas cores</button>`;
  $('#customColors').innerHTML = [['bg', 'Fundo'], ['band', 'Cor principal'], ['accent', 'Destaque 1'], ['accent2', 'Destaque 2']].map(([k, l]) => `<div class="colorrow"><b>${l}</b><div class="sw">${SWATCHES.map(c => `<button type="button" aria-label="${l} ${c}" data-custom="${k}" data-color="${c}" style="background:${c}"></button>`).join('')}<label class="more" title="Outra cor"><input type="color" data-custom-input="${k}"><span>+</span></label></div></div>`).join('');
  $('#titleFonts').innerHTML = Card.TITLE_FONTS.map(f => `<button type="button" class="fontbtn" data-title-font="${f.id}" style="font:${f.f.replace('{}', 30 * f.k)}"><span lang="he" dir="rtl">שָׁלוֹם</span> Amidá<small>${f.label}</small></button>`).join('');
  $('#pasukFonts').innerHTML = Card.PASUK_FONTS.map(f => `<button type="button" class="fontbtn pasukbtn" data-pasuk-font="${f.id}" style="font:${f.f.replace('{}', 34 * f.k)}"><span lang="he" dir="rtl">שִׁירוּ לוֹ שִׁיר חָדָשׁ</span><small>${f.label}</small></button>`).join('');
  $('#ptSizes').innerHTML = Card.PT_SCALES.map((v, i) => `<button type="button" data-pt-size="${i}" style="font-size:${13 + i * 3}px" aria-label="Tamanho ${i + 1}">A</button>`).join('');
  $('#ptColors').innerHTML = `<button type="button" class="auto" data-pt-color="">Cor do modelo</button>` + PT_COLORS.map(c => `<button type="button" aria-label="Cor ${c}" data-pt-color="${c}" style="background:${c}"></button>`).join('') + `<label class="more" title="Outra cor"><input type="color" id="ptCustom"><span>+</span></label>`;

  const ed = $('#editor');
  ed.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.tab) return showTab(d.tab);
    if (d.template) return change(x => { x.template = d.template });
    if (d.sticker) return add(d.sticker);
    if (d.palette) return change(x => { if (d.palette === 'custom') { const P = Card.colors(Card.effective(x), Card.TEMPLATES[x.template]); x.custom = x.custom || { bg: P.bg, band: P.band, accent: P.accent, accent2: P.accent2 } } x.palette = d.palette });
    if (d.custom) return change(x => { const P = Card.colors(Card.effective(x), Card.TEMPLATES[x.template]); x.custom = Object.assign({ bg: P.bg, band: P.band, accent: P.accent, accent2: P.accent2 }, x.custom, { [d.custom]: d.color }); x.palette = 'custom' });
    if (d.titleFont) return change(x => { x.titleFont = d.titleFont });
    if (d.pasukFont) return change(x => { x.pasukFont = d.pasukFont });
    if (d.ptSize) return change(x => { x.ptScale = Number(d.ptSize) });
    if (d.ptColor !== undefined) return change(x => { x.ptColor = d.ptColor || null });
  });
  ed.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.customInput) change(x => { const P = Card.colors(Card.effective(x), Card.TEMPLATES[x.template]); x.custom = Object.assign({ bg: P.bg, band: P.band, accent: P.accent, accent2: P.accent2 }, x.custom, { [t.dataset.customInput]: t.value }); x.palette = 'custom' });
    if (t.id === 'ptCustom') change(x => { x.ptColor = t.value });
  });
  $('#undo').onclick = () => { if (!history.length) return; future.push(snap()); restore(history.pop()) };
  $('#redo').onclick = () => { if (!future.length) return; history.push(snap()); restore(future.pop()) };
  let armed = 0; $('#reset').onclick = () => { const b = $('#reset'); if (Date.now() - armed > 4000) { armed = Date.now(); b.textContent = 'Toque de novo para restaurar'; note('Restaurar volta cores, letras e enfeites ao início. Você pode usar Desfazer depois.'); setTimeout(() => { if (Date.now() - armed >= 4000) b.textContent = 'Restaurar modelo' }, 4100); return } armed = 0; b.textContent = 'Restaurar modelo'; change(x => { const t = x.template; Object.assign(x, Card.defaults(t)); selected = null }) };

  const stage = $('#stage');
  const grab = (e, mode, s) => { const b = $('#edCanvas').getBoundingClientRect(), k = b.width / W, c = { x: b.left + s.x * k, y: b.top + s.y * k }; return { mode, c, d0: Math.max(20, Math.hypot(e.clientX - c.x, e.clientY - c.y)), a0: Math.atan2(e.clientY - c.y, e.clientX - c.x), orig: Object.assign({}, s), prev: snap() } };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.h-del')) return;
    try { stage.setPointerCapture(e.pointerId) } catch { } pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = sticker();
    if (s && e.target.closest('.h-rot')) { drag = grab(e, 'rotate', s); e.preventDefault(); return }
    if (s && e.target.closest('.h-size')) { drag = grab(e, 'size', s); e.preventDefault(); return }
    if (pointers.size === 2 && s) { const [a, b] = [...pointers.values()]; drag = { mode: 'pinch', d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), a0: Math.atan2(b.y - a.y, b.x - a.x), orig: Object.assign({}, s), prev: drag ? drag.prev : snap() }; return }
    if (pointers.size > 1) return;
    const p = point(e), h = hit(p), prev = snap();
    selected = h ? h.k : null;
    if (h) { design.stickers = design.stickers.filter(o => o !== h).concat(h); drag = { mode: 'move', p, orig: Object.assign({}, h), prev }; e.preventDefault() } else drag = null;
    paint();
  });
  // durante o gesto o enfeite segue o dedo livremente; ao soltar ele encaixa fora dos textos
  stage.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !drag) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = sticker(); if (!s) return;
    if (drag.mode === 'move') { const p = point(e); s.x = drag.orig.x + p.x - drag.p.x; s.y = drag.orig.y + p.y - drag.p.y }
    else if (drag.mode === 'rotate') s.r = drag.orig.r + (Math.atan2(e.clientY - drag.c.y, e.clientX - drag.c.x) - drag.a0) * 180 / Math.PI;
    else if (drag.mode === 'size') s.s = Math.max(MIN, Math.min(MAX, drag.orig.s * Math.hypot(e.clientX - drag.c.x, e.clientY - drag.c.y) / drag.d0));
    else if (drag.mode === 'pinch' && pointers.size === 2) { const [a, b] = [...pointers.values()]; s.s = Math.max(MIN, Math.min(MAX, drag.orig.s * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0)); s.r = drag.orig.r + (Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180 / Math.PI }
    inPage(s); paint();
  });
  const end = e => {
    pointers.delete(e.pointerId); if (pointers.size || !drag) return;
    const d = drag; drag = null; const s = sticker(); if (!s) return;
    s.r = ((Math.round(s.r) % 360) + 360) % 360;
    land(s, () => { if (snap() !== d.prev) commit(d.prev) }, d.mode === 'move' ? 0 : d.orig.s);
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  $('#sel .h-del').addEventListener('click', () => change(x => { x.stickers = x.stickers.filter(o => o.k !== selected); selected = null }, false));
  window.addEventListener('resize', () => { if (!ed.hidden) paint() });
}
function showTab(t) {
  tab = t; document.querySelectorAll('#editor [data-tab]').forEach(b => { b.setAttribute('aria-selected', b.dataset.tab === t); b.classList.toggle('on', b.dataset.tab === t) });
  document.querySelectorAll('#editor .tabpanel').forEach(p => p.hidden = p.dataset.panel !== t);
  if (t === 'modelo') thumbs();
}
let thumbKey = '';
async function thumbs() {
  const e = Object.assign({}, design, { stickers: [] }), key = JSON.stringify([entries.map(x => x.name + x.v.id), e.palette, e.custom, e.titleFont, e.pasukFont, e.ptScale, e.ptColor]);
  if (key === thumbKey) return; thumbKey = key;
  const list = $('#templateList'); list.innerHTML = Object.entries(Card.TEMPLATES).map(([id, t]) => `<button type="button" class="tpl" data-template="${id}"><canvas width="424" height="300"></canvas><span>${t.name}</span></button>`).join(''); sync();
  for (const [id] of Object.entries(Card.TEMPLATES)) { const d = Object.assign({}, e, { template: id }); await fonts(d); const t = Card.render(entries, art, d); Card.compose(t, [], imgs, list.querySelector(`[data-template="${id}"] canvas`)); await new Promise(res => setTimeout(res)) }
  layout(); paint();
}
function sync() {
  const e = Card.effective(design), on = (sel, v) => document.querySelectorAll(sel).forEach(b => b.classList.toggle('on', b.dataset[Object.keys(b.dataset)[0]] === String(v)));
  on('[data-template]', design.template); on('[data-palette]', e.palette); on('[data-title-font]', e.titleFont); on('[data-pasuk-font]', e.pasukFont); on('[data-pt-size]', design.ptScale ?? 1); on('[data-pt-color]', design.ptColor || '');
  $('#customColors').hidden = e.palette !== 'custom';
  if (e.palette === 'custom' && design.custom) document.querySelectorAll('[data-custom-input]').forEach(i => { i.value = design.custom[i.dataset.customInput] || '#000000' });
  $('#stickerCount').textContent = design.stickers.length ? design.stickers.length + (design.stickers.length === 1 ? ' enfeite no cartão' : ' enfeites no cartão') : 'Toque em uma imagem para colocá-la no cartão.';
}
async function add(id) {
  if (design.stickers.length >= 12) return note('Já há 12 enfeites. Remova um para colocar outro.');
  await images([id]); if (!imgs[id]) return note('Não foi possível carregar este enfeite. Tente de novo.');
  const s = { k: uid++, id, x: W / 2, y: H / 2, s: 260, r: 0 }, p = place(s);
  if (!p) return note('Não encontrei espaço livre. Diminua ou remova um enfeite.');
  await change(x => { x.stickers.push(Object.assign(s, p)) }, false); selected = s.k; paint();
  note('Arraste para mover. Use ↻ para girar e ⤡ para aumentar ou diminuir (ou dois dedos).');
  if (matchMedia('(max-width: 1000px)').matches) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------- API ---------- */
async function open(list, artImg) {
  entries = list; art = artImg; build();
  if (!design) design = Card.defaults();
  uid = Math.max(uid, ...design.stickers.map(s => s.k + 1));
  await Promise.all([images(design.stickers.map(s => s.id)), fonts(design), Card.loadTextures()]); layout(); settle(); note(notes()); buttons(); showTab(tab); paint(); sync();
}
function exportCanvas() { const c = document.createElement('canvas'); c.width = W; c.height = H; Card.compose(r, design.stickers, imgs, c); return c }
return { open, exportCanvas, get design() { return design }, STICKERS, _test: { resolve, place, hits: (s) => r.protect.filter(p => hits(s, p)), get r() { return r }, add, change, tweak, select: k => { selected = k; paint() } } };
})();
