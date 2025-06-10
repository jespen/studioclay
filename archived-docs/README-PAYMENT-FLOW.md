# Payment System Documentation

## Overview
Betalningssystemet är designat som en generisk lösning som fungerar över flera produkttyper:
- Kursbokningar (course_booking)
- Presentkort (gift_card)
- Konstprodukter (art_purchase)

Systemet stödjer för närvarande två betalningsmetoder:
- Swish - för direktbetalning via mobiltelefon
- Faktura - för fakturering via e-post

## VIKTIGT: API-vägar
**OBS! KRITISKT:** API-vägarna för betalningssystemet måste användas exakt som angivna nedan. Ändringar i dessa vägar kommer orsaka fel i betalningsflödet:
- Swish-betalningar: `/api/payments/swish/create`
- Fakturabetalningar: `/api/payments/invoice/create`
- Statusförfrågningar: `/api/payments/status/[reference]`

Dessa vägars struktur och namnkonventioner är specifikt utformade för att matcha backend-processerna. Ändra aldrig dessa vägar i frontend utan motsvarande ändringar i backend.

## Komponentarkitektur och ansvarsområden

### Huvudkomponenter och deras roller

#### 1. PaymentSelection.tsx
**Huvudrollen:** Central koordinator för hela betalningsflödet.
**Ansvar:**
- Renderar betalningsmetodval (Swish/Faktura)
- Samlar användardata och produktinformation
- Koordinerar flödet mellan olika betalningskomponenter
- Hanterar callbacks och navigering efter betalning
- Validerar de övergripande formulärinmatningarna

**Interaktioner:**
- Renderar antingen `SwishPaymentSection` eller `InvoicePaymentSection` baserat på användarval
- Anropar refs (t.ex. `invoicePaymentRef.current.submitInvoicePayment()`) för att starta betalning
- Hanterar callbacks från betalningskomponenterna via `handlePaymentComplete`

#### 2. Invoice-flödeskomponenter

##### InvoicePaymentSection.tsx
**Huvudrollen:** Ansvarig för fakturainmatning och API-anrop för fakturering.
**Ansvar:**
- Samlar in faktureringsadress och referens
- Validerar faktureringsformulär
- Hanterar API-anropet till `/api/payments/invoice/create`
- Felhantering och statusuppdateringar

**Exponerade metoder via ref:**
- `validateForm()` - Kontrollerar att alla obligatoriska fält är ifyllda
- `getInvoiceDetails()` - Returnerar faktureringsuppgifter
- `submitInvoicePayment()` - Gör API-anropet och returnerar status

**Dataström:**
1. Tar emot användardata från PaymentSelection
2. Samlar formulärdata för fakturering
3. Skapar API-anrop med komplett betalningsdata
4. Anropar `onPaymentComplete` callback med svarsdata

#### 3. Swish-flödeskomponenter

##### SwishPaymentSection.tsx
**Huvudrollen:** Koordinator för Swish-betalningsflödet.
**Ansvar:**
- Hanterar telefoninmatning via `SwishPaymentForm`
- Validerar telefonnummer för Swish
- Skapar API-anrop till Swish-betalning
- Visar dialog för betalningsstatus och QR-kod
- Hanterar polling av betalningsstatus

**Exponerade metoder via ref:**
- `submitSwishPayment()` - Validerar och startar Swish-betalningsflödet

**Dataström:**
1. Tar emot användardata och betalningsbelopp från PaymentSelection
2. Samlar telefonnummer från användaren
3. Gör API-anropet till `/api/payments/swish/create`
4. Startar polling för betalningsstatus
5. Anropar callbacks baserat på betalningsresultat

##### SwishPaymentForm.tsx
**Ansvar:**
- Renderar inmatningsfält för telefonnummer
- Validerar telefonnummerformat
- Ger visuell feedback om valideringsfel

##### SwishPaymentDialog.tsx
**Ansvar:**
- Visar betalningsstatus (väntar, betald, nekad, fel)
- Visar QR-kod för betalning när tillämpligt
- Ger användaren möjlighet att avbryta betalning

### Backend-komponenter och tjänster

#### 1. Tjänster (services)

##### invoiceService.ts
**Huvudrollen:** Sköter kommunikationen med backend för fakturor.
**Ansvar:**
- Skapar API-anrop till `/api/payments/invoice/create`
- Strukturerar faktureringsdata
- Felhantering och återförsök

##### paymentService.ts
**Huvudrollen:** Centraliserad tjänst för betalningsrelaterade funktioner.
**Ansvar:**
- Validerar betalningsdata
- Hanterar idempotensnycklar
- Kan anropa både Swish och Faktura-tjänster

#### 2. API-routes

##### /api/payments/invoice/create/route.ts
**Huvudrollen:** Skapar faktura och hanterar orderdata.
**Ansvar:**
- Validerar inkommande data
- Skapar order i rätt tabell baserat på produkttyp
- Skapar fakturareferens och fakturanummer
- Initierar bakgrundsprocess för PDF-generering och e-post
- Returnerar bekräftelse till frontend

