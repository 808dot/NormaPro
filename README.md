# NormaPro - Kalkulator Normy Produkcyjnej

## 📊 Opis

**NormaPro** to minimalistyczna aplikacja webowa do obliczania norm produkcyjnych dla mebli tapicerowanych. Aplikacja działa całkowicie offline - wystarczy otworzyć plik `index.html` w przeglądarce.

## ✨ Funkcje

### 1. 🧮 Kalkulator Normy
- Wybór mebli z listy (pogrupowane alfabetycznie)
- Ustawianie ilości dla każdego mebla
- Automatyczne obliczanie procentu normy
- Dodawanie do 20 wierszy
- Suma normy wyświetlana na bieżąco

### 2. ⏱️ Przelicznik Godzin
- Konwersja procentu normy między różnymi czasami pracy
- Obsługa norm od 1h do 12h (co 10 minut)
- Automatyczne przeliczanie po zmianie wartości

### 3. 👥 Kalkulator Zespołowy
- Podział pracy między pracowników
- Uwzględnienie wydajności każdego pracownika
- Proporcjonalny podział mebli i normy
- Wyświetlanie ile sztuk ma wykonać każdy pracownik
- Podsumowanie całościowe

### 4. ⚙️ Zarządzanie Pracownikami
- Dodawanie/edycja/usuwanie pracowników
- Ustawianie wydajności (% normy)
- Opcjonalne stanowisko
- Eksport/import danych (JSON)
- Dane zapisywane w LocalStorage

## 🚀 Uruchomienie

### Metoda 1: Bezpośrednie otwarcie
```
Kliknij dwukrotnie na plik index.html
```

### Metoda 2: Z serwera lokalnego (opcjonalnie)
```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .
```
Następnie otwórz: `http://localhost:8080`

## 📁 Struktura projektu

```
NormaPro/
├── index.html          # Główny plik HTML
├── README.md           # Dokumentacja
├── assets/             # Zasoby (puste - brak zewnętrznych)
├── css/
│   └── style.css       # Style CSS (minimalistyczny dark theme)
├── data/
│   └── furniture.json  # Dane mebli (backup, wbudowane w JS)
└── js/
    ├── config.js       # Konfiguracja aplikacji
    ├── workers.js      # Zarządzanie pracownikami
    ├── team-calculator.js  # Logika kalkulatora zespołowego
    └── calculator.js   # Główna logika aplikacji
```

## 🎨 Design

- **Minimalistyczny dark theme** - ciemne szarości (#111111, #171717)
- **Mobile-first** - responsywny design
- **Kompaktowy układ** - wszystko w jednym wierszu
- **Wycentrowane wartości** - czytelne wyświetlanie danych
- **Bez zewnętrznych zależności** - tylko czcionka Inter z Google Fonts

## 📋 Lista mebli

Aplikacja zawiera 37 modeli mebli z predefiniowanymi normami:

| Mebel | Norma (%) |
|-------|-----------|
| Azuro | 4.50 |
| Roma | 4.125 |
| Lizbona | 2.96 |
| Stavia | 3.90 |
| Karisa | 3.00 |
| Atlantic | 5.33 |
| Cocoli | 6.00 |
| Trivento | 8.60 |
| Flavia | 6.75 |
| Veni | 5.54 |
| Verde szelong M | 3.58 |
| Verde siedz. 1-os | 2.30 |
| Verde siedz. róg | 3.15 |
| Verde siedz. 2.5-os | 3.35 |
| Verde Sofa 2.5-os | 5.35 |
| Verde Set-3 | 7.93 |
| Verde pufa | 1.41 |
| Colette Set-2 | 10.50 |
| Colette Set-4 | 14.36 |
| Espada Set-2 | 8.57 |
| Mega kanapa | 4.80 |
| Espada pufa | 1.40 |
| Espada Sofa 2.5-os | 6.00 |
| Espada siedz. 2.5-os + Bok | 4.80 |
| Espada siedz. 1-os + Bok | 4.00 |
| Porto nar. bez boków | 4.13 |
| Porto nar. | 6.26 |
| Ariola nar. | 6.77 |
| Besalu | 4.10 |
| Nola | 3.60 |
| Dali Set-2 | 8.60 |
| Carlo U | 14.40 |
| Marsylia | 6.525 |
| Segre | 5.12 |
| Espada Set-4 | 11.40 |
| Noko | 5.50 |

## ⚙️ Konfiguracja

Plik `js/config.js` zawiera ustawienia:

```javascript
const NormaConfig = {
  MAX_ROWS: 20,           // Max wierszy w kalkulatorze
  MAX_QTY_SELECT: 300,    // Max ilość w select (mobile)
  DEFAULT_NORM_HOURS: 7,  // Domyślna norma godzinowa
  DEFAULT_WORKERS: [...]  // Domyślni pracownicy
};
```

## 💾 Przechowywanie danych

- **Pracownicy** - LocalStorage (`normapro_workers`)
- **Meble** - Wbudowane w JavaScript (nie wymaga serwera)

## 🔧 Wymagania

- Nowoczesna przeglądarka (Chrome, Firefox, Safari, Edge)
- JavaScript włączony
- Brak wymagań serwerowych

## 📱 Responsywność

| Urządzenie | Szerokość | Układ |
|------------|-----------|-------|
| Mobile | < 480px | Kompaktowy, mniejsze fonty |
| Tablet | 480-768px | Standardowy |
| Desktop | > 768px | Rozszerzony |

## 🎯 Użycie

### Obliczanie normy:
1. Kliknij **"+ Dodaj wiersz"**
2. Wybierz mebel z listy
3. Ustaw ilość przyciskami +/- lub wpisz
4. Wynik pojawi się automatycznie
5. Suma na dole

### Przeliczanie godzin:
1. Przejdź do zakładki **"Przelicznik"**
2. Wpisz procent do przeliczenia
3. Wybierz normę źródłową (np. 6h)
4. Wybierz normę docelową (np. 8h)
5. Kliknij **"Oblicz"**

### Podział zespołowy:
1. Przejdź do zakładki **"Zespół"**
2. Dodaj meble do wykonania
3. Zaznacz pracowników
4. Kliknij **"Oblicz podział"**
5. Zobacz ile sztuk przypada każdemu

## 🔄 Changelog

### v2.0.0 (2026-02-03)
- Kompletna modernizacja UI/UX
- Minimalistyczny dark theme
- Kompaktowy układ (wszystko w jednym wierszu)
- Wycentrowane wartości
- Aplikacja działa offline (bez serwera)
- Dane mebli wbudowane w JavaScript
- Poprawiony kalkulator zespołowy (ilość na pracownika)

### v1.0.0
- Pierwsza wersja
- Podstawowy kalkulator normy
- Przelicznik godzin

## 📄 Licencja

MIT License - możesz używać, modyfikować i dystrybuować.

## 👤 Autor

NormaPro Team © 2026

---

**Wersja:** 2.0.0
