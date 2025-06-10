# Checkout Flow Documentation

## Översikt
Checkout-flödet är konstruerat som en generisk lösning som kan hantera flera olika produkttyper:
- Kursbokning (Course Booking)
- Presentkort (Gift Card)
- Produktköp (Shop/Art Purchase)
- Väntelista (Waitlist)

Systemet är uppbyggt med en modulär arkitektur där varje steg i checkout-processen hanteras av en specifik komponent. Hela flödet koordineras av en central wrapper-komponent som hanterar navigation, datavalidering och tillståndshantering.

## Flödestyper

Systemet stödjer fyra huvudsakliga flödestyper:

1. **COURSE_BOOKING**: För bokning av kurser
   - Steg: Kursinformation → Dina uppgifter → Betalning → Bekräftelse
   
2. **GIFT_CARD**: För köp av presentkort
   - Steg: Presentkort → Dina uppgifter → Betalning → Bekräftelse

3. **ART_PURCHASE**: För köp av konstverk och andra produkter
   - Steg: Produktdetaljer → Dina uppgifter → Betalning → Bekräftelse
   - Alla produkter hämtas i butiken (Studio Clay, Norrtullsgatan 65)
   - Bekräftelsesidan visar:
     - Ordernummer och orderdetaljer
     - Produktinformation
     - Kundinformation
     - Betalningsinformation
     - Upphämtningsinstruktioner

4. **WAITLIST**: För att skriva upp sig på väntelista
   - Steg: Kursinformation → Dina uppgifter → Bekräftelse

## Generiska Steg

För att standardisera flödet mellan olika produkttyper används följande generiska steg:

```typescript
export enum GenericStep {
  ITEM_SELECTION = 0,  // Välja produkt (kurs/presentkort/konstverk)
  DETAILS = 1,         // Detaljer om produkten 
  USER_INFO = 2,       // Användarinformation/personuppgifter
  PAYMENT = 3,         // Betalning
  CONFIRMATION = 4     // Bekräftelse
}
```

## Komponentstruktur
```
/src/
├── components/
│   ├── common/                            # Gemensamma komponenter för alla flöden
│   │   ├── BookingStepper.tsx            # Generisk stegindikator
│   │   ├── FlowStepWrapper.tsx           # Huvudwrapper för flödeshantering
│   │   ├── GenericFlowContainer.tsx      # Layout-container för alla steg
│   │   ├── StyledButton.tsx              # Standardiserade knappar
│   │   └── BackButton/BackToCourses.tsx  # Tillbaka-knappar
│   │
│   ├── booking/                          # Kursbokning
│   │   ├── CourseDetails.tsx             # Steg 1: Kursinformation
│   │   ├── UserInfoForm.tsx              # Steg 2: Användarinformation
│   │   ├── PaymentSelection.tsx          # Steg 3: Betalningsval
│   │   ├── BookingConfirmation.tsx       # Steg 4: Bekräftelse
│   │   │
│   │   └── wrappers/                      # Wrapper-komponenter för varje steg
│   │       ├── CourseDetailsWrapper.tsx    # Wrapper för steg 1
│   │       ├── UserInfoFormWrapper.tsx     # Wrapper för steg 2
│   │       ├── PaymentSelectionWrapper.tsx # Wrapper för steg 3
│   │       └── BookingConfirmationWrapper.tsx # Wrapper för steg 4
│   │
│   ├── gift-card-flow/                    # Presentkortsflöde
│   │   ├── GiftCardSelection.tsx          # Steg 1: Välja presentkort
│   │   ├── PersonalInfoForm.tsx           # Steg 2: Personuppgifter
│   │   ├── PaymentWrapper.tsx             # Steg 3: Betalning
│   │   └── GiftCardConfirmation.tsx       # Steg 4: Bekräftelse
│   │
│   ├── shop/                              # Konstverksflöde
│   │   ├── ProductCard.tsx                # Produktkort i butiken
│   │   ├── ProductDialog.tsx              # Detaljerad produktvy
│   │   ├── ShopConfirmation.tsx           # Bekräftelsesida
│   │   │
│   │   └── wrappers/                      # Wrapper-komponenter för varje steg
│   │       ├── UserInfoWrapper.tsx         # Wrapper för personuppgifter
│   │       ├── PaymentWrapper.tsx          # Wrapper för betalning
│   │       └── ShopConfirmationWrapper.tsx # Wrapper för bekräftelse
│   │
│   └── waitlist/                          # Väntelisteflöde
│       ├── WaitlistForm.tsx               # Steg 2: Personuppgifter för väntelista
│       └── WaitlistConfirmation.tsx       # Steg 3: Bekräftelse
│
├── app/                                   # Next.js app router sidor
│   ├── book-course/[id]/                  # Kursbokningsflöde
│   │   ├── page.tsx                       # Steg 1: Kursinformation
│   │   ├── personal-info/page.tsx         # Steg 2: Personuppgifter
│   │   ├── payment/page.tsx               # Steg 3: Betalning
│   │   └── confirmation/page.tsx          # Steg 4: Bekräftelse
│   │
│   ├── gift-card-flow/                    # Presentkortsflöde
│   │   ├── page.tsx                       # Steg 1: Presentkortsval
│   │   ├── personal-info/page.tsx         # Steg 2: Personuppgifter
│   │   ├── payment/page.tsx               # Steg 3: Betalning
│   │   └── confirmation/page.tsx          # Steg 4: Bekräftelse
│   │
│   ├── shop/[id]/                         # Konstverksflöde
│   │   ├── details/page.tsx               # Steg 1: Produktdetaljer
│   │   ├── personal-info/page.tsx         # Steg 2: Personuppgifter
│   │   ├── payment/page.tsx               # Steg 3: Betalning
│   │   └── confirmation/page.tsx          # Steg 4: Bekräftelse
│   │
│   └── waitlist/[id]/                     # Väntelisteflöde
│       ├── page.tsx                       # Steg 1: Kursinformation (väntelista)
│       └── confirmation/page.tsx          # Steg 3: Bekräftelse
│
└── utils/                                 # Hjälpfunktioner
    ├── flowStorage.ts                     # Lagring av flödesdata
    └── flowNavigation.ts                  # Navigeringslogik mellan steg
```

