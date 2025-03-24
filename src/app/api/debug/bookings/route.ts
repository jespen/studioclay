import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    // Get the URL parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const invoiceNumber = url.searchParams.get('invoice');
    
    // First try a simple query without joins
    let query = supabase.from('bookings').select('*');
    
    if (id) {
      query = query.eq('id', id);
    } else if (invoiceNumber) {
      query = query.eq('invoice_number', invoiceNumber);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      bookings: data
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
} 