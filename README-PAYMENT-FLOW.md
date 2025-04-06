# Payment System Documentation

## Overview
Betalningssystemet är designat som en generisk lösning som fungerar över flera produkttyper:
- Kursbokningar (course_booking)
- Presentkort (gift_card)
- Konstprodukter (art_purchase)

Systemet stödjer för närvarande två betalningsmetoder:
- Swish - för direktbetalning via mobiltelefon
- Faktura - för fakturering via e-post

## Komponentstruktur
```
/src/
├── components/
│   └── booking/
│       ├── PaymentSelection.tsx        # Huvudkoordinator för betalningsval
│       │
│       ├── Swish Flow/
│       │   ├── SwishPaymentSection.tsx # Swish-koordinator (telefoninmatning + betalning)
│       │   ├── SwishPaymentForm.tsx    # Telefoninmatning
│       │   └── SwishPaymentDialog.tsx  # Dialog för betalningsstatus
│       │
│       └── Invoice Flow/
│           ├── InvoicePaymentSection.tsx # Faktura-koordinator
│           ├── InvoicePaymentForm.tsx    # Adressinmatning
│           └── InvoicePaymentDialog.tsx  # Dialog för fakturastatus
│
├── services/
│   └── swish/
│       ├── swishService.ts             # Huvudsaklig Swish-tjänst som hanterar API-anrop
│       ├── config.ts                   # Konfiguration för Swish API
│       └── types.ts                    # Typdefinitioner för Swish
│
├── hooks/
│   └── useSwishPaymentStatus.ts        # Custom hook för statushantering
│
├── app/
│   └── api/
│       ├── payments/
│       │   ├── status/
│       │   │   └── [reference]/
│       │   │       └── route.ts        # Hämtar betalningsstatus
│       │   │
│       │   └── swish/
│       │       ├── create/
│       │       │   └── route.ts        # Skapar Swish-betalning
│       │       ├── cancel/
│       │       │   └── route.ts        # Avbryter Swish-betalning och uppdaterar databas
│       │       ├── simple-cancel/
│       │       │   └── route.ts        # Förenklad avbrytningsprocess (fallback)
│       │       ├── callback/
│       │       │   └── route.ts        # Hanterar callbacks från Swish
│       │       └── debug/
│       │           └── cancel-test/
│       │               └── route.ts    # Testendpoint för avbrytningar
│       │
│       └── invoice/
│           └── create/
│               └── route.ts            # Skapar faktura och PDF
│
├── utils/
│   ├── flowStorage.ts                  # Hantering av betalnings- och flödesdata i localStorage
│   └── flowNavigation.ts               # Navigation mellan steg i bokningsflödet
│
└── types/
    └── payment.ts                      # Delade betalningstyper
```

## Komponentansvar

### 1. Huvudkoordinator för betalningsval
**PaymentSelection.tsx**
- Generisk komponent som används för alla produkttyper
- Ansvarar för:
  - Val av betalningsmetod (Swish/Faktura)
  - Validering av vald metod
  - Koordination mellan betalningsmetoder via refs
  - Hantering av betalningsstatus och omdirigering
  - Återanvänder bokningsdata från tidigare steg
  - Beräkning av pris baserat på produkt och antal
  
### 2. Swish-flödet
**SwishPaymentSection.tsx**
- Specifik för Swish-betalningar
- Ansvarar för:
  - Validering av telefonnummer
  - Formatering av telefonnummer för Swish-API
  - Skapande av betalningsreferens
  - Hantering av betalningsstatus
  - Kontrollerar betalningsprocessen
  - Avbrytning av betalning
  - Exponerar `handleCreatePayment` via ref

**SwishPaymentForm.tsx**
- Inmatningsformulär för telefonnummer
- Ansvarar för:
  - Inmatning av telefonnummer
  - Validering av format
  - Visuell feedback vid fel

**SwishPaymentDialog.tsx**
- Modal som visar betalningsstatus
- Ansvarar för:
  - Visar instruktioner till användaren
  - Visar realtidsuppdateringar av status
  - Visar olika tillstånd: CREATED, PAID, DECLINED, ERROR
  - Hanterar tidtagning för förväntad process
  - Ger användaren möjlighet att avbryta betalningen

**useSwishPaymentStatus.tsx**
- Custom hook för statushantering
- Ansvarar för:
  - Polling av betalningsstatus
  - Hantering av dialog-tillstånd
  - Hantering av framgång/misslyckande
  - Omdirigerar till rätt bekräftelsesida baserat på produkttyp

### 3. Backend-tjänster

**SwishService (services/swish/swishService.ts)**
- Singleton-tjänst för Swish API-anrop
- Ansvarar för:
  - Skapande av betalningar
  - Kontroll av betalningsstatus
  - Avbrytning av betalningar
  - Certifikathantering
  - Formatering av telefonnummer
  - Felhantering
  - Loggning