## Nyckelkomponenter

### 1. BookingStepper.tsx
En generisk stegindikator som visar vilket steg användaren befinner sig i inom ett specifikt flöde.

```typescript
// Olika flödestyper som stegindikatorn stödjer
export enum FlowType {
  COURSE_BOOKING = 'course_booking',
  WAITLIST = 'waitlist',
  GIFT_CARD = 'gift_card',
  ART_PURCHASE = 'art_purchase'
}

// Konfigurera steg för olika flödestyper
const flowConfigs: Record<FlowType, StepConfig[]> = {
  [FlowType.COURSE_BOOKING]: [
    { label: 'Kursinformation', icon: <InfoIcon /> },
    { label: 'Dina uppgifter', icon: <PersonIcon /> },
    { label: 'Betalning', icon: <PaymentIcon /> },
    { label: 'Bekräftelse', icon: <CheckCircleIcon /> },
  ],
  // ... konfigurationer för andra flödestyper
}

// Mappa GenericStep-enum till rätt index i flowConfigs för att hantera olika antal steg
// Special mapping för COURSE_BOOKING flow
if (flowType === FlowType.COURSE_BOOKING && !customSteps) {
  if (numericActiveStep === GenericStep.USER_INFO) {
    // USER_INFO (2) should map to index 1 in flowConfigs
    adjustedActiveStep = 1;
  } else if (numericActiveStep === GenericStep.PAYMENT) {
    // PAYMENT (3) should map to index 2 in flowConfigs
    adjustedActiveStep = 2;
  } else if (numericActiveStep === GenericStep.CONFIRMATION) {
    // CONFIRMATION (4) should map to index 3 in flowConfigs
    adjustedActiveStep = 3;
  }
}
// Special mapping för GIFT_CARD flow
else if (flowType === FlowType.GIFT_CARD && !customSteps) {
  if (numericActiveStep === GenericStep.USER_INFO) {
    // USER_INFO (2) should map to index 1 in flowConfigs
    adjustedActiveStep = 1;
  } else if (numericActiveStep === GenericStep.PAYMENT) {
    // PAYMENT (3) should map to index 2 in flowConfigs
    adjustedActiveStep = 2;
  } else if (numericActiveStep === GenericStep.CONFIRMATION) {
    // CONFIRMATION (4) should map to index 3 in flowConfigs
    adjustedActiveStep = 3;
  }
}
```

