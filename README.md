# Studio Clay en liten ändribng

En modern webbplats för Studio Clay, en kreativ designstudio som specialiserar sig på branding, webbdesign och digitala upplevelser. Byggd med Next.js och Tailwind CSS. 

## Features

- Responsive design that works on all devices
- Modern, clean aesthetic with attention to typography and spacing
- Dark mode support
- Animated UI elements for better user experience
- Contact form with validation
- SEO optimized

## Dokumentation

- [README-PAYMENT-REFACTOR.md](./README-PAYMENT-REFACTOR.md) - Komplett betalnings- och checkout-dokumentation
- [README-ADMIN.md](./README-ADMIN.md) - Admin-komponenter och API-caching
- [src/docs/GIFT-CARD-SYSTEM.md](./src/docs/GIFT-CARD-SYSTEM.md) - Dokumentation om presentkortssystemet
- [BOOKING-SYSTEM.md](./BOOKING-SYSTEM.md) - Dokumentation om bokningssystemet
- [archived-docs/](./archived-docs/) - Arkiverade dokumentationsfiler

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js (version 18 or later)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/studioclay.git
cd studioclay
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

```
studioclay/
├── public/            # Static files
├── src/
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── styles/        # Global styles
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── tsconfig.json
```

## Deployment

The site is deployed on Vercel, which provides automatic deployments, preview environments, and serverless functions support for Next.js applications:

1. Connect the GitHub repository to Vercel
2. Vercel will automatically detect the Next.js project and apply optimal settings
3. Configure environment variables in the Vercel dashboard
4. Push changes to the main branch to trigger automatic deployments

For local deployments or manual builds:

```bash
npm run build
# or
yarn build
```

## Customization

You can customize the website by:

