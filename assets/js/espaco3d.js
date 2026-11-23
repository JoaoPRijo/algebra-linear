/* Espaco3D — transformações lineares R^3 -> R^3 com three.js.
 *
 * Uso: <div class="espaco3d" data-config='{"matriz":[2,1,1,2,3,2,3,3,4],"presets":true,"editavel":true}'></div>
 * Mostra vetores unitários numa esfera e as suas imagens por M_t = (1-t)I + tA.
 * Os vetores que ficam na mesma reta (vetores próprios) ficam a dourado; os espaços próprios
 * são desenhados como retas (dim 1) ou planos (dim 2).
 * Nota: M_t tem os mesmos vetores próprios que A (valores próprios 1 - t + tλ), por isso
 * as direções próprias não se mexem durante a animação.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PRESETS3D = {
  'Exemplo da aula': [2, 1, 1, 2, 3, 2, 3, 3, 4],
  'Diagonal (2, 1, ½)': [2, 0, 0, 0, 1, 0, 0, 0, 0.5],
  'Rotação em torno de z': [0, -1, 0, 1, 0, 0, 0, 0, 1],
  'Projeção no plano xy': [1, 0, 0, 0, 1, 0, 0, 0, 0],
  'Cisalhamento': [1, 1, 0, 0, 1, 0, 0, 0, 2],
  'Reflexão (plano xy)': [1, 0, 0, 0, 1, 0, 0, 0, -1]
};

/* ---------- Álgebra ---------- */
const det3 = (m) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);

function raizesCubica(a, b, c, d) { // a x^3 + b x^2 + c x + d = 0, raízes reais
  b /= a; c /= a; d /= a;
  const p = c - b * b / 3, q = 2 * b * b * b / 27 - b * c / 3 + d;
  const D = q * q / 4 + p * p * p / 27, sh = -b / 3, r = [];
  if (Math.abs(D) < 1e-8 * Math.max(1, q * q)) {
    const u = Math.cbrt(-q / 2); r.push(2 * u + sh, -u + sh, -u + sh);
  } else if (D > 0) {
    r.push(Math.cbrt(-q / 2 + Math.sqrt(D)) + Math.cbrt(-q / 2 - Math.sqrt(D)) + sh);
  } else {
    const R = Math.sqrt(-p * p * p / 27), phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * R)))), m = 2 * Math.cbrt(R);
    for (let k = 0; k < 3; k++) r.push(m * Math.cos((phi + 2 * Math.PI * k) / 3) + sh);
  }
  // polir com Newton e agrupar
  const f = (x) => ((x + b) * x + c) * x + d, df = (x) => (3 * x + 2 * b) * x + c;
  const pol = r.map(x => { for (let i = 0; i < 30; i++) { const g = df(x); if (Math.abs(g) < 1e-14) break; x -= f(x) / g; } return x; });
  return pol;
}

function nucleo(M) { // base do núcleo de uma matriz 3x3 (Gauss-Jordan com tolerância)
  const A = [M.slice(0, 3), M.slice(3, 6), M.slice(6, 9)].map(r => r.slice());
  const escala = Math.max(1e-12, ...M.map(Math.abs)), tol = 1e-6 * escala;
  const piv = []; let lin = 0;
  for (let col = 0; col < 3 && lin < 3; col++) {
    let best = lin; for (let i = lin + 1; i < 3; i++) if (Math.abs(A[i][col]) > Math.abs(A[best][col])) best = i;
    if (Math.abs(A[best][col]) < tol) continue;
    [A[lin], A[best]] = [A[best], A[lin]];
    const p = A[lin][col]; for (let j = 0; j < 3; j++) A[lin][j] /= p;
    for (let i = 0; i < 3; i++) if (i !== lin) { const f = A[i][col]; for (let j = 0; j < 3; j++) A[i][j] -= f * A[lin][j]; }
    piv.push(col); lin++;
  }
  const livres = [0, 1, 2].filter(c => !piv.includes(c));
  return livres.map(fl => { const v = [0, 0, 0]; v[fl] = 1; piv.forEach((pc, i) => v[pc] = -A[i][fl]); return v; });
}

