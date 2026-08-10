# Druhy pohybů

[![CI](https://github.com/FrantisekVvb/druhy-pohybu/actions/workflows/ci.yml/badge.svg)](https://github.com/FrantisekVvb/druhy-pohybu/actions/workflows/ci.yml)

Interaktivní webová simulace různých druhů pohybu. Žák vybere kuličku, pozoruje animaci a ověří, zda je pohyb přímočarý nebo křivočarý a rovnoměrný nebo nerovnoměrný.

**Online verze:** [frantisekvvvb.github.io/druhy-pohybu](https://frantisekvvvb.github.io/druhy-pohybu/)

## Kuličky

| Kulička | Pohyb |
|---------|--------|
| červená | rovnoměrný přímočarý |
| modrá | nerovnoměrný přímočarý (zrychlení a zpomalení, tryskový motor) |
| zelená | nerovnoměrný křivočarý (odrazy od podložky) |
| žlutá | rovnoměrný křivočarý (pás s obloukem) |
| šedá | náhodný pohyb (přímočarý/křivočarý × rovnoměrný/nerovnoměrný) |

## Funkce

- výběr kuličky a animace na celé obrazovce
- podložka / pás pod kuličkami
- ověření odpovědí tlačítkem **Ověřit** (zeleně / červeně)

## Požadavky

- [Node.js](https://nodejs.org/) 18+

## Lokální spuštění

```bash
git clone https://github.com/frantisekvvb/druhy-pohybu.git
cd druhy-pohybu
npm start
```

Otevři [http://localhost:3460](http://localhost:3460).

## Licence

MIT
