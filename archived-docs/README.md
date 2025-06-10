# Arkiverade Dokumentationsfiler

Denna mapp innehåller dokumentationsfiler som har arkiverats som en del av dokumentationskonsolideringen som genomfördes den 10 juni 2025 på branchen `fix/gift-card-flow-harmonization`.

## Arkiverade filer:

### README-PAYMENT-FLOW.md
- **Arkiverad:** 10 juni 2025
- **Anledning:** Ersatt av `README-PAYMENT-REFACTOR.md` som är mer uppdaterad och komplett
- **Innehöll:** Ursprunglig betalningssystemdokumentation med komponentarkitektur, dataflöden för Swish/faktura, produktspecifika flöden och databasschema

### README-CHECKOUT-FLOW.md  
- **Arkiverad:** 10 juni 2025
- **Anledning:** Informationen har integrerats i `README-PAYMENT-REFACTOR.md`
- **Innehöll:** Checkout-flödesdokumentation med FlowStepWrapper, generiska steg, komponentstruktur och datalagring via flowStorage

### CHECKOUT-FLOW-REFACTORING.md
- **Arkiverad:** 10 juni 2025
- **Anledning:** Informationen har integrerats i `README-PAYMENT-REFACTOR.md` under "Checkout Flow Refaktorisering"-sektionen
- **Innehöll:** Refaktoriseringsdetaljer för checkout-flödet med centraliserad datahantering via dataFetcher.ts och förenklad komponentstruktur

## Aktuell dokumentationsstruktur:

För uppdaterad dokumentation, se:
- **README.md** - Projektöversikt och snabbstart
- **README-PAYMENT-REFACTOR.md** - Komplett betalnings- och checkout-dokumentation  
- **README-ADMIN.md** - Admin-specifik dokumentation

## Återställning

Om du behöver återställa någon av dessa filer till projektroten:
```bash
# Exempel för att återställa en fil
cp archived-docs/README-PAYMENT-FLOW.md ./
``` 