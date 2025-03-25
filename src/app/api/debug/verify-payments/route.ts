import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Get detailed table information
    const { data: columnsInfo, error: columnsError } = await supabase
      .rpc('debug_get_table_info', { table_name: 'payments' });

    if (columnsError) {
      throw columnsError;
    }

    // Get valid status values
    const { data: statusValues, error: statusError } = await supabase
      .from('status')
      .select('name');

    if (statusError) {
      throw statusError;
    }

    // Create a test payment to verify constraints
    const testPayment = {
      payment_method: 'swish',
      amount: 100,
      currency: 'SEK',
      payment_reference: 'TEST-' + Date.now(),
      product_type: 'course',
      product_id: '00000000-0000-0000-0000-000000000000',
      phone_number: '0701234567', // Required for Swish
      user_info: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '0701234567'
      },
      metadata: {
        test: true
      }
    };

    // Test both Swish and non-Swish payments
    const testPayments = [
      testPayment,
      { ...testPayment, payment_method: 'invoice', phone_number: null } // Should work without phone for invoice
    ];

    const insertResults = [];
    const insertErrors = [];

    for (const payment of testPayments) {
      const { data, error } = await supabase
        .from('payments')
        .insert([payment])
        .select();
      
      if (data) insertResults.push(data[0]);
      if (error) insertErrors.push(error);

      // Clean up test payment if it was inserted
      if (data?.[0]?.id) {
        await supabase
          .from('payments')
          .delete()
          .eq('id', data[0].id);
      }
    }

    // Verify payment history table
    const { data: historyInfo, error: historyError } = await supabase
      .rpc('debug_get_table_info', { table_name: 'payment_status_history' });

    return NextResponse.json({
      success: true,
      paymentsTable: {
        columns: columnsInfo,
        testInserts: {
          swish: {
            success: !insertErrors[0],
            error: insertErrors[0]?.message
          },
          invoice: {
            success: !insertErrors[1],
            error: insertErrors[1]?.message
          }
        }
      },
      statusValues: statusValues?.map(s => s.name),
      historyTable: {
        exists: !historyError,
        columns: historyInfo
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 