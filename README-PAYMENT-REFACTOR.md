# Betalningsintegration Refaktoriseringsprojekt

## Bakgrund och Syfte

Nuvarande betalningsintegration har visat sig vara instabil och svår att underhålla av flera anledningar:

1. **Inkonsistent Datahantering**: 
   - Olika produkttyper (kurser, presentkort, konstprodukter) skickar data i olika format
   - Data härstammar från olika källor (flowData, itemDetails, directInput)
   - Validering och fallbacks är inkonsekvent implementerade

2. **Otillräcklig Validering**:
   - Vi validerar bara grundläggande fält (product_id, email) men inte produktspecifika fält
   - För gift cards behöver vi t.ex. säkerställa att belopp finns och är positivt
   - Schemavalidering saknas för stora delar av flödet

3. **Osäker Callback-hantering**: 
   - Callbacks från Swish hanteras utan proper idempotency och felhantering
   - Statusuppdateringar hanteras inkonsekvent mellan olika produkttyper

4. **Bristfällig Separation of Concerns**: 
   - Betalningslogik är tätt kopplad till produktspecifik logik
   - Databasschemat speglar inte tydligt domänmodellen

5. **Otillförlitlig Asynkron Hantering**: 
   - PDF-generering och e-postutskick förlitar sig på osäkra "fire-and-forget" metoder
   - Ingen återförsöksmekanism för operationer som misslyckas
   - Bakgrundsprocesser saknar spårbarhet och övervakning

6. **Inkonsekventa API-strukturer**: 
   - Olika API-flöden för olika produkttyper och betalningsmetoder
   - Saknad standardisering av svarsformat mellan olika endpoints

Syftet med denna refaktorisering är att skapa en robust, underhållbar och pålitlig betalningsintegration som:
- Hanterar alla edge-cases korrekt
- Är lätt att felsöka
- Har tydlig separation mellan olika ansvarsområden
- Använder konsekvent datastruktur över alla produkttyper
- Implementerar återförsökslogik för kritiska operationer
- Är väl testad och dokumenterad

## Strategisk Arkitektur för Långsiktig Stabilitet

### 1. Enhetligt, Typstarkt Dataflöde

Vi behöver implementera en konsekvent datapipeline där:

- Alla betalningsförfrågningar följer samma struktur oavsett produkttyp
- Produktspecifik data är korrekt typad med tydliga scheman
- Datanormalisering sker tidigt i processen
- Validering är heltäckande och misslyckas tidigt för ogiltig data

### 2. Typstark och Robust Validator

Valideringssystemet ska:

- Använda Zod-scheman för alla datamodeller
- Ha centraliserad valideringslogik för alla betalningsflöden
- Inkludera produktspecifika valideringsregler
- Normalisera inkonsekventa fältnamn (t.ex. phoneNumber vs phone_number)
- Ge tydliga, användbara felmeddelanden

### 3. Robust Processdesign med Transaktioner

För att säkerställa konsistens i alla flöden:

- Implementera riktiga databastransaktioner för atomära operationer
- Använda en "allt eller inget"-strategi för att förhindra partiella poster
- Säkerställa rollback-möjligheter om något steg misslyckas
- Separera kritisk datalagring från sekundära operationer (PDF, e-post)

### 4. Bakgrundsjobb med Återförsökslogik

För att säkerställa att bakgrundsoperationer slutförs tillförlitligt:

- Implementera ett riktigt jobbkösystem
- Lägga till återförsöksmekanismer för misslyckade operationer
- Göra alla operationer idempotenta för att hantera dubblettanrop
- Stödja återupptagande av operationer efter serveromstarter

## Prioriterade Förbättringar för Stabila Flöden

### 1. Centraliserad Datavalidering

Bygg ett robust valideringssystem:

- Skapa scheman för alla datamodeller (PaymentRequest, ProductData, UserInfo)
- Implementera transformationsfunktioner för att normalisera inkonsekvent input
- Validera djupt nästlade strukturer fullständigt innan man fortsätter
- Tillhandahålla omfattande, detaljerade felmeddelanden

```typescript
// Exempel på centraliserad schema-validering
export const BasePaymentRequestSchema = z.object({
  paymentMethod: z.enum([PAYMENT_METHODS.SWISH, PAYMENT_METHODS.INVOICE]),
  productId: z.string().min(1, "Product ID is required"),
  productType: z.enum([PRODUCT_TYPES.COURSE, PRODUCT_TYPES.GIFT_CARD, PRODUCT_TYPES.ART_PRODUCT]),
  amount: z.number().min(1, "Amount must be greater than 0"),
  userInfo: UserInfoSchema
});

// Validering med normalisering
export function validatePaymentRequest(data: unknown): PaymentRequest {
  // Normalisera indata
  const normalizedData = normalizePaymentData(data);
  
  // Validera med rätt schema baserat på betalningsmetod
  if (normalizedData.paymentMethod === PAYMENT_METHODS.INVOICE) {
    return InvoicePaymentRequestSchema.parse(normalizedData);
  } else {
    return SwishPaymentRequestSchema.parse(normalizedData);
  }
}
```

### 2. Transaktionsbaserad Databas

Implementera korrekt transaktionshantering:

- Använd Supabase's transaktionsstöd för atomära operationer
- Identifiera kritiska vs. icke-kritiska databasoperationer
- Säkerställ att rollback sker korrekt vid fel
- Logga transaktionsdetaljer för granskningsändamål

```typescript
// Exempel på transaktionsbaserad databashantering
async function createPaymentTransaction(paymentData, productData) {
  // Starta transaktion
  const { data: transaction, error: transactionError } = await supabase.rpc(
    'create_payment_transaction',
    { 
      p_payment_data: paymentData,
      p_invoice_number: generateInvoiceNumber(),
      p_booking_reference: generateBookingReference(paymentData.productType)
    }
  );
  
  if (transactionError) {
    throw new Error(`Transaction failed: ${transactionError.message}`);
  }
  
  return transaction;
}
```

### 3. Oberoende Bakgrundsjobb

Skapa ett robust bakgrundsbearbetningssystem:

- Implementera en jobbkö som kvarstår bortom request-livscykeln
- Lägg till återförsöksmekanismer med exponentiell backoff
- Gör alla operationer idempotenta för att säkert hantera återförsök
- Fånga och logga alla fel för felsökning

```typescript
// Exempel på bakgrundsjobbhantering
async function queueBackgroundJob(jobType, jobData, options = {}) {
  const jobId = uuidv4();
  
  // Spara jobbet i databasen
  await supabase.from('background_jobs').insert({
    id: jobId,
    job_type: jobType,
    job_data: jobData,
    status: 'PENDING',
    retries: 0,
    max_retries: options.maxRetries || 3,
    created_at: new Date().toISOString()
  });
  
  // Starta bakgrundsprocessering om möjligt
  if (typeof process.env.VERCEL_REGION === 'undefined') {
    // Running in development or on dedicated server
    void processBackgroundJob(jobId);
  }
  
  return jobId;
}
```

## Implementationsplan

### Fas 1: Datamodellerning och Validering (Pågående)
- ✅ Definiera Zod-scheman för alla datamodeller
- ✅ Implementera normaliseringsfunktioner
- ✅ Centralisera valideringslogik
- 🔄 Integrera valideringslagret i alla API-endpoints