function proprios3(m) {
  const tr = m[0] + m[4] + m[8];
  const c2 = (m[0] * m[4] - m[1] * m[3]) + (m[0] * m[8] - m[2] * m[6]) + (m[4] * m[8] - m[5] * m[7]);
  const d = det3(m);
  // det(A - λI) = -λ^3 + tr λ^2 - c2 λ + det
  const rs = raizesCubica(1, -tr, c2, -d).sort((a, b) => a - b);
  const grupos = [];
  for (const x of rs) { const g = grupos.find(g => Math.abs(g.l - x) < 1e-3); if (g) { g.ma++; g.l = (g.l * (g.ma - 1) + x) / g.ma; } else grupos.push({ l: x, ma: 1 }); }
  for (const g of grupos) {
    const l = Math.abs(g.l - Math.round(g.l)) < 1e-4 ? Math.round(g.l) : g.l; g.l = l;
    const B = m.slice(); B[0] -= l; B[4] -= l; B[8] -= l;
    g.base = nucleo(B); g.mg = g.base.length;
  }
  return { grupos, nComplexos: 3 - grupos.reduce((s, g) => s + g.ma, 0) };
}

function fmt(x) {
  if (Math.abs(x) < 1e-9) x = 0;
  for (const q of [2, 3, 4]) { const p = Math.round(x * q); if (Math.abs(p / q - x) < 1e-6 && Math.abs(p) % q !== 0) return (p < 0 ? '−' : '') + Math.abs(p) + '/' + q; }
  return String(Math.round(x * 100) / 100).replace('-', '−');
}
function bonito(v) { // escala o vetor para ter entradas inteiras pequenas, se possível
  const nz = v.filter(x => Math.abs(x) > 1e-9).map(Math.abs);
  if (!nz.length) return v;
  let w = v.map(x => x / Math.min(...nz));
  for (let k = 1; k <= 6; k++) { const u = w.map(x => x * k); if (u.every(x => Math.abs(x - Math.round(x)) < 1e-6)) { w = u.map(Math.round); break; } }
  if (w.filter(x => x !== 0)[0] < 0 && w.filter(x => x < 0).length > w.filter(x => x > 0).length) w = w.map(x => -x);
  return w.map(x => x === 0 ? 0 : x);
}
const fmtV = (v) => '(' + bonito(v).map(fmt).join(', ') + ')';
const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

/* ---------- Widget ---------- */
class Espaco3D {
  constructor(el) {
    this.el = el;
    this.cfg = JSON.parse(el.dataset.config || '{}');
    this.A = (this.cfg.matriz || PRESETS3D['Exemplo da aula']).slice();
    this.t = this.cfg.t ?? 0;
    this.r = this.cfg.raio || 1;
    this.build();
    this.setMatriz(this.A);
    this.loop();
  }

