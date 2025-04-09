# Betalningsintegration Refaktoriseringsprojekt

## Bakgrund och Syfte

Nuvarande betalningsintegration har visat sig vara instabil och svår att underhålla av flera anledningar:

1. **Inkonsekvent Hantering**: Olika produkttyper (kurser, presentkort, konstprodukter) hanteras på olika sätt utan tydlig struktur
2. **Osäker Callback-hantering**: Callbacks från Swish hanteras utan proper idempotency och felhantering
3. **Bristfällig Separation of Concerns**: Betalningslogik är tätt kopplad till produktspecifik logik
4. **Otillförlitlig Asynkron Hantering**: PDF-generering och e-postutskick förlitar sig på osäkra "fire-and-forget" metoder
5. **Inkonsekventa API-strukturer**: Olika API-flöden för olika produkttyper och betalningsmetoder

Syftet med denna refaktorisering är att skapa en robust, underhållbar och pålitlig betalningsintegration som:
- Hanterar alla edge-cases korrekt
- Är lätt att felsöka
- Har tydlig separation mellan olika ansvarsområden
- Använder konsekvent datastruktur över alla produkttyper
- Är väl testad och dokumenterad

## Arkitekturprinciper

1. **Separation of Concerns**
   - Betalningsspecifik logik ska vara isolerad från produktlogik
   - Callback-hantering ska vara separat från affärslogik
   - Asynkrona operationer ska hanteras via en dedikerad jobbkö

2. **Typbaserad Datamodell**
   - Alla datastrukturer ska vara tydligt definierade med TypeScript
   - Unifierad datamodell för alla produkter (kurser, presentkort, konstprodukter)
   - Automatisk datavalidering och konvertering

3. **Idempotency**
   - Alla operationer ska vara idempotenta
   - Dubbla callbacks ska hanteras korrekt
   - Transaktioner ska användas för att säkerställa datakonsistens

4. **Observability**
   - Varje steg i processen ska loggas med unika request-ID
   - Alla fel ska loggas med full kontext
   - Statusändringar ska vara spårbara

5. **Testbarhet**
   - Separata miljöer för test och produktion
   - Möjlighet att simulera betalningsflöden
   - Enkel setup för lokal utveckling

## Uppdaterade Komponenter

### 1. Typbaserad Datamodell

Vi har introducerat en enhetlig datamodell i `src/types/productData.ts` som definierar:

```typescript
// Produkttyper som stöds i systemet
export enum ProductType {
  COURSE = 'course',
  GIFT_CARD = 'gift_card',
  ART_PRODUCT = 'art_product'
}

// Betalningsmetoder som stöds
export enum PaymentMethod {
  SWISH = 'swish',
  INVOICE = 'invoice'
}

// Basproduktedata - gemensamma fält för alla produkttyper
export interface BaseProductData {
  id: string;
  type: ProductType;
  title: string;
  price: number;
  currency?: string;
}

// Produktspecifika gränssnitt
export interface CourseProductData extends BaseProductData {...}
export interface GiftCardProductData extends BaseProductData {...}
export interface ArtProductData extends BaseProductData {...}

// Användardata och betalningsförfrågningar
export interface UserData {...}
export interface InvoiceData {...}
export type PaymentRequest = SwishPaymentRequest | InvoicePaymentRequest;
```

Denna struktur ger följande fördelar:
- Typsäker kod med kompilatorstöd
- Automatisk validering av datavärden 
- Konsekvent hantering av alla produkttyper
- Enklare integrationer till nya produkttyper i framtiden

### 2. Core Betalningsservices

#### SwishService
```typescript
export class SwishService {
  createPayment(data: CreateSwishPaymentDTO): Promise<SwishTransaction>;
  handleCallback(data: SwishCallbackData): Promise<void>;
  getStatus(swishPaymentId: string): Promise<SwishStatus>;
  cancelPayment(swishPaymentId: string): Promise<void>;
}
```

#### InvoiceService
```typescript
export class InvoiceService {
  createInvoice(data: CreateInvoiceDTO): Promise<InvoiceTransaction>;
  getStatus(invoiceId: string): Promise<InvoiceStatus>;
  markAsPaid(invoiceId: string): Promise<void>;
}
```

### 3. UI-Komponenter

Vi har refaktorerat UI-komponenterna för att använda den nya datamodellen:

#### PaymentSelection
```typescript
// Centraliserad komponent som styr val av betalningsmetod
const PaymentSelection: React.FC<PaymentSelectionProps> = (props) => {
  // Hantera olika produkttyper via enhetligt gränssnitt
  // Skicka standardiserade betalningsförfrågningar
}
```

#### SwishPaymentSection & InvoicePaymentSection
```typescript
// Specialiserade komponenter för varje betalningsmetod
// Arbetar med standardiserade data
```

### 4. API-Struktur

Vi har standardiserat API-strukturen:

```
/api/payments/
  ├── swish/
  │   ├── create/        # Skapa Swish-betalning
  │   ├── callback/      # Hantera callbacks från Swish
  │   ├── status/        # Kontrollera betalningsstatus
  │   └── cancel/        # Avbryt betalning
  │
  └── invoice/
      ├── create/        # Skapa fakturabetalning
      └── status/        # Kontrollera fakturastatus
```

**VIKTIGT:** Dessa API-vägar är fasta och måste användas exakt som angivna. Ändring av vägarna kommer att bryta betalningsflödet.

## Dataflöden

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

## Pågående och Framtida Arbete

### Implementerat
- ✅ Enhetlig datamodell för produkter och betalningar
- ✅ Förbättrad API-struktur
- ✅ Normalisering av användardata
- ✅ Typstandard och validering
- ✅ Utökad loggning för felsökning

### Under arbete
- 🔄 Uppdatering av SwishService för att använda ny datamodell
- 🔄 Asynkrona jobb för tyngre operationer
- 🔄 Förbättrad callback-hantering

### Planerat
- 📅 Async job-queue för bakgrundsuppgifter
- 📅 Förbättrad status-tracking
- 📅 Fullständiga testsviter

## VIKTIGT: API-vägar

API-vägarna för betalningssystemet måste användas exakt som angivna nedan:
- Swish-betalningar: `/api/payments/swish/create`
- Fakturabetalningar: `/api/payments/invoice/create`

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