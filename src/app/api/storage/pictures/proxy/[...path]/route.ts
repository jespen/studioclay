import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET_NAME = 'pictures';

// Proxy image from Supabase storage
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the file path from the URL
    const filePath = params.path.join('/');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'No image specified' },
        { status: 400 }
      );
    }
    
    // Fetch the image from Supabase
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(filePath);
    
    if (error) {
      console.error('Error fetching image from storage:', error);
      return NextResponse.json(
        { error: 'Image not found or inaccessible' },
        { status: 404 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Image data is empty' },
        { status: 404 }
      );
    }
    
    // Determine content type based on file extension
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    let contentType = 'image/jpeg'; // Default content type
    
    if (fileExtension === 'png') contentType = 'image/png';
    else if (fileExtension === 'gif') contentType = 'image/gif';
    else if (fileExtension === 'svg') contentType = 'image/svg+xml';
    else if (fileExtension === 'webp') contentType = 'image/webp';
    
    // Return the image with appropriate headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*' // Allow any origin to access the image
      }
    });
  } catch (error) {
    console.error('Error serving proxied image:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve image' },
      { status: 500 }
    );
  }
} 