### Fas 2: Transaktionshantering (Nästa steg)
- 🔄 Skapa stored procedures för transaktionshantering
- 📅 Integrera transaktionslogik i API-endpoints
- 📅 Implementera fellhantering och rollback

### Fas 3: Bakgrundsjobb (Planerat)
- 📅 Bygga jobkösystem
- 📅 Implementera återförsökslogik
- 📅 Integrera PDF-generering och e-postutskick som bakgrundsjobb

### Fas 4: Testning och Stabilisering (Planerat)
- 📅 Omfattande enhetstester
- 📅 Integrationstester för hela flödet
- 📅 Lasttestning och felinjicering

## Förväntat Resultat

Den nya arkitekturen kommer att resultera i:

1. **Förutsägbar Datahantering**
   - Konsekvent validering över alla flöden
   - Tydliga felmeddelanden för klienten
   - Robust hantering av edge-cases

2. **Transaktionssäkerhet**
   - Allt-eller-inget-betalningar
   - Atomar databasuppdatering
   - Säker hantering av avbrott

3. **Tillförlitliga Bakgrundsprocesser**
   - E-postutskick som alltid lyckas (även efter omstart)
   - PDF-generering med återförsök
   - Spårbarhet för alla bakgrundsjobb

4. **Utbyggbarhet**
   - Enkel integration av nya betalningsmetoder
   - Stöd för nya produkttyper utan kodändringar
   - Tydlig separation av ansvarsområden

## Databasschema och Tabellstruktur

Den uppdaterade betalningsmodellen använder följande tabellstruktur:

1. `payments` - Centralt register över alla betalningar
2. `payment_methods` - Referenstabell för betalningsmetoder
3. `payment_statuses` - Referenstabell för betalningsstatus
4. `background_jobs` - Register för bakgrundsjobb
5. `product_specific_tables` - Tabeller för produktspecifik information

## API-struktur

API-strukturen kommer att följa RESTful principer med tydliga ansvarsområden:

```
/api/payments/
  ├── create/                     # Skapa betalning (gemensam endpoint)
  ├── status/:reference           # Hämta betalningsstatus
  │
  ├── swish/
  │   ├── callback                # Hantera Swish-callbacks
  │   └── cancel                  # Avbryt Swish-betalning
  │
  └── background/
      ├── process                 # Bearbeta bakgrundsjobb (intern)
      └── status/:jobId           # Kontrollera jobbstatus (intern)
```

## Slutsats

Den nya arkitekturen representerar ett betydande steg framåt i stabilitet, underhållbarhet och tillförlitlighet för betalningssystemet. Genom att fokusera på typsäkerhet, datakonsistens och robusta bakgrundsprocesser byggs en plattform som kan hantera alla edge-cases på ett tillförlitligt sätt, samtidigt som systemet blir lättare att underhålla och utöka i framtiden.

Denna refaktorisering är en långsiktig investering som kommer att eliminera återkommande problem och skapa en stabil grund för framtida utveckling. 
### 1. Swish Betalningsflöde

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Frontend    │      │ API Gateway │      │ SwishService│      │ Swish API   │
└─────┬───────┘      └─────┬───────┘      └─────┬───────┘      └─────┬───────┘
      │                    │                    │                    │
      │ createPayment      │                    │                    │
      │ (ProductData)      │                    │                    │
      ├───────────────────►│                    │                    │
      │                    │ normalizeData()    │                    │
      │                    ├───────────────────►│                    │
      │                    │                    │ createPayment()    │
      │                    │                    ├───────────────────►│
      │                    │                    │                    │
      │                    │                    │ callback           │
      │                    │                    │◄───────────────────┤
      │                    │                    │                    │
      │                    │                    │ process_callback() │
      │                    │                    ├────────┐           │
      │                    │                    │        │           │
      │                    │                    │◄───────┘           │
      │                    │                    │                    │
      │ pollStatus         │                    │                    │
      ├───────────────────►│                    │                    │
      │                    │ getStatus()        │                    │
      │                    ├───────────────────►│                    │
      │                    │                    │                    │
      │ response           │                    │                    │
      │◄───────────────────┤                    │                    │
      │                    │                    │                    │
```

### 2. Faktura Betalningsflöde

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Frontend    │      │ API Gateway │      │ InvoiceService│      │ Database    │
└─────┬───────┘      └─────┬───────┘      └──────┬────────┘      └─────┬───────┘
      │                    │                     │                     │
      │ createInvoice      │                     │                     │
      │ (ProductData)      │                     │                     │
      ├───────────────────►│                     │                     │
      │                    │ normalizeData()     │                     │
      │                    ├────────────────────►│                     │
      │                    │                     │ createRecord()      │
      │                    │                     ├────────────────────►│
      │                    │                     │                     │
      │                    │                     │ generatePDF()       │
      │                    │                     ├──────┐              │
      │                    │                     │      │              │
      │                    │                     │◄─────┘              │
      │                    │                     │                     │
      │                    │                     │ sendEmail()         │
      │                    │                     ├──────┐              │
      │                    │                     │      │              │
      │                    │                     │◄─────┘              │
      │                    │                     │                     │
      │ response           │                     │                     │
      │◄───────────────────┤                     │                     │
      │                    │                     │                     │
```

## Implementerade förbättringar

### 1. Datastruktur och Validering

- Infört tydlig definiering av produkttyper, betalningsmetoder och datastrukturer
- Implementerat hjälpfunktioner för att normalisera data från olika källor
- Automatisk datatypbestämning baserat på fältinnehåll

```typescript
// Hjälpfunktioner för att normalisera data
export function normalizeProductData(data: any): ProductData { ... }
export function normalizeUserData(data: any): UserData { ... }
export function createPaymentRequest(data: any): PaymentRequest { ... }
```

### 2. API-integration

- Uppdaterat `/api/payments/invoice/create` för att använda typade datastrukturer
- Förbättrad felhantering och validering
- Konsekvent databehandling över alla produkttyper

### 3. Frontend-integration

- Uppdaterat `PaymentSelection` för att använda standardiserade datastrukturer
- Förbättrat felmeddelanden och användarfeedback
- Konsekvent dataflöde från UI till backend

### 4. PDF-generering och slutföringslogik

- Implementerat centraliserad PDF-hantering genom `pdfGenerator.ts`
- Skapade enhetlig hantering för olika produkttypers PDF-generering och lagring
- Integrerad presentkorts-PDF-generering vid presentkortsköp via faktura
- Automatisk lagring av PDF-filer i Supabase Storage buckets
- Robust felhantering och loggning för hela PDF-genereringsprocessen

```typescript
// Exempel på den nya centraliserade PDF-genereringen
export async function generateAndStoreInvoicePdf(options: InvoicePdfOptions): Promise<PdfGenerationResult> {
  // Standardiserad hantering av faktura-PDF oavsett produkttyp
}

export async function generateAndStoreGiftCardPdf(options: GiftCardPdfOptions): Promise<PdfGenerationResult> {
  // Specifik hantering för presentkorts-PDF
}
```

### 5. E-posthantering och kommunikation

