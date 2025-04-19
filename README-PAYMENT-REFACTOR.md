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

### Rekommendationer för Framtida Förbättringar

1. **Databasstruktur**:
   - Överväg en relation mellan `payments` och `gift_cards` via främmande nycklar
   - Implementera databaskonstrainter för att säkerställa unika betalningsreferenser

2. **Jobbhantering**:
   - Implementera en planerad återförsökslogik för misslyckade jobb
   - Skapa en admin-panel för att granska och omköra misslyckade jobb

3. **UI-förbättringar**:
   - Visa tydligare laddningsindikatorer under PDF-generering
   - Implementera automatisk uppdatering av bekräftelsesidan när PDF:er blir tillgängliga

4. **Loggning och Övervakning**:
   - Centralisera loggningen för bättre spårbarhet
   - Implementera alarmering för kritiska fel i betalningsprocessen

Denna uppdaterade dokumentation reflekterar de senaste ändringarna i systemet och ger en solid grund för fortsatt utveckling av betalningsfunktionerna, särskilt för den kommande Swish-integrationen. 