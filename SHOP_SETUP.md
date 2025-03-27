# Shop Feature Setup for Studio Clay

This guide will help you set up the Studio Clay shop feature using Supabase as a backend.

## Step 1: Create the Products Table in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Paste the contents of the `supabase/products.sql` file
5. Run the query to create the products table and sample data

## Step 2: Configure Environment Variables

Make sure your `.env.local` file contains the necessary Supabase configuration:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Step 3: Updating the Product Management Component

When you're ready to switch from local data to Supabase, update the `ProductManager.tsx` component:

1. Uncomment the Supabase query in the `loadProducts` function:
   ```typescript
   const { data, error } = await supabase.from('products').select('*');
   if (error) throw error;
   setProducts(data);
   ```

2. Uncomment the Supabase operations in the `handleDeleteProduct` function:
   ```typescript
   await supabase.from('products').delete().eq('id', id);
   ```

3. Uncomment the Supabase operations in the `handleSaveProduct` function:
   ```typescript
   const { data, error } = await supabase.from('products').upsert(product);
   if (error) throw error;
   ```

## Step 4: Integrating with the Shop Component

Update the `Shop.tsx` component to fetch products from Supabase:

```typescript
useEffect(() => {
  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      setLoading(false);
    }
  }
  
  fetchProducts();
}, []);
```

## Future Enhancements

- **Shopping Cart**: Add shopping cart functionality to allow users to add multiple items
- **Checkout Process**: Implement a checkout process with payment integration
- **Order Management**: Create an order management system in the admin dashboard
- **Product Categories**: Add categories to organize products
- **Product Search**: Implement search functionality for the shop
- **Product Variations**: Support for product variations such as size, color, etc.

## Troubleshooting

If you encounter issues with the shop feature:

1. Check the browser console for errors
2. Verify your Supabase connection is working properly
3. Ensure your environment variables are correctly set
4. Check the Supabase dashboard for any database errors
5. Verify that your products table has the correct structure 