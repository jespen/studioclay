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
