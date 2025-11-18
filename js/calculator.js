(function () {
  function formatPercent(value) {
    return `${value.toFixed(2)}%`;
  }

  function calculateNorm(completed, target) {
    if (target <= 0) return { percent: 0, overUnder: NaN };
    const percent = (completed / target) * 100;
    const overUnder = completed - target;
    return { percent, overUnder };
  }

  function onSubmit(e) {
    e.preventDefault();
    const completed = parseFloat(document.getElementById('completed').value);
    const target = parseFloat(document.getElementById('target').value);
    const resultEl = document.getElementById('result');

    if (isNaN(completed) || isNaN(target) || target <= 0 || completed < 0) {
      resultEl.textContent = 'Please enter valid numbers (target > 0).';
      return;
    }

    const { percent, overUnder } = calculateNorm(completed, target);

    const status = overUnder > 0 ? 'above norm' : overUnder < 0 ? 'below norm' : 'on norm';

    resultEl.textContent = `Result: ${formatPercent(percent)} (${status}; ${overUnder >= 0 ? '+' : ''}${overUnder} units vs norm)`;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('norma-form');
    if (form) form.addEventListener('submit', onSubmit);
  });

  // Expose minimal API for future expansion
  window.NormaCalculator = { calculateNorm };
})();