### 2. FlowStepWrapper.tsx
Den centrala komponenten som hanterar:
- Laddning av flödesdata
- Validering av data för aktuellt steg
- Navigation mellan steg
- Hantering av redirects
- Serialisering av data

```typescript
// Flödesdata som delas mellan alla steg
export interface FlowStateData {
  flowType: FlowType;
  itemDetails: any | null;   // Produkt/kurs-information
  userInfo: any | null;      // Användarinformation
  paymentInfo: any | null;   // Betalningsinformation
}

// Huvudkomponent för wrapper
const FlowStepWrapper: React.FC<FlowStepWrapperProps> = ({
  children,
  flowType,
  activeStep,
  expectedPreviousSteps = [],
  title,
  subtitle,
  validateData,
  itemId,
  redirectOnInvalid = true
}) => {
  // Hantering av flödeslogik, validering och navigation
  // ...
}
```

### 3. GenericFlowContainer.tsx
En layout-container som konsekvent visar:
- Stegindikatorn
- Titlar och undertitlar
- Tillbaka-knappar
- Varningsmeddelanden
- Innehållet för aktuellt steg

```typescript
const GenericFlowContainer: React.FC<GenericFlowContainerProps> = ({
  children,
  activeStep,
  flowType,
  title,
  subtitle,
  alertMessage,
  // ...
}) => {
  // Layout och rendering av komponenter
  // ...
}
```

## Stegkomponenter

### 1. Produkt/Kursdetaljer (Steg 1)
- `CourseDetails.tsx`: Visar kursinformation
- `GiftCardSelection.tsx`: Val av presentkort
- Hanterar val och detaljer för den produkt som ska köpas

### 2. Användarinformation (Steg 2)
- `UserInfoForm.tsx`: Samlar personuppgifter för kursbokning
- `PersonalInfoForm.tsx`: Personuppgifter för presentkort
- `WaitlistForm.tsx`: Personuppgifter för väntelista
- Samlar information om användaren som behövs för bokning/köp

### 3. Betalning (Steg 3)
- `PaymentSelection.tsx`: Huvudkomponent för val av betalningsmetod
- Se [README-PAYMENT-FLOW.md](./README-PAYMENT-FLOW.md) för detaljer om betalningssystemet

### 4. Bekräftelse (Steg 4)
- `BookingConfirmation.tsx`: Bekräftelse för kursbokning/presentkort
- `WaitlistConfirmation.tsx`: Bekräftelse för väntelista
- Visar sammanställning av bokningsinformation

## Dataflöde

### 1. Datalagring mellan steg (flowStorage.ts)
```typescript
// Lagring av data i localStorage
export const setItemDetails = <T>(details: T): void => {
  localStorage.setItem(STORAGE_KEYS.ITEM_DETAILS, JSON.stringify(details));
};

export const setUserInfo = <T>(userInfo: T): void => {
  localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
};

export const setPaymentInfo = <T>(paymentInfo: T): void => {
  localStorage.setItem(STORAGE_KEYS.PAYMENT_INFO, JSON.stringify(paymentInfo));
};

// Hämtning av tidigare lagrad data
export const getItemDetails = <T>(): T | null => {
  // Hämtar produktinformation från localStorage
  // ...
};

// ... och liknande för getUserInfo, getPaymentInfo, etc.
```

### 2. Navigationslogik (flowNavigation.ts)
```typescript
// Hämta URL för nästa steg baserat på flödestyp och aktuellt steg
export const getNextStepUrl = (
  currentStep: GenericStep, 
  flowType: FlowType, 
  itemId?: string
): string => {
  // Beräkna URL för nästa steg i flödet baserat på konfiguration
  // ...
};

// Hämta URL för föregående steg
export const getPreviousStepUrl = (
  currentStep: GenericStep, 
  flowType: FlowType, 
  itemId?: string
): string => {
  // Beräkna URL för föregående steg i flödet
  // ...
};
```

## Valideringslogik

Varje steg har sin egen datavalidering för att säkerställa att nödvändig information finns tillgänglig:

### 1. Detaljer (Steg 1)
```typescript
validateData={({ itemDetails }) => {
  // Validera att produktdetaljer finns
  return !!itemDetails && !!itemDetails.id;
}}
```

### 2. Användarinformation (Steg 2)
```typescript
validateData={({ itemDetails, userInfo }) => {
  // Validera att produktdetaljer och användarinfo finns
  return !!itemDetails && !!userInfo &&
         !!itemDetails.id && !!userInfo.firstName;
}}
```

