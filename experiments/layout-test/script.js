(function(){

  let $tdoc;

  const FORMULAS = [
    {
      latex: "c = \\pm\\sqrt{a^2 + b^2}",
      status: 'ok',
      actions: [ "Solve a", "Solve b" ],
    },
    {
      latex: "\\sum_j \\frac{f_j(x)}{g_j(x)}",
      status: 'ok',
      actions: [ "Diff.", "Plot", "Simplify", "Expand" ]
    },
    {
      latex: "\\frac{1}{g(x)} = \\frac{CP+DQ}{PQ} = \\frac{C}{Q}+\\frac{D}{P}",
      status: 'unknown',
      actions: [],
      selected: true,
    },
    {
      latex: "\\frac{P(x)}{Q(x)} = \\frac{c_1}{x-\\alpha_1} + \\frac{c_2}{x-\\alpha_2} + \\cdots + \\frac{c_n}{x-\\alpha_n}",
      status: 'error',
      actions: [ "Errors" ],
    },
    {
      latex: "",
      actions: [],
    },
    {
      latex: "\\frac{x^2 + 1}{(x+2)(x-1)\\color{Blue}(x^2+x+1)} = \\frac{a}{x+2} + \\frac{b}{x-1} + \\frac{\\color{OliveGreen}cx + d}{\\color{Blue}x^2 + x + 1}",
      status: 'ok',
      actions: [],
    },
    {
      latex: "f(x) = \\frac{p(x)}{q(x)} = P(x) + \\sum_{i=1}^m\\sum_{r=1}^{j_i} \\frac{A_{ir}}{(x-a_i)^r} + \\sum_{i=1}^n\\sum_{r=1}^{k_i} \\frac{B_{ir}x+C_{ir}}{(x^2+b_ix+c_i)^r}",
      status: 'ok',
      actions: [],
    },
    {
      latex: "f(x)=\\frac{1}{x^2+2x-3} =\\frac{A}{x+3}+\\frac{B}{x-1}",
      status: 'ok',
      actions: [],
    },
    {
      latex: "\\begin{cases} 4 = 4C & x =1 \\\\ 2 + 2i = (Fi + G) (2+ 2i) & x = i \\\\ 0 = A- B +C - E - G & x = 0 \\end{cases}",
      status: 'ok',
      actions: [],
    },
  ];

  function addThought(formulaInfo, formulaNum) {
    const thoughtTemplate = document.querySelector('#templates>.thought');
    let html = thoughtTemplate.innerHTML;

    html = html.replace('${num}', formulaNum);

    const formulaHtml = katex.renderToString(formulaInfo.latex, { throwOnError: false });
    html = html.replace('${html}', formulaHtml);

    const status = formulaInfo.status;
    let statusMark = '';
    switch(formulaInfo.status) {
      // case 'ok': statusMark = "&#x2714;"; break;
      case 'error': statusMark = "&#x2757;"; break;
      case 'unknown': statusMark = "&#x2754;"; break;
    }
    html = html.replace('${status}', status);
    html = html.replace('${statusMark}', statusMark);

    const actionsHtml = formulaInfo.actions.map(a=>`<a href="#" class="action">${a}</a>`).join('');
    html = html.replace('${actions}', actionsHtml);

    const $elt = document.createElement('div');
    $elt.classList.add('thought');
    if (formulaInfo.selected) {
      $elt.classList.add('selected');
    }

    $elt.innerHTML = html;

    $tdoc.appendChild($elt);
  }

  function onLoad(event) {

    if (window.location.search == "?d=1") {
      document.querySelector('body').classList.add('debug');
    }

    $tdoc = document.querySelector('#tdoc');

    FORMULAS.forEach((formulaLatex, formulaNum)=> {
      addThought(formulaLatex, formulaNum);
    });

  }

  window.addEventListener('load', onLoad);

})();
