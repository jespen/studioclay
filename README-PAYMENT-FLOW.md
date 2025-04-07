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
│   ├── invoicePDF.ts                   # Genererar faktura-PDF
│   ├── giftCardPDF.ts                  # Genererar presentkorts-PDF
│   ├── serverEmail.ts                  # Hanterar e-postutskick från servern
│   └── flowNavigation.ts               # Navigation mellan steg i bokningsflödet
│
└── types/
    └── payment.ts                      # Delade betalningstyper
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

## Faktureringsflöde i detalj (uppdaterat)

### För konstprodukter (art_product):

1. **Kritiska databassoperationer först**
   - Skapa order-record i art_orders-tabellen
   - Uppdatera stock_quantity i products-tabellen
   - Returnera snabbt svar till klienten

2. **Bakgrundsprocesser**
   - Generera faktura-PDF baserat på produktdata och kundinformation
   - Spara PDF i 'invoices'-bucket med invoiceNumber som filnamn
   - Skicka e-post med bifogad faktura-PDF och orderbekräftelse

### För presentkort (gift_card):

1. **Kritiska databassoperationer först**
   - Skapa post i gift_cards-tabellen med all relevant information
   - Generera unik presentkortskod (GC-YYYYMMDD-XXXX)
   - Returnera svar till klienten med giftCardId och giftCardCode

2. **Bakgrundsprocesser**
   - Generera presentkorts-PDF med mottagarinfo, belopp och personligt meddelande
   - Spara presentkorts-PDF i 'giftcards'-bucket med filnamnet `gift-card-KODEN.pdf`
   - Generera faktura-PDF för presentkortsköpet
   - Spara faktura-PDF i 'invoices'-bucket med invoiceNumber som filnamn
   - Skicka e-post med båda PDF-dokumenten bifogade

### För kursbokningar (course):

1. **Kritiska databassoperationer först**
   - Skapa bokningspost i bookings-tabellen med alla nödvändiga kundinformationer
   - Uppdatera current_participants i course_instances-tabellen
   - Om det finns flera deltagare, skapa poster i booking_participants-tabellen
   - Returnera snabbt svar till klienten

2. **Bakgrundsprocesser**
   - Generera faktura-PDF baserat på kursdata och kundinformation
   - Spara PDF i 'invoices'-bucket med invoiceNumber som filnamn
   - Skicka e-post med bifogad faktura-PDF och bokningsbekräftelse

## E-postbilagor
- **Art Products**: Faktura-PDF
- **Gift Cards**: Både presentkorts-PDF och faktura-PDF i samma e-post
- **Course Bookings**: Faktura-PDF

## Dataflöden (uppdaterade)

### Frontend till Backend
1. **PaymentSelection.tsx**
   - Koordinerar valet av betalningsmetod
   - Anropar rätt betalningssektion (Swish/Invoice)

2. **InvoicePaymentSection.tsx**
   - Validerar faktureringsinformation
   - För presentkort: Hämtar presentkortsinformation från flowStorage
   - Säkerställer att korrekt belopp används för presentkort
   - Skickar komplett data till API

3. **API (/api/invoice/create)**
   - Tar emot betalningsdata
   - Baserat på product_type utför rätt flöde
   - Returnerar tidigt svar efter kritiska databassoperationer
   - Fortsätter bearbetning i bakgrunden

### Backend till Frontend
1. **Snabb respons**
   - Returnerar success: true
   - Inkluderar relevant ID, referens och presentkortskod (om tillämpligt)

2. **Bekräftelsesidan**
   - Hämtar all sparad data från localStorage via flowStorage
   - Visar bekräftelse till användaren baserat på produkt och betalningsstatus

## Viktiga Edge Cases och hantering

### Presentkortsbelopp
- **Problem**: Presentkortsbeloppet överfördes inte korrekt från frontend till backend
- **Lösning**: Explicit extrahering av belopp från itemDetails i InvoicePaymentSection och konsekvent användning av detta belopp i backend

### Timeout-hantering
- **Problem**: Serverless-funktioner har tidsbegränsning (vanligtvis 10-30 sekunder)
- **Lösning**: Asynkron bearbetning och "fire and forget"-mönster för tyngre operationer

