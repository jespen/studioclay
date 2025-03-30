# Shop Feature Setup for Studio Clay

This guide will help you set up the Studio Clay shop feature using Supabase as a backend.

## Step 1: Database Setup in Supabase

### Products Table

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Paste the contents of the `supabase/products.sql` file
5. Run the query to create the products table and sample data

The products table includes important fields for stock management:
- `stock_quantity`: Tracks how many items are available
- `in_stock`: Boolean flag indicating if the product is available for purchase

### Art Orders Table

1. In the SQL Editor, create another query
2. Paste the contents of the `supabase/migrations/20240329_create_art_orders_table.sql` file
3. Run the query to create the art_orders table that will track product purchases

## Step 2: Configure Environment Variables

Make sure your `.env.local` file contains the necessary Supabase configuration:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Step 3: API Routes Implementation

The shop feature requires several API routes:

### Product Routes

- `src/app/api/products/route.ts`: Handles GET (list all products) and POST (create product)
- `src/app/api/products/[id]/route.ts`: Handles GET (get single product), PUT (update) and DELETE

### Art Orders Routes

- `src/app/api/art-orders/[reference]/route.ts`: Handles GET for retrieving order information by reference
- Payment creation is handled by `/api/payments/swish/create` and `/api/invoice/create` (see README-PAYMENT-FLOW.md)
- Both payment handlers automatically update product stock when an order is created

### Invoice Routes

- `src/app/api/invoice/[id]/route.ts`: Universal invoice handler that can retrieve invoices from both bookings and art_orders

## Step 4: Shop Components

The shop implementation consists of several key components:

### Shop Page Components

- `src/app/shop/page.tsx`: Main shop page that lists all products
- `src/app/shop/[id]/page.tsx`: Product details page for a specific product
- `src/app/shop/[id]/details/page.tsx`: Initial step in the art purchase flow
- `src/app/shop/[id]/personal-info/page.tsx`: Collects user information
- `src/app/shop/[id]/payment/page.tsx`: Payment selection and processing
- `src/app/shop/[id]/confirmation/page.tsx`: Order confirmation page

### Common Components

- `src/components/common/BookingStepper.tsx`: Generic stepper component that works across all flows
- `src/components/common/FlowStepWrapper.tsx`: Handles data persistence and flow navigation

### Shop-Specific Components

- `src/components/shop/ProductCard.tsx`: Displays a product in the shop grid
- `src/components/shop/ProductDialog.tsx`: Product quick view modal
- `src/components/shop/ProductDetails.tsx`: Detailed product view for the checkout flow
- `src/components/shop/ShopConfirmation.tsx`: Displays order confirmation details
- `src/components/shop/types.ts`: Type definitions including Product interface with stock management fields

### Admin Shop Components

- `src/components/admin/Shop/ProductManager.tsx`: Admin interface for managing products (CRUD operations)
- `src/components/admin/Shop/ProductForm.tsx`: Form for creating and editing products, including stock quantity
- `src/components/admin/Shop/OrderManager.tsx`: Admin interface for viewing and managing all art orders
- `src/components/admin/Shop/OrderForm.tsx`: Detailed view and editor for individual orders

## Step 5: Checkout Flow Integration

The shop integrates with the generic checkout flow system. See `README-CHECKOUT-FLOW.md` for details on the flow architecture.

### Flow Type

Art purchase uses the `FlowType.ART_PURCHASE` type and follows these steps:
1. Product Details (`GenericStep.DETAILS`)
2. User Information (`GenericStep.USER_INFO`)
3. Payment Selection (`GenericStep.PAYMENT`)
4. Confirmation (`GenericStep.CONFIRMATION`)

### Data Persistence

Data flows through the checkout process using:
- `FlowStateData` interface for type safety
- `saveItemDetails()`, `saveUserInfo()`, etc. for data persistence
- The data is used to create an entry in the `art_orders` table upon payment

## Step 6: Payment Integration

The shop integrates with the payment system described in `README-PAYMENT-FLOW.md`.

### Payment Methods

