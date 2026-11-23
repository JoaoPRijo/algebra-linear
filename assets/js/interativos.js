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

  /* Gerador: dá uma matriz 2x2 com valores próprios inteiros e um vetor; os alunos decidem se é vetor próprio. */
  function geradorVP(el) {
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const vecs = [[1, 0], [0, 1], [1, 1], [1, -1], [1, 2], [2, 1], [1, -2], [2, -1], [1, 3], [3, 1], [-1, 2]];
    let atual = null;
    const area = document.createElement('div'); area.className = 'center'; area.style.fontSize = '1.05em';
    const fb = document.createElement('div'); fb.className = 'quiz'; fb.innerHTML = '<div class="fb center"></div>';
    const bts = document.createElement('div'); bts.className = 'center'; bts.style.marginTop = '14px';
    bts.innerHTML = '<button class="btn" data-r="1">Sim, é vetor próprio</button> <button class="btn" data-r="0">Não é</button> <button class="btn primario" data-n>Nova pergunta ↻</button>';
    el.append(area, bts, fb);

    function nova() {
      // A = P D P^{-1} com P inteira de det ±1 -> entradas inteiras
      let P, D, A;
      do {
        const p = vecs[rnd(0, vecs.length - 1)], q = vecs[rnd(0, vecs.length - 1)];
        const d = p[0] * q[1] - p[1] * q[0];
        if (Math.abs(d) !== 1) continue;
        P = [p[0], q[0], p[1], q[1]];
        const l1 = rnd(-3, 4); let l2; do { l2 = rnd(-3, 4); } while (l2 === l1);
        D = [l1, l2];
        const Pi = [q[1] / d, -q[0] / d, -p[1] / d, p[0] / d];
        // A = P diag(D) P^{-1}
        const PD = [P[0] * D[0], P[1] * D[1], P[2] * D[0], P[3] * D[1]];
        A = [PD[0] * Pi[0] + PD[1] * Pi[2], PD[0] * Pi[1] + PD[1] * Pi[3], PD[2] * Pi[0] + PD[3] * Pi[2], PD[2] * Pi[1] + PD[3] * Pi[3]].map(x => Math.round(x));
      } while (!A || A.some(x => Math.abs(x) > 9));
      // escolher vetor: metade das vezes um vetor próprio (múltiplo)
      let v, prop, lam;
      if (Math.random() < 0.5) { const i = rnd(0, 1), k = [1, -1, 2][rnd(0, 2)]; v = [P[i] * k, P[2 + i] * k]; prop = true; lam = D[i]; }
      else {
        do { v = vecs[rnd(0, vecs.length - 1)].slice(); if (Math.random() < .3) v = v.map(x => -x); } while (Math.abs(v[0] * (A[2] * v[0] + A[3] * v[1]) - v[1] * (A[0] * v[0] + A[1] * v[1])) === 0);
        prop = false;
      }
      atual = { A, v, prop, lam };
      area.innerHTML = `\\(A=\\begin{bmatrix}${A[0]} & ${A[1]}\\\\ ${A[2]} & ${A[3]}\\end{bmatrix}, \\qquad v=\\begin{bmatrix}${v[0]}\\\\ ${v[1]}\\end{bmatrix}\\)`;
      fb.querySelector('.fb').innerHTML = '';
      tex(area);
    }
    function responder(r) {
      const { A, v, prop, lam } = atual;
      const Av = [A[0] * v[0] + A[1] * v[1], A[2] * v[0] + A[3] * v[1]];
      const ok = (r === 1) === prop;
      const exp = `\\(Av=\\begin{bmatrix}${Av[0]}\\\\ ${Av[1]}\\end{bmatrix}\\)` + (prop ? ` \\(= ${lam}\\,v\\)` + `, logo é vetor próprio associado a \\(\\lambda=${lam}\\).` : ', que não é múltiplo de \\(v\\).');
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
