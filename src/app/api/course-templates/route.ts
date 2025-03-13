import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

// GET all course templates
export async function GET() {
  // Since we're using static exports, we'll handle course templates on the client side
  return NextResponse.json({
    message: 'Course templates are handled on the client side',
    status: 'success'
  });
}

// POST a new course template
export async function POST() {
  // Since we're using static exports, we'll handle course templates on the client side
  return NextResponse.json({
    message: 'Course templates are handled on the client side',
    status: 'success'
  });
} 