### 3. Betalning (Steg 3)
```typescript
validateData={({ itemDetails, userInfo, paymentInfo }) => {
  // Validera att all information finns och att betalningen är genomförd
  return !!itemDetails && !!userInfo && !!paymentInfo;
}}
```

## Kommunikation mellan steg

### 1. Dataöverföring
```typescript
// När ett steg slutförs skickas data till nästa steg:

// I komponent (t.ex. UserInfoForm):
const handleSubmit = (data) => {
  // Lagra användardata
  setUserInfo(data);
  
  // Gå vidare till nästa steg
  if (onNext) {
    onNext(data); // Callback från FlowStepWrapper
  } else {
    // Legacy navigation
    router.push(...);
  }
};
```

### 2. Wrapper-till-steg kommunikation
```typescript
// FlowStepWrapper skickar data och callbacks till sina barn
<FlowStepWrapper flowType={...} activeStep={...}>
  {({ flowData, onNext, onBack }) => (
    <UserInfoForm 
      courseId={id} 
      onNext={onNext}
      onBack={onBack}
    />
  )}
</FlowStepWrapper>
```

## Anpassning för olika produkter

Varje flödestyp kan anpassas på följande sätt:

1. **Unika steg**: Vissa flöden har unika steg (t.ex. väntelista saknar betalningssteg)
2. **Stegkonfiguration**: Olika ikoner och etiketter för steg i olika flöden
3. **Validering**: Anpassad valideringslogik för olika produkttyper
4. **Design**: Konsekvent utseende med anpassad styling för olika produkter

## Problemlösningar

### 1. Serialisering av funktioner
För att hantera Next.js begränsningar med att skicka funktioner mellan klient och server:
```typescript
// Skapar en serialiserbar valideringsfunktion
function createValidateFunction() {
  return function validateBookingData({ itemDetails, userInfo, paymentInfo }) {
    return Boolean(itemDetails) && Boolean(userInfo) && Boolean(paymentInfo);
  };
}

// Användning i wrapper-komponenter
const validateBookingData = createValidateFunction();
```

### 2. Stegmappning
För att hantera skillnader mellan GenericStep-enum och faktiska steg:
```typescript
// Special mapping för olika flöden
if (flowType === FlowType.COURSE_BOOKING) {
  if (numericActiveStep === GenericStep.USER_INFO) { // 2
    adjustedActiveStep = 1; // Index i flowConfigs-arrayen
  }
  // ... liknande för andra steg
}
```

### 3. Presentkort (Gift Card) hantering
För att hantera presentkortköp i Swish- och faktureringsflöden:
```typescript
// I Swish-betalningsflödet
if (product_type === 'gift_card') {
  // Lagra presentkortsinformation i metadata
  metadata.item_details = {
    type: storedDetails.type || 'digital',
    recipientName: storedDetails.recipientName || '',
    recipientEmail: storedDetails.recipientEmail || '',
    message: storedDetails.message || ''
  };
  
  // Använd genererat UUID istället för product_id
  const { data: paymentData } = await supabase
    .from('payments')
    .insert({
      // ... övriga fält
      product_type: 'gift_card',
      // Generera korrekt UUID
      product_id: crypto.randomUUID(),
      // ... övriga fält
    })
    .select()
    .single();
}
```

## Visuell representation av flödet

```
┌────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌────────────────┐
│  Steg 1        │      │  Steg 2         │      │  Steg 3         │      │  Steg 4        │
│ ───────────    │      │ ───────────     │      │ ───────────     │      │ ───────────    │
│                │      │                 │      │                 │      │                │
│ Produktdetaljer│─────▶│ Användarinfo    │─────▶│ Betalning       │─────▶│ Bekräftelse    │
│                │      │                 │      │                 │      │                │
└────────────────┘      └─────────────────┘      └─────────────────┘      └────────────────┘
       ▲                       ▲                        ▲                         ▲
       │                       │                        │                         │
       │                       │                        │                         │
┌──────┴───────────────────────┴────────────────────────┴─────────────────────────┴──────┐
│                                                                                        │
│                                 FlowStepWrapper                                        │
│                                                                                        │
│   ┌─────────────────────┐  ┌───────────────────┐  ┌─────────────────────────────┐     │
│   │                     │  │                   │  │                             │     │
│   │  Datahantering      │  │  Validering       │  │  Navigation                 │     │
│   │                     │  │                   │  │                             │     │
│   └─────────────────────┘  └───────────────────┘  └─────────────────────────────┘     │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
       │                       │                        │                         │
       │                       │                        │                         │
       ▼                       ▼                        ▼                         ▼
┌────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌────────────────┐
│                │      │                 │      │                 │      │                │
│ localStorage   │      │ localStorage    │      │ localStorage    │      │ localStorage   │
│ itemDetails    │      │ userInfo        │      │ paymentInfo     │      │ (complete)     │
│                │      │                 │      │                 │      │                │
└────────────────┘      └─────────────────┘      └─────────────────┘      └────────────────┘
```