**Processflöde:**
1. Validerar inkommande data
2. Skapar payment record i databasen
3. Sparar orderdata (beroende på produkttyp)
4. Startar asynkron process för PDF-generering och e-post
5. Returnerar snabbt svar till frontenden med betalningsreferens

##### /api/payments/swish/create/route.ts
**Huvudrollen:** Initierar Swish-betalning och hanterar databasen.
**Ansvar:**
- Validerar inkommande data
- Skapar payment record
- Anropar Swish API
- Returnerar betalningslänk och referens

##### /api/payments/status/[reference]/route.ts
**Huvudrollen:** Returnerar aktuell betalningsstatus.
**Ansvar:**
- Hämtar betalningsstatus från databasen
- Returnerar status och relevant information
- Används för polling från frontend

### Hjälputiliteter

#### flowStorage.ts
**Huvudrollen:** Hanterar persisterande lagring av betalnings- och flödesdata.
**Ansvar:**
- Sparar och hämtar betalningsreferenser
- Hanterar användardata över flödet
- Lagrar tillfälliga betalningsuppgifter

#### invoicePDF.ts
**Huvudrollen:** Genererar faktura-PDF.
**Ansvar:**
- Skapar PDF baserat på order- och kunddata
- Formaterar fakturainformation
- Lägger till betalningsinformation

#### giftCardPDF.ts
**Huvudrollen:** Genererar presentkorts-PDF.
**Ansvar:**
- Skapar presentkort med unik kod
- Formaterar mottagarinformation

#### serverEmail.ts
**Huvudrollen:** Hanterar e-postutskick från servern.
**Ansvar:**
- Skapar e-postmeddelanden
- Bifogar genererade PDF-filer
- Hanterar olika e-postmallar för olika produkttyper

## Dataflöden i detalj

### 1. Faktureringsflödet

#### Frontend-flöde för fakturering:
1. **Användarval:**
   - Användaren väljer "Faktura" i PaymentSelection
   - InvoicePaymentSection visas med formulär

2. **Datainsamling:**
   - Användaren fyller i faktureringsadress och referens
   - PaymentSelection samlar userData, courseData och vald betalningsmetod

3. **Validering och inskickning:**
   - Vid submit anropas `invoicePaymentRef.current.submitInvoicePayment()`
   - InvoicePaymentSection validerar, konstruerar betalningsdata och anropar invoice API

4. **Callback-hantering:**
   - När API svarar, anropar InvoicePaymentSection `onPaymentComplete` med svarsdata
   - PaymentSelection.handlePaymentComplete lagrar data och navigerar till nästa steg

#### Backend-flöde för fakturering:
1. **API-anrop tas emot:**
   - `/api/payments/invoice/create` tar emot data
   - Validerar inkommande data och behörigheter

2. **Databasoperationer:**
   - Skapar post i payments-tabellen
   - Skapar orderpost i relevant tabell (bookings/art_orders/gift_cards)
   - Genererar fakturanummer och betalningsreferens

3. **Returnerar tidigt svar:**
   - Skickar success=true och ID/referens till frontend
   - Användaren kan fortsätta utan att vänta

4. **Bakgrundsbearbetning:**
   - PDF-generering startas
   - PDF sparas i rätt lagringsplats
   - E-post skickas med PDF-bilaga
   - Loggar hela processen

### 2. Swish-flödet

#### Frontend-flöde för Swish:
1. **Användarval:**
   - Användaren väljer "Swish" i PaymentSelection
   - SwishPaymentSection visas med telefonnummerinmatning

2. **Initiering av betalning:**
   - Vid submit anropas `swishPaymentRef.current.submitSwishPayment()`
   - SwishPaymentSection validerar, konstruerar data och anropar Swish API
   - SwishPaymentDialog visas för att visa status och QR-kod

3. **Polling av status:**
   - Frontend pollar `/api/payments/status/[reference]` var tredje sekund
   - Uppdaterar UI baserat på statusändringar

4. **Slutföring:**
   - När status blir PAID, anropar SwishPaymentSection `onPaymentComplete`
   - PaymentSelection.handlePaymentComplete lagrar data och navigerar till nästa steg

#### Backend-flöde för Swish:
1. **API-anrop tas emot:**
   - `/api/payments/swish/create` tar emot data
   - Validerar inkommande data och behörigheter

2. **Swish API-anrop:**
   - Skapar payment record i databasen
   - Anropar externa Swish API:et
   - Returnerar paymentID och status till frontend

3. **Callback-hantering:**
   - Swish skickar callback till `/api/payments/swish/callback`
   - Systemet uppdaterar betalningsstatus i databasen
   - Backend initierar samma orderprocesser som för faktura efter betald status

4. **Statusförfrågningar:**
   - `/api/payments/status/[reference]` svarar på poll-anrop
   - Returnerar aktuell status från databasen

