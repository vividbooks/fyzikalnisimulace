# Simulace rovnováhy na páce

Jednoduchá webová simulace páky (canvas) pro výuku momentů sil.

## Spuštění

### Varianta A: otevřít přímo v prohlížeči

Otevři soubor `index.html` (dvojklik ve Finderu).

### Varianta B: lokální server (doporučeno)

Některé prohlížeče mohou omezovat některé funkce při otevření přes `file://`. V takovém případě spusť jednoduchý server:

```bash
cd simulace-paky
python3 -m http.server 8000
```

Pak otevři `http://localhost:8000`.

## Ovládání

- Přetáhni závaží z hromady na vyznačený bod na páce.
- **Ověřit**: páka se zbarví a nakloní podle zavěšených závaží, pod pákou se ukáže stav rovnováhy.
- **Zpět**: návrat do „šedého“ režimu (bez náklonu).
- **Sundat závaží**: vrátí všechna závaží do hromady.

