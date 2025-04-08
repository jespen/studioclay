# Presentkortssystem - Dokumentation

## Översikt
Studio Clay's presentkortssystem låter kunder köpa digitala presentkort som kan användas vid betalning av kurser och produkter. Systemet inkluderar:

1. Ett komplett flöde för köp av presentkort
2. Automatisk generering av presentkorts-PDF
3. Digital lagring och åtkomst av presentkort
4. Administratörsverktyg för hantering av presentkort

## Köpflöde

Presentkortsköpet följer ett 4-stegsflöde liknande andra produktflöden i systemet:

### 1. Presentkortsval (GiftCardSelection.tsx)
- Kunden väljer presentkortstyp (digitalt)
- Anger presentkortsbelopp (förvalt eller egen summa)
- Fyller i mottagarinformation (namn, e-post)
- Skriver personligt meddelande
- Data lagras med `saveGiftCardDetails()`

### 2. Personuppgifter (UserInfoWrapper.tsx)
- Kunden anger sina egna uppgifter (namn, e-post, telefon)
- Data valideras och lagras i flowStorage

### 3. Betalning (PaymentWrapper.tsx)
- Kunden väljer betalningsmetod (Swish eller faktura)
- Vid betalning med Swish:
  - Betalning sker direkt i Swish-appen
  - Status sätts till `PAID` vid lyckad betalning
  - Presentkorts-PDF genereras automatiskt
- Vid betalning med faktura:
  - Faktura-PDF genereras och skickas till kundens e-post
  - Status sätts till `CREATED` (obetalad)
  - Presentkorts-PDF genereras automatiskt

### 4. Bekräftelse (GiftCardConfirmationDetails.tsx)
- Visar presentkortsinformation (kod, belopp, mottagare)
- Visar betalningsstatus
- Erbjuder knapp för att visa/ladda ner presentkortet som PDF

## Automatisk PDF-generering

Presentkortets PDF genereras automatiskt direkt när presentkortet skapas, oavsett betalningsmetod:

### Processen för PDF-generering:

#### För fakturabetalningar (`/api/invoice/create`):
1. Ett presentkort skapas i databasen med unik kod
2. Presentkorts-PDF genereras med `generateGiftCardPDF()`
3. Bucket "giftcards" kontrolleras/skapas i Supabase
4. PDF:en lagras med filnamnet `gift-card-{kod}.pdf`
5. PDF:en är direkt tillgänglig för nedladdning från bekräftelsesidan

#### För Swish-betalningar (`/api/payments/swish/callback`):
1. När Swish-betalningen bekräftas skapas ett presentkort
2. PDF-genereringsprocessen är identisk med fakturaflödet
3. Presentkortet markeras som `PAID` direkt

#### När PDF:en visas eller laddas ner:

När användaren klickar på knappen för att visa presentkortet:
1. Systemet kontrollerar först om PDF:en redan finns i storage
2. Om den finns, öppnas den direkt utan att genereras på nytt
3. Om den inte finns (vilket skulle vara ovanligt), genereras den på begäran

## Datamodell

Presentkortsinformation lagras i följande tabeller:

### `gift_cards` tabell
- `id`: Unikt presentkorts-ID (UUID)
- `code`: Unik presentkortskod (format: GC-XXXXXXXX)
- `amount`: Presentkortsbelopp (SEK)
- `type`: Typ av presentkort (digital/fysisk)
- `sender_name`: Avsändarens namn
- `sender_email`: Avsändarens e-post
- `sender_phone`: Avsändarens telefonnummer
- `recipient_name`: Mottagarens namn
- `recipient_email`: Mottagarens e-post
- `message`: Personligt meddelande
- `payment_reference`: Betalningsreferens
- `payment_status`: Betalningsstatus (CREATED/PAID)
- `status`: Presentkortsstatus (active/redeemed/expired/cancelled)
- `remaining_balance`: Återstående saldo
- `is_emailed`: Har skickats via mail (boolean)
- `is_printed`: Har skrivits ut/genererats som PDF (boolean)
- `is_paid`: Är betalat (boolean)
- `expires_at`: Utgångsdatum (12 månader från skapande)
- `created_at`: Skapandetidpunkt