- Förbättrad e-postkommunikation via `serverEmail.ts`
- Enhetlig e-postformatering för alla produkttyper
- Möjlighet att inkludera både faktura och presentkorts-PDF i samma e-post
- Strukturerade e-postmallar med tydlig information till användaren

### 6. Användargränssnitt och feedback

- Implementerade visuell processfeedback under betalningsprocessen
- Steg-för-steg-uppdateringar som visar nuvarande status
- Tydliga statusmeddelanden under PDF-generering, e-postleverans och redirect
- Förbättrad felhantering med informativa felmeddelanden

### 7. Bekräftelsesidor och redirect-flöde

- Skapade en central betalningsbekräftelsesida (`/payment/confirmation/[reference]`)
- Produktspecifika bekräftelsesidor för presentkort, kurser och konstprodukter
- Enhetligt flöde för redirect till rätt bekräftelsesida baserat på produkttyp
- API-endpoint för att hämta betalningsdetaljer (`/api/payments/details/[reference]`)
- Omfattande bekräftelseinformation för alla produkttyper

### 8. Förbättrad Kodkvalitet och Arkitektur

- ✅ Borttagning av duplicerad PDF-genereringskod
- ✅ Centraliserad PDF-hantering via `pdfGenerator.ts`
- ✅ Robustare felhantering i bakgrundsjobb för PDF-generering
- ✅ Förbättrad kodsökning i bakgrundsjobb för att hitta rätt presentkort
- ✅ Möjlighet att både spara och skicka PDFer utan lagring vid behov

De här förbättringarna har minskat risken för fel genom att säkerställa att:
1. All PDF-generering går via ett standardiserat API i `pdfGenerator.ts`
2. Alla bakgrundsjobb hanterar och loggar fel på ett konsekvent sätt
3. Koden har bättre feltolerens genom att kunna generera PDFer utan lagring om bucket-lagring misslyckas
4. Presentkort kan hittas på flera olika sätt (via payment_reference, code eller invoice_number) för ökad robusthet

Denna refaktorisering stödjer också den långsiktiga planen för återförsöksmekanismer för bakgrundsjobb genom att förenkla arkitekturen och göra komponenterna mer idempotenta.

## Pågående och Framtida Arbete

### Implementerat
- ✅ Enhetlig datamodell för produkter och betalningar
- ✅ Förbättrad API-struktur
- ✅ Normalisering av användardata
- ✅ Typstandard och validering
- ✅ Utökad loggning för felsökning
- ✅ Centraliserad PDF-generering för alla produkttyper
- ✅ Integrerad presentkorts-PDF-generering med fakturabetalning
- ✅ Förbättrad användbarhet med visuell feedback
- ✅ Produktspecifika bekräftelsesidor
- ✅ Robust datahämtning för betalningsinformation

### Under arbete
- 🔄 Uppdatering av SwishService för att använda ny datamodell
- 🔄 Asynkrona jobb för tyngre operationer
- 🔄 Förbättrad callback-hantering
- 🔄 Omfattande testning av betalningsflödet från start till slut

### Planerat
- 📅 Async job-queue för bakgrundsuppgifter
- 📅 Förbättrad status-tracking
- 📅 Fullständiga testsviter
- 📅 Automatiserad återförsöksmekanism för PDF-generering och e-post
- 📅 Mer detaljerad processpårning och användningsstatistik

## VIKTIGT: API-vägar

API-vägarna för betalningssystemet måste användas exakt som angivna nedan:
- Swish-betalningar: `/api/payments/swish/create`
- Fakturabetalningar: `/api/payments/invoice/create`
- Betalningsinformation: `/api/payments/details/[reference]`

Dessa vägars struktur och namnkonventioner är specifikt utformade för att matcha backend-processerna. Ändra aldrig dessa vägar i frontend utan motsvarande ändringar i backend.

## Testning och Felsökning

### Testmiljö
- Installera Swish Handel Test-appen för mobilsimuleringar
- Använd Test BankID för testbetalningar
- Testnummer för Swish: 1231181189 och 4671234567

### Vanliga Fel och Lösningar
- "Invalid phone number": Säkerställ att telefonnummer är formaterat korrekt (börjar med 46 för Sverige)
- "Transaction not found": Kontrollera att rätt betalningsreferens används
- "Callback timeout": Kontrollera att callback-URL:en är korrekt konfigurerad
- "Invoice creation failed": Kontrollera användardata och beställningsdetaljer

## Definition of Done

1. **Tekniska Krav**
   - Full test coverage
   - Dokumenterad kod
   - Loggning implementerad
   - Felhantering testad

2. **Operationella Krav**
   - Monitoring på plats
   - Backup-procedurer dokumenterade
   - Support-rutiner etablerade

3. **Kvalitetskrav**
   - Prestanda verifierad
   - Säkerhet granskad
   - Code review genomförd 

## Loggningssystem och Testmiljöer

För att förbättra felsökning och observerbarhet har vi implementerat ett omfattande loggningssystem genom hela betalningsflödet. Detta hjälper utvecklingsteamet att:

1. **Identifiera fel snabbare**: Genom detaljerade loggar i varje steg av betalningsprocessen
2. **Förstå användarbeteende**: Se hur kunderna interagerar med betalningsflödet
3. **Diagnostisera problem i produktion**: Utan att behöva replikera felen lokalt
4. **Verifiera korrekt funktionalitet**: Särskilt i testmiljöer

### Loggade Events

Följande events loggas i systemet:

#### Swish-betalningar
- Betalningsinitalisering och parametrar
- Generering av idempotency-nycklar
- API-anrop till Swish
- Callback-mottagning och validering
- Statusuppdateringar och polling

#### Fakturabetalningar
- Initalisering av faktura
- Validering av användardata
- Skapande av fakturareferenser
- API-anrop och svarsdata
- Felhantering

### Testmiljö för Swish

För att kunna testa Swish-betalningar i utvecklingsmiljö krävs följande:

1. **Swish Handel Test App**: Tillgänglig på App Store och Google Play
2. **Test BankID**: Används för att autentisera i testmiljön
3. **Testmobiler**: Vi använder standardnummer 1231181189 eller 4671234567
4. **Test-certifikat**: Konfigurerade i miljövariabler för utvecklingsmiljön

För att aktivera testläget, sätt miljövariabeln:
```
NEXT_PUBLIC_SWISH_TEST_MODE=true
```

### Testscenarier

Vi har implementerat stöd för följande testscenarier:

1. **Lyckad betalning**: Komplett transaktionsflöde från start till slutförd betalning
2. **Avbruten betalning**: Användaren avbryter i Swish-appen
3. **Timeout av betalning**: Användaren svarar inte inom tidsgränsen
4. **Felaktig betalningsdata**: T.ex. ogiltigt telefonnummer
5. **Callback-hantering**: Inklusive duplicerade och sena callbacks

Varje scenario loggas detaljerat för analys och felsökning. 

## Presentkortsköp via Faktura - Fullständigt flöde

Ett av de mest komplexa flödena i betalningssystemet är hanteringen av presentkortsköp via faktura. Detta kräver särskild uppmärksamhet eftersom det innefattar flera unika steg:

1. Generering av presentkortskod
2. Skapande av både presentkorts-PDF och faktura-PDF
3. E-postleverans av båda dokumenten
4. Korrekt uppdatering av lagerstatus och spårning