## Best Practices

1. **Konsekvent dataflöde**: All data passerar genom FlowStepWrapper
2. **Tydlig ansvarsfördelning**: Varje komponent har ett specifikt syfte
3. **Generiska komponenter**: Återanvändbara komponenter för olika flöden
4. **Defensiv programmering**: Kontrollerar alltid att data finns innan den används
5. **Serialisering**: Löser problem med funktions-serialisering för server/klient-överföringar

## Framtida förbättringar

1. **Server-side datapersistens**: Flytta från localStorage till databas
2. **TypeScript-förbättringar**: Striktare typning för data och callbacks
3. **Serverkomponentstöd**: Förbättra stödet för Next.js 13+ serverkomponenter
4. **Autentisering**: Integrera inloggning för återkommande kunder
5. **A/B-testning**: Möjliggöra olika checkout-flöden för testning

## Relaterade dokument
- [README-PAYMENT-FLOW.md](./README-PAYMENT-FLOW.md) - Dokumentation för betalningssystemet

## Datahantering

### Art Orders
När en konstprodukt köps skapas en `art_order` i databasen med följande information:
- Kundinformation (namn, e-post, telefon)
- Produktinformation
- Betalningsinformation (metod, status, referens)
- Orderstatus (pending, completed, picked_up)

### Betalningsflöde
1. **Swish**:
   - Kunden anger telefonnummer
   - Betalning initieras via Swish API
   - Orderbekräftelse skickas när betalningen är genomförd

2. **Faktura**:
   - Kunden anger personuppgifter
   - PDF-faktura genereras och skickas via e-post
   - Orderbekräftelse skickas tillsammans med fakturan

## Gift Card Flow

### Presentkortsflödet (Gift Card Flow)
Presentkortsflödet tillåter användare att köpa digitala presentkort som kan användas för kurser eller produkter:

1. **Steg 1: Presentkortsval (GiftCardSelection)**
   - Välj belopp (fördefinierade alternativ eller eget belopp)
   - Ange mottagarinformation (namn, e-post)
   - Skriv personligt meddelande
   - All data sparas via `saveGiftCardDetails` som säkerställer att data finns tillgänglig i hela flödet

2. **Steg 2: Personuppgifter (UserInfoForm)**
   - Avsändarinformation (namn, e-post, telefon)

3. **Steg 3: Betalning (PaymentSelection)**
   - Välj betalningsmetod (Swish eller faktura)
   - För Swish: Betalning sker direkt och status sätts till `PAID`
   - För faktura: Faktura skapas och status sätts till `CREATED`

4. **Steg 4: Bekräftelse (GiftCardConfirmation)**
   - Visar presentkortskod och detaljer
   - Visar betalningsstatus: "Genomförd" för betalda och "Ej betald" för fakturor
   - Visar mottagarinformation och personligt meddelande

### Data i presentkortstabellen (gift_cards)
Följande data sparas i databasen för varje presentkort:
- `code`: Unik presentkortskod
- `amount`: Belopp (numeriskt)
- `type`: Typ av presentkort (digital)
- `sender_name`: Avsändarens namn
- `sender_email`: Avsändarens e-post
- `sender_phone`: Avsändarens telefon
- `recipient_name`: Mottagarens namn
- `recipient_email`: Mottagarens e-post
- `message`: Personligt meddelande
- `payment_reference`: Betalningsreferens
- `payment_status`: Betalningsstatus (`CREATED` för faktura, `PAID` för Swish)
- `expires_at`: Giltighetsdatum (12 månader från skapande)
- `is_paid`: Boolean som indikerar om presentkortet är betalt
- `payment_method`: Betalningsmetod (`swish` eller `invoice`)
