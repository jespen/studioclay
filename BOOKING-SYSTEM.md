# Booking System Technical Documentation

## Component Architecture

The booking system follows a hierarchical component structure:

```
CourseAdminPage
└── BookingsTable (filtered by status)
    └── BookingsList (displays filtered bookings)
        ├── PaymentStatusBadge (displays and updates payment status)
        └── Booking management dialogs (edit, cancel)
```

## Component Details

### BookingsTable Component

**File location:** `src/components/admin/Courses/BookingsTable.tsx`

**Purpose:** Acts as a container that filters bookings by status and passes them to the BookingsList component for display.

**Component Lifecycle:**
1. Receives full booking list as props from parent
2. Filters bookings based on the `status` prop value
3. Renders appropriate UI based on loading, error, or empty states
4. Passes filtered bookings to BookingsList for rendering

**Props Interface:**
```typescript
interface BookingsTableProps {
  title: string;
  bookings: ExtendedBooking[];
  loading: boolean;
  error: string | null;
  status: 'confirmed' | 'pending' | 'cancelled';
  onBookingUpdate: () => void;
  participantInfo?: string;
}
```

**Key Behaviors:**
- Filters bookings by the specified status
- Shows loading indicator when data is being fetched
- Displays error message if data fetching fails
- Shows empty state UI when no bookings match the current filter
- Passes filtered bookings and other props to BookingsList

### BookingsList Component

**File location:** `src/components/admin/Courses/BookingsList.tsx`

**Purpose:** Renders bookings in a table format with actions for managing them.

**Props Interface:**
```typescript
interface BookingsListProps {
  courseId?: string;
  bookings: ExtendedBooking[];
  loading: boolean;
  error: string | null;
  onBookingUpdate: () => void;
  title?: string;
  participantInfo?: string;
}
```

**Key Features:**
- Table with sortable columns for booking data
- Edit and cancel actions for each booking
- Payment status display and update functionality
- Dialog-based editing for booking details

**State Management:**
- Tracks edit and cancel dialog states
- Maintains form values for booking edits
- Manages pagination for the table

### Key Types

#### ExtendedBooking

**File location:** `src/types/booking.ts`

```typescript
export interface ExtendedBooking extends Omit<Booking, 'course' | 'payments' | 'payment_status'> {
  course: {
    id: string;
    title: string;
    description: string;
    price: number;
    duration: number;
    capacity: number;
  };
  payments?: Array<Payment>;
  payment_method: string;
  booking_reference: string;
  payment_status: PaymentStatus;
}
```

#### PaymentStatus

```typescript
export type PaymentStatus = 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR';
```

## API Integration

### Endpoints

**GET /api/bookings**
- **Purpose:** Fetch a list of bookings with optional filters
- **Query Params:**
  - `courseId`: Filter bookings for a specific course
  - `status`: Filter by booking status
- **Response:** Array of booking objects with joined course data

**PATCH /api/bookings/[id]**
- **Purpose:** Update booking details
- **Params:**
  - `id`: Booking ID
- **Body:**
  - Updated booking fields
- **Response:** Updated booking object

**DELETE /api/bookings/[id]**
- **Purpose:** Cancel a booking
- **Params:**
  - `id`: Booking ID
- **Response:** Success message

**GET /api/admin/payments/status/[bookingId]**
- **Purpose:** Get payment status for a booking
- **Params:**
  - `bookingId`: Booking ID
- **Response:** Payment status information

**POST /api/admin/payments/update-status**
- **Purpose:** Update payment status for a booking
- **Body:**
  - `bookingId`: Booking ID
  - `status`: New payment status
- **Response:** Updated payment info

## Flow Diagrams

### Booking Management Flow

1. Admin navigates to course admin page
2. System loads bookings and displays them in status-based tabs
3. Admin can:
   - View bookings by status (confirmed, pending, cancelled)
   - Edit booking details (customer info, participants)
   - Cancel bookings
   - Update payment status

### Payment Status Update Flow

1. Admin clicks on payment status badge
2. System shows payment status options
3. Admin selects new status
4. System updates payment status in the database
5. UI refreshes to show updated status

## Error Handling

The booking components implement these error handling strategies:

1. **API Errors:** Displayed in UI with error messages
2. **Loading States:** Show spinners during data operations
3. **Empty States:** Provide feedback when no bookings exist
4. **Validation:** Form validation for booking edits
5. **Confirmation:** Dialogs to confirm destructive actions

## Implementation Notes

1. The BookingsTable filters bookings on the client side, which is efficient for reasonably sized datasets but may need to be moved to the API for very large datasets.

2. Payment status updates trigger a full booking list refresh currently - this could be optimized to update just the affected booking.

3. The system does not currently support bulk operations (e.g., cancelling multiple bookings) - this could be a future enhancement.

## Troubleshooting Guide

### Common Issues

1. **Problem:** Bookings not appearing in the list
   **Possible causes:**
   - No bookings with the selected status exist
   - API request failed
   - Filter is incorrectly applied
   
   **Solutions:**
   - Check network tab for API errors
   - Verify status filter is correct
   - Check server logs for backend issues

2. **Problem:** Payment status not updating
   **Possible causes:**
   - API endpoint error
   - Missing permissions
   - Database constraint issue
   
   **Solutions:**
   - Check network response for error messages
   - Verify the booking exists and is in a valid state
   - Check server logs for detailed error information

3. **Problem:** Edit dialog not saving changes
   **Possible causes:**
   - Validation errors
   - API error
   - Form submission issue
   
   **Solutions:**
   - Check form validation messages
   - Look for API errors in network tab
   - Verify all required fields are completed

## Integration with Payment System

The booking system integrates with the payment system through:

1. **PaymentStatusBadge component:** Displays current payment status with click-to-update functionality
2. **PaymentStatusUpdater component:** Provides a dropdown UI for changing payment status
3. **API endpoints:** Communicates with the backend to fetch and update payment information

These components maintain a clear separation of concerns while providing seamless integration between booking and payment management.

## Future Enhancements

1. Server-side filtering for improved performance with large datasets
2. Bulk actions for managing multiple bookings at once
3. Advanced search and filtering options
4. Export functionality for booking data
5. Calendar view for booking management 