## Produktspecifika flöden

### Kursbokning (course_booking)
1. **Databasen:**
   - Skapar post i bookings-tabellen
   - Uppdaterar current_participants i course_instances
   - Skapar poster i booking_participants för gruppaddeltagare

2. **PDF och e-post:**
   - Genererar faktura-PDF med kursuppgifter
   - Skickar bekräftelse-e-post med faktura bifogad

### Konstprodukt (art_product)
1. **Databasen:**
   - Skapar post i art_orders-tabellen
   - Uppdaterar stock_quantity i products-tabellen

2. **PDF och e-post:**
   - Genererar faktura-PDF
   - Skickar e-post med orderbekräftelse och faktura

### Presentkort (gift_card)
1. **Databasen:**
   - Skapar post i gift_cards-tabellen
   - Genererar unik presentkortskod

2. **PDF och e-post:**
   - Genererar presentkorts-PDF med kod och mottagarinformation
   - Genererar faktura-PDF för köpet
   - Skickar e-post med båda PDF-filer bifogade
   - Vid digitalt presentkort skickas separat e-post till mottagaren

## Felhantering och edge-cases

### Viktiga felhanteringsprinciper
1. **Strukturerad loggning:**
   - Alla kritiska operationer loggas med unika request IDs
   - Felloggar innehåller tillräckligt med kontext för felsökning

2. **Granulär felhantering:**
   - Varje steg i processen har sin egen try-catch
   - Fel i specifika steg förhindrar inte fortsatt process

3. **Frontend-feedback:**
   - Användare får tydliga felmeddelanden
   - UI uppdateras korrekt vid serverfel

### Viktiga edge-cases
1. **Timeout-hantering:**
   - Asynkron bearbetning för krävande operationer
   - "Fire and forget"-mönster för PDF-generering
   - Databaslagring sker alltid först för att säkerställa datakonsistens

2. **Dubbla betalningar:**
   - Idempotensnycklar används för alla betalningar
   - Lokalt lagras betalningsreferenser för att förhindra dubbletter

3. **Avbrutna betalningar:**
   - Status-polling detekterar avbrutna betalningar
   - Callback-hantering för Swish hanterar avbrutna flöden

4. **Serverkrascher:**
   - Kritisk data sparas tidigt i processen
   - Betalningsstatus kan återhämtas även om frontend-sessionen avbryts

## Implementationsdetaljer

### PaymentSelection.tsx
```typescript
// PaymentSelection koordinerar mellan betalningsmetoder
const handleInvoicePayment = async (): Promise<boolean> => {
  console.log('[PaymentSelection] Handle invoice payment called');
  setIsSubmitting(true);
  
  try {
    if (!invoicePaymentRef.current || !userInfo) {
      throw new Error('Invoice form reference is not available');
    }
    
    // Låt InvoicePaymentSection hantera API-anropet
    const success = await invoicePaymentRef.current.submitInvoicePayment();
    
    setIsSubmitting(false);
    return success;
  } catch (error) {
    console.error('[PaymentSelection] Invoice payment error:', error);
    setSubmitError(error instanceof Error ? error.message : 'Ett fel uppstod');
    setIsSubmitting(false);
    return false;
  }
};
```

### InvoicePaymentSection.tsx
```typescript
// InvoicePaymentSection hanterar fakturainmatning och API-anrop
const handleSubmit = async (): Promise<boolean> => {
  console.log('[InvoicePaymentSection] Submitting invoice payment');
  
  if (!validateForm()) {
    return false;
  }

  setIsSubmitting(true);

  try {
    // Konstruera requestdata för service-anrop
    const requestData: InvoicePaymentRequest = {
      payment_method: PAYMENT_METHODS.INVOICE,
      amount: amount,
      product_id: courseId,
      product_type: validProductType,
      userInfo: userInfo,
      invoiceDetails: {
        address: address.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        reference: reference || ''
      }
    };
    
    // Anropa invoice service
    const responseData = await createInvoicePayment(requestData);
    
    // Anropa callback med svarsdata
    if (onPaymentComplete) {
      onPaymentComplete(responseData);
    }
    
    setIsSubmitting(false);
    return true;
  } catch (error) {
    console.error('[InvoicePaymentSection] Error:', error);
    setInvoiceFormError(error instanceof Error ? error.message : 'Ett fel uppstod');
    setIsSubmitting(false);
    return false;
  }
};
```

### SwishPaymentSection.tsx
```typescript
// SwishPaymentSection hanterar telefonnummerinmatning och Swish-betalning
const handleSubmit = async () => {
  console.log('[SwishPaymentSection] Submit button clicked');
  if (!validateForm()) {
    return;
  }

  setIsSubmitting(true);
  setError(null);
  
  try {
    // Generera unik referens
    const paymentRef = `${productType.substring(0, 1)}-${Date.now()}`;
    setPaymentReference(paymentRef);
    
    // Konstruera requestbody
    const requestBody = {
      phone_number: phoneNumber,
      payment_method: "swish",
      product_type: productType,
      product_id: productId,
      amount: amount,
      user_info: userInfo
    };
    
    // Gör API-anrop
    const response = await fetch('/api/payments/swish/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Öppna betalningsdialog
    setPaymentDialogOpen(true);
    
  } catch (error) {
    console.error('[SwishPaymentSection] Payment creation error:', error);
    setError(error instanceof Error ? error.message : 'Ett fel uppstod vid betalningen');
    setIsSubmitting(false);
  }
};
```

