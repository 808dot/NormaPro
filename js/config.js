/**
 * NormaPro - Konfiguracja globalna aplikacji
 * 
 * Ten plik zawiera wszystkie konfiguracje, które można łatwo modyfikować
 * bez ingerencji w główną logikę aplikacji.
 * 
 * @author NormaPro Team
 * @version 2.0.0
 */

const NormaConfig = {
  /**
   * ============================================
   * USTAWIENIA NORMY CZASOWEJ
   * ============================================
   */
  
  /**
   * Domyślna norma godzinowa (w godzinach)
   * Używana jako bazowa wartość do obliczeń procentowych
   */
  DEFAULT_NORM_HOURS: 7,

  /**
   * ============================================
   * USTAWIENIA ZMIAN ROBOCZYCH
   * ============================================
   */
  
  /**
   * Harmonogram zmian - co tydzień zmienia się zmiana
   * 
   * Harmonogram:
   * 02.02.2026 - 08.02.2026 = Druga zmiana (tydzień 0)
   * 09.02.2026 - 15.02.2026 = Pierwsza zmiana (tydzień 1)  
   * 16.02.2026 - 22.02.2026 = Druga zmiana (tydzień 2)
   * 23.02.2026 - 01.03.2026 = Pierwsza zmiana (tydzień 3)
   * I tak dalej...
   */
  SHIFT_SCHEDULE: {
    // Data początkowa drugiej zmiany (02.02.2026 - poniedziałek)
    SECOND_SHIFT_START: '2026-02-02',
    // Co ile tygodni zmienia się zmiana
    SHIFT_CYCLE_WEEKS: 1
  },

  /**
   * Bloki czasowe dla pierwszej zmiany
   * 6:00 - 10:00 praca, 10:00 - 10:20 przerwa, 10:20 - 13:30 praca
   */
  FIRST_SHIFT: {
    name: 'Pierwsza zmiana',
    start: '06:00',
    end: '13:30',
    blocks: [
      { type: 'work', start: '06:00', end: '10:00', label: 'Praca' },
      { type: 'break', start: '10:00', end: '10:20', label: 'Przerwa' },
      { type: 'work', start: '10:20', end: '13:30', label: 'Praca' }
    ],
    // Całkowity czas pracy w minutach: 4h + 3h10min = 430min = 7h10min
    totalWorkMinutes: 430
  },

  /**
   * Bloki czasowe dla drugiej zmiany
   * 14:00 - 18:00 praca, 18:00 - 18:20 przerwa, 18:20 - 21:30 praca
   */
  SECOND_SHIFT: {
    name: 'Druga zmiana',
    start: '14:00',
    end: '21:30',
    blocks: [
      { type: 'work', start: '14:00', end: '18:00', label: 'Praca' },
      { type: 'break', start: '18:00', end: '18:20', label: 'Przerwa' },
      { type: 'work', start: '18:20', end: '21:30', label: 'Praca' }
    ],
    // Całkowity czas pracy w minutach: 4h + 3h10min = 430min = 7h10min
    totalWorkMinutes: 430
  },

  /**
   * Domyślne wartości przelicznika godzin
   */
  DEFAULT_CONVERTER: {
    PERCENT: 110,
    FROM_HOURS: 8,
    TO_HOURS: 7
  },
  
  /**
   * Minimalna wartość godzin w pickerze
   */
  MIN_HOURS: 1,
  
  /**
   * Maksymalna wartość godzin w pickerze
   */
  MAX_HOURS: 12,
  
  /**
   * Krok czasowy w minutach dla time pickera
   * ZMIANA: 60 minut → 10 minut
   */
  TIME_STEP_MINUTES: 10,

  /**
   * ============================================
   * USTAWIENIA KALKULATORA
   * ============================================
   */
  
  /**
   * Maksymalna liczba wierszy w kalkulatorze
   */
  MAX_ROWS: 20,
  
  /**
   * Maksymalna wartość ilości w selekcie (mobile)
   */
  MAX_QTY_SELECT: 300,
  
  /**
   * ============================================
   * USTAWIENIA KALKULATORA ZESPOŁOWEGO
   * ============================================
   */
  
  /**
   * Domyślni pracownicy zespołu
   * Można edytować imiona i procenty wydajności (normy)
   */
  DEFAULT_TEAM: [
    { id: 'worker1', name: 'Dawid', efficiency: 110 },
    { id: 'worker2', name: 'Maciek', efficiency: 140 }
  ],

  /**
   * ============================================
   * USTAWIENIA UI
   * ============================================
   */
  
  /**
   * Nazwy widoków w aplikacji
   */
  VIEWS: {
    NORMA: 'norma',
    HOURS: 'hours',
    TEAM: 'team',
    WORKERS: 'workers'
  },

  /**
   * Klucz LocalStorage dla danych pracowników
   */
  STORAGE_KEY_WORKERS: 'normapro_workers',
  
  /**
   * Klucz LocalStorage dla ustawień aplikacji
   */
  STORAGE_KEY_SETTINGS: 'normapro_settings',

  /**
   * ============================================
   * METODY POMOCNICZE
   * ============================================
   */
  
  /**
   * Generuje opcje czasowe dla pickera
   * @returns {Array} Tablica obiektów {value, label}
   */
  getTimeOptions() {
    const options = [];
    const stepHours = this.TIME_STEP_MINUTES / 60;
    
    for (let h = this.MIN_HOURS; h <= this.MAX_HOURS; h += stepHours) {
      const hours = Math.floor(h);
      const minutes = Math.round((h - hours) * 60);
      const value = h;
      
      let label;
      if (minutes === 0) {
        label = `${hours}h`;
      } else {
        label = `${hours}h ${minutes}min`;
      }
      
      options.push({ value, label });
    }
    
    return options;
  },

  /**
   * Formatuje czas do czytelnej postaci
   * @param {number} hours - Czas w godzinach (może być ułamkowy)
   * @returns {string} Sformatowany czas
   */
  formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  },

  /**
   * Konwertuje procent między różnymi normami czasowymi
   * @param {number} percent - Wartość procentowa
   * @param {number} fromHours - Źródłowa norma godzinowa
   * @param {number} toHours - Docelowa norma godzinowa
   * @returns {number} Przekonwertowany procent
   */
  convertPercent(percent, fromHours, toHours) {
    return percent * (fromHours / toHours);
  }
};

// Zamrożenie obiektu konfiguracji (zapobiega przypadkowym zmianom)
Object.freeze(NormaConfig.VIEWS);

// Eksport dla modułów ES6 (jeśli używane)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NormaConfig;
}
