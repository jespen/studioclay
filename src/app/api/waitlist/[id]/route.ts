import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Delete a waitlist entry
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Properly await and extract the ID parameter in Next.js 13+
    const id = await Promise.resolve(context.params.id);
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