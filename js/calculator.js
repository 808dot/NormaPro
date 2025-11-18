(function () {
  const MAX_ROWS = 10;
  let furnitureMap = {};
  let names = [];
  let rowCount = 0;

  function format2(n) { return n.toFixed(2); }

  function buildSelect() {
    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select furniture';
    placeholder.disabled = false;
    select.appendChild(placeholder);
    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
    return select;
  }

  function calcRowResult(rowEl) {
    const select = rowEl.querySelector('select');
    const qtyInput = rowEl.querySelector('input[type="number"]');
    const resultCell = rowEl.querySelector('.result-cell');
    const name = select.value;
    const qty = parseFloat(qtyInput.value || '0');
    const unit = furnitureMap[name] || 0;
    const result = unit * (isNaN(qty) ? 0 : qty);
    resultCell.textContent = `${format2(result)} %`;
    return result;
  }

  function computeTotal() {
    const rows = document.querySelectorAll('#rows .row');
    let total = 0;
    rows.forEach(r => { total += calcRowResult(r); });
    document.getElementById('total').textContent = format2(total);
  }

  function onRowChange() {
    computeTotal();
  }

  function addRow() {
    if (rowCount >= MAX_ROWS) return;
    const rowsContainer = document.getElementById('rows');
    const row = document.createElement('div');
    row.className = 'row';

    const select = buildSelect();
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '0';
    qty.step = '1';
    qty.placeholder = 'Qty';

    const resultCell = document.createElement('div');
    resultCell.className = 'result-cell';
    resultCell.textContent = '0.00 %';

    select.addEventListener('change', onRowChange);
    qty.addEventListener('input', onRowChange);

    row.appendChild(select);
    row.appendChild(qty);
    row.appendChild(resultCell);
    rowsContainer.appendChild(row);

    rowCount += 1;
    updateAddButtonState();
    computeTotal();
  }

  function updateAddButtonState() {
    const btn = document.getElementById('add-row');
    const hint = document.getElementById('row-hint');
    const disabled = rowCount >= MAX_ROWS;
    btn.disabled = disabled;
    if (disabled) { hint.textContent = 'Max 10 rows reached'; }
    else { hint.textContent = 'Up to 10 rows'; }
  }

  async function loadData() {
    const res = await fetch('data/furniture.json');
    if (!res.ok) throw new Error('Failed to load furniture data');
    return res.json();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const addBtn = document.getElementById('add-row');
    addBtn.addEventListener('click', addRow);

    try {
      furnitureMap = await loadData();
      names = Object.keys(furnitureMap).sort((a, b) => a.localeCompare(b));
      addRow();
    } catch (err) {
      const rows = document.getElementById('rows');
      const warn = document.createElement('div');
      warn.className = 'result-cell';
      warn.textContent = 'Unable to load data. Please run via a local server.';
      rows.appendChild(warn);
      console.error(err);
    }
  });

  window.NormaCalculator = { addRow };
})();
