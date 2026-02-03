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
   * Można edytować imiona i procenty wydajności
   */
  DEFAULT_TEAM: [
    { id: 'worker1', name: 'Ja', efficiency: 110 },
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