## Nyligen implementerade förbättringar

### 1. Optimerat flöde för tyngre operationer
- **Asynkron "fire and forget"-process** - Vi har implementerat en bakgrundsprocess för tyngre operationer (PDF-generering, e-post) för att förhindra timeout-problem i serverlösa miljöer.
- **Prioriterad databaslagring** - Kritiska dataoperationer utförs först, innan PDF-generering och e-postutskick, för att säkerställa att data sparas även om senare steg misslyckas.
- **Snabbare svarstider** - Servern väntar nu endast på databasinsättningen innan den svarar till klienten, vilket ger snabbare upplevd prestanda.

### 2. Förbättrad felhantering
- **Robusta try-catch-block** - Varje kritisk operation är nu omgiven av egen felhantering som loggar detaljerad information.
- **Granulär felrapportering** - Detaljerad loggning för varje steg i processen för enklare felsökning.
- **Fortsatt bearbetning trots fel** - Systemet fortsätter processen även om vissa steg misslyckas (t.ex. om PDF-generering misslyckas, fortsätter e-postprocessen).

### 3. Uppdaterat gift card-flöde
- **Korrekt hantering av belopp** - Fixat ett fel där presentkortsbeloppet inte överfördes korrekt från frontend till backend, vilket nu säkerställer att fakturan skapas med rätt belopp.
- **Dubbel PDF-generering** - Både presentkorts-PDF och faktura-PDF genereras och sparas i respektive lagringsplats (buckets).
- **Båda bilagor i ett e-postmeddelande** - Båda PDF-filer bifogas nu i samma e-postmeddelande till kunden.

### 4. Förbättrad produkthantering
- **Automatisk lagerhantering** - Vid köp av produkter uppdateras lagerstatusen automatiskt i products-tabellen.
- **Kursplatshantering** - Vid kursbokningar uppdateras nu current_participants i course_instances-tabellen för att hålla reda på tillgängliga platser.

### 5. Asynkron bearbetning
- **Omedelbar respons till klienten** - Användaren får bekräftelse direkt efter att kritiska data sparats.
- **Bakgrundsprocesser** - PDF-generering, lagring och e-postutskick sker i bakgrunden utan att blockera huvudtråden.
- **Förbättrad upplevelse med längre processer** - Låter användaren fortsätta till bekräftelsesidan medan tyngre uppgifter slutförs.

## TO DO: Framtida förbättringar för betalningsflödet

### 1. Införa köhantering för bakgrundsuppgifter
- **Beskrivning**: Implementera en dedikerad kömekanism (t.ex. med AWS SQS, RabbitMQ eller liknande) för bakgrundsuppgifter istället för "fire and forget"-metoden.
- **Fördelar**:
  - Garanterad leverans av alla meddelanden även vid serverfel
  - Möjlighet att försöka igen vid misslyckade operationer
  - Bättre observerbarhet och övervakning av bakgrundsprocesser
  - Skalbar lösning för att hantera hög belastning

### 2. Förbättrad statushantering av fakturor
- **Beskrivning**: Implementera en fullständig statushantering för fakturor (skapad, skickad, påmind, betald, förfallen).
- **Fördelar**:
  - Bättre uppföljning av obetalda fakturor
  - Möjlighet att automatisera påminnelser
  - Tydlig översikt för administratörer över fakturastatus
  - Integration med bokföringssystem

### 3. Separata Worker-funktioner för PDF-generering
- **Beskrivning**: Flytta PDF-generering till dedikerade serverless-funktioner med högre minnes- och tidsgränser.
- **Fördelar**:
  - Möjlighet att använda mer resurskrävande PDF-generering
  - Minskar risken för timeout i huvudflödet
  - Bättre felloggning och övervakning
  - Möjlighet till återanvändning av genererade PDF:er

### 4. Webhook-system för externa integrationer
- **Beskrivning**: Skapa ett webhook-system som notifierar externa system om nya fakturor, betalningar, etc.
- **Fördelar**:
  - Enklare integration med bokföringssystem
  - Möjlighet för användare att integrera med sina egna system
  - Förbättrad systemkoppling för framtida funktionalitet

### 5. Förbättrat cache-system för presentkort
- **Beskrivning**: Implementera ett mer sofistikerat cachesystem för aktiva presentkort för snabbare validering.
- **Fördelar**:
  - Snabbare svarstider vid kontroll av presentkort
  - Minskat databastryck
  - Förbättrad användbarhet vid inlösen av presentkort