### PDF-generering
- **Problem**: PDF-generering kan misslyckas av olika anledningar
- **Lösning**: Robust felhantering med fortsatt process även om ett steg misslyckas

## TO DO: Framtida förbättringar för faktureringsflödet

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
  - Stöd för företagskunder med organisationsnummer och momsregler
  - Anpassade betalningsvillkor för olika kundtyper
  - Förbättrad professionalitet mot företagssegmentet

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

```sql
CREATE TABLE "public"."payments" (
  "id" UUID PRIMARY KEY,
  "amount" DECIMAL NOT NULL,
  "payment_reference" TEXT NOT NULL, -- Vår interna referens (SC-XXXXXX-XXX)
  "swish_payment_id" TEXT, -- ID från Swish (endast för Swish-betalningar)
  "swish_callback_url" TEXT,
  "phone_number" TEXT,
  "status" TEXT NOT NULL, -- 'CREATED', 'PAID', 'DECLINED', 'ERROR'
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "payment_method" TEXT NOT NULL, -- 'swish', 'invoice'
  "booking_id" UUID, -- FK till bookings.id
  "course_id" UUID, -- FK till course_instances.id
  "user_info" JSONB, -- Lagrar användarinfo som JSON
  "product_type" TEXT NOT NULL, -- 'course', 'gift_card', 'art_product'
  "product_id" UUID NOT NULL, -- ID för produkten (course_instance, gift_card eller product)
  "currency" TEXT DEFAULT 'SEK',
  "metadata" JSONB -- Ytterligare data, callbacks, etc
);
```

**API-användning**:
- `/api/payments/swish/create`: Skapar en ny betalning och skickar betalningsförfrågan till Swish
- `/api/payments/swish/callback`: Tar emot och behandlar callbacks från Swish
- `/api/payments/status/[reference]`: Hämtar betalningsstatus baserat på referens
- `/api/payments/swish/cancel`: Avbryter en pågående betalning

#### 2. `bookings` - Kursbokningar

```sql
CREATE TABLE "public"."bookings" (
  "id" UUID PRIMARY KEY,
  "course_id" UUID NOT NULL, -- FK till course_instances.id
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT NOT NULL,
  "customer_phone" TEXT,
  "number_of_participants" INTEGER DEFAULT 1,
  "booking_date" TIMESTAMPTZ DEFAULT NOW(),
  "status" TEXT NOT NULL, -- 'confirmed', 'cancelled', 'pending'
  "payment_status" TEXT NOT NULL, -- 'paid', 'unpaid', 'refunded'
  "message" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "invoice_number" TEXT,
  "invoice_address" TEXT,
  "invoice_postal_code" TEXT,
  "invoice_city" TEXT,
  "invoice_reference" TEXT,
  "payment_method" TEXT, -- 'swish', 'invoice'
  "booking_reference" TEXT NOT NULL -- Unik bokningsreferens (SC-XXX-XXXXXX)
);
```

**API-användning**:
- `/api/payments/swish/callback`: Skapar bokning när betalningen är genomförd
- `/api/bookings/create`: Direkt skapande av bokningar
- `/api/bookings/[id]`: Hantering av enskilda bokningar

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

```sql
CREATE TABLE "public"."art_orders" (
  "id" UUID PRIMARY KEY,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "product_id" UUID NOT NULL, -- FK till products.id
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT NOT NULL,
  "customer_phone" TEXT,
  "shipping_address" TEXT,
  "shipping_postal_code" TEXT,
  "shipping_city" TEXT,
  "status" TEXT NOT NULL, -- 'confirmed', 'shipped', 'delivered', 'cancelled'
  "payment_status" TEXT NOT NULL, -- 'PAID', 'UNPAID', 'REFUNDED'
  "payment_method" TEXT NOT NULL, -- 'swish', 'invoice'
  "order_reference" TEXT NOT NULL, -- Unik orderreferens
  "invoice_number" TEXT,
  "unit_price" DECIMAL NOT NULL,
  "total_price" DECIMAL NOT NULL,
  "currency" TEXT DEFAULT 'SEK',
  "metadata" JSONB -- Ytterligare data, användarinfo, etc
);
```

**API-användning**:
- `/api/payments/swish/callback`: Skapar eller uppdaterar en konstproduktbeställning
- `/api/art-orders/create`: Direkt skapande av konstproduktbeställningar

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