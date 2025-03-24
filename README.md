# Studio Clay

En modern webbplats för Studio Clay, en kreativ designstudio som specialiserar sig på branding, webbdesign och digitala upplevelser. Byggd med Next.js och Tailwind CSS. 

## Features

- Responsive design that works on all devices
- Modern, clean aesthetic with attention to typography and spacing
- Dark mode support
- Animated UI elements for better user experience
- Contact form with validation
- SEO optimized

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

## Testing Swish Payments

Swish payments follow an E-Commerce flow as documented at [Swish Developer Portal](https://developer.swish.nu/documentation/guides/create-a-payment-request):

1. Our backend creates a payment request with callback URL
2. The user enters their phone number in our UI
3. Swish processes the payment in their app
4. Swish sends a callback to our server with the result
5. Our callback handler:
   - Updates the payment status
   - Creates a booking (if PAID)
   - Updates course participants

### Testing with Swish Test Environment

In the test environment, Swish provides special test phone numbers that automatically generate specific responses:

- **071234567**: Always generates a PAID response
- **071234568**: Always generates a DECLINED response
- **071234569**: Always generates an ERROR response

To test the payment flow:

1. Start the application in test mode (`NEXT_PUBLIC_SWISH_TEST_MODE=true`)
2. Create a payment with one of the test phone numbers
3. Our status polling should reflect the expected status
4. Swish test environment should send a callback to our endpoint
5. After the callback is processed, verify that:
   - The payment status has been updated
   - For successful payments (071234567), a booking has been created
   - The course participants count has been updated

### Important Note on Development Testing

The Swish test environment expects to be able to reach your callback URL. If testing locally, you may need to expose your local server using a tool like ngrok:

```bash
ngrok http 3000
```

Then update the `NEXT_PUBLIC_BASE_URL` environment variable with the generated ngrok URL.

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