### 6. Dynamisk fakturautformning baserad på kundtyp
- **Beskrivning**: Utöka fakturasystemet för att hantera både privatpersoner och företag med specifika fakturakrav.
- **Fördelar**:
  - Korrekt momshantering för olika kundtyper
  - Stöd för företagsspecifik information (organisationsnummer, etc.)
  - Förbättrad efterlevnad av bokföringsregler

### 7. E-postkvalitetsövervakning och analys
- **Beskrivning**: Implementera spårning av e-postleverans, öppningsgrad och klickfrekvens.
- **Fördelar**:
  - Bättre insikt i om e-post når fram till kunderna
  - Möjlighet att optimera e-postinnehåll
  - Proaktiv hantering av leveransproblem

## Slutsats

Betalningssystemet har nu förbättrats betydligt med robustare felhantering, optimerat flöde för tyngre operationer, och korrekt stöd för alla produkttyper. De kritiska problemen med timeout och felaktig dataöverföring har åtgärdats, och systemet har testats för alla huvudflöden: konstprodukter, kursbokningar och presentkort.

De föreslagna framtida förbättringarna skulle ytterligare stärka systemets robusthet, skalbarhet och funktionalitet, men den nuvarande implementationen ger en solid grund som uppfyller de grundläggande kraven för e-handel och bokningssystem.

## Databasstruktur och API-integration

### Databastabeller

Betalningssystemet använder följande databastabeller med tillhörande struktur:

#### 1. `payments` - Huvudtabell för betalningar

Tabellen `payments` lagrar alla betalningsförsök för olika produkttyper och betalningsmetoder:

| Kolumnnamn            | Datatyp   | Beskrivning                                      | Rekommendation                                    |
|-----------------------|-----------|--------------------------------------------------|---------------------------------------------------|
| id                    | UUID      | Primärnyckel                                     | Genereras automatiskt                             |
| status                | TEXT      | Betalningsstatus                                 | Använd `PAYMENT_STATUSES.CREATED/PAID`            |
| amount                | DECIMAL   | Betalningsbelopp                                 | I SEK, med två decimaler                          |
| currency              | TEXT      | Valutakod                                        | Normalt "SEK"                                     |
| payment_method        | TEXT      | Betalningsmetod                                  | Använd `PAYMENT_METHODS.INVOICE/SWISH`            |
| payment_reference     | TEXT      | Unikt betalningsreferensnummer                   | Format: "SC-ÅÅÅÅMMDD-XXXXXX"                      |
| product_type          | TEXT      | Typ av produkt                                   | 'course', 'art_product', 'gift_card'              |
| product_id            | UUID      | ID för den produkt som betalades                 | Främmande nyckel till respektive produkttabell    |
| created_at            | TIMESTAMP | Tidsstämpel för betalningsförsöket               | Genereras automatiskt                             |
| updated_at            | TIMESTAMP | Tidsstämpel för betalningsstatusen               | Uppdateras automatiskt                            |
| swish_payment_id      | TEXT      | Swish-specifikt betalnings-ID                    | För Swish-betalningar                             |
| swish_callback_url    | TEXT      | URL för Swish-callback                           | För Swish-betalningar                             |
| swish_reference       | TEXT      | Swish referenskod                                | För Swish-betalningar                             |
| user_info             | JSONB     | Kundinformation i JSON-format                    | Standardiserad struktur                           |
| metadata              | JSONB     | Ytterligare information i JSON-format            | Varierar beroende på produkttyp                   |

**Viktigt för payments-tabellen:**
- Använd ALLTID konstanter från `statusCodes.ts` för statusvärden
- Korrekt hantering av `product_type` är kritisk för att relatera betalningar till rätt produkttabell
- Alla belopp ska anges i öre för att undvika avrundningsproblem med decimaler

#### 2. `bookings` - Kursbokningar

Tabellen `bookings` lagrar alla kursbokningar, inklusive de som skapats genom fakturabetalningar:

