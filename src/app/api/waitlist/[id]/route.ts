import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Delete a waitlist entry
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('API: Deleting waitlist entry with ID:', id);
    
    // Delete the waitlist entry
    const { error } = await supabaseAdmin
      .from('waitlist')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('API: Error deleting waitlist entry:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.log('API: Waitlist entry deleted successfully');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API: Error in waitlist entry deletion:', error);
    return NextResponse.json(
      { error: 'Failed to delete waitlist entry' },
      { status: 500 }
    );
  }
} 