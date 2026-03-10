/**
 * NormaPro - Główny moduł kalkulatora
 * 
 * Zawiera logikę:
 * - Kalkulatora normy (wybór mebli + ilość)
 * - Przelicznika godzin (konwersja między normami)
 * - Kalkulatora zespołowego (podział pracy)
 * - Zarządzania widokami
 * 
 * @author NormaPro Team
 * @version 2.0.0
 */

(function () {
  'use strict';

  // ============================================
  // KONFIGURACJA I STAŁE
  // ============================================
  
  /**
   * Maksymalna liczba wierszy w kalkulatorze
   */
  const MAX_ROWS = NormaConfig?.MAX_ROWS || 20;
  
  /**
   * Maksymalna wartość w selekcie ilości (mobile)
   */
  const MAX_QTY_SELECT = NormaConfig?.MAX_QTY_SELECT || 300;
  
  /**
   * Domyślna norma godzinowa (ZMIANA: 8h → 7h)
   */
  let currentNormHours = NormaConfig?.DEFAULT_NORM_HOURS || 7;

  // ============================================
  // STAN APLIKACJI
  // ============================================
  
  /**
   * Mapa mebli: nazwa → procent normy
   */
  let furnitureMap = {};
  
  /**
   * Posortowana lista nazw mebli
   */
  let furnitureNames = [];
  
  /**
   * Aktualna liczba wierszy (kalkulator główny)
   */
  let rowCount = 0;
  
  /**
   * Aktualna liczba wierszy (kalkulator zespołowy)
   */
  let teamRowCount = 0;
  
  /**
   * Aktualny widok
   */
  let currentView = 'norma';

  // ============================================
  // FUNKCJE POMOCNICZE
  // ============================================

  /**
   * Skrót do getElementById
   * @param {string} id - ID elementu
   * @returns {HTMLElement|null}
   */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * Formatuje liczbę do 2 miejsc po przecinku
   * @param {number} n - Liczba
   * @returns {string}
   */
  function format2(n) {
    return n.toFixed(2);
  }

  /**
   * Formatuje czas (godziny) do czytelnej postaci
   * @param {number} hours - Czas w godzinach
   * @returns {string}
   */
  function formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  /**
   * Sprawdza czy urządzenie ma ekran dotykowy
   * @returns {boolean}
   */
  function isMobileLike() {
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) 
      || (navigator.maxTouchPoints || 0) > 0;
  }

  /**
   * Pokazuje powiadomienie toast
   * @param {string} message - Treść
   * @param {string} type - Typ: 'success', 'error', 'info'
   */
  function showToast(message, type = 'info') {
    // Usuń istniejące toasty
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-usuwanie po 3s
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================
  // ZARZĄDZANIE WIDOKAMI
  // ============================================

  /**
   * Przełącza widok aplikacji
   * @param {string} viewName - Nazwa widoku: 'norma', 'hours', 'team', 'workers'
   */
  function switchView(viewName) {
    currentView = viewName;
    
    // Ukryj wszystkie sekcje
    document.querySelectorAll('.view-section').forEach(section => {
      section.hidden = true;
      section.classList.remove('active');
    });
    
    // Pokaż wybraną sekcję
    const targetSection = $(`${viewName}-section`);
    if (targetSection) {
      targetSection.hidden = false;
      targetSection.classList.add('active');
    }
    
    // Aktualizuj przyciski nawigacji
    document.querySelectorAll('.view-toggle .btn-toggle').forEach(btn => {
      const isActive = btn.id === `view-${viewName}`;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Odśwież dane specyficzne dla widoku
    if (viewName === 'team') {
      refreshTeamWorkersList();
    } else if (viewName === 'workers') {
      refreshWorkersList();
    }
  }

  /**
   * Inicjalizuje nawigację widoków
   */
  function initViewNavigation() {
    const viewButtons = ['norma', 'hours', 'team', 'workers'];
    
    viewButtons.forEach(view => {
      const btn = $(`view-${view}`);
      if (btn) {
        btn.addEventListener('click', () => switchView(view));
      }
    });
  }

  // ============================================
  // BUDOWANIE SELEKTÓW
  // ============================================

  /**
   * Buduje select z listą mebli (pogrupowany)
   * @returns {HTMLSelectElement}
   */
  function buildFurnitureSelect() {
    const select = document.createElement('select');
    select.setAttribute('data-role', 'model');
    select.className = 'furniture-select';
    
    // Placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Wybierz mebel...';
    placeholder.disabled = false;
    select.appendChild(placeholder);

    // Grupowanie mebli po pierwszym słowie
    const groups = new Map();
    const singles = [];

    // Zlicz ile mebli w każdej grupie
    const counts = Object.create(null);
    for (const name of furnitureNames) {
      const base = name.split(' ')[0];
      counts[base] = (counts[base] || 0) + 1;
    }

    // Podziel na grupy i pojedyncze
    for (const name of furnitureNames) {
      const base = name.split(' ')[0];
      if (counts[base] > 1 && base !== name) {
        if (!groups.has(base)) groups.set(base, []);
        groups.get(base).push(name);
      } else {
        singles.push(name);
      }
    }

    // Dodaj pojedyncze meble
    singles.sort((a, b) => a.localeCompare(b, 'pl'));
    for (const name of singles) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${format2(furnitureMap[name])}%)`;
      select.appendChild(opt);
    }

    // Dodaj grupy
    const groupLabels = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'pl'));
    for (const label of groupLabels) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      
      const items = groups.get(label).slice().sort((a, b) => a.localeCompare(b, 'pl'));
      for (const name of items) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `${name} (${format2(furnitureMap[name])}%)`;
        optgroup.appendChild(opt);
      }
      select.appendChild(optgroup);
    }

    return select;
  }

  /**
   * Generuje opcje czasowe dla przelicznika godzin
   * Krok co 10 minut (ZMIANA z 1 godziny)
   */
  function populateTimeSelects() {
    const fromSel = $('from-hours');
    const toSel = $('to-hours');
    
    if (!fromSel || !toSel) return;

    // Wyczyść
    fromSel.innerHTML = '';
    toSel.innerHTML = '';

    // Generuj opcje co 10 minut od 1h do 12h
    const stepMinutes = NormaConfig?.TIME_STEP_MINUTES || 10;
    const stepHours = stepMinutes / 60;
    const minHours = NormaConfig?.MIN_HOURS || 1;
    const maxHours = NormaConfig?.MAX_HOURS || 12;

    for (let h = minHours; h <= maxHours; h += stepHours) {
      const hours = Math.floor(h);
      const minutes = Math.round((h - hours) * 60);
      
      let label;
      if (minutes === 0) {
        label = `${hours}h`;
      } else {
        label = `${hours}h ${minutes}min`;
      }

      const opt1 = document.createElement('option');
      opt1.value = h.toFixed(2);
      opt1.textContent = label;
      fromSel.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = h.toFixed(2);
      opt2.textContent = label;
      toSel.appendChild(opt2);
    }

    // Domyślne wartości: 8h → 7h
    const defaultFrom = NormaConfig?.DEFAULT_CONVERTER?.FROM_HOURS || 8;
    const defaultTo = NormaConfig?.DEFAULT_CONVERTER?.TO_HOURS || 7;
    fromSel.value = defaultFrom.toFixed(2);
    toSel.value = defaultTo.toFixed(2);
  }

  /**
   * Populuje select normy w modalu
   */
  function populateNormSelect() {
    const normInput = $('norm-hours-input');
    if (!normInput) return;

    normInput.innerHTML = '';
    
    for (let h = 5; h <= 10; h++) {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = `${h} godzin`;
      if (h === currentNormHours) opt.selected = true;
      normInput.appendChild(opt);
    }
  }

  // ============================================
  // KALKULATOR NORMY
  // ============================================

  /**
   * Kontrolka ilości dla mobile (select)
   * @returns {HTMLSelectElement}
   */
  function buildQtyControlMobile() {
    const sel = document.createElement('select');
    sel.setAttribute('data-qty', '1');
    sel.className = 'qty-select';
    
    for (let i = 0; i <= MAX_QTY_SELECT; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      sel.appendChild(opt);
    }
    return sel;
  }

  /**
   * Kontrolka ilości dla desktop (+/- przyciski)
   * @returns {Object}
   */
  function buildQtyControlDesktop() {
    const wrap = document.createElement('div');
    wrap.className = 'qty';
    
    const dec = document.createElement('button');
    dec.type = 'button';
    dec.className = 'qty-btn';
    dec.setAttribute('aria-label', 'Zmniejsz ilość');
    dec.textContent = '−';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.placeholder = 'Ilość';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.pattern = '[0-9]*';
    input.setAttribute('data-qty', '1');
    
    const inc = document.createElement('button');
    inc.type = 'button';
    inc.className = 'qty-btn';
    inc.setAttribute('aria-label', 'Zwiększ ilość');
    inc.textContent = '+';
    
    wrap.appendChild(dec);
    wrap.appendChild(input);
    wrap.appendChild(inc);
    
    return { wrap, dec, input, inc };
  }

  /**
   * Oblicza wynik dla pojedynczego wiersza
   * @param {HTMLElement} rowEl - Element wiersza
   * @returns {number} Procent normy
   */
  function calcRowResult(rowEl) {
    const select = rowEl.querySelector('select[data-role="model"]');
    const qtyEl = rowEl.querySelector('[data-qty]');
    const resultCell = rowEl.querySelector('.result-cell');
    
    const name = select?.value || '';
    const qty = parseFloat(qtyEl?.value || '0');
    const unit = furnitureMap[name] || 0;
    const result = unit * (isNaN(qty) ? 0 : qty);
    
    if (resultCell) {
      resultCell.textContent = `${format2(result)}%`;
    }
    
    return result;
  }

  /**
   * Oblicza sumę wszystkich wierszy i aktualizuje UI
   */
  function computeTotal() {
    const rows = document.querySelectorAll('#rows .row');
    let total = 0;
    
    rows.forEach(row => {
      total += calcRowResult(row);
    });
    
    // Aktualizuj sumę
    const totalEl = $('total');
    if (totalEl) {
      totalEl.textContent = format2(total);
    }
  }

  /**
   * Handler zmiany w wierszu
   */
  function onRowChange() {
    computeTotal();
  }

  /**
   * Dodaje nowy wiersz do kalkulatora
   */
  function addRow() {
    if (rowCount >= MAX_ROWS) {
      showToast('Osiągnięto maksymalną liczbę wierszy', 'error');
      return;
    }
    
    const rowsContainer = $('rows');
    if (!rowsContainer) return;

    const row = document.createElement('div');
    row.className = 'row';

    // Select mebla
    const select = buildFurnitureSelect();
    
    // Kontrolka ilości
    const mobile = isMobileLike();
    let qtyWrap, qtyEl, dec, inc;
    
    if (mobile) {
      qtyEl = buildQtyControlMobile();
      qtyWrap = qtyEl;
    } else {
      const desktop = buildQtyControlDesktop();
      qtyWrap = desktop.wrap;
      qtyEl = desktop.input;
      dec = desktop.dec;
      inc = desktop.inc;
    }

    // Komórka wyniku
    const resultCell = document.createElement('div');
    resultCell.className = 'result-cell';
    resultCell.textContent = '0.00%';

    // Przycisk usuwania
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'row-remove';
    removeBtn.setAttribute('aria-label', 'Usuń wiersz');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
      rowCount--;
      updateAddButtonState();
      computeTotal();
    });

    // Event listenery
    select.addEventListener('change', onRowChange);
    
    if (qtyEl.tagName === 'SELECT') {
      qtyEl.addEventListener('change', onRowChange);
    } else {
      qtyEl.addEventListener('input', onRowChange);
      dec?.addEventListener('click', () => {
        const v = Math.max(0, (parseInt(qtyEl.value || '0', 10) || 0) - 1);
        qtyEl.value = String(v);
        onRowChange();
      });
      inc?.addEventListener('click', () => {
        const v = (parseInt(qtyEl.value || '0', 10) || 0) + 1;
        qtyEl.value = String(v);
        onRowChange();
      });
    }

    // Złożenie wiersza
    row.appendChild(select);
    row.appendChild(qtyWrap);
    row.appendChild(resultCell);
    row.appendChild(removeBtn);
    rowsContainer.appendChild(row);

    rowCount++;
    updateAddButtonState();
    computeTotal();
  }

  /**
   * Aktualizuje stan przycisku dodawania
   */
  function updateAddButtonState() {
    const btn = $('add-row');
    const hint = $('row-hint');
    const disabled = rowCount >= MAX_ROWS;
    
    if (btn) btn.disabled = disabled;
    if (hint) {
      hint.textContent = disabled 
        ? 'Osiągnięto maksimum wierszy' 
        : `Możesz dodać do ${MAX_ROWS} wierszy`;
    }
  }

  // ============================================
  // PRZELICZNIK GODZIN
  // ============================================

  /**
   * Oblicza konwersję procentu między normami
   */
  function calculateHoursConversion() {
    const input = $('input-percent');
    const fromSel = $('from-hours');
    const toSel = $('to-hours');
    const resultEl = $('hours-result');
    const explanationEl = $('hours-explanation');

    const value = parseFloat(input?.value);
    
    if (isNaN(value)) {
      if (resultEl) resultEl.textContent = '—';
      if (explanationEl) explanationEl.textContent = 'Wprowadź wartość procentową';
      return;
    }

    const from = parseFloat(fromSel?.value) || 7;
    const to = parseFloat(toSel?.value) || 7;
    const result = value * (from / to);

    if (resultEl) {
      resultEl.textContent = `${format2(result)}%`;
    }
    
    if (explanationEl) {
      const fromFormatted = formatTime(from);
      const toFormatted = formatTime(to);
      explanationEl.textContent = `${format2(value)}% przy ${fromFormatted} = ${format2(result)}% przy ${toFormatted}`;
    }
  }

  /**
   * Inicjalizuje przelicznik godzin
   */
  function initHoursConverter() {
    populateTimeSelects();

    const calcBtn = $('calc-hours');
    const inputEl = $('input-percent');
    
    // Ustaw domyślną wartość procentu
    if (inputEl) {
      inputEl.value = NormaConfig?.DEFAULT_CONVERTER?.PERCENT || 110;
    }

    calcBtn?.addEventListener('click', calculateHoursConversion);
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') calculateHoursConversion();
    });
    inputEl?.addEventListener('input', calculateHoursConversion);
  }

  // ============================================
  // KALKULATOR ZESPOŁOWY
  // ============================================

  /**
   * Odświeża listę pracowników w kalkulatorze zespołowym
   */
  async function refreshTeamWorkersList() {
    const container = $('team-workers-list');
    if (!container) return;

    try {
      const workers = await WorkersManager.getActiveWorkers();
      
      container.innerHTML = '';
      
      for (const worker of workers) {
        const item = document.createElement('label');
        item.className = 'worker-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'team-worker';
        checkbox.value = worker.id;
        checkbox.checked = true;
        checkbox.dataset.name = worker.name;
        checkbox.dataset.efficiency = worker.efficiency;
        
        const text = document.createElement('span');
        text.innerHTML = `<strong>${worker.name}</strong> <span class="efficiency-badge">${worker.efficiency}%</span>`;
        
        item.appendChild(checkbox);
        item.appendChild(text);
        container.appendChild(item);
      }
    } catch (e) {
      console.error('Błąd ładowania pracowników:', e);
      container.innerHTML = '<p class="error-text">Nie można załadować pracowników</p>';
    }
  }

  /**
   * Dodaje nowy wiersz do kalkulatora zespołowego
   */
  function addTeamRow() {
    if (teamRowCount >= MAX_ROWS) {
      showToast('Osiągnięto maksymalną liczbę wierszy', 'error');
      return;
    }
    
    const rowsContainer = $('team-rows');
    if (!rowsContainer) return;

    const row = document.createElement('div');
    row.className = 'team-row';

    // Select mebla
    const select = buildFurnitureSelect();
    select.dataset.role = 'model';
    
    // Kontrolka ilości
    const mobile = isMobileLike();
    let qtyWrap, qtyEl, dec, inc;
    
    if (mobile) {
      qtyEl = buildQtyControlMobile();
      qtyWrap = qtyEl;
    } else {
      const desktop = buildQtyControlDesktop();
      qtyWrap = desktop.wrap;
      qtyEl = desktop.input;
      dec = desktop.dec;
      inc = desktop.inc;
    }

    // Komórka wyniku (opcjonalna - dla podglądu normy)
    const resultCell = document.createElement('div');
    resultCell.className = 'result-cell';
    resultCell.textContent = '0.00%';

    // Przycisk usuwania
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'team-row-remove';
    removeBtn.setAttribute('aria-label', 'Usuń wiersz');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
      teamRowCount--;
      updateTeamAddButtonState();
      computeTeamTotal();
    });

    // Funkcja aktualizująca wynik wiersza
    const onTeamRowChange = () => {
      const name = select.value;
      let val;
      if (qtyEl.tagName === 'SELECT') {
        val = parseInt(qtyEl.value, 10) || 0;
      } else {
        val = parseInt(qtyEl.value || '0', 10) || 0;
      }
      if (name && val > 0) {
        const norm = furnitureMap[name] || 0;
        resultCell.textContent = format2(norm * val) + '%';
      } else {
        resultCell.textContent = '0.00%';
      }
      computeTeamTotal();
    };

    // Event listenery
    select.addEventListener('change', onTeamRowChange);
    
    if (qtyEl.tagName === 'SELECT') {
      qtyEl.addEventListener('change', onTeamRowChange);
    } else {
      qtyEl.addEventListener('input', onTeamRowChange);
      dec?.addEventListener('click', () => {
        const v = Math.max(0, (parseInt(qtyEl.value || '0', 10) || 0) - 1);
        qtyEl.value = String(v);
        onTeamRowChange();
      });
      inc?.addEventListener('click', () => {
        const v = (parseInt(qtyEl.value || '0', 10) || 0) + 1;
        qtyEl.value = String(v);
        onTeamRowChange();
      });
    }

    // Złożenie wiersza
    row.appendChild(select);
    row.appendChild(qtyWrap);
    row.appendChild(resultCell);
    row.appendChild(removeBtn);
    rowsContainer.appendChild(row);

    teamRowCount++;
    updateTeamAddButtonState();
  }

  /**
   * Aktualizuje stan przycisku dodawania (team)
   */
  function updateTeamAddButtonState() {
    const btn = $('add-team-row');
    if (btn) btn.disabled = teamRowCount >= MAX_ROWS;
  }

  /**
   * Oblicza sumę normy dla zespołu (preview)
   */
  function computeTeamTotal() {
    const container = $('team-rows');
    if (!container) return;

    let total = 0;
    const rows = container.querySelectorAll('.team-row');
    
    rows.forEach(row => {
      const sel = row.querySelector('select');
      const qtyEl = row.querySelector('select.qty-select, input[type="number"]');
      const name = sel?.value;
      let qty = 0;
      
      if (qtyEl?.tagName === 'SELECT') {
        qty = parseInt(qtyEl.value, 10) || 0;
      } else {
        qty = parseInt(qtyEl?.value || '0', 10) || 0;
      }
      
      if (name && qty > 0) {
        total += (furnitureMap[name] || 0) * qty;
      }
    });

    // Opcjonalnie: można wyświetlić sumę gdzieś
    // Nie ma teraz dedykowanego elementu na sumę
  }

  /**
   * Zbiera dane z wierszy zespołowych
   */
  function collectTeamFurnitureData() {
    const container = $('team-rows');
    if (!container) return [];

    const items = [];
    const rows = container.querySelectorAll('.team-row');
    
    rows.forEach(row => {
      const sel = row.querySelector('select');
      const qtyEl = row.querySelector('select.qty-select, input[type="number"]');
      const name = sel?.value;
      let qty = 0;
      
      if (qtyEl?.tagName === 'SELECT') {
        qty = parseInt(qtyEl.value, 10) || 0;
      } else {
        qty = parseInt(qtyEl?.value || '0', 10) || 0;
      }
      
      if (name && qty > 0) {
        items.push({
          name: name,
          norm: furnitureMap[name] || 0,
          quantity: qty
        });
      }
    });

    return items;
  }

  /**
   * Oblicza podział pracy w zespole z harmonogramem godzinowym
   */
  function calculateTeamDistribution() {
    const resultsContainer = $('team-results');
    const distributionContainer = $('team-distribution');
    const summaryContainer = $('team-summary');

    // Zbierz dane z wierszy
    const furnitureItems = collectTeamFurnitureData();

    if (furnitureItems.length === 0) {
      showToast('Dodaj przynajmniej jeden mebel', 'error');
      return;
    }

    // Pobierz zaznaczonych pracowników
    const checkboxes = document.querySelectorAll('input[name="team-worker"]:checked');
    const selectedWorkers = Array.from(checkboxes).map(cb => ({
      id: cb.value,
      name: cb.dataset.name,
      efficiency: parseInt(cb.dataset.efficiency),
      active: true
    }));

    if (selectedWorkers.length === 0) {
      showToast('Wybierz przynajmniej jednego pracownika', 'error');
      return;
    }

    // Użyj nowego kalkulatora z harmonogramem
    const result = TeamCalculator.calculateTeamWork(selectedWorkers, furnitureItems);

    if (!result.success) {
      showToast(result.error || 'Błąd obliczeń', 'error');
      return;
    }

    // Wyświetl wyniki
    resultsContainer?.classList.remove('hidden');
    
    // Generuj karty pracowników z przypisanymi meblami i harmonogramem
    if (distributionContainer) {
      distributionContainer.innerHTML = '';
      
      for (const worker of result.workers) {
        // Lista mebli
        const furnitureListHtml = worker.assignedFurniture.map(f => 
          `<div class="furniture-item ${worker.normAnalysis.isExcess && f === worker.assignedFurniture[worker.assignedFurniture.length - 1] ? 'excess-item' : ''}">
            <span class="furniture-name">${f.name}</span>
            <span class="furniture-qty">${f.quantity} szt.</span>
            <span class="furniture-percent">${f.totalNorm.toFixed(2)}%</span>
          </div>`
        ).join('');
        
        // Harmonogram godzinowy
        const hourlyPlanHtml = worker.hourlyProgress.hourlyPlan.map(hour => {
          if (hour.isOvertime) {
            return `
              <div class="hourly-item excess-hour">
                <span class="hour-time">⚠️ ${hour.time}</span>
                <span class="hour-target">${hour.excessNorm}% nadmiar</span>
                <div class="hour-furniture excess-furniture">
                  ${hour.furniture.map(f => `<span class="mini-furniture">${f.name}</span>`).join('')}
                </div>
                <span class="hour-message">${hour.message}</span>
              </div>
            `;
          }
          
          const furnitureNames = hour.furniture.length > 0 
            ? hour.furniture.map(f => `<span class="mini-furniture">${f.name}</span>`).join('') 
            : '<span class="no-furniture">—</span>';
          
          return `
            <div class="hourly-item ${hour.isExcess ? 'excess-hour' : ''} ${hour.isEndOfBlock ? 'block-end' : ''}">
              <span class="hour-time">${hour.time}</span>
              <span class="hour-target">${hour.targetPercent}% (${hour.targetNorm}%)</span>
              <span class="hour-cumulative">${hour.cumulativeNorm}% (${hour.cumulativeFurnitureCount} szt.)</span>
              <div class="hour-furniture">${furnitureNames}</div>
            </div>
          `;
        }).join('');
        
        // Status normy
        const normStatusClass = worker.normAnalysis.isExcess ? 'excess-warning' : 'norm-ok';
        const normStatusText = worker.normAnalysis.isExcess 
          ? `⚠️ Nadmiar: ${worker.normAnalysis.excessFormatted}` 
          : `✓ W normie (${worker.normAnalysis.fulfillmentPercent}%)`;
        
        const card = document.createElement('div');
        card.className = `worker-card ${worker.normAnalysis.isExcess ? 'has-excess' : ''}`;
        card.innerHTML = `
          <div class="worker-card-header">
            <span class="worker-name">${worker.name}</span>
            <span class="worker-efficiency">Norma: ${worker.efficiency}%</span>
          </div>
          <div class="worker-card-body">
            <div class="stat-row">
              <div class="stat">
                <span class="stat-label">Sztuk</span>
                <span class="stat-value">${worker.totalAssignedQty}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Przypisano</span>
                <span class="stat-value">${worker.totalAssignedNorm.toFixed(2)}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Cel</span>
                <span class="stat-value">${worker.efficiency}%</span>
              </div>
            </div>
            
            <div class="norm-status ${normStatusClass}">
              ${normStatusText}
            </div>
            
            <div class="furniture-list">
              <div class="furniture-list-header">Przypisane meble:</div>
              ${furnitureListHtml}
            </div>
            
            <details class="hourly-schedule">
              <summary>📅 Harmonogram godzinowy</summary>
              <div class="hourly-header">
                <span>Godzina</span>
                <span>Cel %</span>
                <span>Zrobione</span>
                <span>Meble</span>
              </div>
              <div class="hourly-plan">
                ${hourlyPlanHtml}
              </div>
            </details>
          </div>
        `;
        distributionContainer.appendChild(card);
      }
    }

    // Podsumowanie z informacją o zmianie
    if (summaryContainer) {
      const shiftBlocksHtml = result.shiftInfo.blocks.map(block => 
        `<span class="shift-block ${block.type}">${block.start}-${block.end} (${block.label})</span>`
      ).join(' ');
      
      const excessWarning = result.summary.teamHasExcess 
        ? `<div class="team-excess-warning">⚠️ NADMIAR: Praca przekracza łączną normę zespołu o ${result.summary.teamExcessAmount}%</div>` 
        : '';

      summaryContainer.innerHTML = `
        <div class="shift-info">
          <div class="shift-name">🕐 ${result.shiftInfo.name}</div>
          <div class="shift-dates">${result.shiftInfo.cycleStart} - ${result.shiftInfo.cycleEnd}</div>
          <div class="shift-blocks">${shiftBlocksHtml}</div>
        </div>
        
        ${excessWarning}
        
        <div class="summary-row">
          <span>Suma normy:</span>
          <strong>${result.summary.totalNorm}%</strong>
        </div>
        <div class="summary-row">
          <span>Łączna ilość:</span>
          <strong>${result.summary.totalFurnitureQty} szt.</strong>
        </div>
        <div class="summary-row">
          <span>Suma norm zespołu:</span>
          <strong>${result.summary.totalTeamEfficiency}%</strong>
        </div>
      `;
    }

    // POPRAWKA: Przewiń do wyników po obliczeniu (łagodnie)
    // Odczekaj chwilę na renderowanie DOM, potem przewiń
    setTimeout(() => {
      if (resultsContainer) {
        resultsContainer.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }, 100);
  }

  /**
   * Inicjalizuje kalkulator zespołowy
   */
  function initTeamCalculator() {
    const calcBtn = $('calc-team');
    const addBtn = $('add-team-row');
    const backToTopBtn = $('back-to-top');
    
    calcBtn?.addEventListener('click', calculateTeamDistribution);
    addBtn?.addEventListener('click', addTeamRow);
    
    // Przycisk "Wróć na górę"
    backToTopBtn?.addEventListener('click', () => {
      // Przewiń do sekcji zespołu (na górę formularza)
      const teamSection = $('team-section');
      if (teamSection) {
        teamSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    });
    
    // NIE dodawaj wiersza tutaj - dane nie są jeszcze załadowane
    // Wiersz zostanie dodany po załadowaniu danych w initApp
  }

  // ============================================
  // ZARZĄDZANIE PRACOWNIKAMI
  // ============================================

  /**
   * Odświeża listę pracowników w panelu zarządzania
   */
  async function refreshWorkersList() {
    const container = $('workers-list');
    if (!container) return;

    try {
      const workers = await WorkersManager.getAllWorkers();
      
      container.innerHTML = '';
      
      if (workers.length === 0) {
        container.innerHTML = '<p class="empty-text">Brak pracowników. Dodaj pierwszego poniżej.</p>';
        return;
      }
      
      for (const worker of workers) {
        if (worker.active === false) continue; // Ukryj usuniętych
        
        const card = document.createElement('div');
        card.className = 'worker-edit-card';
        card.dataset.workerId = worker.id;
        
        card.innerHTML = `
          <div class="worker-info">
            <span class="worker-name-display">${worker.name}</span>
            <span class="worker-position">${worker.position || 'Klejarz'}</span>
          </div>
          <div class="worker-efficiency-display">
            <span class="efficiency-value">${worker.efficiency}%</span>
          </div>
          <div class="worker-actions">
            <button type="button" class="btn-icon edit-worker" data-tooltip="Edytuj" aria-label="Edytuj pracownika">✏️</button>
            <button type="button" class="btn-icon delete-worker" data-tooltip="Usuń" aria-label="Usuń pracownika">🗑️</button>
          </div>
        `;
        
        // Event listenery
        card.querySelector('.edit-worker')?.addEventListener('click', () => editWorker(worker.id));
        card.querySelector('.delete-worker')?.addEventListener('click', () => deleteWorker(worker.id, worker.name));
        
        container.appendChild(card);
      }
    } catch (e) {
      console.error('Błąd ładowania pracowników:', e);
      container.innerHTML = '<p class="error-text">Nie można załadować pracowników</p>';
    }
  }

  /**
   * Edytuje pracownika (inline)
   * @param {string} workerId - ID pracownika
   */
  async function editWorker(workerId) {
    const worker = await WorkersManager.getWorkerById(workerId);
    if (!worker) return;

    const card = document.querySelector(`[data-worker-id="${workerId}"]`);
    if (!card) return;

    // Zamień na formularz edycji
    card.innerHTML = `
      <div class="edit-form">
        <input type="text" class="edit-name" value="${worker.name}" placeholder="Imię" />
        <input type="number" class="edit-efficiency" value="${worker.efficiency}" min="1" max="300" placeholder="%" />
        <input type="text" class="edit-position" value="${worker.position || ''}" placeholder="Stanowisko" />
      </div>
      <div class="worker-actions">
        <button type="button" class="btn-icon save-worker" data-tooltip="Zapisz" aria-label="Zapisz">✅</button>
        <button type="button" class="btn-icon cancel-edit" data-tooltip="Anuluj" aria-label="Anuluj">❌</button>
      </div>
    `;

    card.querySelector('.save-worker')?.addEventListener('click', async () => {
      const name = card.querySelector('.edit-name')?.value.trim();
      const efficiency = parseInt(card.querySelector('.edit-efficiency')?.value);
      const position = card.querySelector('.edit-position')?.value.trim();

      if (!name) {
        showToast('Imię jest wymagane', 'error');
        return;
      }

      await WorkersManager.updateWorker(workerId, { name, efficiency, position });
      showToast('Pracownik zaktualizowany', 'success');
      refreshWorkersList();
    });

    card.querySelector('.cancel-edit')?.addEventListener('click', () => {
      refreshWorkersList();
    });
  }

  /**
   * Usuwa pracownika
   * @param {string} workerId - ID pracownika
   * @param {string} name - Imię (do potwierdzenia)
   */
  async function deleteWorker(workerId, name) {
    if (!confirm(`Czy na pewno chcesz usunąć pracownika "${name}"?`)) return;

    await WorkersManager.removeWorker(workerId);
    showToast(`Pracownik "${name}" został usunięty`, 'success');
    refreshWorkersList();
    refreshTeamWorkersList();
  }

  /**
   * Inicjalizuje panel zarządzania pracownikami
   */
  function initWorkersPanel() {
    // Formularz dodawania
    const addForm = $('add-worker-form');
    addForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = $('new-worker-name')?.value.trim();
      const efficiency = parseInt($('new-worker-efficiency')?.value) || 100;
      const position = $('new-worker-position')?.value.trim();

      if (!name) {
        showToast('Imię jest wymagane', 'error');
        return;
      }

      await WorkersManager.addWorker({ name, efficiency, position });
      showToast(`Dodano pracownika "${name}"`, 'success');
      
      // Reset formularza
      addForm.reset();
      refreshWorkersList();
      refreshTeamWorkersList();
    });

    // Eksport
    $('export-workers')?.addEventListener('click', async () => {
      const json = await WorkersManager.exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'normapro-pracownicy.json';
      a.click();
      
      URL.revokeObjectURL(url);
      showToast('Dane wyeksportowane', 'success');
    });

    // Import
    $('import-workers')?.addEventListener('click', () => {
      $('import-file')?.click();
    });

    $('import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = WorkersManager.importFromJson(text);
        
        if (success) {
          showToast('Dane zaimportowane', 'success');
          refreshWorkersList();
          refreshTeamWorkersList();
        } else {
          showToast('Błąd importu - nieprawidłowy format', 'error');
        }
      } catch (err) {
        showToast('Błąd odczytu pliku', 'error');
      }
      
      e.target.value = '';
    });

    // Reset
    $('reset-workers')?.addEventListener('click', async () => {
      if (!confirm('Czy na pewno chcesz przywrócić domyślną listę pracowników?')) return;
      
      await WorkersManager.resetToDefault();
      showToast('Przywrócono domyślnych pracowników', 'success');
      refreshWorkersList();
      refreshTeamWorkersList();
    });
  }

  // ============================================
  // ZARZĄDZANIE NORMĄ BAZOWĄ
  // ============================================

  /**
   * Aktualizuje wyświetlanie aktualnej normy
   */
  function updateNormDisplay() {
    const displayEl = $('current-norm-display');
    const footerEl = $('footer-norm');
    
    if (displayEl) displayEl.textContent = `${currentNormHours} godzin`;
    if (footerEl) footerEl.textContent = `${currentNormHours}h`;
  }

  /**
   * Inicjalizuje modal zmiany normy
   */
  function initNormModal() {
    const modal = $('norm-modal');
    const changeBtn = $('change-norm-btn');
    const cancelBtn = $('norm-modal-cancel');
    const saveBtn = $('norm-modal-save');
    const normInput = $('norm-hours-input');

    changeBtn?.addEventListener('click', () => {
      populateNormSelect();
      modal?.classList.remove('hidden');
    });

    cancelBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    saveBtn?.addEventListener('click', () => {
      currentNormHours = parseInt(normInput?.value) || 7;
      updateNormDisplay();
      computeTotal();
      modal?.classList.add('hidden');
      showToast(`Norma zmieniona na ${currentNormHours}h`, 'success');
      
      // Zapisz do localStorage
      localStorage.setItem('normapro_norm_hours', currentNormHours);
    });

    // Kliknięcie poza modalem zamyka go
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    // Wczytaj zapisaną normę
    const savedNorm = localStorage.getItem('normapro_norm_hours');
    if (savedNorm) {
      currentNormHours = parseInt(savedNorm) || 7;
      updateNormDisplay();
    }
  }

  // ============================================
  // DANE MEBLI
  // ============================================
  // Usunięto wbudowany obiekt `FURNITURE_DATA` — dane pochodzą z
  // `#furniture-data` w HTML lub z pliku `data/furniture.json`.

  /**
   * Ładuje dane mebli (wbudowane lub z JSON jako fallback)
   * @returns {Promise<Object>}
   */
  async function loadFurnitureData() {
    // Najpierw spróbuj pobrać dane osadzone w HTML (np. przy otwarciu pliku lokalnie)
    try {
      const inline = document.getElementById('furniture-data');
      if (inline && inline.textContent.trim()) {
        const parsed = JSON.parse(inline.textContent);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Nie udało się sparsować osadzonych danych furniture-data:', e);
    }

    // Następnie spróbuj pobrać z pliku JSON (działa na serwerach i GitHub Pages)
    try {
      const res = await fetch('data/furniture.json');
      if (res.ok) {
        const json = await res.json();
        if (json && Object.keys(json).length > 0) return json;
      } else {
        console.warn('fetch data/furniture.json zwrócił status', res.status);
      }
    } catch (e) {
      // fetch może nie działać przy otwieraniu pliku lokalnie (file://)
      console.log('Nie udało się pobrać data/furniture.json — fetch nieudany', e);
    }

    // Fallback: wbudowane dane w skrypcie
    if (Object.keys(FURNITURE_DATA).length > 0) {
      return FURNITURE_DATA;
    }

    return {};
  }

  // ============================================
  // INICJALIZACJA APLIKACJI
  // ============================================

  document.addEventListener('DOMContentLoaded', async function () {
    // Inicjalizuj nawigację
    initViewNavigation();
    
    // Inicjalizuj modal normy
    initNormModal();
    
    // Inicjalizuj przelicznik godzin
    initHoursConverter();
    
    // Inicjalizuj panel pracowników
    initWorkersPanel();
    
    // Inicjalizuj kalkulator zespołowy
    initTeamCalculator();

    // Przycisk dodawania wiersza
    const addBtn = $('add-row');
    addBtn?.addEventListener('click', addRow);

    // Aktualizuj wyświetlanie normy
    updateNormDisplay();

    try {
      // Załaduj dane mebli (wbudowane - działa bez serwera)
      furnitureMap = await loadFurnitureData();
      furnitureNames = Object.keys(furnitureMap).sort((a, b) => a.localeCompare(b, 'pl'));
      
      // Dodaj pierwszy wiersz do głównego kalkulatora
      addRow();
      
      // Dodaj pierwszy wiersz do kalkulatora zespołowego
      addTeamRow();
      
      // Załaduj pracowników
      await WorkersManager.loadWorkers();
      
    } catch (err) {
      console.error('Błąd inicjalizacji:', err);
        // Nawet przy błędzie, ustaw pustą mapę (selecty będą miały tylko placeholder)
        if (Object.keys(furnitureMap).length === 0) {
          furnitureMap = {};
          furnitureNames = [];
          addRow();
          addTeamRow();
        }
    }
  });

  // Eksport globalny (dla debugowania)
  window.NormaPro = {
    addRow,
    computeTotal,
    switchView,
    getConfig: () => ({ currentNormHours, rowCount, furnitureNames })
  };

})();
