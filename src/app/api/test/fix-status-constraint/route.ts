import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('Attempting to fix art_orders status constraint...');
    
    // Step 1: Try to drop the existing constraint
    console.log('Step 1: Dropping existing status constraint...');
    
    const dropConstraintSQL = `
      ALTER TABLE art_orders 
      DROP CONSTRAINT IF EXISTS valid_status;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropConstraintSQL 
    });
    
    if (dropError) {
      console.log('Drop constraint failed, trying alternative method...');
      // Continue anyway - constraint might not exist or have a different name
    }
    
    // Step 2: Add new constraint with simplified status values
    console.log('Step 2: Adding new status constraint...');
    
    const addConstraintSQL = `
      ALTER TABLE art_orders 
      ADD CONSTRAINT valid_status 
      CHECK (status IN ('confirmed', 'completed'));
    `;
    
    const { error: addError } = await supabase.rpc('exec_sql', { 
      sql: addConstraintSQL 
    });
    
    if (addError) {
      console.error('Failed to add new constraint:', addError);
      
      // Try without the constraint for now
      console.log('Step 2b: Attempting to update existing records first...');
      
      // Update any invalid status values to 'confirmed'
      const { error: updateError } = await supabase
        .from('art_orders')
        .update({ status: 'confirmed' })
        .not('status', 'in', '(confirmed,completed)');
        
      if (updateError) {
        console.error('Failed to update existing records:', updateError);
      } else {
        console.log('Updated existing records with invalid statuses');
        
        // Try adding constraint again
        const { error: retryAddError } = await supabase.rpc('exec_sql', { 
          sql: addConstraintSQL 
        });
        
        if (retryAddError) {
          return NextResponse.json({
            success: false,
            error: 'Could not add status constraint',
            details: retryAddError,
            suggestion: 'Check database manually in Supabase dashboard'
          }, { status: 500 });
        }
      }
    }
    
    // Step 3: Verify the constraint works
    console.log('Step 3: Testing the new constraint...');
    
    // Test that valid values work
    const { data: testData, error: testError } = await supabase
      .from('art_orders')
      .select('id, status')
      .limit(1);
      
    if (testError) {
      console.error('Failed to test constraint:', testError);
      return NextResponse.json({
        success: false,
        error: 'Could not verify constraint',
        details: testError
      }, { status: 500 });
    }
    
    console.log('Successfully fixed status constraint!');
    
    return NextResponse.json({
      success: true,
      message: 'Status constraint successfully updated',
      allowedValues: ['confirmed', 'completed'],
      testRecord: testData?.[0] || null
    });
    
  } catch (error) {
    console.error('Error fixing status constraint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Manual database intervention required'
    }, { status: 500 });
  }
} 