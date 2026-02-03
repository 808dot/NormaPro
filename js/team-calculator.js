/**
 * NormaPro - Kalkulator Zespołowy
 * 
 * Moduł do proporcjonalnego podziału pracy między członków zespołu
 * z uwzględnieniem indywidualnej wydajności pracowników.
 * 
 * @author NormaPro Team
 * @version 2.0.0
 */

const TeamCalculator = (function() {
  'use strict';

  /**
   * Oblicza proporcjonalny podział pracy między pracowników
   * 
   * Algorytm:
   * 1. Sumuje procenty wydajności wszystkich pracowników
   * 2. Oblicza udział każdego pracownika proporcjonalnie do wydajności
   * 3. Mnoży udział przez ilość pracy do wykonania
   * 4. Zaokrągla wyniki tak, aby suma = całkowita ilość (bez strat)
   * 
   * Zasady zaokrąglania:
   * - Preferuje większy przydział dla pracownika z wyższą wydajnością
   * - Zawsze rozdziela dokładnie 100% pracy
   * 
   * @param {Array} workers - Lista pracowników [{name, efficiency}, ...]
   * @param {number} totalQuantity - Całkowita ilość do wykonania
   * @returns {Object} Wynik podziału
   */
  function calculateDistribution(workers, totalQuantity) {
    if (!workers || workers.length === 0) {
      return {
        success: false,
        error: 'Brak pracowników do przydziału',
        distribution: []
      };
    }

    if (totalQuantity <= 0) {
      return {
        success: false,
        error: 'Ilość musi być większa od 0',
        distribution: []
      };
    }

    // Filtruj tylko aktywnych pracowników
    const activeWorkers = workers.filter(w => w.active !== false && w.efficiency > 0);
    
    if (activeWorkers.length === 0) {
      return {
        success: false,
        error: 'Brak aktywnych pracowników z wydajnością > 0',
        distribution: []
      };
    }

    // Suma wydajności
    const totalEfficiency = activeWorkers.reduce((sum, w) => sum + w.efficiency, 0);

    // Oblicz dokładne udziały (ułamkowe)
    const exactDistribution = activeWorkers.map(worker => {
      const share = (worker.efficiency / totalEfficiency) * totalQuantity;
      return {
        ...worker,
        exactShare: share,
        floorShare: Math.floor(share),
        remainder: share - Math.floor(share)
      };
    });

    // Suma zaokrąglonych w dół
    let distributedSum = exactDistribution.reduce((sum, w) => sum + w.floorShare, 0);
    
    // Ile brakuje do pełnej ilości
    let remaining = totalQuantity - distributedSum;

    // Sortuj po reszcie malejąco (przy równej reszcie - po wydajności malejąco)
    // To gwarantuje, że dodatkowe jednostki trafią do osób z wyższą wydajnością
    const sortedByRemainder = [...exactDistribution].sort((a, b) => {
      if (Math.abs(a.remainder - b.remainder) < 0.0001) {
        return b.efficiency - a.efficiency; // Przy równej reszcie - wyższa wydajność
      }
      return b.remainder - a.remainder;
    });

    // Rozdysponuj brakujące jednostki
    for (let i = 0; i < remaining; i++) {
      const workerId = sortedByRemainder[i % sortedByRemainder.length].id;
      const worker = exactDistribution.find(w => w.id === workerId);
      worker.floorShare += 1;
    }

    // Przygotuj wynik końcowy
    const distribution = exactDistribution.map(w => ({
      id: w.id,
      name: w.name,
      efficiency: w.efficiency,
      position: w.position,
      assignedQuantity: w.floorShare,
      percentOfTotal: ((w.floorShare / totalQuantity) * 100).toFixed(1),
      theoreticalShare: w.exactShare.toFixed(2)
    }));

    // Weryfikacja - suma musi się zgadzać
    const checkSum = distribution.reduce((sum, w) => sum + w.assignedQuantity, 0);
    
    return {
      success: true,
      totalQuantity: totalQuantity,
      totalWorkers: activeWorkers.length,
      totalEfficiency: totalEfficiency,
      distribution: distribution,
      verified: checkSum === totalQuantity
    };
  }

  /**
   * Oblicza czas potrzebny na wykonanie przydzielonej pracy
   * 
   * @param {number} assignedQuantity - Przydzielona ilość
   * @param {number} efficiency - Wydajność pracownika (%)
   * @param {number} unitNorm - Norma % na jednostkę
   * @param {number} normHours - Bazowa norma godzinowa
   * @returns {Object} Czas w różnych formatach
   */
  function calculateTime(assignedQuantity, efficiency, unitNorm, normHours) {
    // Bazowy czas na wykonanie pracy (przy 100% wydajności)
    const basePercent = assignedQuantity * unitNorm;
    
    // Czas skorygowany o wydajność
    // Wyższa wydajność = mniej czasu
    const adjustedPercent = basePercent / (efficiency / 100);
    
    // Konwersja na godziny
    const hours = (adjustedPercent / 100) * normHours;
    
    return {
      basePercent: basePercent.toFixed(2),
      adjustedPercent: adjustedPercent.toFixed(2),
      hours: hours.toFixed(2),
      formatted: formatTime(hours)
    };
  }

  /**
   * Formatuje czas do czytelnej postaci
   * @param {number} hours - Czas w godzinach
   * @returns {string} Sformatowany czas
   */
  function formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  /**
   * Oblicza pełny raport zespołowy
   * 
   * @param {Array} workers - Lista pracowników
   * @param {string} furnitureName - Nazwa mebla
   * @param {number} furnitureNorm - Norma % na jednostkę mebla
   * @param {number} quantity - Ilość do wykonania
   * @param {number} normHours - Bazowa norma godzinowa (domyślnie z config)
   * @returns {Object} Pełny raport
   */
  function generateTeamReport(workers, furnitureName, furnitureNorm, quantity, normHours = 7) {
    const distribution = calculateDistribution(workers, quantity);
    
    if (!distribution.success) {
      return distribution;
    }

    // Dodaj kalkulacje czasowe
    distribution.distribution = distribution.distribution.map(worker => {
      const time = calculateTime(
        worker.assignedQuantity,
        worker.efficiency,
        furnitureNorm,
        normHours
      );
      
      return {
        ...worker,
        timeEstimate: time
      };
    });

    // Suma czasów
    const totalBasePercent = distribution.distribution.reduce(
      (sum, w) => sum + parseFloat(w.timeEstimate.basePercent), 0
    );

    return {
      ...distribution,
      furniture: {
        name: furnitureName,
        normPerUnit: furnitureNorm,
        quantity: quantity
      },
      normHours: normHours,
      totalBasePercent: totalBasePercent.toFixed(2),
      summary: `Podział ${quantity} szt. "${furnitureName}" na ${distribution.totalWorkers} pracowników`
    };
  }

  // Public API
  return {
    calculateDistribution,
    calculateTime,
    generateTeamReport,
    formatTime
  };
})();

// Eksport dla modułów ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamCalculator;
}