| Kolumnnamn            | Datatyp   | Beskrivning                                      | Rekommendation                                    |
|-----------------------|-----------|--------------------------------------------------|---------------------------------------------------|
| id                    | UUID      | Primärnyckel                                     | Genereras automatiskt                             |
| course_id             | UUID      | Främmande nyckel till course_instances           | Måste vara ett giltigt course_id                  |
| customer_name         | TEXT      | Kundens fullständiga namn                        | Formatera som "Förnamn Efternamn"                 |
| customer_email        | TEXT      | Kundens e-postadress                             | Använd lowercase för konsistens                   |
| customer_phone        | TEXT      | Kundens telefonnummer                            | Formatera som "07XXXXXXXX" utan mellanslag        |
| number_of_participants| INTEGER   | Antal deltagare i bokningen                      | Minimum 1                                         |
| booking_date          | TIMESTAMP | Datum när bokningen gjordes                      | Använd UTC-tid                                    |
| status                | TEXT      | Bokningsstatus                                   | Använd `BOOKING_STATUSES.CONFIRMED`               |
| payment_status        | TEXT      | Betalningsstatus                                 | Använd `PAYMENT_STATUSES.CREATED` vid skapande   |
| message               | TEXT      | Valfritt meddelande från kunden                  | Kan vara null                                     |
| created_at            | TIMESTAMP | Tidsstämpel för postens skapande                 | Genereras automatiskt                             |
| updated_at            | TIMESTAMP | Tidsstämpel för postens uppdatering              | Uppdateras automatiskt                            |
| invoice_number        | TEXT      | Fakturanummer för fakturabetalningar             | Format: "SC-ÅÅÅÅMMDD-XXXX"                        |
| invoice_address       | TEXT      | Faktureringsadress                               | Obligatoriskt för fakturabetalningar              |
| invoice_postal_code   | TEXT      | Postnummer för faktura                           | Obligatoriskt för fakturabetalningar              |
| invoice_city          | TEXT      | Ort för faktura                                  | Obligatoriskt för fakturabetalningar              |
| invoice_reference     | TEXT      | Kundens referens för fakturan                    | Valfritt fält                                     |
| payment_method        | TEXT      | Betalningsmetod                                  | Använd `PAYMENT_METHODS.INVOICE` för fakturor     |
| booking_reference     | TEXT      | Unikt referensnummer för bokningen               | Format: "SC-XXX-XXXXXX"                           |
| unit_price            | DECIMAL   | Pris per deltagare                               | I SEK, med två decimaler                          |
| total_price           | DECIMAL   | Totalpris för bokningen                          | unit_price * number_of_participants               |
| currency              | TEXT      | Valutakod                                        | Normalt "SEK"                                     |

**VIKTIGT:** 
- För bokning via faktura, använd ALLTID `booking_reference` som fältnamn för bokningens referensnummer, inte `order_reference`.
- För betalningar använd ALLTID status-värden från konstanterna i `statusCodes.ts`:
  - `PAYMENT_STATUSES.CREATED` - när fakturan skapas
  - `PAYMENT_STATUSES.PAID` - när betalningen är bekräftad 
  - `BOOKING_STATUSES.CONFIRMED` - för bekräftade bokningar
- För fakturabetalningar måste fälten `invoice_address`, `invoice_postal_code` och `invoice_city` vara ifyllda.

### Kodexempel: Skapa en bokning via faktura

```typescript
// Importera nödvändiga konstanter
import { BOOKING_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '@/constants/statusCodes';

// Exempel på bookingData för infogning i databasen
const bookingData = {
  course_id: courseId, // UUID från course_instances
  customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
  customer_email: userInfo.email,
  customer_phone: userInfo.phoneNumber || '',
  number_of_participants: parseInt(userInfo.numberOfParticipants) || 1,
  booking_date: new Date().toISOString(),
  status: BOOKING_STATUSES.CONFIRMED,
  payment_status: PAYMENT_STATUSES.CREATED, // Ändra till PAID när betalning bekräftas
  message: message || null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  invoice_number: invoiceNumber, // Format: SC-ÅÅÅÅMMDD-XXXX
  invoice_address: invoiceDetails.address,
  invoice_postal_code: invoiceDetails.postalCode,
  invoice_city: invoiceDetails.city,
  invoice_reference: invoiceDetails.reference || '',
  payment_method: PAYMENT_METHODS.INVOICE,
  booking_reference: bookingReference, // Format: SC-XXX-XXXXXX
  unit_price: coursePrice,
  total_price: coursePrice * (parseInt(userInfo.numberOfParticipants) || 1),
  currency: 'SEK'
};

// Infoga bokningen i databasen
const { data: bookingResult, error: bookingError } = await supabase
  .from('bookings')
  .insert(bookingData)
  .select('id, booking_reference')
  .single();
```

#### 3. `gift_cards` - Presentkort

```sql
CREATE TABLE "public"."gift_cards" (
  "id" UUID PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE, -- Unik kod för presentkortet (GC-XXXXXXXX)
  "amount" DECIMAL NOT NULL,
  "type" TEXT NOT NULL, -- 'digital', 'physical'
  "status" TEXT NOT NULL, -- 'active', 'redeemed', 'expired', 'cancelled'
  "remaining_balance" DECIMAL NOT NULL,
  "sender_name" TEXT NOT NULL,
  "sender_email" TEXT NOT NULL,
  "sender_phone" TEXT,
  "recipient_name" TEXT,
  "recipient_email" TEXT,
  "message" TEXT,
  "is_emailed" BOOLEAN DEFAULT FALSE,
  "is_printed" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "is_paid" BOOLEAN DEFAULT FALSE,
  "invoice_number" TEXT,
  "invoice_address" TEXT,
  "invoice_postal_code" TEXT,
  "invoice_city" TEXT,
  "invoice_reference" TEXT,
  "recipient_message" TEXT,
  "payment_method" TEXT, -- 'swish', 'invoice'
  "payment_reference" TEXT, -- FK till payments.id
  "payment_status" TEXT -- 'PAID', 'UNPAID'
);
```