### Dataflöde för presentkortsköp med faktura

```
┌────────────┐      ┌────────────┐      ┌────────────────┐      ┌──────────────┐
│ Frontend   │      │ API Gateway│      │ InvoiceService │      │ PDF Generator│
└─────┬──────┘      └─────┬──────┘      └───────┬────────┘      └──────┬───────┘
      │                   │                     │                       │
      │ purchaseGiftCard  │                     │                       │
      │ (amount, userData)│                     │                       │
      ├──────────────────►│                     │                       │
      │                   │                     │                       │
      │                   │ normalizeData()     │                       │
      │                   ├────────────────────►│                       │
      │                   │                     │ createGiftCard()      │
      │                   │                     ├─────────┐             │
      │                   │                     │         │             │
      │                   │                     │◄────────┘             │
      │                   │                     │                       │
      │                   │                     │ createInvoice()       │
      │                   │                     ├─────────┐             │
      │                   │                     │         │             │
      │                   │                     │◄────────┘             │
      │                   │                     │                       │
      │                   │                     │ generateInvoicePDF()  │
      │                   │                     ├──────────────────────►│
      │                   │                     │                       │
      │                   │                     │◄──────────────────────┤
      │                   │                     │                       │
      │                   │                     │ generateGiftCardPDF() │
      │                   │                     ├──────────────────────►│
      │                   │                     │                       │
      │                   │                     │◄──────────────────────┤
      │                   │                     │                       │
      │                   │                     │ sendEmail()           │
      │                   │                     ├─────────┐             │
      │                   │                     │         │             │
      │                   │                     │◄────────┘             │
      │                   │                     │                       │
┌─────┴──────┐      ┌─────┴──────┐      ┌───────┴────────┐      ┌──────┴───────┐
│ Frontend   │      │ API Gateway│      │ InvoiceService │      │ PDF Generator│
└────────────┘      └────────────┘      └────────────────┘      └──────────────┘
```

### Stegvis process

1. **Frontend-initiering**
   - Användaren fyller i presentkortsdata: belopp, mottagare, meddelande
   - Väljer faktura som betalningsmetod
   - Fyller i faktureringsuppgifter
   - Skickar beställningen

2. **Backend-bearbetning (API Gateway)**
   - Validerar och normaliserar data
   - Genererar unika referenser (fakturanummer, betalningsreferens)
   - Anropar InvoiceService

3. **InvoiceService (Presentkortshantering)**
   - Genererar unik presentkortskod i format `GC-XXXXXX-XXXX`
   - Skapar presentkortspost i databasen med status "pending"
   - Sparar alla presentkortsdata (mottagare, belopp, meddelande, osv.)
   - Genererar utgångsdatum (vanligtvis 1 år från köpdatum)

4. **InvoiceService (Fakturahantering)**
   - Skapar faktureringspost i databasen
   - Länkar fakturan till presentkortet via betalningsreferens
   - Anropar PDF-generatorn

5. **PDF-generering**
   - Genererar fakturaunderlag från databasen
   - Skapar PDF-dokument för fakturan
   - Genererar presentkorts-PDF med kod, belopp och meddelande
   - Lagrar båda PDF-filerna i Supabase Storage

6. **E-postkommunikation**
   - Skickar e-post till köparen med både faktura och presentkort
   - Inkluderar bekräftelse och instruktioner
   - Tillhandahåller länk till bekräftelsesidan

7. **Bekräftelsesida**
   - Användaren omdirigeras till presentkortsbekräftelsesidan
   - Visar detaljerad information om köpet
   - Möjliggör nedladdning av presentkorts-PDF

### Nyckelklasser och funktioner

```typescript
// Presentkortsdata-struktur
interface GiftCardData {
  code: string;                // Unik presentkortskod
  amount: number;              // Presentkortsbelopp
  recipientName: string;       // Mottagarens namn
  senderName: string;          // Avsändarens namn
  message?: string;            // Valfritt meddelande
  senderEmail?: string;        // Avsändarens e-post
  senderPhone?: string;        // Avsändarens telefonnummer
  recipientEmail?: string;     // Mottagarens e-post
  createdAt: string;           // Skapandedatum (ISO-format)
  expiresAt: string;           // Utgångsdatum (ISO-format)
}

// PDF-generering för presentkort
export async function generateAndStoreGiftCardPdf(options: GiftCardPdfOptions): Promise<PdfGenerationResult> {
  const { requestId, giftCardData, storeToBucket = true } = options;
  
  try {
    // 1. Generera PDF
    const pdfBlob = await generateGiftCardPDF(giftCardData);
    
    // 2. Lagra PDF om det begärs
    if (storeToBucket) {
      return await storePdfToBucket(
        pdfBlob, 
        'giftcards', 
        giftCardData.code.replace(/[^a-zA-Z0-9-]/g, '_'), 
        requestId
      );
    }
    
    // Returnera bara PDF-blob om lagring inte begärs
    return { success: true, pdfBlob };
  } catch (error) {
    // Felhantering och loggning
  }
}
```

### Aktiveringsprocess för presentkort

Eftersom presentkort köpta via faktura kräver betalningsbekräftelse, implementeras en tvåstegsaktiveringsprocess:

1. **Initial skapande (Status: pending)**
   - Presentkortet skapas när beställningen läggs
   - Status sätts till 'pending'
   - Koden genereras och PDF:en skapas
   - Användaren får presentkortet men informeras om att det aktiveras efter betalning

2. **Betalningsbekräftelse (Status: active)**
   - När fakturan markeras som betald
   - Presentkortsstatus uppdateras till 'active'
   - Presentkortet kan nu användas för köp

3. **Användning**
   - När presentkortet används, uppdateras dess saldo
   - Varje transaktion loggas för spårbarhet
   - När saldot når noll, markeras det som 'used'

### Hantering av edge-cases

För att säkerställa ett robust flöde hanterar systemet flera edge-cases:

1. **Fakturan betalas inte**
   - Presentkortet förblir i 'pending'-status
   - Efter 30 dagar, flaggas det för manuell hantering
   - Administratörer kan avbryta eller förlänga fakturan

2. **Användaren försöker använda oaktiverat presentkort**
   - Systemet kontrollerar alltid status innan användning
   - Tydligt felmeddelande visas för användaren
   - Administratörsverktyg finns för att manuellt överrida vid behov

3. **PDF-generering misslyckas**
   - Automatisk återförsökslogik för PDF-generering
   - Status och fel loggas för felsökning
   - E-post skickas fortfarande, med information om problemet
   - Administratörer kan manuellt regenerera PDF:er

4. **E-post levereras inte**
   - Återförsöksmekanism för e-postleverans
   - Manuell omgenerering och omsändning via admin-panelen

Denna förbättrade presentkortshantering garanterar ett sömlöst flöde från köp till användning, oavsett betalningsmetod, med noggrann hantering av alla steg i processen. 

## Uppdaterade Presentkortsprocessen och Betalningsflödet

Efter omfattande felsökning och förbättringar har vi implementerat flera viktiga ändringar i presentkortsprocessen och betalningsflödet. Dessa förändringar förbättrar robustheten, spårbarheten och användarupplevelsen för hela systemet.

### Nyckelförbättringar

