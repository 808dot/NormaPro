/**
 * NormaPro - Moduł zarządzania pracownikami
 * 
 * Obsługuje CRUD operacje na danych pracowników z wykorzystaniem LocalStorage
 * oraz synchronizację z plikiem workers.json
 * 
 * @author NormaPro Team
 * @version 2.0.0
 */

const WorkersManager = (function() {
  'use strict';

  // Klucz LocalStorage
  const STORAGE_KEY = 'normapro_workers';
  
  // Cache pracowników w pamięci
  let workersCache = null;
  
  // Domyślni pracownicy (fallback)
  const DEFAULT_WORKERS = [
    {
      id: 'worker_1',
      name: 'Ja',
      efficiency: 110,
      position: 'Klejarz',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'worker_2',
      name: 'Maciek',
      efficiency: 140,
      position: 'Klejarz Senior',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  /**
   * Generuje unikalne ID dla nowego pracownika
   * @returns {string} Unikalne ID
   */
  function generateId() {
    return 'worker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Ładuje pracowników z LocalStorage lub pliku JSON
   * @returns {Promise<Array>} Lista pracowników
   */
  async function loadWorkers() {
    // Najpierw sprawdź LocalStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        workersCache = data.workers || data;
        return workersCache;
      } catch (e) {
        console.warn('Błąd parsowania danych z LocalStorage:', e);
      }
    }
    
    // Jeśli brak w LocalStorage, załaduj z pliku JSON
    try {
      const response = await fetch('data/workers.json');
      if (response.ok) {
        const data = await response.json();
        workersCache = data.workers || data;
        // Zapisz do LocalStorage
        saveToStorage(workersCache);
        return workersCache;
      }
    } catch (e) {
      console.warn('Nie można załadować workers.json, używam domyślnych:', e);
    }
    
    // Fallback do domyślnych
    workersCache = [...DEFAULT_WORKERS];
    saveToStorage(workersCache);
    return workersCache;
  }

  /**
   * Zapisuje pracowników do LocalStorage
   * @param {Array} workers - Lista pracowników
   */
  function saveToStorage(workers) {
    const data = {
      workers: workers,
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString()
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Pobiera wszystkich aktywnych pracowników
   * @returns {Promise<Array>} Lista aktywnych pracowników
   */
  async function getActiveWorkers() {
    if (!workersCache) {
      await loadWorkers();
    }
    return workersCache.filter(w => w.active !== false);
  }

  /**
   * Pobiera wszystkich pracowników (włącznie z nieaktywnymi)
   * @returns {Promise<Array>} Lista wszystkich pracowników
   */
  async function getAllWorkers() {
    if (!workersCache) {
      await loadWorkers();
    }
    return [...workersCache];
  }

  /**
   * Pobiera pracownika po ID
   * @param {string} id - ID pracownika
   * @returns {Promise<Object|null>} Pracownik lub null
   */
  async function getWorkerById(id) {
    if (!workersCache) {
      await loadWorkers();
    }
    return workersCache.find(w => w.id === id) || null;
  }

  /**
   * Dodaje nowego pracownika
   * @param {Object} workerData - Dane pracownika
   * @returns {Object} Dodany pracownik
   */
  async function addWorker(workerData) {
    if (!workersCache) {
      await loadWorkers();
    }
    
    const newWorker = {
      id: generateId(),
      name: workerData.name || 'Nowy pracownik',
      efficiency: parseInt(workerData.efficiency) || 100,
      position: workerData.position || 'Klejarz',
      active: true,
      createdAt: new Date().toISOString()
    };
    
    workersCache.push(newWorker);
    saveToStorage(workersCache);
    
    return newWorker;
  }

  /**
   * Aktualizuje dane pracownika
   * @param {string} id - ID pracownika
   * @param {Object} updates - Dane do aktualizacji
   * @returns {Object|null} Zaktualizowany pracownik lub null
   */
  async function updateWorker(id, updates) {
    if (!workersCache) {
      await loadWorkers();
    }
    
    const index = workersCache.findIndex(w => w.id === id);
    if (index === -1) return null;
    
    // Aktualizuj pola
    if (updates.name !== undefined) workersCache[index].name = updates.name;
    if (updates.efficiency !== undefined) workersCache[index].efficiency = parseInt(updates.efficiency);
    if (updates.position !== undefined) workersCache[index].position = updates.position;
    if (updates.active !== undefined) workersCache[index].active = updates.active;
    
    workersCache[index].updatedAt = new Date().toISOString();
    
    saveToStorage(workersCache);
    
    return workersCache[index];
  }

  /**
   * Usuwa pracownika (soft delete - dezaktywacja)
   * @param {string} id - ID pracownika
   * @returns {boolean} Sukces operacji
   */
  async function removeWorker(id) {
    if (!workersCache) {
      await loadWorkers();
    }
    
    const index = workersCache.findIndex(w => w.id === id);
    if (index === -1) return false;
    
    // Soft delete - oznacz jako nieaktywny
    workersCache[index].active = false;
    workersCache[index].deletedAt = new Date().toISOString();
    
    saveToStorage(workersCache);
    
    return true;
  }

  /**
   * Trwale usuwa pracownika z bazy
   * @param {string} id - ID pracownika
   * @returns {boolean} Sukces operacji
   */
  async function permanentlyRemoveWorker(id) {
    if (!workersCache) {
      await loadWorkers();
    }
    
    const index = workersCache.findIndex(w => w.id === id);
    if (index === -1) return false;
    
    workersCache.splice(index, 1);
    saveToStorage(workersCache);
    
    return true;
  }

  /**
   * Resetuje dane do domyślnych
   */
  async function resetToDefault() {
    workersCache = [...DEFAULT_WORKERS];
    saveToStorage(workersCache);
    return workersCache;
  }

  /**
   * Eksportuje dane pracowników do JSON
   * @returns {string} JSON string
   */
  async function exportToJson() {
    if (!workersCache) {
      await loadWorkers();
    }
    
    return JSON.stringify({
      workers: workersCache,
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString()
      }
    }, null, 2);
  }

  /**
   * Importuje dane pracowników z JSON
   * @param {string} jsonString - JSON string z danymi
   * @returns {boolean} Sukces operacji
   */
  function importFromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const workers = data.workers || data;
      
      if (!Array.isArray(workers)) {
        throw new Error('Nieprawidłowy format danych');
      }
      
      // Walidacja struktury
      for (const worker of workers) {
        if (!worker.name || worker.efficiency === undefined) {
          throw new Error('Brakujące wymagane pola');
        }
      }
      
      workersCache = workers.map(w => ({
        id: w.id || generateId(),
        name: w.name,
        efficiency: parseInt(w.efficiency) || 100,
        position: w.position || 'Klejarz',
        active: w.active !== false,
        createdAt: w.createdAt || new Date().toISOString()
      }));
      
      saveToStorage(workersCache);
      
      return true;
    } catch (e) {
      console.error('Błąd importu:', e);
      return false;
    }
  }

  // Public API
  return {
    loadWorkers,
    getActiveWorkers,
    getAllWorkers,
    getWorkerById,
    addWorker,
    updateWorker,
    removeWorker,
    permanentlyRemoveWorker,
    resetToDefault,
    exportToJson,
    importFromJson
  };
})();

// Eksport dla modułów ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkersManager;
}