**API-användning**:
- `/api/payments/swish/callback`: Skapar presentkort när betalningen är genomförd
- `/api/gift-cards/validate`: Validerar en presentkortskod
- `/api/gift-cards/redeem`: Löser in ett presentkort

#### 4. `art_orders` - Beställningar av konstprodukter

Tabellen `art_orders` lagrar information om beställningar av konstverk:

| Kolumnnamn            | Datatyp   | Beskrivning                                      | Rekommendation                                    |
|-----------------------|-----------|--------------------------------------------------|---------------------------------------------------|
| id                    | UUID      | Primärnyckel                                     | Genereras automatiskt                             |
| product_id            | UUID      | Främmande nyckel till art_products               | Måste vara ett giltigt product_id                 |
| customer_name         | TEXT      | Kundens fullständiga namn                        | Formatera som "Förnamn Efternamn"                 |
| customer_email        | TEXT      | Kundens e-postadress                             | Använd lowercase för konsistens                   |
| customer_phone        | TEXT      | Kundens telefonnummer                            | Formatera som "07XXXXXXXX" utan mellanslag        |
| shipping_address      | TEXT      | Leveransadress för konstverk                     | Fullständig adress                                |
| shipping_postal_code  | TEXT      | Postnummer för leverans                          | Format "XXX XX"                                   |
| shipping_city         | TEXT      | Leveransort                                      | Stadsnamn                                         |
| status                | TEXT      | Orderstatus                                      | Använd konstanter för statusvärden                 |
| payment_status        | TEXT      | Betalningsstatus                                 | Använd `PAYMENT_STATUSES.CREATED/PAID`            |
| payment_method        | TEXT      | Betalningsmetod                                  | Använd `PAYMENT_METHODS.INVOICE/SWISH`            |
| order_reference       | TEXT      | Unikt referensnummer för beställningen           | Format: "ART-ÅÅMMDD-XXXX"                         |
| price                 | DECIMAL   | Pris för konstverket                             | I SEK, med två decimaler                          |
| currency              | TEXT      | Valutakod                                        | Normalt "SEK"                                     |
| invoice_number        | TEXT      | Fakturanummer (för fakturabetalningar)           | Format: "INV-ÅÅMM-XXXX"                           |
| invoice_address       | TEXT      | Faktureringsadress                               | Obligatoriskt för fakturabetalningar              |
| invoice_postal_code   | TEXT      | Postnummer för faktura                           | Obligatoriskt för fakturabetalningar              |
| invoice_city          | TEXT      | Ort för faktura                                  | Obligatoriskt för fakturabetalningar              |
| invoice_reference     | TEXT      | Kundens referens för fakturan                    | Valfritt fält                                     |
| message               | TEXT      | Meddelande från kunden                           | Valfritt fält                                     |
| created_at            | TIMESTAMP | Tidsstämpel för postens skapande                 | Genereras automatiskt                             |
| updated_at            | TIMESTAMP | Tidsstämpel för postens uppdatering              | Uppdateras automatiskt                            |

**Viktigt för art_orders-tabellen:**
- För konstbeställningar, använd `order_reference` (inte `booking_reference`) för det unika referensnumret
- Alla konstbeställningar kräver fullständig leveransinformation
- Vid fakturabetalning krävs fakturainformation även om den är identisk med leveransinformationen

#### 5. `products` - Konstprodukter

```sql
CREATE TABLE "public"."products" (
  "id" UUID PRIMARY KEY,
  "title" TEXT NOT NULL,
  "price" DECIMAL NOT NULL,
  "original_price" DECIMAL,
  "image" TEXT,
  "description" TEXT,
  "is_new" BOOLEAN DEFAULT FALSE,
  "discount" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "in_stock" BOOLEAN DEFAULT TRUE,
  "stock_quantity" INTEGER DEFAULT 1,
  "published" BOOLEAN DEFAULT TRUE
);
```

**API-användning**:
- `/api/payments/swish/callback`: Uppdaterar lagerstatusen när en konstprodukt köps
- `/api/products`: Hanterar produktdata

#### 6. `course_instances` - Kurstillfällen

```sql
CREATE TABLE "public"."course_instances" (
  "id" UUID PRIMARY KEY,
  "title" TEXT NOT NULL,
  "start_date" TIMESTAMPTZ NOT NULL,
  "end_date" TIMESTAMPTZ NOT NULL,
  "max_participants" INTEGER NOT NULL,
  "current_participants" INTEGER DEFAULT 0,
  "is_published" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "template_id" UUID, -- FK till course_templates.id
  "status" TEXT NOT NULL, -- 'scheduled', 'completed', 'cancelled'
  "price" DECIMAL NOT NULL,
  "rich_description" TEXT,
  "description" TEXT,
  "category_id" UUID, -- FK till categories.id
  "image_url" TEXT
);
```