  build() {
    const el = this.el, cfg = this.cfg;
    el.classList.add('widget');
    el.setAttribute('data-prevent-swipe', '');
    const box = document.createElement('div');
    box.style.cssText = `position:relative;width:100%;height:${cfg.altura || 430}px;border-radius:4px;overflow:hidden;background:#fff`;
    el.appendChild(box); this.box = box;

    const W = box.clientWidth || 700, H = cfg.altura || 430;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.max(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    box.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff); this.scene = scene;
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
    const d = cfg.distancia || 9; cam.position.set(d * 0.75, d * 0.55, d * 0.9); cam.up.set(0, 0, 1); // z para cima
    this.cam = cam;
    const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true; ctl.autoRotate = !!cfg.rodar; ctl.autoRotateSpeed = 0.8;
    this.ctl = ctl;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(5, 3, 8); scene.add(dl);

    // eixos
    const eixos = new THREE.Group();
    const cores = [0x007660, 0xc0182b, 0x003e74];
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((e, i) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...e).multiplyScalar(-4), new THREE.Vector3(...e).multiplyScalar(4)]);
      eixos.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x9aa3ad })));
      const s = this.textoSprite(['x', 'y', 'z'][i], cores[i]); s.position.set(...e.map(x => x * 4.35)); eixos.add(s);
    });
    const grid = new THREE.GridHelper(8, 8, 0xd5dae1, 0xeceff3); grid.rotation.x = Math.PI / 2; eixos.add(grid);
    scene.add(eixos);

    // vetores na esfera (setas)
    this.dirs = [];
    const n = cfg.nvetores || 46, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { // espiral de Fibonacci
      const z = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - z * z), th = ga * i;
      this.dirs.push(new THREE.Vector3(rr * Math.cos(th), rr * Math.sin(th), z));
    }
    const geoHaste = new THREE.CylinderGeometry(1, 1, 1, 8); geoHaste.translate(0, 0.5, 0);
    const geoPonta = new THREE.ConeGeometry(1, 1, 12); geoPonta.translate(0, -0.5, 0);
    this.criarSeta = () => {
      const mat = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const g = new THREE.Group(), h = new THREE.Mesh(geoHaste, mat), p = new THREE.Mesh(geoPonta, mat);
      g.add(h); g.add(p); g.userData = { h, p, mat }; scene.add(g); return g;
    };
    this.setas = this.dirs.map(() => this.criarSeta());
    this.nBase = this.dirs.length;

    // esfera -> elipsoide (malha)
    const sg = new THREE.SphereGeometry(this.r, 32, 20);
    this.esfBase = sg.attributes.position.array.slice();
    this.esfera = new THREE.Mesh(sg, new THREE.MeshPhongMaterial({ color: 0x007896, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    this.esferaW = new THREE.LineSegments(new THREE.WireframeGeometry(sg), new THREE.LineBasicMaterial({ color: 0x007896, transparent: true, opacity: 0.18 }));
    scene.add(this.esfera); scene.add(this.esferaW);

    this.grupoProprio = new THREE.Group(); scene.add(this.grupoProprio);

    // controlos
    const ctrl = document.createElement('div'); ctrl.className = 'ctrl'; el.appendChild(ctrl);
    if (cfg.editavel) {
      const lab = document.createElement('label'); lab.innerHTML = 'A = ';
      const g = document.createElement('span'); g.className = 'mat-edit'; g.style.setProperty('--n', 3);
      this.inputs = this.A.map((x, i) => {
        const inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.5'; inp.value = x;
        inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) { this.A[i] = v; this.setMatriz(this.A); } });
        g.appendChild(inp); return inp;
      });
      lab.appendChild(g); ctrl.appendChild(lab);
    }
    const lt = document.createElement('label'); lt.innerHTML = '<span>I</span>';
    const sl = document.createElement('input'); sl.type = 'range'; sl.min = 0; sl.max = 1; sl.step = 0.01; sl.value = this.t;
    sl.addEventListener('input', () => { this.anim = null; this.t = parseFloat(sl.value); this.atualizar(); });
    this.slider = sl; lt.appendChild(sl); lt.insertAdjacentHTML('beforeend', '<span>A</span>'); ctrl.appendChild(lt);
    const play = document.createElement('button'); play.className = 'btn primario'; play.textContent = '▶ Aplicar A';
    play.addEventListener('click', () => this.animar()); ctrl.appendChild(play);

    const mk = (txt, on, fn) => { const b = document.createElement('button'); b.className = 'btn' + (on ? ' on' : ''); b.textContent = txt; b.addEventListener('click', () => { b.classList.toggle('on'); fn(b.classList.contains('on')); }); ctrl.appendChild(b); return b; };
    this.verProprios = cfg.proprios ?? true;
    mk('Espaços próprios', this.verProprios, (on) => { this.verProprios = on; this.grupoProprio.visible = on; });
    mk('Esfera', true, (on) => { this.esfera.visible = on; this.esferaW.visible = on; });
    mk('Rodar', !!cfg.rodar, (on) => { this.ctl.autoRotate = on; });

    if (cfg.presets) {
      const nomes = cfg.presets === true ? Object.keys(PRESETS3D) : cfg.presets;
      const sel = document.createElement('select'); sel.className = 'btn';
      sel.innerHTML = '<option value="">Exemplos…</option>' + nomes.map(n => `<option>${n}</option>`).join('');
      sel.addEventListener('change', () => { if (!sel.value) return; this.setMatriz(PRESETS3D[sel.value]); this.t = 0; this.slider.value = 0; this.animar(); });
      ctrl.appendChild(sel);
    }
    this.info = document.createElement('div'); this.info.className = 'info'; el.appendChild(this.info);

    new ResizeObserver(() => this.resize()).observe(box);
  }

  textoSprite(txt, cor) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d'); g.font = 'italic bold 84px "Times New Roman", serif'; g.fillStyle = '#' + cor.toString(16).padStart(6, '0');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 64);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    s.scale.set(0.45, 0.45, 1); return s;
  }

  resize() {
    const W = this.box.clientWidth, H = this.box.clientHeight;
    if (!W || !H) return;
    this.renderer.setSize(W, H, false); this.cam.aspect = W / H; this.cam.updateProjectionMatrix();
  }

  setMatriz(m) {
    this.A = m.slice();
    if (this.inputs) this.inputs.forEach((inp, i) => inp.value = this.A[i]);
    this.ep = proprios3(this.A);
    // desenhar espaços próprios
    const G = this.grupoProprio; while (G.children.length) G.remove(G.children[0]);
    // setas extra exatamente sobre os espaços próprios
    this.setas.splice(this.nBase).forEach(a => this.scene.remove(a));
    this.dirs.splice(this.nBase);
    for (const g of this.ep.grupos) {
      if (g.mg === 1) { const v = new THREE.Vector3(...g.base[0]).normalize(); this.dirs.push(v, v.clone().negate()); }
      else if (g.mg === 2) {
        const a = new THREE.Vector3(...g.base[0]).normalize(), n = a.clone().cross(new THREE.Vector3(...g.base[1])).normalize(), b = n.clone().cross(a);
        for (let k = 0; k < 8; k++) { const th = k * Math.PI / 4 + 0.2; this.dirs.push(a.clone().multiplyScalar(Math.cos(th)).add(b.clone().multiplyScalar(Math.sin(th)))); }
      }
    }
    while (this.setas.length < this.dirs.length) this.setas.push(this.criarSeta());
    const cores = [0x683a8c, 0xd99a00, 0x007660];
    const corCss = ['#683a8c', '#d99a00', '#007660'];
    const linhas = [];
    this.ep.grupos.forEach((g, i) => {
      const cor = cores[i % 3];
      if (g.mg === 1) {
        const v = new THREE.Vector3(...g.base[0]).normalize();
        const geo = new THREE.CylinderGeometry(0.025, 0.025, 12, 8); geo.rotateX(Math.PI / 2); // eixo z
        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: cor }));
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v); G.add(mesh);
        const s = this.textoSprite('E', cor); s.position.copy(v.clone().multiplyScalar(3.6)); G.add(s);
      } else if (g.mg === 2) {
        const nrm = new THREE.Vector3(...g.base[0]).cross(new THREE.Vector3(...g.base[1])).normalize();
        const plano = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshPhongMaterial({ color: cor, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
        plano.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm); G.add(plano);
        const borda = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, k) => new THREE.Vector3(2.4 * Math.cos(k * Math.PI / 32), 2.4 * Math.sin(k * Math.PI / 32), 0))), new THREE.LineBasicMaterial({ color: cor }));
        borda.quaternion.copy(plano.quaternion); G.add(borda);
      }
      const desc = g.mg === 3 ? 'todo o ℝ³' : g.mg === 2 ? 'plano gerado por ' + g.base.map(fmtV).join(' e ') : 'reta gerada por ' + fmtV(g.base[0]);
      linhas.push(`<span style="color:${corCss[i % 3]};font-weight:600">λ = ${fmt(g.l)}</span> (m<sub>a</sub> = ${g.ma}, m<sub>g</sub> = ${g.mg}): ${desc}`);
    });
    if (this.ep.nComplexos > 0) linhas.push(`<span class="muted">+ ${this.ep.nComplexos} valores próprios complexos (não reais)</span>`);
    const diag = this.ep.nComplexos === 0 && this.ep.grupos.every(g => g.mg === g.ma);
    linhas.push(diag ? '<b class="green">A é diagonalizável</b>' : '<b class="red">A não é diagonalizável (em ℝ)</b>');
    this.info.innerHTML = linhas.join('<br>');
    G.visible = this.verProprios;
    this.atualizar();
  }

  Mt() { const t = this.t, A = this.A; return A.map((a, i) => (i % 4 === 0 ? 1 - t : 0) + t * a); }

  atualizar() {
    const M = this.Mt();
    const ap = (v) => new THREE.Vector3(M[0] * v.x + M[1] * v.y + M[2] * v.z, M[3] * v.x + M[4] * v.y + M[5] * v.z, M[6] * v.x + M[7] * v.y + M[8] * v.z);
    const AF = this.A;
    this.dirs.forEach((u, i) => {
      const w = ap(u.clone().multiplyScalar(this.r)), L = w.length(), a = this.setas[i];
      // é vetor próprio de A? (independente de t)
      const Au = new THREE.Vector3(AF[0] * u.x + AF[1] * u.y + AF[2] * u.z, AF[3] * u.x + AF[4] * u.y + AF[5] * u.z, AF[6] * u.x + AF[7] * u.y + AF[8] * u.z);
      const prop = Au.length() < 1e-6 || Au.clone().normalize().cross(u).length() < 0.06;
      if (L < 1e-4) { a.visible = false; return; }
      a.visible = true;
      a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), w.clone().normalize());
      const { h, p, mat } = a.userData, hc = Math.min(0.2, L * 0.4), rs = prop ? 0.028 : 0.016;
      h.scale.set(rs, L - hc, rs); p.scale.set(rs * 3.2, hc, rs * 3.2); p.position.set(0, L, 0);
      const cor = prop ? 0xd99a00 : new THREE.Color().setHSL(((Math.atan2(u.y, u.x) / (2 * Math.PI) + 1) % 1), 0.5, 0.42 + 0.15 * u.z).getHex();
      mat.color.set(cor);
    });
    const pos = this.esfera.geometry.attributes.position, b = this.esfBase;
    for (let i = 0; i < pos.count; i++) {
      const x = b[3 * i], y = b[3 * i + 1], z = b[3 * i + 2];
      pos.setXYZ(i, M[0] * x + M[1] * y + M[2] * z, M[3] * x + M[4] * y + M[5] * z, M[6] * x + M[7] * y + M[8] * z);
    }
    pos.needsUpdate = true; this.esfera.geometry.computeVertexNormals();
    this.esferaW.geometry.dispose(); this.esferaW.geometry = new THREE.WireframeGeometry(this.esfera.geometry);
  }

  animar() { this.anim = { t0: performance.now(), from: this.t >= 0.99 ? 0 : this.t }; }

  loop() {
    const step = (now) => {
      requestAnimationFrame(step);
      const sec = this.el.closest('section');
      if (sec && !sec.classList.contains('present')) return; // só desenha no slide atual
      if (this.box.clientWidth && Math.abs(this.renderer.domElement.width / this.renderer.getPixelRatio() - this.box.clientWidth) > 2) this.resize();
      if (this.anim) {
        const { t0, from } = this.anim, dur = 2400 * (1 - from), x = Math.min(1, (now - t0) / dur);
        this.t = from + (1 - from) * ease(x); this.slider.value = this.t; this.atualizar();
        if (x >= 1) this.anim = null;
      }
      this.ctl.update(); this.renderer.render(this.scene, this.cam);
    };
    requestAnimationFrame(step);
  }
}

window.proprios3 = proprios3;
function init() { document.querySelectorAll('.espaco3d').forEach(el => { if (!el._e3d) el._e3d = new Espaco3D(el); }); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
