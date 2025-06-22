import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Checking database constraints for art_orders...');
    
    // Check table constraints
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_table_constraints', { table_name: 'art_orders' });
    
    if (constraintsError) {
      console.log('Constraints RPC not available, trying direct query...');
      
      // Try a direct query to get constraint info
      const { data: directConstraints, error: directError } = await supabase
        .from('information_schema.check_constraints')
        .select('*')
        .like('constraint_name', '%status%');
        
      if (directError) {
        console.log('Direct constraint query failed, trying table info...');
        
        // Get basic table info instead
        const { data: tableInfo, error: tableError } = await supabase
          .from('art_orders')
          .select('*')
          .limit(1);
          
        if (tableError) {
          throw new Error(`Failed to access art_orders table: ${tableError.message}`);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Cannot directly access constraint info, but table is accessible',
          tableAccessible: true,
          sampleRecord: tableInfo?.[0] || null,
          constraints: 'Not accessible via API'
        });
      }
      
      return NextResponse.json({
        success: true,
        constraints: directConstraints,
        source: 'information_schema'
      });
    }
    
    return NextResponse.json({
      success: true,
      constraints: constraints,
      source: 'rpc_function'
    });
    
  } catch (error) {
    console.error('Error checking constraints:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check database manually via Supabase dashboard'
    }, { status: 500 });
  }
} 