## Storage-struktur

Presentkorts-PDFer lagras i Supabase storage:

- **Bucket**: `giftcards`
- **Filnamnsmönster**: `gift-card-{kod}.pdf`
- **Åtkomst**: PDFerna är publikt tillgängliga via URL-struktur
- **URL-mönster**: `{SUPABASE_URL}/storage/v1/object/public/giftcards/gift-card-{kod}.pdf`

## Administratörsgränssnitt

Administratörer kan hantera presentkort via admin-panelen:

### Funktioner i GiftCardManager.tsx:
- Lista alla presentkort med filteralternativ
- Visa presentkortsstatus (aktiv, inlöst, utgången)
- Visa betalningsstatus (betald/obetald)
- Visa/generera presentkorts-PDF
- Uppdatera presentkortsstatus
- Markera presentkort som använda (uppdatera saldo)
- Skapa nya presentkort direkt i admin-gränssnittet

### PDF-visning i admin-gränssnittet:
1. PDF-ikonen försöker först hitta PDF:en direkt i storage baserat på presentkortskoden
2. Om den inte hittas, försöker systemet generera PDF:en via API:et
3. Resultatet visas i en ny flik

## API-endpoints

Presentkortssystemet använder följande API-endpoints:

- **POST `/api/gift-card/generate-pdf`**: Genererar presentkorts-PDF på begäran
- **POST `/api/invoice/create`**: Skapar fakturor och presentkort vid fakturabetalning
- **POST `/api/payments/swish/callback`**: Hanterar Swish-callback och skapar presentkort
- **GET `/api/gift-cards`**: Hämtar lista över presentkort (för admin)
- **POST `/api/gift-cards/update-status`**: Uppdaterar presentkortsstatus
- **POST `/api/gift-cards/update-payment`**: Uppdaterar betalningsstatus
- **POST `/api/gift-cards/update-balance`**: Uppdaterar återstående saldo

## Förbättringar (April 2024)

Följande förbättringar har nyligen implementerats:

1. **Automatisk PDF-generering**
   - PDF:er genereras nu automatiskt vid skapande av presentkort
   - Sker både för faktura- och Swish-betalningar
   - Minskar risken för saknade presentkort

2. **Optimerad lagring**
   - Presentkorts-PDF:er sparas med standardiserat namnmönster
   - Förhindrar duplicerade PDF:er
   - Förenklar åtkomst via direkta URL:er

3. **Förbättrad klientupplevelse**
   - Knappen för att visa/ladda ner presentkort kontrollerar först om PDF:en redan finns
   - Vid flera klick används befintlig PDF istället för att generera nya kopior
   - Snabbare responstider för användaren

4. **Admin-gränssnittsförbättringar**
   - PDF-ikonen länkar nu direkt till presentkorts-PDF:en istället för fakturan
   - Använder direkt URL-åtkomst när möjligt för snabbare visning
   - Tydligare felmeddelanden vid problem

## Teknologier

Presentkortssystemet bygger på följande teknologier:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Databas**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **PDF-generering**: jsPDF
- **Betalningar**: Swish API, fakturasystem

## Utvecklingtips

### Utveckla nya funktioner
När du utvecklar nya funktioner för presentkortssystemet:

1. Stödja befintlig namngivningskonvention för att säkerställa kompatibilitet
2. Använd en konsekvent filnamnskonvention för lagring
3. Följ logiken för automatisk PDF-generering
4. Säkerställ att användarna alltid har möjlighet att komma åt sina presentkort

### Felsökning
Vanliga problem och lösningar:

- **Saknad PDF**: Kontrollera att bucket `giftcards` existerar och att filnamnet följer mönstret `gift-card-{kod}.pdf`
- **Betalningsproblem**: Granska loggar för `/api/payments/swish/callback` eller `/api/invoice/create`
- **Visningsproblem i admin**: Kontrollera att `process.env.NEXT_PUBLIC_SUPABASE_URL` är korrekt satt 