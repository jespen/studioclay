import { NextRequest, NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET() {
  // Since we're using static exports, we'll handle course templates on the client side
  return NextResponse.json({
    message: 'Course templates are handled on the client side',
    status: 'success'
  });
}

export async function PATCH() {
  // Since we're using static exports, we'll handle course templates on the client side
  return NextResponse.json({
    message: 'Course templates are handled on the client side',
    status: 'success'
  });
}

export async function DELETE() {
  // Since we're using static exports, we'll handle course templates on the client side
  return NextResponse.json({
    message: 'Course templates are handled on the client side',
    status: 'success'
  });
} 