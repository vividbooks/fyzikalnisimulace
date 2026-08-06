# Tepelná kapacita

Interaktivní simulace zahřívání různých těles na hořáku – voda, olej, líh, zlato, měď, mramor.

## Spuštění

Otevřete `index.html` v prohlížeči, nebo spusťte lokální server:

```bash
npx live-server --port=8080
```

Poté otevřete [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Online verze (GitHub Pages)

Po pushi na větev `main` se simulace automaticky nasadí přes [GitHub Actions](https://github.com/FrantisekVvb/tepelna_kapacita/actions). Adresa bývá:

**https://frantisekvvb.github.io/tepelna_kapacita/**

(Poprvé může nasazení trvat 1–2 minuty.)

## Funkce

- Zásobník materiálů – přetažení na pracovní plochu
- 1–2 hořáky, výkon 0–1000 W
- Přichycení těles k plameni, automatické vypnutí při dosažení teploty varu/tání
- Chladnutí do okolí (20 °C) – volitelné
- Teplota nad objektem, hmotnost 10 g–2 kg

## Materiály

| Materiál | Hustota (kg/m³) | c (J/(kg·°C)) | Limit teploty |
|----------|-----------------|---------------|---------------|
| Voda | 1000 | 4200 | 100 °C |
| Olej | 850 | 1800 | 300 °C |
| Líh | 790 | 2400 | 78 °C |
| Zlato | 19 300 | 130 | 1064 °C |
| Měď | 9000 | 400 | 1085 °C |
| Mramor | 2700 | 850 | 1200 °C |
| **Bazén (voda)** | 1000 | 4200 | **20 °C** (3 kg, bez ohřevu) |

## Struktura

- `index.html` – rozhraní
- `styles.css` – styly
- `main.js` – simulace a interakce
- `assets/` – SVG hořák, nádoby a cihly