- Modifying the color scheme in `src/app/globals.css`
- Updating the content in the components
- Adding new pages and sections as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Design inspiration from various creative agency websites
- Icons from [Heroicons](https://heroicons.com/)
- Fonts from [Google Fonts](https://fonts.google.com/)

# Studio Clay Website

## API Refactoring

The codebase has been refactored to follow Next.js best practices for server-side rendering and API routes:

### Key Improvements

1. **Centralized Database Access**
   - Removed direct Supabase client access from client components
   - Created proper API routes for all data operations
   - Consolidated Supabase client instances to use `supabaseAdmin` for server operations

2. **Dynamic Route Parameter Handling**
   - Ensured all dynamic route parameters (`params.id`) are properly awaited
   - Added consistent error handling for missing parameters
   - Improved logging for better debugging

3. **API Structure**
   - Implemented RESTful API routes for all resources:
     - `/api/courses` - List, create courses
     - `/api/courses/[id]` - Get, update, delete specific course
     - `/api/courses/[id]/bookings` - Get bookings for a course
     - `/api/bookings` - List, create bookings
     - `/api/bookings/[id]` - Get, update, delete specific booking
     - `/api/course-templates` - List, create course templates
     - `/api/course-templates/[id]` - Get, update, delete specific template
     - `/api/gift-cards` - List, create gift cards
     - `/api/gift-cards/[id]` - Get, update, delete specific gift card
     - `/api/waitlist` - List, create waitlist entries
     - `/api/waitlist/[id]` - Get, update, delete specific waitlist entry

4. **Client Components**
   - Updated all client components to use fetch API instead of direct database access
   - Implemented proper loading states and error handling
   - Added pagination for large data sets

5. **Security Improvements**
   - Moved sensitive operations to server-side API routes
   - Prevented exposure of database credentials in client code
   - Added validation for all API inputs

This refactoring improves the application's security, maintainability, and performance by following Next.js best practices for data fetching and API design.

## Database Migrations

To apply database migrations, first ensure you have the correct Supabase credentials in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then, to apply a specific migration:

```bash
# First, create the run_sql_query function (only need to do this once)
npx supabase functions deploy run_sql_query --project-ref your-project-ref

# Then run the migration
npm run migrate add_status_to_course_instances.sql
```

This will add the missing `status` column to the `course_instances` table.

## Recent Fixes

### 1. Course Creation Issues
- Fixed an issue where course creation was failing due to a missing `status` column in the `course_instances` table.
- Added a migration file `add_status_to_course_instances.sql` to add the required column.
- Fixed course instance creation to include the `title` field, which had a NOT NULL constraint.

### 2. Parameter Handling in Dynamic Routes
- Updated dynamic route components to correctly handle parameters, fixing the "params.id should be awaited" warnings.
- Fixed API routes to properly await route parameters before accessing them.

### 3. Bookings List Component
- Updated the BookingsList component to use server-side filtering for better performance.
- Implemented status-based filtering that works from the API level instead of client-side.
- Added proper error handling for all API operations.

### 4. Payment Status Handling
- Moved payment status updates to use API routes instead of direct Supabase access
- Updated PaymentStatusBadge and PaymentStatusUpdater components to use client-side fetch
- Removed direct database access from client components for better security
- Simplified the payment status update flow to use a single API endpoint
- Added proper error handling and loading states for payment status updates

The payment status can now be updated through:
- PaymentStatusBadge component (click to update)
- PaymentStatusUpdater component (dropdown selection)

Both components now use the `/api/admin/payments/update-status` endpoint for updates.

## Betalningssystem

Studio Clay använder ett avancerat betalningssystem som stödjer både Swish och fakturabetalningar för kursbokningar, presentkort och konstprodukter. 

För detaljerad dokumentation om betalningssystemet, se [README-PAYMENT-REFACTOR.md](./README-PAYMENT-REFACTOR.md).

### Snabbguide för testning
- **Swish-testning**: Använd testläge med `NEXT_PUBLIC_SWISH_TEST_MODE=true`
- **Testnummer**: 071234567 (PAID), 071234568 (DECLINED), 071234569 (ERROR)
- **Fakturabetalningar**: Genererar automatiskt PDF-fakturor och skickar via e-post

## Booking System Documentation

### Overview
The booking system provides functionality to display, filter, and manage course bookings in the admin interface. It consists of several key components that work together to provide a complete booking management experience.

### Main Components

#### 1. BookingsTable Component
`BookingsTable` serves as a container component that filters bookings by status and renders them using the `BookingsList` component.

**Features:**
- Filters bookings by status (confirmed, pending, or cancelled)
- Displays loading states with a spinner when data is being fetched
- Shows appropriate error messages when data fetching fails
- Provides empty state UI when no bookings match the current filter
- Passes filtered bookings to the BookingsList component for rendering

**Props:**
- `title`: String title for the bookings table section
- `bookings`: Array of ExtendedBooking objects
- `loading`: Boolean indicating if data is being loaded
- `error`: Error message string or null
- `status`: Filter value ('confirmed', 'pending', or 'cancelled')
- `onBookingUpdate`: Callback function triggered when bookings are updated
- `participantInfo`: Optional string with additional participant information

#### 2. BookingsList Component
`BookingsList` renders bookings in a table format with various actions for managing them.

**Features:**
- Displays bookings in a table with sortable columns
- Provides actions to edit and cancel bookings
- Shows payment status with option to update it
- Supports viewing and editing booking details

**Key Functionality:**
- Edit booking information (customer details, participants count)
- Cancel bookings with confirmation dialog
- Update payment status
- View booking details including payment method and references

### Data Model

The booking system uses several key data types:

**ExtendedBooking**: 
Extends the base Booking type with additional information needed for display and management in the admin interface.

Key fields:
- `id`: Unique identifier for the booking
- `status`: Current booking status ('pending', 'confirmed', or 'cancelled')
- `customer_name`: Name of the customer who made the booking
- `customer_email`: Customer's email address
- `customer_phone`: Customer's phone number
- `number_of_participants`: Number of people included in this booking
- `course_id`: ID of the course instance booked
- `payment_status`: Status of the payment ('CREATED', 'PAID', 'DECLINED', 'ERROR')
- `payment_method`: Payment method used ('swish', 'invoice', etc.)
- `booking_reference`: Reference number for the booking
- `created_at`: Timestamp when booking was created

### API Integration

The booking system interacts with several API endpoints:

1. **GET /api/bookings** - Fetches booking list with optional filters
2. **GET /api/bookings/[id]** - Retrieves a specific booking by ID
3. **PATCH /api/bookings/[id]** - Updates booking information
4. **DELETE /api/bookings/[id]** - Cancels a booking

The API returns bookings with course information joined, allowing the UI to display relevant course details alongside booking information.

### Troubleshooting

**Common Issues:**
1. **Bookings not displaying**: Check network requests to ensure API endpoints are being called correctly
2. **Payment status not updating**: Verify the payment service is running and callbacks are being received
3. **Empty booking lists**: Confirm that the status filter is correctly set and that bookings exist with that status

For deeper debugging, check browser console logs and server-side logs for any errors during API calls.

For more detailed technical documentation on the booking system, please refer to [BOOKING-SYSTEM.md](./BOOKING-SYSTEM.md).

## Rich Text Editor

### Overview
Studio Clay använder en anpassad Rich Text Editor för att redigera formaterad text i systemet, såsom kursbeskrivningar och innehåll. Editorn är baserad på React-Quill-New, en modern version av Quill som är kompatibel med React 18 och Next.js.

### Funktioner
- WYSIWYG (What You See Is What You Get) redigering
- Stöd för typografiska format: rubriker, fetstil, kursiv, understruket, genomstruket
- Stöd för listor (numrerade och punkter)
- Stöd för länkar
- Responsiv design som fungerar på alla enheter
- Dynamisk laddning för att minska initial laddningstid
- Anpassad styling som matchar Studio Clay's designsystem

### Implementering
Rich Text Editorn är implementerad som en React-komponent i `src/components/common/RichTextEditor.tsx`. Komponenten använder:

1. **Dynamic Import**: Komponenten laddas dynamiskt på klientsidan för att förbättra prestanda
2. **Klientsidesrendering**: För att undvika serverladdningsproblem körs editorn endast på klientsidan
3. **Anpassade formatdefinitioner**: Specificerar vilka format som stöds av editorn
4. **Responsiv styling**: Anpassad CSS för att matcha resten av designsystemet

### Användning
För att använda Rich Text Editorn i en komponent:

```tsx
import RichTextEditor from '../../components/common/RichTextEditor';

// I din komponent
const [content, setContent] = useState('');

return (
  <RichTextEditor
    value={content}
    onChange={setContent}
    placeholder="Skriv eller klistra in text här..."
  />
);
```

### Props
Rich Text Editorn accepterar följande props:

- `value`: (string) Det aktuella värdet av editorn
- `onChange`: (function) Callback-funktion som anropas när innehållet ändras
- `placeholder`: (string, optional) Platshållartext som visas när editorn är tom
- `readOnly`: (boolean, optional) Om editorn ska vara skrivskyddad
- `style`: (object, optional) Ytterligare CSS-stilar att tillämpa

Rich Text Editorn används främst i kursredigeringsgränssnittet för att skapa rika kursbeskrivningar som visas på webbplatsen.

## Database Structure

### Bookings Table

The `bookings` table stores all course bookings, including those created through invoice payments:

| Column Name           | Data Type   | Description                                       |
|-----------------------|-------------|---------------------------------------------------|
| id                    | UUID        | Primary key                                       |
| course_id             | UUID        | Foreign key to course_instances                   |
| customer_name         | TEXT        | Full name of customer                            |
| customer_email        | TEXT        | Email address of customer                        |
| customer_phone        | TEXT        | Phone number of customer                         |
| number_of_participants| INTEGER     | Number of participants in the booking            |
| booking_date          | TIMESTAMP   | Date when booking was made                       |
| status                | TEXT        | Status of booking (confirmed, cancelled)         |
| payment_status        | TEXT        | Status of payment (CREATED, PAID, ERROR)         |
| message               | TEXT        | Optional message from customer                   |
| created_at            | TIMESTAMP   | Record creation timestamp                        |
| updated_at            | TIMESTAMP   | Record update timestamp                          |
| invoice_number        | TEXT        | Invoice number for invoice payments              |
| invoice_address       | TEXT        | Billing address for invoice                      |
| invoice_postal_code   | TEXT        | Postal code for invoice                          |
| invoice_city          | TEXT        | City for invoice                                 |
| invoice_reference     | TEXT        | Customer reference for invoice                   |
| payment_method        | TEXT        | Payment method (swish, invoice)                  |
| booking_reference     | TEXT        | Unique reference code for booking                |
| unit_price            | DECIMAL     | Price per participant                            |
| total_price           | DECIMAL     | Total price for booking                          |
| currency              | TEXT        | Currency code (default: SEK)                     |

Example row:
```sql
INSERT INTO "public"."bookings" (
  "id", "course_id", "customer_name", "customer_email", "customer_phone", 
  "number_of_participants", "booking_date", "status", "payment_status", 
  "message", "created_at", "updated_at", "invoice_number", "invoice_address", 
  "invoice_postal_code", "invoice_city", "invoice_reference", "payment_method", 
  "booking_reference", "unit_price", "total_price", "currency"
) VALUES (
  'e992ae1a-1c97-4210-b818-0c6924961e8b', 'c51791b1-dc50-4027-8c9b-b839d4665acd', 
  'Charlotta + dotter', 'charlotta-eriksson@outlook.com', '', '2', 
  '2025-03-30 23:12:09.258+00', 'confirmed', 'CREATED', null, 
  '2025-03-30 23:12:09.329301+00', '2025-03-30 23:12:09.329301+00', 
  'SC-20250330-4050', '', '', '', null, 'invoice', 'SC-G47-328930', 
  '800.00', '1600.00', 'SEK'
);
```

**Important Notes:**
- The `booking_reference` field is the correct field name for storing booking references.
- Status values should use constants from `BOOKING_STATUSES` and `PAYMENT_STATUSES`.
- For invoice payments, all invoice_* fields should be populated.
