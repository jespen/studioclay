import { NextRequest, NextResponse } from 'next/server';

// Removed static export flag

import { jsPDF } from 'jspdf';

export async function POST(request: NextRequest) {
  // Since we're using static exports, we'll handle PDF generation on the client side
  return NextResponse.json({
    message: 'PDF generation is handled on the client side',
    status: 'success'
  });
} 