1. **Enhetlig Identifieringsmetod**
   - Systemet stöder nu både presentkortskod (`code`) och betalningsreferens (`payment_reference`) som identifierare
   - PDF-generering kan använda båda typerna av identifierare, med `payment_reference` prioriterad
   - Bekräftelsesidan kan hämta presentkortsinformation med båda typerna av identifierare

2. **Robustare Databasinteraktioner**
   - Förbättrade frågor som undviker konflikter med flera poster med samma referens
   - Användning av `maybeSingle()` istället för `single()` för att hantera frånvarande data
   - Räkning och validering av poster innan hämtning för att förhindra databasfel

3. **Förbättrad Bakgrundsjobbshantering**
   - Omskriven `processInvoiceEmailJob`-funktion som genererar presentkorts-PDF vid fakturering
   - Stegvis uppdatering av presentkortsrekord med PDF-URL
   - Automatisk återhämtning från fel i bakgrundsprocessen

4. **PDF-generering och E-post**
   - Förbättrad presentkorts-PDF med professionell layout
   - Stöd för både kod och betalningsreferens i PDF-generering
   - Inkludering av båda PDF-filerna (faktura och presentkort) i e-postutskick

5. **Omfattande Loggning**
   - Detaljerad loggningsinformation om alla steg i processen
   - Tydliga felmeddelanden och statusuppdateringar
   - Call stack-information för enklare felsökning

### Detaljerad Komponentöversikt och Dataflöde

#### 1. Frontend till Backend-interaktion
```
Frontend (React/MUI) → API Gateway → Databashantering + Bakgrundsjobb
```

- **Frontend-komponenter**:
  - `GiftCardFlow`: Hanterar hela presentkortsköpflödet
  - `PaymentSelection`: Presenterar betalningsalternativ (Swish eller faktura)
  - `InvoicePaymentSection`: Hanterar fakturaspecifika data
  - `GiftCardConfirmationDetails`: Visar bekräftelse efter köp

- **Lokalt Lagringssystem**:
  ```typescript
  // I flowStorage.ts
  // Sparar presentkortsdetaljer temporärt under köpprocessen
  export function setGiftCardDetails(details) { ... }
  export function getGiftCardDetails() { ... }
  
  // Sparar betalningsinformation
  export function setPaymentInfo(info) { ... }
  export function getPaymentInfo() { ... }
  
  // I PaymentService.ts
  // Slutför betalning och uppdaterar lokalt status
  export function completePayment(paymentInfo) { ... }
  ```

#### 2. Identifierare i Systemet

Systemet använder två typer av identifierare för att spåra presentkort:

1. **Presentkortskod (`code`)**:
   - Format: `GC-YYYYMMDD-XXX` (t.ex. "GC-250419-553")
   - Används traditionellt för att identifiera presentkort
   - Genereras i `src/app/api/payments/invoice/create/route.ts`

2. **Betalningsreferens (`payment_reference`)**:
   - Format: `SC-YYYYMMDD-XXXXX` (t.ex. "SC-20250414-11192B")
   - Används för att länka presentkort till betalningar
   - Genereras i `generatePaymentReferences()`-funktionen

Båda identifierarna lagras i `gift_cards`-tabellen, och systemet kan nu använda vilken som helst för sökning/hämtning:

```typescript
// I gift_cards-tabellen
{
  id: 'uuid', // Databasens primärnyckel
  code: 'GC-250419-553', // Presentkortskod
  payment_reference: 'SC-20250414-11192B', // Betalningsreferens
  amount: 500,
  // övriga fält...
}
```

#### 3. Bakgrundsjobb för Presentkortshantering

Bakgrundsjobb skapas efter fakturabetalningar och hanteras av följande komponenter:

1. **Skapande av jobb**:
   ```typescript
   // I src/app/api/payments/invoice/create/route.ts
   const jobId = await createBackgroundJob(
     'invoice_email', 
     {
       paymentReference,
       invoiceNumber,
       productType,
       // övriga data...
     }
   );
   ```

2. **Jobbets exekvering**:
   ```typescript
   // I src/app/api/jobs/process/utils.ts
   async function processInvoiceEmailJob(jobData) {
     // 1. Hämta presentkortsdata baserat på payment_reference
     // 2. Generera presentkorts-PDF
     // 3. Uppdatera gift_cards med PDF-URL
     // 4. Skapa och skicka e-post med båda PDF:er
   }
   ```

3. **Aktivering av jobb**:
   - Via API-endpoint: `POST /api/jobs/process`
   - Automatiskt i utvecklingsmiljö genom direkt anrop

#### 4. PDF-generering för Presentkort

PDF-generering har förbättrats för att hantera båda typerna av identifierare:

```typescript
// I src/utils/giftCardPDF.ts
export async function generateGiftCardPDF(giftCardData: GiftCardData): Promise<Blob | null> {
  try {
    // Bestäm vilken referens som ska användas
    const referenceToUse = giftCardData.payment_reference || giftCardData.code;
    if (!referenceToUse) {
      logError(`No reference found for PDF`);
      return null;
    }

    // Skapa och formatera PDF med professionell layout
    // ...

    return pdfBlob;
  } catch (error) {
    logError(`Error generating PDF`, error);
    return null;
  }
}
```

#### 5. Bekräftelsesidans Dataflöde

Bekräftelsesidan hämtar data via två huvudvägar:

1. **Från lokalt lagring**:
   - Vid direkt redirect efter köp
   - Innehåller basdata som belopp, mottagare, etc.

2. **Från API genom `payment_reference`**:
   ```typescript
   // I GiftCardConfirmationDetails.tsx
   const fetchGiftCardByReference = async () => {
     if (!giftCardDetails?.code && giftCardDetails?.payment_reference) {
       const response = await fetch(`/api/gift-cards/by-reference?reference=${giftCardDetails.payment_reference}`);
       // Hantera svaret och uppdatera UI
     }
   };
   ```

### Integrering med Swish-Betalning (Planerad)

Baserat på de förbättringar som gjorts i fakturaflödet, kommer Swish-integrationen att följa liknande mönster:

1. **Frontend-hantering**:
   - Lik `InvoicePaymentSection` men med Swish-specifik UI
   - Hantering av telefonnummer och redirect till Swish-app

2. **Backend-hantering**:
   - Endpoint för att skapa Swish-betalning
   - Callback-endpoint för att hantera betalningssvar från Swish
   - Bakgrundsjobb för PDF-generering och e-postutskick

3. **Gemensam infrastruktur**:
   - Återanvändning av presentkortsgenerering
   - Samma PDF-genererings- och lagringsmekanismer
   - Liknande bekräftelseprocess och e-postutskick

### Förbättrade Processfeedback-Dialoger

För att förbättra användarupplevelsen under de längre bearbetningstiderna (30-45 sekunder) för betalningar, har vi implementerat förbättrade dialogrutor som ger användarna detaljerad feedback om vad som sker i bakgrunden:

#### SwishPaymentDialog

Vi har förbättrat SwishPaymentDialog med:

1. **Stegvis Statusuppdatering**:
   - Visar olika informativa meddelanden vid specifika tidpunkter i betalningsprocessen
   - 5-15 sek: "Betalning mottagen - Vi registrerar din betalning"
   - 15-25 sek: "Skapar bekräftelsedokument - Vi förbereder faktura/presentkort"
   - 25-40 sek: "Skickar bekräftelsemail - Med viktiga dokument"
   - >40 sek: "Nästan klart - Förbereder bekräftelsesidan"

