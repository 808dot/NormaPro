/**
 * NormaPro - Kalkulator Zespołowy
 * 
 * Moduł do proporcjonalnego podziału pracy między członków zespołu
 * z uwzględnieniem indywidualnej wydajności pracowników.
 * 
 * Zawiera:
 * - Proporcjonalny podział mebli według norm pracowników
 * - Wykrywanie nadmiarowych mebli (ponad normę)
 * - Bloki czasowe z harmonogramem godzinowym
 * - Automatyczne wykrywanie zmiany (I/II) na podstawie daty
 * 
 * @author NormaPro Team
 * @version 2.0.0
 */

const TeamCalculator = (function() {
  'use strict';

  /**
   * ============================================
   * ZARZĄDZANIE ZMIANAMI
   * ============================================
   */

  /**
   * Określa aktualną zmianę na podstawie daty
   * Zmiany rotują co tydzień od daty startowej
   * 
   * Harmonogram:
   * - 02.02.2026 - 08.02.2026 = Druga zmiana (tydzień 0)
   * - 09.02.2026 - 15.02.2026 = Pierwsza zmiana (tydzień 1)  
   * - 16.02.2026 - 22.02.2026 = Druga zmiana (tydzień 2)
   * - itd...
   * 
   * @param {Date} date - Data do sprawdzenia (domyślnie dzisiaj)
   * @returns {Object} Informacje o zmianie
   */
  function getCurrentShift(date = new Date()) {
    const config = NormaConfig;
    const startDate = new Date(config.SHIFT_SCHEDULE.SECOND_SHIFT_START);
    const cycleWeeks = config.SHIFT_SCHEDULE.SHIFT_CYCLE_WEEKS;
    
    // Oblicz liczbę dni od daty startowej
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Oblicz w którym tygodniu jesteśmy (0 = pierwszy tydzień = druga zmiana)
    const weekNumber = Math.floor(diffDays / 7);
    
    // Parzyste tygodnie = druga zmiana, nieparzyste = pierwsza zmiana
    // Tydzień 0 (02.02-08.02) = druga, tydzień 1 (09.02-15.02) = pierwsza
    const isSecondShift = weekNumber % 2 === 0;
    
    const shift = isSecondShift ? config.SECOND_SHIFT : config.FIRST_SHIFT;
    
    // Oblicz daty aktualnego tygodnia
    const cycleStartDate = new Date(startDate);
    cycleStartDate.setDate(cycleStartDate.getDate() + (weekNumber * 7));
    const cycleEndDate = new Date(cycleStartDate);
    cycleEndDate.setDate(cycleEndDate.getDate() + 6); // +6 dni (tydzień)
    
    return {
      isSecondShift,
      shift,
      shiftName: shift.name,
      cycleStart: cycleStartDate.toLocaleDateString('pl-PL'),
      cycleEnd: cycleEndDate.toLocaleDateString('pl-PL'),
      totalWorkMinutes: shift.totalWorkMinutes,
      blocks: shift.blocks
    };
  }

  /**
   * Parsuje czas w formacie HH:MM do minut od północy
   * @param {string} timeStr - Czas w formacie "HH:MM"
   * @returns {number} Minuty od północy
   */
  function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Formatuje minuty do formatu HH:MM
   * @param {number} minutes - Minuty od północy
   * @returns {string} Czas w formacie "HH:MM"
   */
  function formatMinutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Generuje szczegółowy harmonogram godzinowy dla zmiany
   * @param {Object} shift - Dane zmiany
   * @returns {Array} Tablica godzin pracy
   */
  function generateHourlySchedule(shift) {
    const schedule = [];
    let cumulativeWorkMinutes = 0;
    
    for (const block of shift.blocks) {
      if (block.type !== 'work') continue;
      
      const startMin = parseTimeToMinutes(block.start);
      const endMin = parseTimeToMinutes(block.end);
      
      // Generuj punkty co godzinę
      let currentMin = startMin;
      while (currentMin < endMin) {
        const nextHour = Math.min(currentMin + 60, endMin);
        const workInThisHour = nextHour - currentMin;
        cumulativeWorkMinutes += workInThisHour;
        
        schedule.push({
          time: formatMinutesToTime(nextHour),
          cumulativeMinutes: cumulativeWorkMinutes,
          cumulativePercent: (cumulativeWorkMinutes / shift.totalWorkMinutes) * 100,
          isEndOfBlock: nextHour === endMin
        });
        
        currentMin = nextHour;
      }
    }
    
    return schedule;
  }

  /**
   * ============================================
   * PODZIAŁ PRACY
   * ============================================
   */

  /**
   * Oblicza proporcjonalny podział pracy między pracowników
   * z uwzględnieniem ich norm (wydajności)
   * 
   * Algorytm:
   * 1. Sumuje normy (wydajności) wszystkich pracowników
   * 2. Oblicza udział każdego pracownika proporcjonalnie do normy
   * 3. Pracownik z wyższą normą dostaje więcej pracy
   * 4. Zaokrągla wyniki tak, aby suma = całkowita ilość
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

    // Suma wydajności (norm)
    const totalEfficiency = activeWorkers.reduce((sum, w) => sum + w.efficiency, 0);

    // Oblicz dokładne udziały (ułamkowe)
    // Pracownik z normą 140% dostanie 140/(110+140) = 56% pracy
    // Pracownik z normą 110% dostanie 110/(110+140) = 44% pracy
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
    const sortedByRemainder = [...exactDistribution].sort((a, b) => {
      if (Math.abs(a.remainder - b.remainder) < 0.0001) {
        return b.efficiency - a.efficiency;
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
   * ============================================
   * ANALIZA NORMY I NADMIARU
   * ============================================
   */

  /**
   * Oblicza ile % normy potrzebuje zebrać pracownik
   * i czy meble są nadmiarowe (przekraczają wymaganą normę)
   * 
   * @param {number} workerEfficiency - Norma pracownika (np. 110, 140)
   * @param {number} assignedNormPercent - Przypisana norma w %
   * @returns {Object} Analiza normy
   */
  function analyzeNormFulfillment(workerEfficiency, assignedNormPercent) {
    // Pracownik musi zebrać swoją normę (np. 110% lub 140%)
    const targetNorm = workerEfficiency;
    
    // Ile faktycznie ma przypisane
    const assigned = assignedNormPercent;
    
    // Czy jest nadmiar?
    const excess = Math.max(0, assigned - targetNorm);
    const isExcess = excess > 0;
    
    // Ile % normy realizuje przypisana praca
    const fulfillmentPercent = (assigned / targetNorm) * 100;
    
    return {
      targetNorm,
      assigned,
      excess,
      isExcess,
      fulfillmentPercent: fulfillmentPercent.toFixed(1),
      withinNorm: Math.min(assigned, targetNorm),
      excessFormatted: isExcess ? `+${excess.toFixed(2)}% (nadmiar)` : null
    };
  }

  /**
   * Oblicza harmonogram godzinowy dla pracownika
   * - ile mebli i jakich powinien mieć zrobione co godzinę
   * 
   * @param {Array} furnitureItems - Lista mebli [{name, quantity, norm}]
   * @param {number} workerEfficiency - Norma pracownika
   * @param {Object} shiftInfo - Informacje o zmianie
   * @returns {Array} Harmonogram godzinowy
   */
  function calculateHourlyProgress(furnitureItems, workerEfficiency, shiftInfo) {
    const schedule = generateHourlySchedule(shiftInfo.shift);
    const targetNorm = workerEfficiency;
    
    // Oblicz całkowitą normę z przypisanych mebli
    let totalNorm = 0;
    furnitureItems.forEach(item => {
      totalNorm += item.norm * item.quantity;
    });
    
    // Przygotuj kolejkę mebli do zrobienia
    const furnitureQueue = [];
    for (const item of furnitureItems) {
      for (let i = 0; i < item.quantity; i++) {
        furnitureQueue.push({
          name: item.name,
          norm: item.norm
        });
      }
    }
    
    // Czy mamy nadmiar?
    const hasExcess = totalNorm > targetNorm;
    const excessNorm = Math.max(0, totalNorm - targetNorm);
    
    // Rozłóż meble w czasie
    const hourlyPlan = [];
    let usedNorm = 0;
    let furnitureIndex = 0;
    
    for (let i = 0; i < schedule.length; i++) {
      const hourPoint = schedule[i];
      const targetNormAtThisPoint = (hourPoint.cumulativePercent / 100) * targetNorm;
      
      // Jakie meble powinny być zrobione do tej godziny
      const furnitureAtThisHour = [];
      
      while (furnitureIndex < furnitureQueue.length && usedNorm < targetNormAtThisPoint) {
        const furniture = furnitureQueue[furnitureIndex];
        furnitureAtThisHour.push(furniture);
        usedNorm += furniture.norm;
        furnitureIndex++;
      }
      
      // Czy w tej godzinie są meble nadmiarowe?
      const isExcessHour = usedNorm > targetNorm;
      
      hourlyPlan.push({
        time: hourPoint.time,
        targetPercent: hourPoint.cumulativePercent.toFixed(1),
        targetNorm: targetNormAtThisPoint.toFixed(2),
        furniture: furnitureAtThisHour,
        cumulativeNorm: usedNorm.toFixed(2),
        cumulativeFurnitureCount: furnitureIndex,
        isExcess: isExcessHour,
        isEndOfBlock: hourPoint.isEndOfBlock
      });
    }
    
    // Dodaj pozostałe meble (nadmiarowe) jako ostatni punkt
    if (furnitureIndex < furnitureQueue.length) {
      const excessFurniture = furnitureQueue.slice(furnitureIndex);
      let excessNormSum = 0;
      excessFurniture.forEach(f => excessNormSum += f.norm);
      
      hourlyPlan.push({
        time: 'NADMIAR',
        isOvertime: true,
        furniture: excessFurniture,
        excessNorm: excessNormSum.toFixed(2),
        message: `Te meble są ponad normę ${targetNorm}%`
      });
    }
    
    return {
      hourlyPlan,
      totalNorm: totalNorm.toFixed(2),
      targetNorm,
      hasExcess,
      excessNorm: excessNorm.toFixed(2),
      furnitureCount: furnitureQueue.length
    };
  }

  /**
   * ============================================
   * GŁÓWNA FUNKCJA PODZIAŁU
   * ============================================
   */

  /**
   * Oblicza pełny podział pracy zespołowej z harmonogramem
   * 
   * @param {Array} workers - Lista pracowników
   * @param {Array} furnitureItems - Lista mebli [{name, norm, quantity}]
   * @param {Date} date - Data (do określenia zmiany)
   * @returns {Object} Pełny raport z podziałem i harmonogramem
   */
  function calculateTeamWork(workers, furnitureItems, date = new Date()) {
    // Pobierz informacje o zmianie
    const shiftInfo = getCurrentShift(date);
    
    // Oblicz całkowitą normę do wykonania
    let totalNorm = 0;
    let totalQuantity = 0;
    furnitureItems.forEach(item => {
      totalNorm += item.norm * item.quantity;
      totalQuantity += item.quantity;
    });
    
    // Suma norm (wydajności) pracowników
    const activeWorkers = workers.filter(w => w.active !== false && w.efficiency > 0);
    const totalTeamEfficiency = activeWorkers.reduce((sum, w) => sum + w.efficiency, 0);
    
    // Sprawdź czy praca nie przekracza łącznej normy zespołu
    const teamExcess = totalNorm > totalTeamEfficiency;
    const teamExcessAmount = Math.max(0, totalNorm - totalTeamEfficiency);
    
    // Rozdziel meble proporcjonalnie według norm pracowników
    const workerAssignments = activeWorkers.map(worker => {
      // Udział pracownika = jego norma / suma norm
      const share = worker.efficiency / totalTeamEfficiency;
      
      return {
        id: worker.id,
        name: worker.name,
        efficiency: worker.efficiency,
        position: worker.position,
        share: share,
        targetNorm: worker.efficiency, // To musi zebrać
        assignedFurniture: [],
        totalAssignedNorm: 0,
        totalAssignedQty: 0
      };
    });
    
    // Przydziel meble do pracowników proporcjonalnie
    for (const item of furnitureItems) {
      let remainingQty = item.quantity;
      
      // Sortuj pracowników po udziale (malejąco)
      const sortedWorkers = [...workerAssignments].sort((a, b) => b.share - a.share);
      
      for (let i = 0; i < sortedWorkers.length; i++) {
        const worker = workerAssignments.find(w => w.id === sortedWorkers[i].id);
        
        let assignedQty;
        if (i === sortedWorkers.length - 1) {
          // Ostatni pracownik dostaje resztę
          assignedQty = remainingQty;
        } else {
          // Przydziel proporcjonalnie
          assignedQty = Math.round(item.quantity * worker.share);
          // Nie więcej niż zostało
          assignedQty = Math.min(assignedQty, remainingQty);
          remainingQty -= assignedQty;
        }
        
        if (assignedQty > 0) {
          const assignedNorm = item.norm * assignedQty;
          worker.assignedFurniture.push({
            name: item.name,
            quantity: assignedQty,
            norm: item.norm,
            totalNorm: assignedNorm
          });
          worker.totalAssignedNorm += assignedNorm;
          worker.totalAssignedQty += assignedQty;
        }
      }
    }
    
    // Dla każdego pracownika oblicz analizę normy i harmonogram
    for (const worker of workerAssignments) {
      // Analiza czy przekracza normę
      worker.normAnalysis = analyzeNormFulfillment(
        worker.efficiency, 
        worker.totalAssignedNorm
      );
      
      // Harmonogram godzinowy
      worker.hourlyProgress = calculateHourlyProgress(
        worker.assignedFurniture,
        worker.efficiency,
        shiftInfo
      );
    }
    
    return {
      success: true,
      shiftInfo: {
        name: shiftInfo.shiftName,
        cycleStart: shiftInfo.cycleStart,
        cycleEnd: shiftInfo.cycleEnd,
        isSecondShift: shiftInfo.isSecondShift,
        blocks: shiftInfo.blocks
      },
      summary: {
        totalFurnitureQty: totalQuantity,
        totalNorm: totalNorm.toFixed(2),
        totalTeamEfficiency,
        teamHasExcess: teamExcess,
        teamExcessAmount: teamExcessAmount.toFixed(2)
      },
      workers: workerAssignments,
      furnitureItems
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
    const basePercent = assignedQuantity * unitNorm;
    const adjustedPercent = basePercent / (efficiency / 100);
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
    formatTime,
    getCurrentShift,
    calculateTeamWork,
    analyzeNormFulfillment,
    calculateHourlyProgress,
    generateHourlySchedule
  };
})();

// Eksport dla modułów ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamCalculator;
}
