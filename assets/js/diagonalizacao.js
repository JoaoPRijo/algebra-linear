/* Exercício guiado de diagonalização: <div class="exercicio-diag"></div>
 * Gera matrizes 2×2, 3×3 ou 4×4 com valores próprios inteiros (diagonalizáveis ou não) e
 * conduz o aluno por fases: 1) polinómio característico, 2) valores próprios e m_a,
 * 3) espaços próprios (m_g e base), 4) conclusão (P e D). Cada fase tem ajudas.
 * Aritmética exata com frações. Sem dependências (usa KaTeX através de window.KATEX_OPTS).
 */
(function () {
  /* ---------- utilitários ---------- */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[rnd(0, arr.length - 1)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = rnd(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
  const tex = (el) => { if (window.renderMathInElement) renderMathInElement(el, window.KATEX_OPTS || {}); };

  // frações [num, den]
  const F = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; };
  const fsub = (a, b) => F(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  const fmul = (a, b) => F(a[0] * b[0], a[1] * b[1]);
  const fdiv = (a, b) => F(a[0] * b[1], a[1] * b[0]);
  const fz = (a) => a[0] === 0;
  const ftex = (a) => a[1] === 1 ? String(a[0]) : (a[0] < 0 ? '-' : '') + `\\frac{${Math.abs(a[0])}}{${a[1]}}`;

  const id = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
  const mul = (X, Y) => X.map(r => Y[0].map((_, j) => r.reduce((s, x, k) => s + x * Y[k][j], 0)));
  const bmat = (M, f = String) => '\\begin{bmatrix}' + M.map(r => r.map(f).join(' & ')).join('\\\\ ') + '\\end{bmatrix}';
  const bvec = (v) => '\\begin{bmatrix}' + v.join('\\\\ ') + '\\end{bmatrix}';

  /* Forma escalonada reduzida (Gauss-Jordan) com frações; devolve matriz e colunas pivô */
  function rref(M) {
    const A = M.map(r => r.map(x => F(x)));
    const n = A.length, m = A[0].length, piv = [];
    let lin = 0;
    for (let c = 0; c < m && lin < n; c++) {
      let p = -1; for (let i = lin; i < n; i++) if (!fz(A[i][c])) { p = i; break; }
      if (p < 0) continue;
      [A[lin], A[p]] = [A[p], A[lin]];
      const pv = A[lin][c]; A[lin] = A[lin].map(x => fdiv(x, pv));
      for (let i = 0; i < n; i++) if (i !== lin && !fz(A[i][c])) { const f = A[i][c]; A[i] = A[i].map((x, j) => fsub(x, fmul(f, A[lin][j]))); }
      piv.push(c); lin++;
    }
    return { R: A, piv };
  }
  /* Base do núcleo (vetores inteiros) a partir da forma escalonada reduzida */
  function baseNucleo(M) {
    const { R, piv } = rref(M), m = M[0].length;
    const livres = [...Array(m).keys()].filter(c => !piv.includes(c));
    const base = livres.map(fl => {
      const v = Array(m).fill(null).map(() => F(0)); v[fl] = F(1);
      piv.forEach((pc, i) => { v[pc] = F(-R[i][fl][0], R[i][fl][1]); });
      const L = v.reduce((s, x) => lcm(s, x[1]), 1);
      let w = v.map(x => x[0] * (L / x[1]));
      const g = w.reduce((s, x) => gcd(s, x), 0) || 1; w = w.map(x => x / g);
      return w;
    });
    return { R, piv, livres, base };
  }

  /* ---------- polinómios: coeficientes c[k] de λ^k ---------- */
  function polyRaizes(raizes) { // Π (r − λ)
    let c = [1];
    for (const r of raizes) {
      const nc = Array(c.length + 1).fill(0);
      c.forEach((x, k) => { nc[k] += r * x; nc[k + 1] -= x; });
      c = nc;
    }
    return c;
  }
  const pmul = (a, b) => { const c = Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { c[i + j] += x * y; })); return c; };
  const pval = (c, x) => c.reduce((s, a, k) => s + a * x ** k, 0);
  function ptex(c) {
    let s = '';
    for (let k = c.length - 1; k >= 0; k--) {
      const a = c[k]; if (a === 0) continue;
      const sinal = a < 0 ? '-' : (s ? '+' : '');
      const abs = Math.abs(a);
      const coef = (abs === 1 && k > 0) ? '' : String(abs);
      const pot = k === 0 ? '' : k === 1 ? '\\lambda' : `\\lambda^{${k}}`;
      s += sinal + coef + pot;
    }
    return s || '0';
  }
  const fator = (r) => r === 0 ? '\\lambda' : `(\\lambda${r > 0 ? '-' : '+'}${Math.abs(r)})`;
  function ftexFat(grupos, n, quads = []) {
    const nReais = grupos.reduce((s, g) => s + g.m, 0);
    return (nReais % 2 ? '-' : '') + grupos.map(g => fator(g.l) + (g.m > 1 ? `^{${g.m}}` : '')).join('') + quads.map(q => `(${ptex(q)})`).join('');
  }
  const gtex = (gs) => gs.map(g => `\\lambda=${g.l}\\ (m_a=${g.m})`).join(',\\quad ');
  const gkey = (gs) => gs.map(g => g.l + ':' + g.m).join('|');

  /* ---------- gerador ---------- */
  const PADROES = {
    2: { diag: [[1, 1]], nao: [[2]] },
    3: { diag: [[1, 1, 1], [2, 1]], nao: [[2, 1]] },
    4: { diag: [[1, 1, 1, 1], [2, 1, 1], [2, 2]], nao: [[2, 1, 1], [3, 1], [2, 2]] }
  };
  /* A = P M P^{-1}, com P unimodular; devolve null se A não for "bonita" */
  function conjugar(M, n) {
    const maxAbs = n === 4 ? 12 : 9;
    let P = id(n), Pi = id(n);
    for (let k = 0; k < n + (n === 2 ? 0 : 1); k++) {
      const i = rnd(0, n - 1); let j; do { j = rnd(0, n - 1); } while (j === i);
      const c = n === 2 ? pick([1, -1, 2, -2]) : pick([1, -1]);
      const E = id(n); E[i][j] = c; const Ei = id(n); Ei[i][j] = -c;
      P = mul(P, E); Pi = mul(Ei, Pi);
    }
    const A = mul(mul(P, M), Pi);
    const flat = A.flat();
    if (flat.some(x => Math.abs(x) > maxAbs)) return null;
    if (flat.filter(x => x === 0).length > n) return null;
    if (A.some(r => r.every(x => x === 0)) || A[0].some((_, j) => A.every(r => r[j] === 0))) return null;
    if (A.every((r, i) => r.every((x, j) => i === j || x === 0))) return null;
    return A;
  }
  function espacos(A, raizes) {
    const gs = [...new Set(raizes)].sort((a, b) => a - b).map(l => ({ l, m: raizes.filter(x => x === l).length }));
    gs.forEach(g => { const B = A.map((r, i) => r.map((x, j) => x - (i === j ? g.l : 0))); g.B = B; Object.assign(g, baseNucleo(B)); g.mg = g.base.length; });
    return gs;
  }
  /* Matrizes com valores próprios complexos: blocos 2×2 sem raízes reais */
  function gerarComplexo(n) {
    for (let tent = 0; tent < 3000; tent++) {
      const nBlocos = n === 4 && Math.random() < 0.3 ? 2 : 1;
      const M = id(n).map(r => r.map(() => 0)), quads = [];
      let pos = 0;
      for (let b = 0; b < nBlocos; b++) {
        let a, bb, c, d;
        do { a = rnd(-2, 3); bb = rnd(-3, 3); c = rnd(-3, 3); d = rnd(-2, 3); } while (bb === 0 || c === 0 || (a - d) ** 2 + 4 * bb * c >= 0);
        M[pos][pos] = a; M[pos][pos + 1] = bb; M[pos + 1][pos] = c; M[pos + 1][pos + 1] = d;
        quads.push([a * d - bb * c, -(a + d), 1]); pos += 2;
      }
      const raizes = []; while (raizes.length < n - pos) { const l = rnd(-3, 4); if (!raizes.includes(l)) raizes.push(l); }
      raizes.forEach((l, k) => { M[pos + k][pos + k] = l; });
      const A = conjugar(M, n); if (!A) continue;
      const gs = espacos(A, raizes);
      const poly = quads.reduce((acc, q) => pmul(acc, q), polyRaizes(raizes));
      return { n, A, gs, poly, diag: false, complexo: true, quads };
    }
    return null;
  }
  function gerar(n) {
    const u = Math.random();
    if (u >= 0.75) return gerarComplexo(n);
    const diag = u < 0.45;
    for (let tent = 0; tent < 3000; tent++) {
      const padrao = pick(PADROES[n][diag ? 'diag' : 'nao']);
      const vals = []; while (vals.length < padrao.length) { const l = rnd(-3, 4); if (!vals.includes(l)) vals.push(l); }
      // matriz M em blocos (diagonal ou com um bloco de Jordan)
      const M = id(n).map(r => r.map(() => 0));
      let pos = 0; const raizes = [];
      padrao.forEach((mult, gi) => {
        for (let k = 0; k < mult; k++) { M[pos + k][pos + k] = vals[gi]; raizes.push(vals[gi]); }
        if (!diag && gi === 0 && mult >= 2) M[pos][pos + 1] = 1;           // bloco de Jordan no 1.º grupo repetido
        if (!diag && gi === 1 && mult >= 2 && padrao[0] < 2) M[pos][pos + 1] = 1;
        pos += mult;
      });
      if (!diag && !M.some((r, i) => r[i + 1] === 1)) continue;
      const A = conjugar(M, n); if (!A) continue;
      // valores próprios e espaços próprios (verificação exata)
      const gs = espacos(A, raizes);
      const ehDiag = gs.every(g => g.mg === g.m);
      if (ehDiag !== diag) continue;
      return { n, A, gs, poly: polyRaizes(raizes), diag, complexo: false, quads: [] };
    }
    return null;
  }

  /* ---------- distratores ---------- */
  function opcoesPoly(c, n) {
    const certo = ptex(c), vistos = new Set([certo]), ops = [certo];
    const tenta = (cc) => { const t = ptex(cc); if (!vistos.has(t) && cc.some(x => x !== 0)) { vistos.add(t); ops.push(t); } };
    let a = c.slice(); a[n - 1] = -a[n - 1] || 2; tenta(a);                        // erro no traço
    a = c.slice(); a[0] = a[0] + pick([-2, -1, 1, 2]); tenta(a);                       // erro no determinante
    a = c.map(x => -x); if (n % 2 === 0) { a = c.slice(); a[1] = a[1] + pick([-3, 3]); } tenta(a); // sinal / termo em λ
    while (ops.length < 4) { a = c.slice(); const k = rnd(0, n - 1); a[k] += pick([-2, -1, 1, 2]); tenta(a); }
    return { ops: shuffle(ops), certo };
  }
  function opcoesVP(ex) {
    const { gs, n } = ex;
    if (ex.complexo) {
      const nc = n - gs.length;
      const txtC = nc === n ? 'Não há valores próprios reais: as raízes de \\(p(\\lambda)\\) são todas complexas (não reais)'
        : `\\(${gtex(gs)}\\) e ${nc === 2 ? 'duas raízes complexas' : 'raízes complexas'} (não reais)`;
      const vistos = new Set(), falsos = [];
      let t = 0;
      while (falsos.length < 3 && t++ < 200) { // conjuntos só com raízes reais (multiplicidade total n)
        const vals = gs.map(g => g.l);
        while (vals.length < n) { const x = rnd(-4, 5); if (!vals.includes(x) || Math.random() < 0.3) vals.push(x); }
        const g2 = [...new Set(vals)].sort((a, b) => a - b).map(l => ({ l, m: vals.filter(x => x === l).length }));
        const k = gkey(g2); if (!vistos.has(k)) { vistos.add(k); falsos.push(`\\(${gtex(g2)}\\)`); }
      }
      const ops = shuffle([txtC, ...falsos]);
      return { ops, iCerto: ops.indexOf(txtC) };
    }
    const r = opcoesVPreais(gs);
    return { ops: r.ops.map(o => `\\(${gtex(o)}\\)`), iCerto: r.ops.findIndex(o => gkey(o) === r.certo) };
  }
  function opcoesVPreais(gs) {
    const certo = gkey(gs), vistos = new Set([certo]), ops = [gs];
    const tenta = (g) => { g = g.slice().sort((x, y) => x.l - y.l); const k = gkey(g); if (!vistos.has(k) && new Set(g.map(x => x.l)).size === g.length) { vistos.add(k); ops.push(g); } };
    if (gs.length > 1) tenta(gs.map((g, i) => ({ l: g.l, m: gs[(i + 1) % gs.length].m })));
    tenta(gs.map(g => ({ l: -g.l, m: g.m })));
    let t = 0;
    while (ops.length < 4 && t++ < 100) { const i = rnd(0, gs.length - 1); tenta(gs.map((g, j) => ({ l: j === i ? g.l + pick([-1, 1, 2]) : g.l, m: g.m }))); }
    return { ops: shuffle(ops), certo };
  }

  /* ---------- widget ---------- */
  function ExercicioDiag(el) {
    el.classList.add('diag-ex');
    el.setAttribute('data-prevent-swipe', '');
    el.innerHTML = `
      <div class="dx-esq">
        <div class="dx-tam">Tamanho:
          <button class="btn" data-n="2">2×2</button><button class="btn on" data-n="3">3×3</button><button class="btn" data-n="4">4×4</button>
          <button class="btn primario" data-nova>Nova matriz ↻</button></div>
        <div class="dx-mat"></div>
        <div class="dx-resumo"></div>
      </div>
      <div class="dx-dir"><div class="dx-fases"></div><div class="dx-passo"></div></div>`;
    const $ = (s) => el.querySelector(s);
    let n = 3, ex = null, fase = 0, iE = 0;
    const resumo = [];

    const FASES = ['Polinómio característico', 'Valores próprios', 'Espaços próprios', 'Conclusão'];
    function barra() {
      $('.dx-fases').innerHTML = FASES.map((f, i) => {
        const cl = (ex && ex.complexo && i === 2 && fase > 1) ? 'saltado' : i < fase ? 'feito' : i === fase ? 'atual' : '';
        return `<span class="dx-f ${cl}">${i + 1}. ${f}</span>`;
      }).join('');
    }
    function atualizaResumo() { $('.dx-resumo').innerHTML = resumo.map(r => `<div>${r}</div>`).join(''); tex($('.dx-resumo')); }

    function nova() {
      ex = gerar(n);
      fase = 0; iE = 0; resumo.length = 0;
      $('.dx-mat').innerHTML = `<p>A matriz \\(A\\) é diagonalizável?</p><p class="center" style="font-size:1.15em">\\(A=${bmat(ex.A)}\\)</p>`;
      tex($('.dx-mat')); atualizaResumo(); passo();
    }

    /* Bloco de escolha múltipla genérico */
    function escolha(htmlPergunta, opcoes, iCerto, ajudas, aoAcertar, colunas = 2) {
      const box = $('.dx-passo');
      box.innerHTML = `<div class="dx-q">${htmlPergunta}</div>
        <div class="dx-opts" style="grid-template-columns:repeat(${colunas},1fr)">${opcoes.map((o, i) => `<div class="opt" data-i="${i}">${o}</div>`).join('')}</div>
        <div class="dx-fb"></div>
        <div class="dx-ajudas">${ajudas.map((a, i) => `<button class="btn dx-aj" data-a="${i}">💡 ${a.rotulo}</button>`).join(' ')}</div>
        <div class="dx-ajuda-txt"></div>
        <div class="dx-seg"></div>`;
      tex(box);
      let feito = false;
      box.querySelectorAll('.opt').forEach(o => o.addEventListener('click', () => {
        if (feito) return;
        const i = +o.dataset.i;
        if (i === iCerto) { o.classList.add('certo'); feito = true; box.querySelector('.dx-fb').innerHTML = '<b class="green">Certo!</b>'; aoAcertar(box); }
        else { o.classList.add('errado'); box.querySelector('.dx-fb').innerHTML = '<b class="red">Não.</b> Tenta outra vez ou usa uma ajuda.'; }
      }));
      box.querySelectorAll('.dx-aj').forEach(b => b.addEventListener('click', () => {
        const t = box.querySelector('.dx-ajuda-txt'); t.innerHTML = ajudas[+b.dataset.a].html; tex(t);
      }));
    }
    function botaoAvancar(box, texto, fn) {
      const seg = box.querySelector('.dx-seg');
      seg.innerHTML = `<button class="btn primario">${texto} →</button>`;
      seg.querySelector('button').addEventListener('click', fn);
    }

    function passo() {
      barra();
      const { A, gs, poly } = ex;
      const AmL = A.map((r, i) => r.map((x, j) => i === j ? `${x === 0 ? '' : x}-\\lambda` : String(x)));
      if (fase === 0) {
        const { ops, certo } = opcoesPoly(poly, n);
        const ajudas = [
          { rotulo: 'Como começar?', html: `<p>Escreve a matriz \\(A-\\lambda I\\) (subtrai \\(\\lambda\\) à diagonal):</p><p class="center">\\(A-\\lambda I=${bmat(AmL)}\\)</p><p>e calcula o seu determinante (${n === 2 ? 'fórmula dos 2×2' : n === 3 ? 'regra de Sarrus ou Laplace' : 'Laplace ao longo de uma linha ou coluna com zeros'}).</p>` }
        ];
        if (n === 2) ajudas.push({ rotulo: 'Ver o cálculo', html: `<p class="center">\\(\\det(A-\\lambda I)=(${A[0][0]}-\\lambda)(${A[1][1]}-\\lambda)-(${A[0][1]})\\cdot(${A[1][0]})=${ptex(poly)}\\)</p>` });
        escolha('<b>1.º passo.</b> Qual é o polinómio característico \\(p(\\lambda)=\\det(A-\\lambda I)\\)?', ops.map(o => `\\(${o}\\)`), ops.indexOf(certo), ajudas, (box) => {
          resumo.push(`\\(p(\\lambda)=${ptex(poly)}\\)`); atualizaResumo();
          botaoAvancar(box, 'Avançar para os valores próprios', () => { fase = 1; passo(); });
        });
      } else if (fase === 1) {
        const { ops, iCerto } = opcoesVP(ex);
        const fat = ftexFat(gs, n, ex.quads);
        // candidatos: divisores do termo independente (ou do primeiro coeficiente não nulo)
        const k0 = poly.findIndex(x => x !== 0), c0 = Math.abs(poly[k0]);
        const divs = []; for (let d = 1; d <= c0; d++) if (c0 % d === 0) divs.push(d, -d);
        if (k0 > 0) divs.unshift(0);
        const linhas = divs.slice(0, 12).map(d => `\\(p(${d})=${pval(poly, d)}\\)${pval(poly, d) === 0 ? ' ✔' : ''}`).join(' &nbsp; ');
        const ajudas = [
          { rotulo: 'Onde procurar raízes?', html: `<p>As raízes inteiras de \\(p(\\lambda)\\) são divisores do termo independente${k0 > 0 ? ` (aqui \\(\\lambda=0\\) é raiz, porque \\(p(0)=0\\))` : ''}. Testa-os:</p><p class="small">${linhas}</p><p>Quando encontrares uma raiz \\(r\\), divide \\(p(\\lambda)\\) por \\((\\lambda-r)\\) com a regra de Ruffini.</p>` },
          { rotulo: 'Ver a fatorização', html: `<p class="center">\\(p(\\lambda)=${fat}\\)</p>` + (gs.length ? `<p>O expoente de cada fator \\((\\lambda-\\lambda_i)\\) é a multiplicidade algébrica \\(m_a(\\lambda_i)\\).</p>` : '') +
            ex.quads.map(q => `<p>O fator \\(${ptex(q)}\\) tem \\(\\Delta=(${q[1]})^2-4\\cdot ${q[0]}=${q[1] * q[1] - 4 * q[0]}<0\\): as suas raízes são complexas (não reais).</p>`).join('') }
        ];
        if (ex.complexo && !gs.length) ajudas[0] = { rotulo: 'Como começar?', html: `<p>Resolve \\(p(\\lambda)=0\\)${n === 2 ? ' com a fórmula resolvente: calcula primeiro \\(\\Delta=b^2-4ac\\).' : '.'}</p>` };
        escolha('<b>1.º passo (cont.).</b> Quais são os valores próprios de \\(A\\) e as respetivas multiplicidades algébricas?', ops, iCerto, ajudas, (box) => {
          resumo.push(`\\(p(\\lambda)=${fat}\\)`);
          if (ex.complexo) {
            resumo.push((gs.length ? `\\(${gtex(gs)}\\) e ` : '') + 'raízes complexas (não reais)'); atualizaResumo();
            botaoAvancar(box, 'Avançar para a conclusão', () => { fase = 3; passo(); });
          } else {
            resumo.push(`\\(${gtex(gs)}\\)`); atualizaResumo();
            botaoAvancar(box, 'Avançar para os espaços próprios', () => { fase = 2; iE = 0; passo(); });
          }
        }, 1);
      } else if (fase === 2) {
        const g = gs[iE];
        const opc = []; for (let k = 1; k <= Math.min(n, g.m + 1); k++) opc.push(k);
        const Btex = bmat(g.B);
        const Rtex = bmat(g.R, ftex);
        const livres = g.livres.map(c => ['x', 'y', 'z', 'w'][c]);
        const ajudas = [
          { rotulo: 'Como começar?', html: `<p>\\(E(${g.l})=\\mathcal{N}(A-${g.l < 0 ? `(${g.l})` : g.l}I)\\): resolve o sistema homogéneo com a matriz</p><p class="center">\\(A-${g.l < 0 ? `(${g.l})` : g.l}I=${Btex}\\)</p>` },
          { rotulo: 'Ver a matriz escalonada', html: `<p>Pelo método de Gauss-Jordan:</p><p class="center">\\(${Rtex}\\)</p><p>Variáveis livres: ${livres.map(v => `\\(${v}\\)`).join(', ')}. O número de variáveis livres é \\(\\dim E(${g.l})\\).</p>` },
          { rotulo: 'Lembrete', html: `<p>Tem-se sempre \\(1\\le m_g(\\lambda)\\le m_a(\\lambda)\\). Aqui \\(m_a(${g.l})=${g.m}\\).</p>` }
        ];
        escolha(`<b>2.º passo.</b> Para \\(\\lambda=${g.l}\\), qual é a multiplicidade geométrica \\(m_g(${g.l})=\\dim E(${g.l})\\)?`, opc.map(k => `\\(${k}\\)`), opc.indexOf(g.mg), ajudas, (box) => {
          const base = g.base.map(v => `\\(${bvec(v)}\\)`).join(' , ');
          box.querySelector('.dx-fb').innerHTML += ` &nbsp; \\(E(${g.l})\\) é gerado por ${base}`; tex(box.querySelector('.dx-fb'));
          resumo.push(`\\(E(${g.l})=\\ger\\{${g.base.map(v => '(' + v.join(',') + ')').join(',')}\\},\\ m_g(${g.l})=${g.mg}\\)`); atualizaResumo();
          if (iE < gs.length - 1) botaoAvancar(box, `Avançar para λ = ${gs[iE + 1].l}`, () => { iE++; passo(); });
          else botaoAvancar(box, 'Avançar para a conclusão', () => { fase = 3; passo(); });
        }, opc.length);
      } else if (fase === 3) {
        const ajudas = [{ rotulo: 'Critério', html: `<p>\\(A\\) é diagonalizável se e só se todos os valores próprios são reais e \\(m_g(\\lambda)=m_a(\\lambda)\\) para cada um. Compara as multiplicidades no resumo à esquerda.</p>` }];
        escolha('<b>3.º passo.</b> A matriz \\(A\\) é diagonalizável?', ['Sim', 'Não'], ex.diag ? 0 : 1, ajudas, (box) => {
          const fb = box.querySelector('.dx-fb');
          if (ex.diag) {
            const cols = gs.flatMap(g => g.base.map(v => ({ v, l: g.l })));
            const P = ex.A.map((_, i) => cols.map(c => c.v[i]));
            const D = cols.map((c, i) => cols.map((_, j) => i === j ? c.l : 0));
            fb.innerHTML += ` Para todos os valores próprios, \\(m_g=m_a\\). Juntando as bases dos espaços próprios:<p class="center">\\(P=${bmat(P)},\\qquad D=${bmat(D)},\\qquad A=PDP^{-1}\\)</p>`;
          } else if (ex.complexo) {
            fb.innerHTML += ' O polinómio característico tem raízes complexas (não reais), por isso \\(A\\) não é diagonalizável.';
          } else {
            const mau = gs.filter(g => g.mg < g.m).map(g => `\\(m_g(${g.l})=${g.mg}<${g.m}=m_a(${g.l})\\)`).join(' e ');
            fb.innerHTML += ` Como ${mau}, não existe uma base de \\(\\R^{${n}}\\) formada por vetores próprios de \\(A\\).`;
          }
          tex(fb); fase = 4; barra();
          botaoAvancar(box, 'Nova matriz', () => nova());
        });
      }
    }

    el.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
      n = +b.dataset.n; el.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); nova();
    }));
    $('[data-nova]').addEventListener('click', nova);
    nova();
  }

  function init() { document.querySelectorAll('.exercicio-diag').forEach(el => { if (!el._dx) el._dx = new ExercicioDiag(el); }); }
  window.geraDiag = gerar; // para testes
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
