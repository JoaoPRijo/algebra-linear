/* Configuração comum do KaTeX (macros iguais às do preâmbulo LaTeX) */
window.KATEX_OPTS = {
  delimiters: [
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false }
  ],
  macros: {
    '\\R': '\\mathbb{R}', '\\N': '\\mathbb{N}',
    '\\nul': '\\operatorname{nul}', '\\car': '\\operatorname{car}',
    '\\imagem': '\\operatorname{Im}', '\\col': '\\operatorname{col}',
    '\\ger': '\\operatorname{L}', '\\tr': '\\operatorname{tr}'
  },
  throwOnError: false
};
renderMathInElement(document.body, window.KATEX_OPTS);