**API-routes**
- `/api/payments/swish/create` - Skapar Swish-betalning
- `/api/payments/swish/cancel` - Avbryter betalning och uppdaterar databas
- `/api/payments/swish/simple-cancel` - Förenklad avbrytning (fallback)
- `/api/payments/swish/callback` - Webhook för Swish-API callbacks
- `/api/payments/status/[reference]` - Hämtar betalningsstatus
- `/api/invoice/create` - Skapar fakturabetalning

## Dataflöden

### Swish-betalningsflöde (Happy Path)

1. **Initering av betalning**
   - User väljer "Swish" i PaymentSelection
   - Fyller i telefonnummer i SwishPaymentForm
   - PaymentSelection anropar SwishPaymentSection.handleCreatePayment via ref
   - SwishPaymentSection validerar telefonnummer
   - SwishPaymentSection uppdaterar UI-staten till "CREATED"
   - SwishPaymentDialog öppnas

2. **Betalningsförfrågan**
   - SwishPaymentSection gör API-anrop till `/api/payments/swish/create`
   - API-routen:
     - Validerar indata
     - Skapar betalningsreferens (SC-XXXXXX-XXX)
     - Anropar SwishService.createPayment
     - SwishService använder certifikat för säker kommunikation
     - Swish API returnerar betalnings-ID och URL
     - API-routen sparar betalningsinformation i databasen
     - Returnerar betalningsreferens till frontendet

3. **Statusövervakning**
   - useSwishPaymentStatus startar polling mot `/api/payments/status/[reference]`
   - API-routen kontrollerar status i databasen
   - Efter 20 sekunder görs även direktkontroll mot Swish API
   - SwishPaymentDialog uppdateras baserat på status

4. **Betalningsbekräftelse**
   - Användaren godkänner betalningen i Swish-appen
   - Swish skickar callback till `/api/payments/swish/callback`
   - Callback-routen uppdaterar betalningsstatus i databasen till "PAID"
   - Polling upptäcker statusändringen
   - SwishPaymentDialog visar framgångsmeddelande
   - Användaren omdirigeras till bekräftelsesidan

### Avbrytningsflöde (Användaren avbryter)

1. **Användaren avbryter i gränssnittet**
   - Användaren klickar på "Avbryt betalning" i SwishPaymentDialog
   - SwishPaymentDialog anropar `onCancel`-funktionen
   - SwishPaymentSection.handleCancelPayment anropas:
     - Uppdaterar UI-staten till "DECLINED"
     - Stänger dialogen omedelbart
     - Gör asynkront API-anrop till `/api/payments/swish/cancel`

2. **Avbrytning i backend**
   - `/api/payments/swish/cancel` tar emot betalningsreferensen
   - Hämtar full betalningsinformation inklusive Swish-ID från databasen
   - Anropar SwishService.cancelPayment med Swish-ID
   - SwishService gör PUT-anrop till Swish API:s avbrytningsendpoint
   - Uppdaterar betalningsstatus i databasen till "DECLINED"

3. **Fallback-mekanism**
   - Om `/api/payments/swish/cancel` misslyckas, prövar frontend `/api/payments/swish/simple-cancel`
   - simple-cancel returnerar alltid framgång utan att uppdatera databas eller Swish

### Felhanteringsflöde (Unhappy Path)

1. **Tekniskt fel vid betalningsskapande**
   - SwishPaymentSection kan inte skapa betalning (nätverksfel/serverfel)
   - Visar felmeddelande och låter användaren försöka igen

2. **Användaren avbryter i Swish-appen**
   - Användaren nekar betalningen i Swish-appen
   - Swish skickar callback med "DECLINED"
   - Status uppdateras i databasen
   - Polling upptäcker statusändringen
   - SwishPaymentDialog visar avbrytningsmeddelande

3. **Timeout-hantering**
   - Om användaren inte svarar inom 60 sekunder
   - SwishPaymentDialog visar timeout-meddelande
   - Betalning kan fortfarande slutföras om användarens interaktion är sen

4. **Certifikatfel**
   - Om Swish-API-anrop misslyckas p.g.a. certifikatfel
   - SwishService kastar SwishCertificateError
   - Felloggas med detaljerad information
   - API-routen returnerar 500-fel
   - Frontend visar användarvänligt felmeddelande

## Certifikathantering

Systemet använder Swish-certifikat för säker kommunikation med Swish API. Följande hantering finns implementerad:

### Certifikatfiler
- **Test-miljö**:
  - `SWISH_TEST_CERT_PATH`: Sökväg till certifikatfil
  - `SWISH_TEST_KEY_PATH`: Sökväg till privat nyckel
  - `SWISH_TEST_CA_PATH`: Sökväg till CA-certifikat

- **Produktions-miljö**:
  - `SWISH_PROD_CERT_PATH`: Sökväg till certifikatfil
  - `SWISH_PROD_KEY_PATH`: Sökväg till privat nyckel
  - `SWISH_PROD_CA_PATH`: Sökväg till CA-certifikat

### SwishService certifikathantering
- Singleton-mönster som skapar en instance med rätt konfiguration
- Validerar att alla certifikatfiler existerar vid start
- Använder HTTPS-agent med korrekt certifikatkonfiguration för alla anrop
- makeSwishRequest-metoden säkerställer att alla anrop använder samma certifikathantering
- Felhantering med speciella SwishCertificateError-exceptions

