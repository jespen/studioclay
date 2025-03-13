import { NextRequest, NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

import { jsPDF } from 'jspdf';

export async function POST(request: NextRequest) {
  // Since we're using static exports, we'll handle PDF generation on the client side
  return NextResponse.json({
    message: 'PDF generation is handled on the client side',
    status: 'success'
  });
} 