(function () {
  const MAX_ROWS = 20;
  const MAX_QTY_SELECT = 300;
  let furnitureMap = {};
  let names = [];
  let rowCount = 0;

  function format2(n) { return n.toFixed(2); }

  function buildSelect() {
    const select = document.createElement('select');
    select.setAttribute('data-role', 'model');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select furniture';
    placeholder.disabled = false;
    select.appendChild(placeholder);

    // Group by first word (e.g., "Verde ..." -> group "Verde")
    const counts = Object.create(null);
    for (const n of names) {
      const base = n.split(' ')[0];
      counts[base] = (counts[base] || 0) + 1;
    }

    const groups = new Map();
    const singles = [];
    for (const n of names) {
      const base = n.split(' ')[0];
      if (counts[base] > 1 && base !== n) {
        if (!groups.has(base)) groups.set(base, []);
        groups.get(base).push(n);
      } else {
        singles.push(n);
      }
    }

    // Append singles
    singles.sort((a,b)=>a.localeCompare(b));
    for (const name of singles) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }

    // Append groups alphabetically
    const groupLabels = Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b));
    for (const label of groupLabels) {
      const og = document.createElement('optgroup');
      og.label = label; // most browsers render optgroup labels bold by default
      const items = groups.get(label).slice().sort((a,b)=>a.localeCompare(b));
      for (const name of items) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        og.appendChild(opt);
      }
      select.appendChild(og);
    }

    return select;
  }

  function calcRowResult(rowEl) {
    const select = rowEl.querySelector('select[data-role="model"]');
    const qtyEl = rowEl.querySelector('[data-qty]');
    const resultCell = rowEl.querySelector('.result-cell');
    const name = select.value;
    const qty = parseFloat(qtyEl && qtyEl.value ? qtyEl.value : '0');
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

  function isMobileLike() {
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
  }

  function buildQtyControlMobile() {
    const sel = document.createElement('select');
    sel.setAttribute('data-qty', '1');
    for (let i = 0; i <= MAX_QTY_SELECT; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }
    return sel;
  }

  function buildQtyControlDesktop() {
    const wrap = document.createElement('div');
    wrap.className = 'qty';
    const dec = document.createElement('button');
    dec.type = 'button';
    dec.className = 'qty-btn';
    dec.setAttribute('aria-label', 'Decrease quantity');
    dec.textContent = '−';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.placeholder = 'Qty';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.pattern = '[0-9]*';
    input.setAttribute('data-qty', '1');
    const inc = document.createElement('button');
    inc.type = 'button';
    inc.className = 'qty-btn';
    inc.setAttribute('aria-label', 'Increase quantity');
    inc.textContent = '+';
    wrap.appendChild(dec);
    wrap.appendChild(input);
    wrap.appendChild(inc);
    return { wrap, dec, input, inc };
  }

  function addRow() {
    if (rowCount >= MAX_ROWS) return;
    const rowsContainer = document.getElementById('rows');
    const row = document.createElement('div');
    row.className = 'row';

    const select = buildSelect();
    const mobile = isMobileLike();
    let qtyWrap = null;
    let qtyEl = null;
    let dec = null;
    let inc = null;
    if (mobile) {
      qtyEl = buildQtyControlMobile();
      qtyWrap = qtyEl; // direct select element occupies the middle grid cell
    } else {
      const desktop = buildQtyControlDesktop();
      qtyWrap = desktop.wrap;
      qtyEl = desktop.input;
      dec = desktop.dec;
      inc = desktop.inc;
    }

    const resultCell = document.createElement('div');
    resultCell.className = 'result-cell';
    resultCell.textContent = '0.00 %';

    select.addEventListener('change', onRowChange);
    if (qtyEl.tagName === 'SELECT') {
      qtyEl.addEventListener('change', onRowChange);
    } else {
      qtyEl.addEventListener('input', onRowChange);
      dec.addEventListener('click', function(){
        const v = Math.max(0, (parseInt(qtyEl.value || '0', 10) || 0) - 1);
        qtyEl.value = String(v);
        onRowChange();
      });
      inc.addEventListener('click', function(){
        const v = (parseInt(qtyEl.value || '0', 10) || 0) + 1;
        qtyEl.value = String(v);
        onRowChange();
      });
    }

    row.appendChild(select);
    row.appendChild(qtyWrap);
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
