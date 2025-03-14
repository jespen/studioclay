import { NextResponse } from 'next/server';

// GET all course templates
export async function GET() {
  // This is a server-side API route that will be hosted on Vercel
  // Return empty data for now - this will be implemented with real data
  return NextResponse.json({ templates: [] });
}

// POST to create a new course template
export async function POST() {
  // This is a server-side API route that will be hosted on Vercel
  // Return success for now - this will be implemented with real data
  return NextResponse.json({ success: true });
}

export const dynamic = 'force-dynamic'; 