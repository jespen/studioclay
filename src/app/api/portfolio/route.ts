import { NextResponse } from 'next/server';
import { listPortfolioImages } from '@/lib/portfolioImages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const images = await listPortfolioImages();
    return NextResponse.json(
      { images },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading portfolio images:', error);
    return NextResponse.json(
      { error: 'Failed to load portfolio images' },
      { status: 500 }
    );
  }
}