2. **Visuell Progress-Indikator**:
   - En progress bar som visuellt visar hur långt i processen användaren kommit
   - Ger en känsla av framsteg under den längre väntetiden

3. **Förbättrad Läsbarhet**:
   - Färgkodade statusmeddelanden med tydliga rubriker
   - Responsiv design som fungerar väl på olika skärmstorlekar

#### InvoicePaymentDialog

Fakturadialogrutan har fått en ännu mer detaljerad processfeedback:

1. **Processlista med Tydliga Steg**:
   - Visar fyra tydliga steg i faktureringsprocessen:
     - Registrerar fakturainformation
     - Genererar fakturadokument
     - Förbereder och bearbetar orderinformation
     - Skickar bekräftelsemail

2. **Visuella Statusindikationer**:
   - Steg markeras med grön bock när de slutförts
   - Aktivt steg framhävs med bakgrundsfärg och fetstil
   - Spinner-animation för aktuellt processteg

3. **Tidvisning och Progress**:
   - Visar exakt processtid i minuter:sekunder
   - Linear progress bar för visuell indikering av total framgång

Dessa förbättringar ger användaren bättre insyn i vad som faktiskt sker under den relativt långa bearbetningstiden för betalningar, vilket minskar risken att användare avbryter processen av frustration eller osäkerhet.

### Rekommendationer för Framtida Förbättringar

1. **Databasstruktur**:
   - Överväg en relation mellan `payments` och `gift_cards` via främmande nycklar
   - Implementera databaskonstrainter för att säkerställa unika betalningsreferenser

2. **Jobbhantering**:
   - Implementera en planerad återförsökslogik för misslyckade jobb
   - Skapa en admin-panel för att granska och omköra misslyckade jobb

3. **UI-förbättringar**:
   - ✅ Implementera tydligare laddningsindikatorer under PDF-generering (Klart!)
   - ✅ Förbättra processfeedback för både Swish och fakturering (Klart!)
   - Implementera automatisk uppdatering av bekräftelsesidan när PDF:er blir tillgängliga
   - Överväg ytterligare optimeringspunkter för bakgrundsprocesser

4. **Loggning och Övervakning**:
   - Centralisera loggningen för bättre spårbarhet
   - Implementera alarmering för kritiska fel i betalningsprocessen

5. **PDF-funktionalitet**:
   - Fixa nedladdning av presentkorts-PDF på bekräftelsesidan 
   - Säkerställa konsekvent namngivning av PDF-filer (payment_reference.pdf)
   - Förbättra felhanteringen när presentkorts-PDF inte kan hittas

Denna uppdaterade dokumentation reflekterar de senaste ändringarna i systemet och ger en solid grund för fortsatt utveckling av betalningsfunktionerna, särskilt för den kommande Swish-integrationen. 

## Produktions- och Felsökningsverktyg

För att underlätta felsökning och diagnostik i olika miljöer har vi implementerat en uppsättning testendpoints som kan användas för att verifiera systemets komponenter. Dessa endpoints är särskilt användbara i produktionsmiljön för att identifiera och lösa problem relaterade till betalningsflödet.

### Testendpoints för Felsökning

Följande endpoints kan anropas för att testa och diagnostisera olika delar av systemet:

#### Generella Systemkontroller

| Endpoint | Beskrivning | Användning |
|----------|-------------|------------|
| `/api/test-env` | Visar alla miljövariabler (säkra versioner) | `curl https://studioclay.se/api/test-env` |
| `/api/test-supabase` | Testar Supabase-anslutning | `curl https://studioclay.se/api/test-supabase` |

#### Storage och Buckets

| Endpoint | Beskrivning | Användning |
|----------|-------------|------------|
| `/api/test/check-bucket-policies` | Testar rättigheter och policys för storage buckets | `curl https://studioclay.se/api/test/check-bucket-policies` |
| `/api/test/setup-storage` | Verifierar och skapar storage buckets vid behov | `curl https://studioclay.se/api/test/setup-storage` |
| `/api/test/check-storage` | Kontrollerar status för alla storage buckets | `curl https://studioclay.se/api/test/check-storage` |

#### Email-konfiguration

| Endpoint | Beskrivning | Användning |
|----------|-------------|------------|
| `/api/test-email-config` | Testar e-postkonfiguration och SMTP-anslutning | `curl https://studioclay.se/api/test-email-config` |

#### Bakgrundsjobb

| Endpoint | Beskrivning | Användning |
|----------|-------------|------------|
| `/api/test/test-job-processor` | Testar jobbprocessorn direkt och visar resultat | `curl https://studioclay.se/api/test/test-job-processor` |
| `/api/test/process-jobs` | Manuellt processar nästa väntande jobb i kön | `curl https://studioclay.se/api/test/process-jobs` |
| `/api/test/job-stats` | Visar statistik över bakgrundsjobb | `curl https://studioclay.se/api/test/job-stats` |
| `/api/test/job-status` | Kontrollerar status för specifika jobb | `curl https://studioclay.se/api/test/job-status?id=JOB_ID` |

#### Swish-integration

| Endpoint | Beskrivning | Användning |
|----------|-------------|------------|
| `/api/payments/swish/quicktest` | Testar Swish-konfiguration och certifikat | `curl https://studioclay.se/api/payments/swish/quicktest` |
| `/api/payments/swish/testflow` | Simulerar ett Swish-betalningsflöde | `curl https://studioclay.se/api/payments/swish/testflow` |

#### PDF-generering

| Endpoint | Beskrivning | Användning |
|----------|-------------|------------|
| `/api/test/generate-invoice` | Testar faktura-PDF-generering | `curl https://studioclay.se/api/test/generate-invoice` |

### Felsökningsstrategi i Produktion

När problem uppstår i produktionsmiljön, följ denna systematiska metod för felsökning:

