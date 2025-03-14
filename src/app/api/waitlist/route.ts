import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for waitlist
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('API: Received waitlist submission:', body);

    const waitlistData = {
      course_id: body.course_id,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone || null,
      number_of_participants: body.number_of_participants,
      message: body.message || null,
      status: 'waiting',
      created_at: new Date().toISOString()
    };

    console.log('API: Inserting waitlist data:', waitlistData);

    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert([waitlistData])
      .select()
      .single();

    if (error) {
      console.error('API: Error inserting waitlist entry:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('API: Successfully created waitlist entry:', data);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('API: Error processing waitlist submission:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist submission' },
      { status: 500 }
    );
  }
} 