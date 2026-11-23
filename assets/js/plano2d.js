/* Plano2D — visualização interativa de transformações lineares R^2 -> R^2.
 *
 * Uso: <div class="plano2d" data-config='{...}'></div>
 * Opções (data-config, JSON):
 *   matriz:   [a,b,c,d]  (matriz [[a,b],[c,d]])      — por omissão [3,1,-2,0]
 *   modo:     lista de camadas iniciais: "grelha","vetor","circulo","proprios"
 *   botoes:   camadas que o utilizador pode ligar/desligar
 *   presets:  nomes de presets a mostrar (ver PRESETS2D) ou true para todos
 *   editavel: true -> campos para editar a matriz
 *   alcance:  meia-largura visível (por omissão 4)
 *   vetor:    [x,y] vetor inicial arrastável
 *   t:        valor inicial da animação (0 = identidade, 1 = A)
 */
(function () {
  const COR = {
    azul: '#003e74', verde: '#007660', laranja: '#cc5c00', roxo: '#683a8c',
    teal: '#007896', cinza: '#5a5a5a', vermelho: '#c0182b', ouro: '#d99a00'
  };

  const PRESETS2D = {
    'Exemplo da aula': [3, 1, -2, 0],
    'Reflexão (y = x)': [0, 1, 1, 0],
    'Rotação 90°': [0, -1, 1, 0],
    'Cisalhamento': [1, 1, 0, 1],
    'Escala 2I': [2, 0, 0, 2],
    'Projeção (eixo x)': [1, 0, 0, 0],
    'Simétrica': [2, 1, 1, 2]
  };

  const NOMES_CAMADA = { grelha: 'Grelha', vetor: 'Vetor v', circulo: 'Vários vetores', proprios: 'Direções próprias' };

  function fmt(x) {
    if (Math.abs(x) < 1e-9) x = 0;
    const r = Math.round(x * 100) / 100;
    // frações simples
    for (const q of [2, 3, 4]) {
      const p = Math.round(x * q);
      if (Math.abs(p / q - x) < 1e-9 && Math.abs(p) % q !== 0) return (p < 0 ? '−' : '') + Math.abs(p) + '/' + q;
    }
    return String(r).replace('-', '−');
  }

  /* Valores e vetores próprios reais de [[a,b],[c,d]] */
  function proprios2(m) {
    const [a, b, c, d] = m;
    const tr = a + d, det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    const eps = 1e-9;
    const vec = (l) => {
      const r1 = [a - l, b], r2 = [c, d - l];
      if (Math.hypot(...r1) > 1e-7) return norm([b, -(a - l)]);
      if (Math.hypot(...r2) > 1e-7) return norm([d - l, -c]);
      return null; // todos os vetores
    };
    if (disc < -eps) return { tipo: 'complexos', tr, det, disc, lista: [] };
    if (Math.abs(disc) <= eps) {
      const l = tr / 2, v = vec(l);
      return { tipo: v ? 'duplo' : 'todos', tr, det, disc, lista: [{ l, v, ma: 2, mg: v ? 1 : 2 }] };
    }
    const s = Math.sqrt(disc);
    const l1 = (tr - s) / 2, l2 = (tr + s) / 2;
    return { tipo: 'distintos', tr, det, disc, lista: [{ l: l1, v: vec(l1), ma: 1, mg: 1 }, { l: l2, v: vec(l2), ma: 1, mg: 1 }] };
  }
  function norm(v) { const n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n]; }
  const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

  class Plano2D {
    constructor(el) {
      this.el = el;
      const cfg = JSON.parse(el.dataset.config || '{}');
      this.cfg = cfg;
      this.A = (cfg.matriz || [3, 1, -2, 0]).slice();
      this.R = cfg.alcance || 4;
      this.t = cfg.t ?? 1;
      this.v = (cfg.vetor || [1, 1]).slice();
      this.camadas = new Set(cfg.modo || ['grelha']);
      this.W = cfg.largura || 560; this.H = cfg.altura || 420;
      this.build();
      this.draw();
    }

    build() {
      const el = this.el, cfg = this.cfg;
      el.classList.add('widget');
      el.setAttribute('data-prevent-swipe', '');
      const cv = document.createElement('canvas');
      this.cv = cv; this.ctx = cv.getContext('2d');
      const dpr = Math.max(2, window.devicePixelRatio || 1);
      cv.width = this.W * dpr; cv.height = this.H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      el.appendChild(cv);

      const ctrl = document.createElement('div'); ctrl.className = 'ctrl';
      el.appendChild(ctrl);

      // Matriz editável
      if (cfg.editavel) {
        const lab = document.createElement('label'); lab.innerHTML = 'A = ';
        const g = document.createElement('span'); g.className = 'mat-edit'; g.style.setProperty('--n', 2);
        this.inputs = this.A.map((x, i) => {
          const inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.5'; inp.value = x;
          inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v)) { this.A[i] = v; this.draw(); } });
          g.appendChild(inp); return inp;
        });
        lab.appendChild(g); ctrl.appendChild(lab);
      }

      // Animação I -> A
      const lt = document.createElement('label');
      lt.innerHTML = '<span>I</span>';
      const sl = document.createElement('input'); sl.type = 'range'; sl.min = 0; sl.max = 1; sl.step = 0.01; sl.value = this.t;
      sl.addEventListener('input', () => { this.stop(); this.t = parseFloat(sl.value); this.draw(); });
      this.slider = sl; lt.appendChild(sl);
      lt.insertAdjacentHTML('beforeend', '<span>A</span>');
      ctrl.appendChild(lt);
      const play = document.createElement('button'); play.className = 'btn primario'; play.textContent = '▶ Aplicar A';
      play.addEventListener('click', () => this.animar());
      ctrl.appendChild(play);

      // Camadas
      for (const c of (cfg.botoes || [])) {
        const b = document.createElement('button'); b.className = 'btn' + (this.camadas.has(c) ? ' on' : '');
        b.textContent = NOMES_CAMADA[c] || c;
        b.addEventListener('click', () => { this.camadas.has(c) ? this.camadas.delete(c) : this.camadas.add(c); b.classList.toggle('on'); this.draw(); });
        ctrl.appendChild(b);
      }

      // Presets
      if (cfg.presets) {
        const nomes = cfg.presets === true ? Object.keys(PRESETS2D) : cfg.presets;
        const sel = document.createElement('select'); sel.className = 'btn';
        sel.innerHTML = '<option value="">Exemplos…</option>' + nomes.map(n => `<option>${n}</option>`).join('');
        sel.addEventListener('change', () => { if (!sel.value) return; this.setMatriz(PRESETS2D[sel.value]); this.t = 0; this.slider.value = 0; this.animar(); });
        ctrl.appendChild(sel);
      }

      this.info = document.createElement('div'); this.info.className = 'info'; el.appendChild(this.info);

      // Arrastar o vetor v
      const pos = (e) => {
        const r = cv.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * this.W, y = (e.clientY - r.top) / r.height * this.H;
        return this.fromPx(x, y);
      };
      let arrastar = false;
      cv.addEventListener('pointerdown', (e) => {
        if (!this.camadas.has('vetor')) return;
        arrastar = true; cv.setPointerCapture(e.pointerId); this.setV(pos(e)); e.preventDefault(); e.stopPropagation();
      });
      cv.addEventListener('pointermove', (e) => { if (arrastar) { this.setV(pos(e)); e.preventDefault(); } });
      cv.addEventListener('pointerup', () => { arrastar = false; });
      cv.addEventListener('pointercancel', () => { arrastar = false; });
    }

    setV(p) {
      // íman: se estiver perto de uma direção própria, cola-se a ela
      const ep = proprios2(this.A);
      const len = Math.hypot(p[0], p[1]);
      if (len > 0.2) for (const e of ep.lista) if (e.v) {
        const proj = p[0] * e.v[0] + p[1] * e.v[1];
        const dist = Math.hypot(p[0] - proj * e.v[0], p[1] - proj * e.v[1]);
        if (dist < 0.12) { p = [proj * e.v[0], proj * e.v[1]]; break; }
      }
      this.v = p; this.draw();
    }

    setMatriz(m) {
      this.A = m.slice();
      if (this.inputs) this.inputs.forEach((inp, i) => inp.value = this.A[i]);
      this.draw();
    }

    stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
    animar() {
      this.stop();
      const t0 = performance.now(), from = this.t >= 0.99 ? 0 : this.t, dur = 1800 * (1 - from);
      const step = (now) => {
        const x = Math.min(1, (now - t0) / dur);
        this.t = from + (1 - from) * ease(x); this.slider.value = this.t; this.draw();
        if (x < 1) this.raf = requestAnimationFrame(step); else this.raf = null;
      };
      this.raf = requestAnimationFrame(step);
    }

    Mt() { const t = this.t, [a, b, c, d] = this.A; return [1 - t + t * a, t * b, t * c, 1 - t + t * d]; }
    ap(m, p) { return [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]]; }
    get s() { return this.H / (2 * this.R); }
    px(p) { return [this.W / 2 + p[0] * this.s, this.H / 2 - p[1] * this.s]; }
    fromPx(x, y) { return [(x - this.W / 2) / this.s, (this.H / 2 - y) / this.s]; }

    linha(p, q, cor, lw = 1, dash = null) {
      const c = this.ctx, a = this.px(p), b = this.px(q);
      c.save(); c.strokeStyle = cor; c.lineWidth = lw; if (dash) c.setLineDash(dash);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.restore();
    }
    seta(q, cor, lw = 3, rotulo = null, p = [0, 0]) {
      const c = this.ctx, a = this.px(p), b = this.px(q);
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < 1) return;
      const ux = dx / L, uy = dy / L, h = Math.min(14, L * 0.45);
      c.save(); c.strokeStyle = cor; c.fillStyle = cor; c.lineWidth = lw; c.lineCap = 'round';
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0] - ux * h * 0.8, b[1] - uy * h * 0.8); c.stroke();
      c.beginPath(); c.moveTo(b[0], b[1]);
      c.lineTo(b[0] - ux * h - uy * h * 0.45, b[1] - uy * h + ux * h * 0.45);
      c.lineTo(b[0] - ux * h + uy * h * 0.45, b[1] - uy * h - ux * h * 0.45);
      c.closePath(); c.fill();
      if (rotulo) {
        c.font = 'italic 600 21px "Times New Roman", serif';
        c.fillText(rotulo, b[0] + ux * 8 + 4, b[1] + uy * 8 - 4);
      }
      c.restore();
    }

    draw() {
      const c = this.ctx, W = this.W, H = this.H, R = this.R, Rx = R * W / H;
      const M = this.Mt();
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);

      // grelha original
      for (let k = -Math.ceil(Rx); k <= Math.ceil(Rx); k++) this.linha([k, -R], [k, R], '#eceff3');
      for (let k = -Math.ceil(R); k <= Math.ceil(R); k++) this.linha([-Rx, k], [Rx, k], '#eceff3');
      this.linha([-Rx, 0], [Rx, 0], '#9aa3ad', 1.2); this.linha([0, -R], [0, R], '#9aa3ad', 1.2);

      const ep = proprios2(this.A);

      // grelha transformada
      if (this.camadas.has('grelha')) {
        const N = 8;
        for (let k = -N; k <= N; k++) {
          const cor = k === 0 ? 'rgba(0,62,116,.55)' : 'rgba(0,120,150,.28)';
          this.linha(this.ap(M, [k, -N]), this.ap(M, [k, N]), cor, k === 0 ? 1.6 : 1.1);
          this.linha(this.ap(M, [-N, k]), this.ap(M, [N, k]), cor, k === 0 ? 1.6 : 1.1);
        }
        // quadrado unitário
        const q = [[0, 0], [1, 0], [1, 1], [0, 1]].map(p => this.px(this.ap(M, p)));
        c.save(); c.fillStyle = 'rgba(204,92,0,.13)'; c.beginPath(); q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fill(); c.restore();
        this.seta(this.ap(M, [1, 0]), COR.verde, 3, 'T(e₁)');
        this.seta(this.ap(M, [0, 1]), COR.vermelho, 3, 'T(e₂)');
      }

      // direções próprias
      if (this.camadas.has('proprios')) {
        const cores = [COR.roxo, COR.ouro];
        ep.lista.forEach((e, i) => {
          if (!e.v) return;
          const L = 3 * R;
          this.linha([-L * e.v[0], -L * e.v[1]], [L * e.v[0], L * e.v[1]], cores[i], 2.5, [8, 6]);
          // rótulo E(λ)
          const k = R * 0.85, p = this.px([k * e.v[0], k * e.v[1]]);
          let pp = p; if (p[1] < 20 || p[1] > H - 10 || p[0] < 10 || p[0] > W - 60) pp = this.px([-k * e.v[0], -k * e.v[1]]);
          c.save(); c.fillStyle = cores[i]; c.font = '600 19px "Source Sans 3", Arial, sans-serif';
          c.fillText('E(' + fmt(e.l) + ')', pp[0] + 6, pp[1] - 6); c.restore();
        });
      }

      // vários vetores (círculo -> elipse)
      if (this.camadas.has('circulo')) {
        const n = 24, r = Math.min(1.6, R * 0.4);
        c.save(); c.strokeStyle = 'rgba(90,90,90,.35)'; c.setLineDash([4, 4]); c.beginPath();
        for (let i = 0; i <= 120; i++) { const a = 2 * Math.PI * i / 120; const p = this.px(this.ap(M, [r * Math.cos(a), r * Math.sin(a)])); i ? c.lineTo(...p) : c.moveTo(...p); }
        c.stroke(); c.restore();
        for (let i = 0; i < n; i++) {
          const a = 2 * Math.PI * i / n, u = [r * Math.cos(a), r * Math.sin(a)], w = this.ap(M, u);
          const cr = (u[0] * w[1] - u[1] * w[0]) / (Math.hypot(...u) * Math.hypot(...w) + 1e-12);
          const alinhado = Math.abs(cr) < 0.035 && Math.hypot(...w) > 1e-6;
          const cor = alinhado ? COR.ouro : `hsl(${(a * 180 / Math.PI + 200) % 360},55%,48%)`;
          this.seta(w, cor, alinhado ? 4 : 2);
        }
      }

      // vetor arrastável
      let msg = '';
      if (this.camadas.has('vetor')) {
        const v = this.v, Av = this.ap(M, v), AvF = this.ap(this.A, v);
        const nv = Math.hypot(...v), nAv = Math.hypot(...AvF);
        const cr = nv > 1e-6 && nAv > 1e-9 ? (v[0] * AvF[1] - v[1] * AvF[0]) / (nv * nAv) : 0;
        const proprio = nv > 0.05 && (Math.abs(cr) < 0.01 || nAv < 1e-6);
        if (proprio) { // linha de suporte
          const u = [v[0] / nv, v[1] / nv]; const L = 3 * R;
          this.linha([-L * u[0], -L * u[1]], [L * u[0], L * u[1]], 'rgba(217,154,0,.6)', 6);
        }
        this.seta(v, COR.azul, 4, 'v');
        if (this.t > 0.001) this.seta(Av, proprio ? COR.verde : COR.laranja, 4, this.t > 0.999 ? 'Av' : null);
        const vs = `v = (${fmt(v[0])}, ${fmt(v[1])})`;
        if (proprio) {
          const lam = nAv < 1e-6 ? 0 : (AvF[0] * v[0] + AvF[1] * v[1]) / (nv * nv);
          msg = `<b class="green">${vs} é vetor próprio: Av = ${fmt(lam)}·v</b>`;
        } else msg = `${vs}, &nbsp; Av = (${fmt(AvF[0])}, ${fmt(AvF[1])}) — <span class="orange">não é múltiplo de v</span>`;
      }

      // informação
      let lin = '';
      if (this.cfg.mostrarValores !== false) {
        if (ep.tipo === 'complexos') lin = 'Sem valores próprios reais (Δ < 0): nenhuma direção é preservada.';
        else if (ep.tipo === 'todos') lin = `λ = ${fmt(ep.lista[0].l)} (m<sub>a</sub> = m<sub>g</sub> = 2): todos os vetores não nulos são vetores próprios.`;
        else if (ep.tipo === 'duplo') lin = `λ = ${fmt(ep.lista[0].l)} com m<sub>a</sub> = 2 mas m<sub>g</sub> = 1: só uma direção própria.`;
        else lin = ep.lista.map(e => `λ = ${fmt(e.l)}`).join(', ') + ' &nbsp;(' + ep.lista.map(e => { const k = Math.abs(e.v[1]) > 1e-9 ? e.v[1] : e.v[0]; return `E(${fmt(e.l)}) gerado por (${fmt(e.v[0] / k)}, ${fmt(e.v[1] / k)})`; }).join('; ') + ')';
      }
      this.info.innerHTML = [msg, this.camadas.has('proprios') || this.cfg.mostrarValores ? lin : ''].filter(Boolean).join('<br>');
    }
  }

  window.Plano2D = Plano2D;
  window.proprios2 = proprios2;
  function init() { document.querySelectorAll('.plano2d').forEach(el => { if (!el._p2d) el._p2d = new Plano2D(el); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
