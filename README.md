# Materiais interativos (site estático)

Site estático pensado para o GitHub Pages: não há passo de compilação, basta servir esta pasta.

```
site/
├── index.html                         página inicial (lista de materiais)
├── assets/
│   ├── css/ma.css                     tema comum (cores do preâmbulo beamer)
│   ├── js/katex-config.js             macros KaTeX (\R, \nul, \car, \imagem, ...)
│   ├── js/plano2d.js                  animações R^2 -> R^2 (canvas)
│   ├── js/espaco3d.js                 animações R^3 -> R^3 (three.js)
│   ├── js/interativos.js              flashcards, escolha múltipla, "revelar", gerador de perguntas
│   └── img/
└── slides/
    └── 6-valores-vetores-proprios/    reveal.js
```

Para juntar outra aplicação (por ex. a da eliminação de Gauss), basta copiá-la para `apps/<nome>/`
e acrescentar um cartão em `index.html`.

## Ver localmente

```bash
cd site
python3 -m http.server 8000
```

e abrir <http://localhost:8000>. (Abrir o `index.html` diretamente com duplo clique também funciona,
exceto a animação 3D, que precisa de um servidor por usar módulos JavaScript.)

As bibliotecas (reveal.js 5.1.0, KaTeX 0.16.11, three.js 0.160.0) são carregadas do jsDelivr, por isso é
preciso ligação à internet na sala.

## Atalhos nos slides

Setas: navegar · `F`: ecrã inteiro · `Esc`: vista geral · `?`: lista de atalhos ·
acrescentar `?print-pdf` ao endereço e imprimir para PDF a partir do Chrome.