**API-användning**:
- `/api/payments/swish/callback`: Uppdaterar antalet deltagare när en kursbokning görs
- `/api/courses`: Hanterar kursdata

### API-flöden och databasoperationer

#### Swish-betalningsflöde

1. **Skapa betalning** (`/api/payments/swish/create`):
   - Validerar begäran och skapar en unik `payment_reference`
   - Sparar betalningen i `payments`-tabellen med status "CREATED"
   - Skickar betalningsförfrågan till Swish API
   - Returnerar betalningsreferens till frontend

2. **Callback från Swish** (`/api/payments/swish/callback`):
   - Verifierar callback och uppdaterar betalningsstatus i `payments`-tabellen
   - Baserat på produkttyp:
     - **Kurs**: Skapar en ny post i `bookings`-tabellen och uppdaterar `current_participants` i `course_instances`
     - **Presentkort**: Skapar en ny post i `gift_cards`-tabellen och genererar/skickar PDF
     - **Konstprodukt**: Skapar en ny post i `art_orders`-tabellen och uppdaterar `stock_quantity` i `products`
   - Skickar bekräftelsemail i bakgrundsprocess

3. **Statusförfrågan** (`/api/payments/status/[reference]`):
   - Söker i `payments`-tabellen efter angiven referens
   - Returnerar aktuell betalningsstatus och tillhörande information
   - Används för polling från frontend för att uppdatera användargränssnittet

4. **Avbryt betalning** (`/api/payments/swish/cancel`):
   - Uppdaterar betalningsstatus i `payments`-tabellen till "DECLINED"
   - För kursbokningar: Uppdaterar `current_participants` i `course_instances`
   - Avbryter betalningen i Swish API om den fortfarande är pågående

### Central statushantering

För att säkerställa konsistens i statushanteringen över hela systemet, används nu centrala definitioner av statusvärden. Dessa är definierade i `src/constants/statusCodes.ts` och inkluderar:

#### Betalningsstatuskoder
```typescript
export const PAYMENT_STATUSES = {
  CREATED: 'CREATED',   // Initial state when payment is created
  PAID: 'PAID',         // Payment confirmed by Swish/Invoice
  ERROR: 'ERROR',       // Payment failed
  DECLINED: 'DECLINED'  // Payment declined by user or Swish
} as const;
```

#### Bokningsstatuskoder
```typescript
export const BOOKING_STATUSES = {
  PENDING: 'pending',       // Initial state when booking is created
  CONFIRMED: 'confirmed',   // Booking is confirmed
  CANCELLED: 'cancelled'    // Booking is cancelled
} as const;
```

#### Orderstatuskoder
```typescript
export const ORDER_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled'
} as const;
```

Genom att använda dessa centrala definitioner tillsammans med hjälpfunktioner som `getValidPaymentStatus()` säkerställs att:

1. **Konsistenta värden** används över hela systemet
2. **Felaktiga statusvärden** fångas upp tidigt med tydlig loggning
3. **Typvalidering** hjälper utvecklare att undvika misstag under kompilering

Detta förhindrar att inkonsekventa statusvärden (t.ex. 'PENDING' när det borde vara 'CREATED') smyger sig in i systemet och orsakar felaktigt beteende.

### Rekommenderade SQL-förfrågningar för felsökning

#### Hitta betalning med specifik referens
```sql
SELECT * FROM payments WHERE payment_reference = 'SC-XXXXXX-XXX' OR swish_payment_id = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
```

#### Hitta bokning kopplad till en betalning
```sql
SELECT b.* FROM bookings b
JOIN payments p ON p.booking_id = b.id
WHERE p.payment_reference = 'SC-XXXXXX-XXX';
```

#### Hitta presentkort kopplat till en betalning
```sql
SELECT * FROM gift_cards WHERE payment_reference = 'payment-id-here';
```

#### Hitta konstproduktbeställning med specifik orderreferens
```sql
SELECT * FROM art_orders WHERE order_reference = 'reference-here';
```

#### Visa alla kurser med bokningsstatus
```sql
SELECT c.id, c.title, c.start_date, c.max_participants, c.current_participants,
  (SELECT COUNT(*) FROM bookings WHERE course_id = c.id AND status = 'confirmed') as confirmed_bookings
FROM course_instances c
WHERE c.status = 'scheduled'
ORDER BY c.start_date;
```

### Relationer mellan tabeller

- `payments.booking_id` → `bookings.id`
- `payments.course_id` → `course_instances.id`
- `bookings.course_id` → `course_instances.id`
- `gift_cards.payment_reference` → `payments.id`
- `art_orders.product_id` → `products.id`
- `course_instances.template_id` → `course_templates.id`

Dessa databasrelationer är centrala för att förstå hur de olika systemen hänger ihop och hur data flödar mellan dem.

## TO DO: Framtida förbättringar för faktureringsflödet