1. **Verifiera miljövariabler**
   ```bash
   curl https://studioclay.se/api/test-env
   ```
   
   Kontrollera att alla nödvändiga miljövariabler finns och har korrekta värden, särskilt:
   - `NEXT_PUBLIC_BASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Email-konfiguration (`EMAIL_SMTP_HOST`, `EMAIL_USER`, etc.)

2. **Kontrollera Supabase-anslutning och lagringsbuckets**
   ```bash
   curl https://studioclay.se/api/test-supabase
   curl https://studioclay.se/api/test/check-bucket-policies
   ```
   
   Verifierar att applikationen kan ansluta till Supabase och har korrekta rättigheter för bucket-åtkomst.

3. **Testa e-postkonfiguration**
   ```bash
   curl https://studioclay.se/api/test-email-config
   ```
   
   Kontrollerar att SMTP-anslutning fungerar och att e-post kan skickas.

4. **Inspektera bakgrundsjobbkön**
   ```bash
   curl https://studioclay.se/api/test/job-stats
   curl https://studioclay.se/api/test/test-job-processor
   ```
   
   Visar status för bakgrundsjobb och testar jobbprocessorn för att säkerställa att jobb bearbetas korrekt.

5. **Manuellt processa jobb vid behov**
   ```bash
   curl https://studioclay.se/api/test/process-jobs
   ```
   
   Tvingar fram bearbetning av nästa väntande jobb i kön. Användbart för att manuellt processa jobb.

4. **Åtgärda identifierade problem**
   - Justera miljövariabler om nödvändigt
   - Se till att alla buckets existerar och har rätt behörigheter
   - Kontrollera att bakgrundsjobb processas korrekt

Genom att använda dessa verktyg systematiskt kan de flesta produktionsproblem diagnostiseras och åtgärdas utan behov av kodändringar eller omdeployering. 

### Förslag på Flöde för Produktionsfelsökning

1. **Identifiera problemområde**
   - Fakturering → Kontrollera PDF-generering och e-post
   - Swish → Kontrollera Swish-konfiguration och certifikat
   - Bakgrundsjobb → Kontrollera jobbkön och processorn

2. **Kontrollera grundläggande infrastruktur**
   - Miljövariabler
   - Databas och Storage-anslutning
   - E-postkonfiguration

3. **Testa specifika komponenter**
   - Använd relevanta testendpoints för att isolera problemet
   - Granska loggar i Vercel-dashboard för detaljerad felsökningsinformation

4. **Åtgärda identifierade problem**
   - Justera miljövariabler om nödvändigt
   - Se till att alla buckets existerar och har rätt behörigheter
   - Kontrollera att bakgrundsjobb processas korrekt

Genom att använda dessa verktyg systematiskt kan de flesta produktionsproblem diagnostiseras och åtgärdas utan behov av kodändringar eller omdeployering. 

## Jobbhantering

### Ny Arkitektur (Direkt Bearbetning)

I den nya arkitekturen bearbetas jobb direkt när de skapas, oavsett miljö (utveckling eller produktion). Detta ger flera fördelar:

1. **Konsekvent beteende** - Samma beteende i alla miljöer
2. **Transaktionell process** - Om ett steg misslyckas, markeras hela jobbet som misslyckat
3. **Omedelbar feedback** - Problem upptäcks direkt istället för att vänta på asynkron bearbetning
4. **Inga beroenden** - Ingen behov av cron-jobb eller externa tjänster

### Jobbtyper

Systemet hanterar följande typer av jobb:

1. **invoice_email** - Skickar faktura via e-post
2. **order_confirmation** - Skickar orderbekräftelse
3. **gift_card_delivery** - Skickar presentkort

### Jobbflöde

1. Jobb skapas med `createBackgroundJob()`
2. Jobbet bearbetas omedelbart
3. Resultatet loggas och jobbet markeras som slutfört eller misslyckat

### Felsökning

Om ett jobb misslyckas:

1. Kontrollera jobbets status i Supabase-tabellen `background_jobs`
2. Använd testendpointen `/api/jobs/status` för att se jobbstatistik
3. Använd `/api/jobs/process` för att manuellt bearbeta jobb

## Databas och Tabellarkitektur

Betalningssystemet använder flera nyckelkomponenter i databasen, där olika produkttyper interagerar med specifika tabeller. Nedan är en detaljerad beskrivning av tabellerna och hur de används.

### Nyckelkomponenter i tabellstrukturen

1. **payments** - Central tabell för alla betalningar
   - Innehåller grundläggande betalningsinformation: belopp, status, metod, etc.
   - Länkas till produktspecifika tabeller via `payment_reference` och `product_id`

2. **bookings** - För kursbokning
   - Innehåller kursbokningsinformation
   - Länkas till `payments` via `payment_reference` 
   - Länkas till `course_instances` via `course_id`

3. **course_instances** - Kursinformation
   - Innehåller kursdetaljer, inklusive `current_participants` som uppdateras vid bokningar
   - Hanterar tillgängliga platser och bokningsstatus

4. **gift_cards** - Presentkortsinformation
   - Innehåller presentkortsdetaljer som kod, belopp, mottagare, etc.
   - Länkas till `payments` via `payment_reference`

5. **art_orders** - För konstprodukter
   - Innehåller orderinformation för konstprodukter
   - Länkas till `payments` via `payment_reference`

6. **background_jobs** - För bakgrundsbearbetning
   - Hanterar asynkrona processer som PDF-generering och e-postutskick
   - Innehåller jobbstatus, typ och resultat

### Nyligen åtgärdade problem: Kursbokningar med faktura

Ett problem identifierades i kursbokningsflödet för fakturabetalningar. Systemet kunde inte skapa bokningsposter korrekt på grund av en databaskonflikt. Specifikt var problemet:

1. I `src/app/api/payments/invoice/create/route.ts` försökte koden skapa en bokning i `bookings`-tabellen med ett fält kallat `payment_reference`.
2. Detta fält fanns inte i `bookings`-tabellen, vilket orsakade ett databasfel.
3. På grund av detta fel uppdaterades inte `current_participants` i `course_instances`, vilket gjorde att kursen inte registrerade bokningar korrekt.

**Lösningen:**
1. Lägga till `payment_reference`-kolumnen i `bookings`-tabellen i Supabase.
2. Bekräfta att korrekt kod för att uppdatera `current_participants` i `course_instances` redan fanns implementerad.
3. Verifiera att hela flödet fungerar korrekt genom testning.

Den befintliga koden i `src/app/api/payments/invoice/create/route.ts` hanterar nu korrekt:
1. Skapande av bokningspost med `payment_reference`
2. Uppdatering av kursens `current_participants`-antal
3. Koppling av betalningen till bokningen

### Produktflöden i detalj

#### 1. Kursbokningsflöde med fakturabetalning

**Processflöde:**
1. Användaren väljer en kurs och faktura som betalningsmetod
2. Ett betalningsreferensnummer (`payment_reference`) genereras, t.ex. `SC-20250425-9EA699`
3. Ett fakturabokningsmummer (`invoice_number`) genereras, t.ex. `INV-2504-8F73`
4. En `payments`-post skapas med status "CREATED"
5. Ett bokningsrefernsnummer (`booking_reference`) genereras, t.ex. `BC-250425-279`
6. En `bookings`-post skapas med kursdetaljer, användarinfo och betalningsreferenser
7. `course_instances`-tabellens `current_participants` uppdateras med antalet nya deltagare
8. Betalningsposten länkas till bokningen genom att uppdatera `booking_id` i `payments`
9. Ett bakgrundsjobb skapas för att generera faktura-PDF och skicka e-post
10. Bekräftelsesidan visar bokningsinformation

**Databasinteraktioner:**
```
payments
├── id: UUID
├── payment_reference: "SC-20250425-9EA699"
├── invoice_number: "INV-2504-8F73"
├── product_type: "course"
├── product_id: "92325c7f-fcf6-4838-abb6-a231442aa05b"
├── status: "CREATED"
├── payment_method: "invoice"
├── amount: 3300
├── booking_id: [bokningens ID] (uppdateras efter bokningsskapande)
└── customer_info: { kunddata som JSON }

bookings
├── id: UUID
├── course_id: "92325c7f-fcf6-4838-abb6-a231442aa05b"
├── booking_reference: "BC-250425-279"
├── payment_reference: "SC-20250425-9EA699"
├── invoice_number: "INV-2504-8F73"
├── payment_status: "CREATED"
├── customer_name: "Jens Sahlström"
├── number_of_participants: 1
└── [övriga bokningsdetaljer]