## Statushantering

Betalningsstatusar följer ett standardiserat flöde:

1. **CREATED**: Initial status när betalning skapas
2. **PAID**: Betalning har godkänts och genomförts
3. **DECLINED**: Betalning har nekats eller avbrutits
4. **ERROR**: Tekniskt fel har uppstått

### Statusöverföring mellan komponenter

1. **Frontend till Backend**:
   - Använder API-anrop för att uppdatera status
   - Skickar betalningsreferens för identifiering

2. **Backend till Frontend**:
   - Använder polling via `/api/payments/status/[reference]`
   - API-svar innehåller aktuell status från databasen

3. **Swish till Backend**:
   - Använder callbacks till `/api/payments/swish/callback`
   - Callback-body innehåller status och betalningsreferens

4. **Mellan Frontend-komponenter**:
   - useSwishPaymentStatus hook hanterar statusuppdateringar
   - SwishPaymentDialog visar status visuellt för användaren
   - PaymentSelection hanterar slutgiltig framgång/misslyckande

## Felhantering och Debugging

### HTTP-felkoder
- **400 Bad Request**: Validerings- eller formatfel
  - Felaktigt telefonnummer
  - Saknad betalningsreferens
  - Felaktigt produkttyp (databasens CHECK-constraint)
  
- **401 Unauthorized**: Autentiseringsfel mot Swish API
  - Ogiltiga eller utgångna certifikat
  
- **404 Not Found**: Resurs hittades inte
  - Ogiltig betalningsreferens
  
- **500 Internal Server Error**: Serverfel
  - Certifikatfel eller cert-sökvägsfel
  - Databasfel
  - Swish API-fel

### Loggning
- Utförlig loggning via `logDebug` och `logError` metoder
- Kritiska operationer loggas med kontext:
  - Betalningsreferenser
  - API-svar
  - Certifikatinformation
  - Tidsstämplar och durationer
  
### Debug-endpoints
- `/api/payments/swish/debug/cancel-test`: Testar avbrytning av specifik betalning
- `/api/debug/supabase-test`: Testar databaskoppling och behörigheter

## Viktiga Edge Cases

### Avbrytning och Återupptagen Betalning
- **Problem**: Om en användare avbryter en betalning och försöker igen, kan det uppstå tillståndskonflikter.
- **Lösning**: 
  - Betalningsstatusen uppdateras omedelbart i UI till "DECLINED" när användaren avbryter.
  - Frontend uppdaterar databasen asynkront.
  - Frontend genererar en ny betalningsreferens vid ny betalning.

### Certifikathantering på Servern
- **Problem**: Certifikatfiler kan saknas eller vara otillgängliga i produktionsmiljön.
- **Lösning**:
  - Valideringscheck vid startup.
  - Fallback-mekanismer som simple-cancel.
  - Robust felhantering som prioriterar användarupplevelsen.

### Tidssynkronisering
- **Problem**: Frontend-tid och Swish-backendets tid kan vara osynkroniserade.
- **Lösning**:
  - Generösa timeouts i frontend (60 sekunder).
  - Databaspersistens av betalningsinformation.
  - Direktkontroll mot Swish API efter 20 sekunder.

## To-Do: Framtida Förbättringar

### 1. Förbättrad Avbrytningshantering
- Implementera en lösning för att stänga Swish-appen när användaren avbryter betalning från vår sida.
- Utforska möjligheten att använda deep links eller appintents för att återta fokus till webbappen.
- Testa olika enheter och versioner av Swish-appen för korrekt beteende.

### 2. Hantering av Edge Case: Avbrytning följt av Ny Betalning
- Implement flöde för att hantera tillståndet där en användare:
  1. Initierar betalning
  2. Avbryter betalning från vårt gränssnitt
  3. Klickar på "Slutför bokning" igen
- Säkerställ att alla gamla referenser rensas korrekt.
- Lägg till validering som kontrollerar tidigare avbrutna betalningar.

### 3. Förbättrad Certifikathantering
- Lägg till automatisk kontroll att certifikaten är giltiga innan anrop.
- Skapa ett enkelt administratörsgränssnitt för att ladda upp nya certifikat.
- Implementera automatiska påminnelser när certifikat närmar sig utgångsdatum.

### 4. Debuggning och Övervakning
- Lägg till mer detaljerad loggning för feldiagnostik.
- Implementera automatiska larm vid onormalt höga felantal.
- Skapa en dashboard för att övervaka betalningsstatistik.

## Slutsats

Betalningssystemet är en kritisk komponent för användare att slutföra bokningar och köp. Genom att implementera robusta flöden med tydlig felhantering, certifikatsäkerhet och användarvänliga gränssnitt har vi skapat en pålitlig betalningsprocess som kan hantera olika produkttyper och betalningsmetoder.

Genom fortsatt förbättring av avbrytningshantering och edge cases kan vi ytterligare förbättra användarupplevelsen och minska risken för förvirring eller förlorade köp.