Art purchases support:
- **Swish**: Direct mobile payment
- **Invoice**: PDF invoice generation

### Payment Processing

1. User selects a payment method in `PaymentSelection.tsx`
2. `product_type: 'art_product'` is passed to the payment API
3. After successful payment, an `art_order` record is created with status `confirmed`
4. Product's stock quantity is automatically decremented and `in_stock` status is updated
5. User is redirected to the confirmation page

## Step 7: Confirmation Page Implementation

The confirmation page shows order details to the user:

1. **Product Information**: Title, description, price, pickup details
2. **User Information**: Name, email, phone (and address for invoice)
3. **Payment Information**: Method, status, amount, date
4. **Order Reference**: For future inquiries

The confirmation page supports three data sources:
- Direct flow data from the checkout process
- URL reference parameter for direct links
- API data fetching for page refreshes

## Step 8: Admin Dashboard Integration

The shop admin components are integrated into the admin dashboard:

1. **Product Management**:
   - Accessible from the admin dashboard navigation
   - Lists all products with status, price, and availability
   - Products can be published/unpublished with a checkbox
   - Create, edit, and delete product functionality

2. **Order Management**:
   - Accessible from the admin dashboard via "Beställningar" link
   - Shows all art orders with status, payment info, and customer details
   - View detailed information including payment status
   - Access to invoice PDF via built-in viewer
   - Contact customers directly from the interface
   - Update order status (confirmed, processing, completed, cancelled)

## Art Order Data Structure

The `art_orders` table stores:

```sql
CREATE TABLE art_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    product_id UUID NOT NULL REFERENCES products(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- Now set to 'confirmed' when created
    payment_status TEXT NOT NULL DEFAULT 'CREATED',
    payment_method TEXT NOT NULL,
    order_reference TEXT NOT NULL,
    invoice_number TEXT,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SEK',
    metadata JSONB,
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('CREATED', 'PAID', 'DECLINED', 'ERROR')),
    CONSTRAINT valid_status CHECK (status IN ('confirmed', 'processing', 'completed', 'cancelled'))
);
```

## Stock Management

Products include stock management with automatic updates during the purchase process:

1. **Stock Fields in Products Table**:
   - `stock_quantity`: Numeric value of available items
   - `in_stock`: Boolean flag for quick filtering

2. **Automatic Stock Updates**:
   - When an order is created (via Swish or Invoice), the stock is automatically decreased
   - If stock reaches 0, `in_stock` is set to `false`

3. **Admin Management**:
   - Stock levels can be updated manually via the ProductForm

## Invoice Handling

Invoices are managed through a unified system:

1. **Invoice Creation**:
   - Generated during order creation for invoice payments
   - Stored in Supabase Storage in the `invoices` bucket
   - Same invoice format for courses, gift cards, and art products

2. **Invoice Retrieval**:
   - Universal API endpoint `/api/invoice/[id]` that works with both bookings and art_orders
   - Identifies the correct record source and retrieves the associated PDF
   - Handles multiple ID formats (order ID, invoice number)

3. **Invoice Display**:
   - Admin interface shows invoices directly in the browser
   - Uses Base64 encoding for secure transfer

## Troubleshooting

If you encounter issues with the shop feature:

1. Check the browser console for errors
2. Verify your Supabase connection is working properly
3. Ensure your environment variables are correctly set
4. Check the Supabase dashboard for any database errors
5. For confirmation page issues, check:
   - Flow data in localStorage
   - API responses from `/api/art-orders/[reference]`
   - Product data from `/api/products/[id]`
6. For invoice display problems:
   - Ensure the invoice exists in Supabase Storage
   - Check the server logs for specific error messages
   - Verify the correct invoice number is being passed to the API

## Future Enhancements

- **Shopping Cart**: Add shopping cart functionality to allow users to add multiple items
- **Advanced Filtering**: Implement filtering and sorting options
- **Product Categories**: Add categories to organize products
- **Product Search**: Implement search functionality for the shop
- **Product Variations**: Support for product variations such as size, color, etc.
- **Order Management**: Further enhance admin dashboard for art order management with reporting 