course_instances
├── id: "92325c7f-fcf6-4838-abb6-a231442aa05b"
├── title: "Dag kurs"
├── max_participants: 10
├── current_participants: [ökas med antal nya deltagare]
└── [övriga kursdetaljer]

background_jobs
├── id: UUID
├── job_type: "invoice_email"
├── job_data: { paymentReference, invoiceNumber, productType, etc. }
├── status: "completed"
└── created_at: timestamp
```

#### 2. Presentkortsköp med fakturabetalning

**Processflöde:**
1. Användaren väljer presentkort och faktura som betalningsmetod
2. Ett betalningsreferensnummer (`payment_reference`) genereras
3. En presentkortskod (`code`) genereras, t.ex. `GC-250425-A31B`
4. En `payments`-post skapas med status "CREATED"
5. En `gift_cards`-post skapas med betalningsreferens, kod, belopp, etc.
6. Ett bakgrundsjobb skapas för att:
   - Generera faktura-PDF
   - Generera presentkorts-PDF
   - Skicka e-post med båda dokumenten
7. Bekräftelsesidan visar presentkortsinformation

**Databasinteraktioner:**
```
payments
├── id: UUID
├── payment_reference: "SC-20250423-F59A31"
├── invoice_number: "INV-2304-5F81"
├── product_type: "gift_card"
├── product_id: [presentkortets ID]
├── status: "CREATED"
├── payment_method: "invoice"
├── amount: 500
└── customer_info: { kunddata som JSON }

gift_cards
├── id: UUID
├── code: "GC-250423-A31B"
├── payment_reference: "SC-20250423-F59A31"
├── amount: 500
├── recipient_name: "Eva Svensson"
├── recipient_email: null (valfritt fält)
├── sender_name: "Jens Sahlström"
├── message: "Grattis på födelsedagen!"
├── status: "active"
├── pdf_url: "https://storage.url/giftcards/GC-250423-A31B.pdf"
└── created_at: timestamp

background_jobs
├── id: UUID
├── job_type: "invoice_email"
├── job_data: { paymentReference, invoiceNumber, productType, etc. }
├── status: "completed"
└── created_at: timestamp
```

#### 3. Konstproduktköp med fakturabetalning

**Processflöde:**
1. Användaren väljer en konstprodukt och faktura som betalningsmetod
2. Ett betalningsreferensnummer (`payment_reference`) genereras
3. Ett orderreferensnummer (`order_reference`) genereras, t.ex. `ORD-20250425-A15A7F`
4. En `payments`-post skapas med status "CREATED"
5. En `art_orders`-post skapas med produktdetaljer, leveransinformation, etc.
6. Lagret för produkten uppdateras (minskar tillgängligt antal)
7. Ett bakgrundsjobb skapas för att generera faktura-PDF och skicka e-post
8. Bekräftelsesidan visar orderinformation

**Databasinteraktioner:**
```
payments
├── id: UUID
├── payment_reference: "SC-20250425-D315F1"
├── invoice_number: "INV-2504-9A32"
├── product_type: "art_product"
├── product_id: [konstproduktens ID]
├── status: "CREATED"
├── payment_method: "invoice"
├── amount: 1200
├── order_id: [orderns ID] (uppdateras efter orderskapande)
└── customer_info: { kunddata som JSON }

art_orders
├── id: UUID
├── order_reference: "ORD-20250425-A15A7F"
├── payment_reference: "SC-20250425-D315F1"
├── product_id: [konstproduktens ID]
├── quantity: 1
├── status: "created"
├── shipping_address: { leveransinformation som JSON }
└── created_at: timestamp

art_products
├── id: [konstproduktens ID]
├── title: "Keramikvas"
├── price: 1200
├── stock: [minskas med köpt antal]
└── [övriga produktdetaljer]

background_jobs
├── id: UUID
├── job_type: "invoice_email"
├── job_data: { paymentReference, invoiceNumber, productType, etc. }
├── status: "completed"
└── created_at: timestamp
```

### Schema-relationer och dataflöde

Följande diagram illustrerar relationerna mellan huvudtabellerna i betalningssystemet:

```
                           ┌─────────────────┐
                           │                 │
                           │    payments     │
                           │                 │
                           └────────┬────────┘
                                    │
                payment_reference   │
                                    │
           ┌──────────────┬─────────┴─────────┬──────────────┐
           │              │                   │              │
┌──────────▼────────┐ ┌───▼───────────┐ ┌─────▼──────────┐  │
│                   │ │               │ │                │  │
│    bookings       │ │   gift_cards  │ │   art_orders  │  │
│                   │ │               │ │                │  │
└──────────┬────────┘ └───────────────┘ └────────────────┘  │
           │                                                 │
     course_id                                               │
           │                                                 │
┌──────────▼────────┐                                       │
│                   │◄──────────────────────────────────────┘
│  course_instances │    product_id (för kursbokning)
│                   │
└───────────────────┘
```

### Viktiga tekniska detaljer

1. **Säkerställa databasintegritet**
   - IMPORTANT: Alla nya tabeller måste skapas genom officiella migrationer
   - Alla nödvändiga kolumner måste definieras med rätt typer
   - Foreign key-relationer bör övervägas för att förbättra dataintegritet

2. **Hantering av references**
   - `payment_reference` ska användas konsekvent i alla produktspecifika tabeller
   - Detta är nyckeln till att spåra en betalning genom hela systemet

3. **current_participants i course_instances**
   - För kursbokningar är det kritiskt att uppdatera `current_participants`
   - Detta fält används för att beräkna tillgängliga platser och förhindra överbokningar
   - Kod för att uppdatera detta finns i `/src/app/api/payments/invoice/create/route.ts` runt rad 1125-1130

4. **Background Jobs**
   - `background_jobs` är en kritisk komponent för att hantera asynkrona processer
   - Alla operationer som genererar PDF:er eller skickar e-post bör använda bakgrundsjobb
   - Jobbtypen `invoice_email` hanterar genereringen av faktura-PDF:er för alla produkttyper

### Best Practices och riktlinjer

1. **Ändra aldrig genererade referenser**
   - När en `payment_reference` har genererats, ska den aldrig ändras
   - Referensen ska följa betalningen genom hela systemet

2. **Implementera genomgående felhantering**
   - Kritiska fel som förhindrar databasens integritet bör avbryta processen
   - Mindre kritiska fel (t.ex. PDF-generering) bör loggas och fortsätta

3. **Undvik duplicerade betalningsreferenser**
   - Steg för att förhindra detta:
     1. Använd `generatePaymentReference()` endast i betalningsskapandet
     2. Skicka alltid vidare original-referensen till bakgrundsjobb
     3. Använd aldrig funktioner för att skapa nya referenser i bakgrundsjobb

4. **Betrakta betalningsreferensen som en "source of truth"**
   - Säkerställ att `payment_reference` propageras korrekt genom hela systemet
   - Använd referensen för att spåra betalningen i alla relaterade tabeller

Genom att följa denna arkitektur och dessa riktlinjer kan betalningssystemet hantera olika produkttyper konsekvent och pålitligt, samtidigt som det förblir flexibelt för framtida utökningar.
