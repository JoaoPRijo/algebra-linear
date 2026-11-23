/* Mecanismos didáticos simples: flashcards, perguntas de escolha múltipla, "revelar ao clicar"
 * e o gerador de perguntas "Será vetor próprio?". Sem dependências (usa KaTeX se existir).
 *
 *  <div class="flash"><div class="in"><div class="f">Pergunta</div><div class="v">Resposta</div></div></div>
 *  <div class="quiz" data-certo="1" data-explica="..."> <div class="q">..</div>
 *     <div class="opts"><div class="opt">A</div><div class="opt">B</div>...</div><div class="fb"></div></div>
 *  <span class="revelar">conteúdo escondido</span>
 */
(function () {
  function tex(el) {
    if (window.renderMathInElement) renderMathInElement(el, window.KATEX_OPTS || {});
  }

  function init() {
    document.querySelectorAll('.flash').forEach(f => {
      f.querySelectorAll('.f, .v').forEach(face => { const d = document.createElement('div'); while (face.firstChild) d.appendChild(face.firstChild); face.appendChild(d); });
      f.addEventListener('click', () => f.classList.toggle('virado'));
    });

    document.querySelectorAll('.quiz').forEach(q => {
      const certo = parseInt(q.dataset.certo, 10);
      const opts = [...q.querySelectorAll('.opt')], fb = q.querySelector('.fb');
      opts.forEach((o, i) => o.addEventListener('click', () => {
        if (i === certo) {
          o.classList.add('certo');
          if (fb) { fb.innerHTML = '<b class="green">Certo!</b> ' + (q.dataset.explica || ''); tex(fb); }
        } else {
          o.classList.add('errado');
          if (fb) fb.innerHTML = '<b class="red">Não.</b> Tenta outra vez.';
        }
      }));
    });

    document.querySelectorAll('.revelar').forEach(r => r.addEventListener('click', () => r.classList.toggle('visto')));

    document.querySelectorAll('.gerador-vp').forEach(geradorVP);
  }

  /* Gerador: dá uma matriz n×n (n = 2 ou 3, atributo data-n) com valores próprios inteiros e um vetor;
   * os alunos decidem se é vetor próprio. A = P D P^{-1}, com P inteira de determinante 1. */
  function geradorVP(el) {
    const n = parseInt(el.dataset.n || '2', 10);
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const mul = (X, Y) => X.map((r, i) => Y[0].map((_, j) => r.reduce((s, x, k) => s + x * Y[k][j], 0)));
    const id = () => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
    const bmat = (M) => '\\begin{bmatrix}' + M.map(r => r.join(' & ')).join('\\\\ ') + '\\end{bmatrix}';
    const bvec = (v) => '\\begin{bmatrix}' + v.join('\\\\ ') + '\\end{bmatrix}';
    let atual = null;
    const area = document.createElement('div'); area.className = 'center'; area.style.fontSize = '1.05em';
    const fb = document.createElement('div'); fb.className = 'quiz'; fb.innerHTML = '<div class="fb center"></div>';
    const bts = document.createElement('div'); bts.className = 'center'; bts.style.marginTop = '14px';
    bts.innerHTML = '<button class="btn" data-r="1">Sim, é vetor próprio</button> <button class="btn" data-r="0">Não é</button> <button class="btn primario" data-n>Nova pergunta ↻</button>';
    el.append(area, bts, fb);

    function matrizP() { // produto de operações elementares l_i += c l_j (det = 1); devolve P e P^{-1}
      let P = id(), Pi = id();
      for (let k = 0; k < (n === 2 ? 2 : 3); k++) {
        const i = rnd(0, n - 1); let j; do { j = rnd(0, n - 1); } while (j === i);
        const c = [1, -1, 2, -2][rnd(0, n === 2 ? 3 : 1)];
        const E = id(); E[i][j] = c; const Ei = id(); Ei[i][j] = -c;
        P = mul(P, E); Pi = mul(Ei, Pi);
      }
      return [P, Pi];
    }
    function nova() {
      let P, Pi, D, A;
      do {
        [P, Pi] = matrizP();
        const ls = []; while (ls.length < n) { const l = rnd(-2, 4); if (!ls.includes(l)) ls.push(l); }
        D = ls;
        const Dm = id().map((r, i) => r.map(x => x * D[i]));
        A = mul(mul(P, Dm), Pi);
      } while (A.flat().some(x => Math.abs(x) > 9) || P.flat().some(x => Math.abs(x) > 3) || A.flat().filter(x => x === 0).length > n);
      const Av = (v) => A.map(r => r.reduce((s, x, k) => s + x * v[k], 0));
      const multiplo = (v, w) => { // w = λv ?
        const i = v.findIndex(x => x !== 0); const lam = w[i] / v[i];
        return v.every((x, k) => Math.abs(lam * x - w[k]) < 1e-9) ? lam : null;
      };
      let v, prop, lam;
      if (Math.random() < 0.5) {
        const i = rnd(0, n - 1), k = [1, -1, 2][rnd(0, 2)];
        v = P.map(r => r[i] * k); prop = true; lam = D[i];
      } else {
        do { v = Array.from({ length: n }, () => rnd(-2, 3)); } while (v.every(x => x === 0) || multiplo(v, Av(v)) !== null);
        prop = false;
      }
      atual = { A, v, prop, lam, Av: Av(v) };
      area.innerHTML = `\\(A=${bmat(A)}, \\qquad v=${bvec(v)}\\)`;
      fb.querySelector('.fb').innerHTML = '';
      tex(area);
    }
    function responder(r) {
      const { v, prop, lam, Av } = atual;
      const ok = (r === 1) === prop;
      const exp = `\\(Av=${bvec(Av)}\\)` + (prop ? ` \\(= ${lam}\\,v\\)` + `, logo é vetor próprio associado a \\(\\lambda=${lam}\\).` : ', que não é múltiplo de \\(v\\).');
      const f = fb.querySelector('.fb');
      f.innerHTML = (ok ? '<b class="green">Certo!</b> ' : '<b class="red">Errado.</b> ') + exp; tex(f);
    }
    bts.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-n')) nova(); else responder(parseInt(b.dataset.r, 10));
    });
    nova();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
